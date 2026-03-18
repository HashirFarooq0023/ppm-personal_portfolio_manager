from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv
from .models import (
    PortfolioItem, PortfolioResponseItem, PortfolioSummary, 
    MarketIndex, MarketWatch, User, Transaction, SectorPerformance
)

# Load .env from the same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Database Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

# --- Market Services ---

async def get_all_indices() -> List[MarketIndex]:
    cursor = db.market_indices.find()
    indices = await cursor.to_list(length=10)
    return [MarketIndex(**i) for i in indices]

async def get_market_watch() -> List[MarketWatch]:
    cursor = db.market_watch.find().limit(100)
    stocks = await cursor.to_list(length=100)
    return [MarketWatch(**s) for s in stocks]

async def get_index_history(symbol: str, limit: int = 100) -> List[dict]:
    cursor = db.market_history.find({"symbol": symbol.upper()}).sort("time", -1).limit(limit)
    history = await cursor.to_list(length=limit)
    # Convert to format suitable for lightweight-charts: {time: number, value: number}
    # Ensure unique timestamps by keeping the latest value per second
    temp_map = {}
    for h in reversed(history):
        ts = int(h["time"].timestamp())
        temp_map[ts] = h["value"]
    
    # Return as sorted list of points
    return [
        {"time": ts, "value": val} 
        for ts, val in sorted(temp_map.items())
    ]

async def get_sector_performance() -> List[SectorPerformance]:
    """Aggregates individual stock data into sector performance metrics."""
    cursor = db.market_watch.find()
    all_stocks = await cursor.to_list(length=200)
    
    sectors_map = {} # name -> {total_change: float, count: int}
    
    for s in all_stocks:
        name = s.get('sector', 'Other')
        change = s.get('change_percent', 0.0)
        
        if name not in sectors_map:
            sectors_map[name] = {"total_change": 0.0, "count": 0}
        
        sectors_map[name]["total_change"] += change
        sectors_map[name]["count"] += 1
    
    total_stocks = len(all_stocks) if all_stocks else 1
    result = []
    for name, data in sectors_map.items():
        avg_change = data["total_change"] / data["count"] if data["count"] > 0 else 0.0
        share = (data["count"] / total_stocks) * 100
        result.append(SectorPerformance(name=name, change=avg_change, value=share))
    
    # Sort by performance (descending)
    result.sort(key=lambda x: x.change, reverse=True)
    return result

async def upsert_market_indices(indices: List[MarketIndex]):
    for index in indices:
        await db.market_indices.update_one(
            {"symbol": index.symbol},
            {"$set": index.model_dump()},
            upsert=True
        )

async def upsert_market_watch(stocks: List[MarketWatch]):
    for stock in stocks:
        await db.market_watch.update_one(
            {"symbol": stock.symbol},
            {"$set": stock.model_dump()},
            upsert=True
        )

# --- Portfolio Services ---

async def get_user_portfolio(clerk_id: str) -> PortfolioSummary:
    cursor = db.portfolio.find({"clerk_id": clerk_id, "is_deleted": {"$ne": True}})
    items = await cursor.to_list(length=100)
    
    response_items = []
    total_cost = 0.0
    total_value = 0.0
    
    for item in items:
        # Fetch live price
        market_data = await db.market_watch.find_one({"symbol": item['symbol']})
        current_price = market_data['current_price'] if market_data else item['average_buy_price']
        
        cost = item['shares'] * item['average_buy_price']
        value = item['shares'] * current_price
        pl = value - cost
        pl_pct = (pl / cost * 100) if cost > 0 else 0
        
        total_cost += cost
        total_value += value
        
        response_items.append(PortfolioResponseItem(
            symbol=item['symbol'],
            shares=item['shares'],
            average_buy_price=item['average_buy_price'],
            current_price=current_price,
            total_cost=cost,
            total_value=value,
            profit_loss=pl,
            profit_loss_percent=pl_pct,
            transactions=[Transaction(**t) for t in item.get('transactions', [])]
        ))
    
    total_pl = total_value - total_cost
    total_pl_pct = (total_pl / total_cost * 100) if total_cost > 0 else 0
    
    return PortfolioSummary(
        items=response_items,
        total_cost=total_cost,
        total_value=total_value,
        total_profit_loss=total_pl,
        total_profit_loss_percent=total_pl_pct
    )

async def add_or_update_holding(clerk_id: str, symbol: str, action: str, shares: int, price: float):
    existing = await db.portfolio.find_one({"clerk_id": clerk_id, "symbol": symbol})
    
    new_txn = Transaction(
        action=action,
        shares=shares,
        price=price
    )

    if existing:
        if action == "Buy":
            new_shares = existing['shares'] + shares
            # Weighted Average Cost Calculation
            new_avg_price = ((existing['shares'] * existing['average_buy_price']) + (shares * price)) / new_shares
        else: # Sell
            new_shares = max(0, existing['shares'] - shares)
            # Average buy price doesn't change on sell (it's the cost of remaining shares)
            new_avg_price = existing['average_buy_price']
        
        await db.portfolio.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {"shares": new_shares, "average_buy_price": new_avg_price},
                "$push": {"transactions": new_txn.model_dump()}
            }
        )
    else:
        # If selling something not owned, we'll ignore for now or start at 0
        start_shares = shares if action == "Buy" else 0
        new_holding = PortfolioItem(
            clerk_id=clerk_id,
            symbol=symbol,
            shares=start_shares,
            average_buy_price=price,
            transactions=[new_txn]
        )
        await db.portfolio.insert_one(new_holding.model_dump())

async def delete_holding(clerk_id: str, symbol: str):
    """Soft deletes a holding by moving it to the bin."""
    await db.portfolio.update_one(
        {"clerk_id": clerk_id, "symbol": symbol},
        {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow()}}
    )

async def get_deleted_holdings(clerk_id: str) -> List[PortfolioResponseItem]:
    """Fetches recently deleted holdings from the bin."""
    cursor = db.portfolio.find({"clerk_id": clerk_id, "is_deleted": True})
    items = await cursor.to_list(length=100)
    
    response_items = []
    for item in items:
        # Fetch live price
        market_data = await db.market_watch.find_one({"symbol": item['symbol']})
        current_price = market_data['current_price'] if market_data else item['average_buy_price']
        
        cost = item['shares'] * item['average_buy_price']
        value = item['shares'] * current_price
        pl = value - cost
        pl_pct = (pl / cost * 100) if cost > 0 else 0
        
        response_items.append(PortfolioResponseItem(
            symbol=item['symbol'],
            shares=item['shares'],
            average_buy_price=item['average_buy_price'],
            current_price=current_price,
            total_cost=cost,
            total_value=value,
            profit_loss=pl,
            profit_loss_percent=pl_pct,
            transactions=[Transaction(**t) for t in item.get('transactions', [])],
            deleted_at=item.get('deleted_at')
        ))
    return response_items

async def restore_holding(clerk_id: str, symbol: str):
    """Restores a holding from the bin."""
    await db.portfolio.update_one(
        {"clerk_id": clerk_id, "symbol": symbol, "is_deleted": True},
        {"$set": {"is_deleted": False, "deleted_at": None}}
    )
