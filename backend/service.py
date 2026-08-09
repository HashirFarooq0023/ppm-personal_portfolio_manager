import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne, IndexModel, ASCENDING, DESCENDING, ReturnDocument
import os
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4
from dotenv import load_dotenv
from models import (
    PortfolioItem, PortfolioResponseItem, PortfolioSummary, PortfolioHistoryPoint,
    MarketIndex, MarketWatch, User, Transaction, SectorPerformance,
    AIAnalysisRequest, AIAnalysisResponse, CandleData, Company, MarketHistoryPoint,
    Dividend, DividendAddRequest, AccountSettings, AccountSettingsUpdateRequest, CashReconciliationResponse,
    UserSettings, UserSettingsUpdateRequest
)
from fastapi import HTTPException
import json
from openai import AsyncOpenAI
from ddgs import DDGS

# Load .env from the same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Database Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

# Connection Pool Management:
# maxPoolSize=10 limits the number of connections to Atlas Free Tier (M0)
# waitQueueTimeoutMS=5000 prevents long hangs
client = AsyncIOMotorClient(
    MONGODB_URI, 
    maxPoolSize=10, 
    minPoolSize=1, 
    waitQueueTimeoutMS=5000,
    serverSelectionTimeoutMS=10000, # Increased to handle Atlas Free Tier blips
    retryWrites=True,
    retryReads=True
)
db = client[DB_NAME]

async def ensure_indexes():
    """Defines and creates indexes for the normalized PPSM schema."""
    print("[BACKEND] Checking Database Indexes...")
    try:
        # 1. Market History (Time Series Ready)
        try:
            await db.market_history.create_indexes([
                IndexModel([("symbol", ASCENDING), ("time", DESCENDING)], name="history_symbol_time_idx", unique=True)
            ])
        except Exception as e:
            # If the index exists but with different options (e.g. not unique), drop and recreate it
            if "IndexKeySpecsConflict" in str(e) or "IndexOptionsConflict" in str(e):
                print("[BACKEND] Index options mismatch. Updating history_symbol_time_idx...")
                await db.market_history.drop_index("history_symbol_time_idx")
                await db.market_history.create_indexes([
                    IndexModel([("symbol", ASCENDING), ("time", DESCENDING)], name="history_symbol_time_idx", unique=True)
                ])
            else:
                raise e
        
        # 2. Companies (Slow Data)
        await db.companies.create_indexes([
            IndexModel([("symbol", ASCENDING)], name="company_symbol_idx", unique=True),
            IndexModel([("sector", ASCENDING)], name="company_sector_idx")
        ])
        
        # 3. Market Watch (Fast Data)
        try:
            await db.market_watch.create_indexes([
                IndexModel([("symbol", ASCENDING)], name="watch_symbol_idx", unique=True)
            ])
        except Exception as e:
            if "IndexKeySpecsConflict" in str(e) or "IndexOptionsConflict" in str(e):
                print("[BACKEND] Index options mismatch. Updating watch_symbol_idx...")
                await db.market_watch.drop_index("watch_symbol_idx")
                await db.market_watch.create_indexes([
                    IndexModel([("symbol", ASCENDING)], name="watch_symbol_idx", unique=True)
                ])
            else:
                raise e
        
        # 4. Portfolio (Current State Only)
        await db.portfolio.create_indexes([
            IndexModel([("clerk_id", ASCENDING), ("symbol", ASCENDING)], name="portfolio_user_symbol_idx", unique=True)
        ])

        # 5. Transactions (Infinite Standalone Ledger)
        await db.transactions.create_indexes([
            IndexModel([("clerk_id", ASCENDING), ("symbol", ASCENDING)], name="transaction_user_symbol_idx"),
            IndexModel([("transaction_id", ASCENDING)], name="transaction_id_idx", unique=True),
            IndexModel([("date", DESCENDING)], name="transaction_date_idx")
        ])
        
        print("=> SUCCESS: Normalized database indexes verified.")
    except Exception as e:
        print(f"=> ERROR creating indexes: {e}")

# --- Market Services ---

async def get_all_indices() -> List[MarketIndex]:
    cursor = db.market_indices.find()
    indices = await cursor.to_list(length=10)
    return [MarketIndex(**i) for i in indices]

async def get_market_watch() -> List[MarketWatch]:
    """Fetches live prices and hydrates them with static company metadata."""
    from fixed_symbols import FIXED_SYMBOLS
    # 1. Fetch fast-changing market data (ONLY for fixed symbols)
    cursor = db.market_watch.find({"symbol": {"$in": list(FIXED_SYMBOLS)}})
    stocks = await cursor.to_list(length=1000) 
    
    # 2. Fetch slow-changing company metadata
    company_cursor = db.companies.find()
    companies_list = await company_cursor.to_list(length=1000)
    company_map = {c['symbol']: c for c in companies_list}
    
    result = []
    for s in stocks:
        meta = company_map.get(s['symbol'], {})
        # Merge live data with static metadata for the frontend
        merged = {**s}
        merged['company_name'] = meta.get('company_name', s.get('company_name'))
        merged['sector'] = meta.get('sector', s.get('sector', 'Miscellaneous'))
        
        result.append(MarketWatch.model_validate(merged))
    return result

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

async def get_symbol_history_ohlc(symbol: str, limit: int = 200) -> List[CandleData]:
    """
    Aggregates raw market snapshots into OHLC (Open, High, Low, Close) candles.
    Buckets data into 30-minute intervals to match the scraper frequency.
    """
    pipeline = [
        {"$match": {"symbol": symbol.upper()}},
        {
            "$group": {
                "_id": {
                    "$dateTrunc": {
                        "date": "$time",
                        "unit": "minute",
                        "binSize": 30
                    }
                },
                "open": {"$first": "$price"},
                "high": {"$max": "$price"},
                "low": {"$min": "$price"},
                "close": {"$last": "$price"}
            }
        },
        {"$sort": {"_id": 1}},
        {"$limit": limit}
    ]
    
    candles = []
    async for doc in db.market_history.aggregate(pipeline):
        candles.append(CandleData(
            time=int(doc["_id"].timestamp()),
            open=doc["open"],
            high=doc["high"],
            low=doc["low"],
            close=doc["close"]
        ))
    
    # Fallback: if no history yet, return an empty list instead of crashing
    return candles
async def get_sector_performance() -> list[SectorPerformance]:
    """Aggregates individual stock data into sector performance metrics using MongoDB."""
    from fixed_symbols import FIXED_SYMBOLS
    
    # 1. Get the total number of stocks so we can calculate the percentage share
    filter_query = {"symbol": {"$in": list(FIXED_SYMBOLS)}}
    total_stocks = await db.market_watch.count_documents(filter_query)
    if total_stocks == 0:
        return []
        
    # 2. Let MongoDB do the math! (Much faster than a Python loop)
    pipeline = [
        {
            "$match": filter_query
        },
        {
            "$group": {
                "_id": "$sector",
                "avg_change_snake": {"$avg": "$change_percent"},
                "avg_change_camel": {"$avg": "$changePercent"},
                "count": {"$sum": 1}
            }
        }
    ]
    
    result = []
    async for doc in db.market_watch.aggregate(pipeline):
        name = doc.get("_id")
        
        # Skip empty or unclassified sectors
        if not name or name == "Miscellaneous" or name == "Other":
            continue 
            
        avg_change = doc.get("avg_change_snake") or doc.get("avg_change_camel") or 0.0
        count = doc.get("count", 0)
        
        # Calculate what percentage of the market this sector takes up
        share = (count / total_stocks) * 100
        
        result.append(SectorPerformance(
            name=name,
            change=avg_change,
            value=share
        ))
    
    # Sort the final result array by market value (share) high to low.
    result.sort(key=lambda x: x.value, reverse=True)
    
    print(f"[BACKEND] Sector Aggregation Complete: Found {len(result)} valid sectors.")
    return result

async def upsert_market_indices(indices: List[MarketIndex]):
    if not indices:
        return
    operations = [
        UpdateOne({"symbol": index.symbol}, {"$set": index.model_dump()}, upsert=True)
        for index in indices
    ]
    await db.market_indices.bulk_write(operations)

async def upsert_market_watch(stocks: List[MarketWatch]):
    if not stocks:
        return
    operations = [
        UpdateOne({"symbol": stock.symbol}, {"$set": stock.model_dump()}, upsert=True)
        for stock in stocks
    ]
    await db.market_watch.bulk_write(operations)

async def record_market_snapshot():
    """Captures a full historical snapshot with price and volume (Time Series Optimized)."""
    print("[BACKEND] Recording Market History Snapshot...")
    now = datetime.now(timezone.utc)
    
    # 1. Snapshot Indices
    indices = await db.market_indices.find().to_list(length=10)
    for idx in indices:
        try:
            await db.market_history.insert_one({
                "symbol": idx["symbol"],
                "price": idx["value"],
                "volume": 0, # Indices don't have volume in the same way
                "time": now
            })
        except: pass # Skip duplicates
        
    # 2. Snapshot All Stocks (Time Series Data)
    stocks = await db.market_watch.find().to_list(length=1000)
    history_points = []
    for s in stocks:
        history_points.append({
            "symbol": s["symbol"],
            "price": s["current_price"],
            "volume": int(s.get("volume", 0)),
            "time": now
        })
    
    if history_points:
        try:
            await db.market_history.insert_many(history_points, ordered=False)
            print(f"=> INFO: Recorded {len(history_points)} stock snapshots.")
        except Exception as e:
            # Duplicate timestamps are caught by unique index
            pass

async def record_all_portfolios_snapshot():
    """Iterates through all users and records their total portfolio metrics."""
    print("[BACKEND] Recording All Portfolio Snapshots...")
    # 1. Get all unique users who have at least one holding
    clerk_ids = await db.portfolio.distinct("clerk_id")
    
    now = datetime.now(timezone.utc)
    snapshots_taken = 0
    
    for cid in clerk_ids:
        try:
            summary = await get_user_portfolio(cid)
            if summary.total_value > 0 or summary.total_cost > 0:
                history_point = PortfolioHistoryPoint(
                    clerk_id=cid,
                    total_value=summary.total_value,
                    total_cost=summary.total_cost,
                    total_profit_loss=summary.total_profit_loss,
                    total_profit_loss_percent=summary.total_profit_loss_percent,
                    timestamp=now
                )
                await db.portfolio_history.insert_one(history_point.model_dump())
                snapshots_taken += 1
        except Exception as e:
            print(f"Error recording snapshot for user {cid}: {e}")
            
    print(f"=> INFO: Successfully archived {snapshots_taken} user portfolio snapshots.")

# --- Portfolio Services ---

async def get_user_portfolio(clerk_id: str) -> PortfolioSummary:
    """Returns user portfolio summary with WABP, realized profit, and dividends calculations."""
    cursor = db.portfolio.find({"clerk_id": clerk_id, "is_deleted": {"$in": [False, None]}})
    items = await cursor.to_list(length=100)
    
    # Fetch all dividends for this user
    div_cursor = db.dividends.find({"clerk_id": clerk_id})
    div_docs = await div_cursor.to_list(length=1000)
    user_dividends = [Dividend(**d) for d in div_docs]
    overall_dividends = sum(d.net_dividend for d in user_dividends)
    
    if not items:
        # Check if user has all-time transactions for realized profit calculation
        all_txns_cursor = db.transactions.find({"clerk_id": clerk_id})
        all_txns = await all_txns_cursor.to_list(length=2000)
        total_realized = sum(t.get("net_settled", 0.0) for t in all_txns)
        total_real = total_realized + overall_dividends
        return PortfolioSummary(
            items=[],
            total_cost=0,
            total_value=0,
            total_profit_loss=0,
            total_profit_loss_percent=0,
            total_realized_profit=total_realized,
            total_dividends=overall_dividends,
            total_real_profit=total_real
        )

    # 1. Bulk Fetch Market Prices
    symbols = [item['symbol'] for item in items]
    market_cursor = db.market_watch.find({"symbol": {"$in": symbols}})
    market_docs = await market_cursor.to_list(length=len(symbols))
    market_map = {doc['symbol']: doc for doc in market_docs}
    
    response_items = []
    total_cost = 0.0
    total_value = 0.0
    total_realized = 0.0
    
    # Also fetch all transactions for user to ensure full realized profit computation
    all_txns_cursor = db.transactions.find({"clerk_id": clerk_id})
    all_txns_list = await all_txns_cursor.to_list(length=5000)
    txns_by_symbol = {}
    for t in all_txns_list:
        sym = t.get("symbol")
        if sym not in txns_by_symbol:
            txns_by_symbol[sym] = []
        txns_by_symbol[sym].append(t)
        total_realized += t.get("net_settled", 0.0)
    
    for item in items:
        sym = item['symbol']
        market_data = market_map.get(sym)
        current_price = market_data['current_price'] if market_data else item['average_buy_price']
        
        # Transactions for this symbol
        transactions_raw = txns_by_symbol.get(sym, [])
        transactions = []
        buy_gross_sum = 0.0
        buy_shares_sum = 0
        symbol_realized = 0.0
        
        for t in transactions_raw:
            # Migration/Fallback hydration for legacy transactions missing net_settled
            if "net_settled" not in t or t["net_settled"] == 0.0:
                g_amt = t.get("gross_amount") or (t.get("shares", 0) * t.get("price", 0.0))
                b_fee = t.get("brokerage_fee", 0.0)
                cgt = t.get("cgt_paid", 0.0)
                act = t.get("action", "Buy")
                n_set = -(g_amt + b_fee) if act == "Buy" else (g_amt - b_fee - cgt)
                t["gross_amount"] = g_amt
                t["net_settled"] = n_set
            
            t_obj = Transaction(**t)
            transactions.append(t_obj)
            
            symbol_realized += t_obj.net_settled
            if t_obj.action == "Buy":
                buy_gross_sum += t_obj.gross_amount
                buy_shares_sum += t_obj.shares
                
        # Calculate WABP (Weighted Average Buy Price)
        wabp = (buy_gross_sum / buy_shares_sum) if buy_shares_sum > 0 else item['average_buy_price']
        
        effective_buy_price = wabp if wabp > 0 else item['average_buy_price']
        cost = item['shares'] * effective_buy_price
        value = item['shares'] * current_price
        pl = value - cost
        pl_pct = (pl / cost * 100) if cost > 0 else 0
        
        total_cost += cost
        total_value += value
        
        # Calculate dividends for this symbol
        stock_divs = sum(d.net_dividend for d in user_dividends if d.symbol == sym)
        
        response_items.append(PortfolioResponseItem(
            symbol=sym,
            shares=item['shares'],
            average_buy_price=item['average_buy_price'],
            wabp=wabp,
            current_price=current_price,
            total_cost=cost,
            total_value=value,
            profit_loss=pl,
            profit_loss_percent=pl_pct,
            realized_profit=symbol_realized,
            total_dividends=stock_divs,
            transactions=transactions
        ))
    
    total_pl = total_value - total_cost
    total_pl_pct = (total_pl / total_cost * 100) if total_cost > 0 else 0
    total_real = total_realized + overall_dividends
    
    return PortfolioSummary(
        items=response_items,
        total_cost=total_cost,
        total_value=total_value,
        total_profit_loss=total_pl,
        total_profit_loss_percent=total_pl_pct,
        total_realized_profit=total_realized,
        total_dividends=overall_dividends,
        total_real_profit=total_real
    )

async def add_or_update_holding(
    clerk_id: str,
    symbol: str,
    action: str,
    shares: int,
    price: float,
    brokerage_fee: Optional[float] = None,
    cgt_paid: float = 0.0,
    override_brokerage_fee: bool = False,
    reset_history: bool = False
):
    """
    Scalable Portfolio Mutation with Net Settled calculation:
    Auto-computes brokerage commission & sales tax if not overridden.
    Buy: net_settled = -(gross_amount + total_brokerage_cost)
    Sell: net_settled = (gross_amount - total_brokerage_cost - cgt_paid)
    """
    symbol = symbol.upper()
    action = "Buy" if action.lower() == "buy" else "Sell"
    gross_amount = float(shares) * float(price)
    
    # Calculate or use provided brokerage fee
    if not override_brokerage_fee or brokerage_fee is None:
        user_settings = await get_user_settings(clerk_id)
        if user_settings.fee_type == "Percentage":
            base_commission = gross_amount * (user_settings.fee_value / 100.0)
        else: # Flat_Per_Share
            base_commission = float(shares) * user_settings.fee_value
        sales_tax = base_commission * (user_settings.sales_tax_rate / 100.0)
        final_brokerage_fee = base_commission + sales_tax
    else:
        final_brokerage_fee = float(brokerage_fee)
    
    if action == "Buy":
        net_settled = -(gross_amount + final_brokerage_fee)
    else:
        net_settled = gross_amount - final_brokerage_fee - cgt_paid

    txn_id = str(uuid4())
    new_txn = Transaction(
        transaction_id=txn_id,
        clerk_id=clerk_id,
        symbol=symbol,
        action=action,
        shares=shares,
        price=price,
        gross_amount=gross_amount,
        brokerage_fee=final_brokerage_fee,
        cgt_paid=cgt_paid if action == "Sell" else 0.0,
        net_settled=net_settled,
        date=datetime.utcnow()
    )

    async with await client.start_session() as session:
        async with session.start_transaction():
            # 1. Fetch current totals
            existing = await db.portfolio.find_one(
                {"clerk_id": clerk_id, "symbol": symbol},
                session=session
            )

            if existing:
                prev_shares = existing.get('shares', 0)
                prev_avg_price = existing.get('average_buy_price', 0.0)
                is_binned = existing.get('is_deleted', False)
                
                if is_binned and reset_history:
                    # Wipe Infinite Ledger for this stock if requested
                    await db.transactions.delete_many({"clerk_id": clerk_id, "symbol": symbol}, session=session)
                    new_shares = shares if action == "Buy" else 0
                    new_avg_price = price
                else:
                    if action == "Buy":
                        new_shares = prev_shares + shares
                        new_avg_price = ((prev_shares * prev_avg_price) + (shares * price)) / new_shares
                    else: # Sell
                        new_shares = max(0, prev_shares - shares)
                        new_avg_price = prev_avg_price
                
                # Update Totals
                await db.portfolio.update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "shares": new_shares,
                            "average_buy_price": new_avg_price,
                            "is_deleted": False,
                            "deleted_at": None,
                            "last_modified": datetime.utcnow()
                        }
                    },
                    session=session
                )
            else:
                # Create New Holding Entry
                start_shares = shares if action == "Buy" else 0
                await db.portfolio.insert_one({
                    "clerk_id": clerk_id,
                    "symbol": symbol,
                    "shares": start_shares,
                    "average_buy_price": price,
                    "is_deleted": False,
                    "last_modified": datetime.utcnow()
                }, session=session)

            # 2. Permanent Ledger Entry (Always written to separate collection)
            await db.transactions.insert_one(new_txn.model_dump(), session=session)

def _recompute_holding_from_transactions(transactions: List[dict]) -> tuple[int, float]:
    """
    Recomputes (shares, average_buy_price) by replaying the transaction ledger.
    This matches the incremental logic used in `add_or_update_holding`.
    """
    shares = 0
    avg_price = 0.0

    def _sort_key(t: dict):
        # If Mongo stored `date` as datetime, this works; otherwise falls back.
        d = t.get("date")
        return d or datetime.min

    for t in sorted(transactions, key=_sort_key):
        action = t.get("action")
        t_shares = int(t.get("shares", 0) or 0)
        t_price = float(t.get("price", 0) or 0.0)

        if action == "Buy":
            new_shares = shares + t_shares
            if new_shares <= 0:
                shares = 0
                avg_price = 0.0
            else:
                avg_price = ((shares * avg_price) + (t_shares * t_price)) / new_shares
                shares = new_shares
        elif action == "Sell":
            shares = max(0, shares - t_shares)
            # average_buy_price remains unchanged on sell

    return shares, avg_price

async def delete_transaction(clerk_id: str, transaction_id: str) -> None:
    """Deletes a trade from the separate ledger and updates totals atomically."""
    async with await client.start_session() as session:
        async with session.start_transaction():
            # 1. Fetch the transaction to delete
            txn = await db.transactions.find_one({"transaction_id": transaction_id, "clerk_id": clerk_id}, session=session)
            if not txn:
                raise HTTPException(status_code=404, detail="Transaction not found.")

            symbol = txn["symbol"]

            # 2. Remove from ledger
            await db.transactions.delete_one({"_id": txn["_id"]}, session=session)

            # 3. Recompute Totals from the remaining ledger
            txn_cursor = db.transactions.find({"clerk_id": clerk_id, "symbol": symbol}, session=session)
            remaining_txns = await txn_cursor.to_list(length=1000)
            
            new_shares, new_avg_price = _recompute_holding_from_transactions(remaining_txns)
            soft_delete = len(remaining_txns) == 0 or new_shares <= 0

            # 4. Update Portfolio Document
            await db.portfolio.update_one(
                {"clerk_id": clerk_id, "symbol": symbol},
                {
                    "$set": {
                        "shares": max(0, new_shares),
                        "average_buy_price": new_avg_price if new_shares > 0 else 0.0,
                        "is_deleted": soft_delete,
                        "deleted_at": datetime.utcnow() if soft_delete else None,
                        "last_modified": datetime.utcnow()
                    }
                },
                session=session
            )

async def empty_bin_items(clerk_id: str):
    """Permanently deletes all binned holdings for a user."""
    await db.portfolio.delete_many({"clerk_id": clerk_id, "is_deleted": True})

async def delete_holding(clerk_id: str, symbol: str):
    """Soft deletes a holding by moving it to the bin."""
    await db.portfolio.update_one(
        {"clerk_id": clerk_id, "symbol": symbol},
        {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow()}}
    )

async def get_deleted_holdings(clerk_id: str) -> List[PortfolioResponseItem]:
    """Fetches recently deleted holdings from the bin with their full transaction history."""
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
        
        # Fetch Transactions from the separate infinite ledger
        txn_cursor = db.transactions.find({"clerk_id": clerk_id, "symbol": item['symbol']}).sort("date", -1)
        transactions = await txn_cursor.to_list(length=500)

        # [MIGRATION]: Fallback for older binned items
        if not transactions:
            legacy_txns = item.get("transactions", [])
            if legacy_txns:
                for t in legacy_txns:
                    t["clerk_id"] = clerk_id
                    t["symbol"] = item['symbol']
                    if not t.get("transaction_id"): t["transaction_id"] = str(uuid4())
                await db.transactions.insert_many(legacy_txns)
                transactions = legacy_txns
                await db.portfolio.update_one({"_id": item["_id"]}, {"$unset": {"transactions": ""}})

        response_items.append(PortfolioResponseItem(
            symbol=item['symbol'],
            shares=item['shares'],
            average_buy_price=item['average_buy_price'],
            current_price=current_price,
            total_cost=cost,
            total_value=value,
            profit_loss=pl,
            profit_loss_percent=pl_pct,
            transactions=[Transaction(**t) for t in transactions],
            deleted_at=item.get('deleted_at')
        ))
    return response_items

async def restore_holding(clerk_id: str, symbol: str):
    """Restores a holding from the bin."""
    await db.portfolio.update_one(
        {"clerk_id": clerk_id, "symbol": symbol, "is_deleted": True},
        {"$set": {"is_deleted": False, "deleted_at": None}}
    )

# --- AI Analyst Service ---

async def generate_stock_analysis(clerk_id: str, symbol: Optional[str], question: Optional[str] = None, history: Optional[List[dict]] = None) -> dict:
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is missing.")

    openai_client = AsyncOpenAI(api_key=api_key)

    # ---- 0. Fetch Global Market Context (Fresh Data for AI) ----
    from fixed_symbols import FIXED_SYMBOLS, CURATED_COMPANIES
    import re
    
    market_snapshot = "Market currently unavailable."
    try:
        # Fetch Top 3 Gainers and Losers for context
        cursor = db.market_watch.find({"symbol": {"$in": list(FIXED_SYMBOLS)}}).sort("change_percent", -1)
        all_market = await cursor.to_list(length=100)
        if all_market:
            gainers = all_market[:3]
            losers = all_market[-3:]
            market_snapshot = "**Top Gainers Today:** " + ", ".join([f"{s['symbol']} ({s.get('change_percent', 0):+.2f}%)" for s in gainers])
            market_snapshot += "\n**Top Losers Today:** " + ", ".join([f"{s['symbol']} ({s.get('change_percent', 0):+.2f}%)" for s in losers])
    except Exception as e:
        print(f"Market context error: {e}")

    # ---- 1. Optimized Symbol Detection ----
    if not symbol and question:
        q_upper = question.upper()
        q_lower = question.lower()
        import difflib

        # 1.1. Exact word match for symbols (High Priority)
        detected = [sym for sym in FIXED_SYMBOLS if re.search(rf'\b{sym}\b', q_upper)]
        if detected:
            symbol = detected[0]
        else:
            # 1.2. Fuzzy/Part match for Company Names
            for sym, details in CURATED_COMPANIES.items():
                full_name = details["name"].lower()
                # Get first significant word (e.g., "Meezan", "Systems", "Lucky")
                name_parts = full_name.split()
                # Skip generic first words like "Bank" or "The"
                common_name = name_parts[0] if name_parts[0] not in ["bank", "the", "national", "oil", "pakistan"] else (name_parts[1] if len(name_parts) > 1 else name_parts[0])
                
                # Check for direct substring or fuzzy match of the common name
                if common_name in q_lower or (len(common_name) > 4 and difflib.get_close_matches(common_name, q_lower.split(), n=1, cutoff=0.7)):
                    symbol = sym
                    break

    # ---- MODE 2: GENERAL CHAT (No Symbol Selected) ----
    if not symbol:
        portfolio = await get_user_portfolio(clerk_id)
        portfolio_summary = ""
        if portfolio.items:
            now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            portfolio_summary = f"**User's Current Portfolio (AS OF {now_str} UTC):**\n"
            for item in portfolio.items:
                ownership_word = "profit" if item.profit_loss_percent >= 0 else "loss"
                portfolio_summary += (
                    f"- {item.symbol}: {item.shares} shares @ PKR {item.average_buy_price:.2f} "
                    f"(Current: PKR {item.current_price:.2f}, {abs(item.profit_loss_percent):.1f}% {ownership_word})\n"
                )
            portfolio_summary += f"\nTotal Value: PKR {portfolio.total_value:,.0f} | P&L: PKR {portfolio.total_profit_loss:,.0f} ({portfolio.total_profit_loss_percent:.1f}%)"
        else:
            portfolio_summary = "The user has no stocks in their current active portfolio."

        # News Intent Detection: Broadened keywords to capture "projects", "goals", etc.
        general_news = ""
        news_keywords = ["news", "latest", "update", "impact", "budget", "dollar", "rate", "economy", "happened", "projects", "goals", "future", "vision"]
        if any(kw in question.lower() for kw in news_keywords):
            try:
                results = DDGS().text("Pakistan PSX stock market news today", max_results=3)
                if results:
                    general_news = "\n**Latest Market News Snippets:**\n"
                    for r in results:
                        general_news += f"- {r.get('title')}: {r.get('body')[:180]}...\n"
            except:
                pass

        system_prompt = f"""You are an elite Financial Analyst and seasoned PSX Stock Broker.
You are street-smart, direct, and data-driven.

**CURRENT MARKET CONTEXT:**
{market_snapshot}
{general_news}

**USER PORTFOLIO:**
{portfolio_summary}

**INSTRUCTIONS:**
1. Match user energy: If they say "hi", be brief. If they ask for analysis, be deep.
2. ALWAYS pivot general questions back to relevant PSX stocks or sectors.
3. Use the Market Snapshot and Portfolio data to provide specific, personalized insights.
4. Format with **bolding** and bullet points for readability. Do NOT return JSON."""

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
            
        user_msg = question if question else "Give me your outlook on the current PSX market conditions."
        messages.append({"role": "user", "content": user_msg})

        try:
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            return {"response_text": response.choices[0].message.content}
        except Exception as e:
            print(f"OpenAI API error: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate AI analysis.")

    # ---- MODE 1: SPECIFIC STOCK ANALYSIS ----
    symbol = symbol.upper()
    
    # 1. Symbol Validation via Market Watch
    market_data = await db.market_watch.find_one({"symbol": symbol})
    if not market_data:
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found in PSX market watch.")
    
    live_price = market_data.get('current_price', 0.0)
    
    # 2. Portfolio Context Injection
    portfolio = await get_user_portfolio(clerk_id)
    user_context = "The user does not currently own this stock. Advise on whether it is a good entry point."
    
    for item in portfolio.items:
        if item.symbol == symbol:
            ownership_word = "profit" if item.profit_loss_percent >= 0 else "loss"
            user_context = (
                f"The user currently owns {item.shares} shares of {symbol} "
                f"at an average buy price of PKR {item.average_buy_price:.2f}. "
                f"They are currently at a {abs(item.profit_loss_percent):.2f}% {ownership_word}. "
                f"Tailor your advice to help them decide whether to hold, average down, or cut losses."
            )
            break
            
    # 3. Live News via DuckDuckGo
    news_context = ""
    try:
        search_query = f"{symbol} stock news Pakistan PSX"
        results = DDGS().text(search_query, max_results=3)
        if results:
            for i, r in enumerate(results):
                news_context += f"Source {i+1}: {r.get('title', '')} - {r.get('href', '')}\nSnippet: {r.get('body', '')}\n\n"
        else:
            news_context = "No recent specific news found."
    except Exception as e:
        print(f"DuckDuckGo Search error: {e}")
        news_context = "Could not retrieve live news."

    # 3.5 Historical Trend Detection
    history_context = "No recent historical trend data available."
    try:
        cursor = db.market_history.find({"symbol": symbol}).sort("time", -1).limit(10)
        recent_history = await cursor.to_list(length=10)
        if recent_history:
            history_context = "Recent Price Snapshots (Hourly):\n"
            for h in reversed(recent_history):
                h_time = h.get('time', '').split('T')[-1].split('.')[0] if 'T' in h.get('time', '') else str(h.get('time'))
                history_context += f"- At {h_time}: PKR {h.get('price', 0.0):.2f}\n" # Renamed from current_price
            
            first_p = recent_history[-1].get('price', 0.0) # oldest in set
            last_p = recent_history[0].get('price', 0.0)   # newest
            trend_pct = ((last_p - first_p) / first_p * 100) if first_p else 0
            history_context += f"\nApproximate 10-hour trend: {trend_pct:+.2f}%"
    except Exception as e:
        print(f"History context error: {e}")
        
    # 4. Antigravity Prompt Construction
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    system_prompt = f"""You are an elite Financial Analyst and seasoned Stock Broker for the Pakistan Stock Exchange (PSX).
You have decades of experience navigating the KSE-100 and a reputation for being savvy and street-smart.

**GLOBAL MARKET CONTEXT:**
{market_snapshot}

**CURRENT PORTFOLIO STATE (AS OF {now_str} UTC):**
{user_context}
(Note: Only rely on this "CURRENT PORTFOLIO STATE". If history contradicts this, ignore history as it is stale information.)

**MARKET DATA FOR {symbol}:**
- Live Price: PKR {live_price}
- Historical Trend (Last 10 Hours):
{history_context}

- Live News & Sentiment:
{news_context}

**Instructions:**
Respond directly to the user in a conversational, professional tone.
Incorporate the following elements naturally into your text:
1. A clear **Verdict** (BUY, HOLD, or SELL) — make it bold.
2. A **Risk Score** from 1-10.
3. Market trend and running projects based on the news.
4. Reference links at the bottom (only real URLs from the news context).

Format your response using **bolding**, bullet points, and clean paragraphs. Do NOT return JSON."""

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
        
    user_msg = question if question else f"Give me your full analysis on {symbol}."
    messages.append({"role": "user", "content": user_msg})

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        return {"response_text": response.choices[0].message.content}
        
    except Exception as e:
        print(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI analysis.")

# --- Dividend Services ---

async def get_user_dividends(clerk_id: str) -> List[Dividend]:
    cursor = db.dividends.find({"clerk_id": clerk_id}).sort("date_received", -1)
    docs = await cursor.to_list(length=1000)
    return [Dividend(**d) for d in docs]

async def add_user_dividend(clerk_id: str, symbol: str, net_dividend: float, date_received: Optional[datetime] = None) -> Dividend:
    if not date_received:
        date_received = datetime.utcnow()
    dividend_id = str(uuid4())
    dividend = Dividend(
        dividend_id=dividend_id,
        clerk_id=clerk_id,
        symbol=symbol.upper(),
        date_received=date_received,
        net_dividend=net_dividend
    )
    await db.dividends.insert_one(dividend.model_dump())
    return dividend

async def delete_user_dividend(clerk_id: str, dividend_id: str) -> None:
    res = await db.dividends.delete_one({"dividend_id": dividend_id, "clerk_id": clerk_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dividend record not found.")

# --- Account Settings & Cash Reconciliation Services ---

async def get_account_settings(clerk_id: str) -> AccountSettings:
    settings = await db.account_settings.find_one({"clerk_id": clerk_id})
    if not settings:
        return AccountSettings(clerk_id=clerk_id, total_cash_deposited=0.0, current_cash_balance=0.0)
    return AccountSettings(**settings)

async def update_account_settings(clerk_id: str, total_cash_deposited: float, current_cash_balance: float) -> AccountSettings:
    now = datetime.utcnow()
    res = await db.account_settings.find_one_and_update(
        {"clerk_id": clerk_id},
        {
            "$set": {
                "total_cash_deposited": total_cash_deposited,
                "current_cash_balance": current_cash_balance,
                "last_updated": now
            }
        },
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return AccountSettings(**res)

async def get_cash_reconciliation(clerk_id: str) -> CashReconciliationResponse:
    settings = await get_account_settings(clerk_id)
    
    # 1. Sum net_settled across all transactions
    txn_cursor = db.transactions.find({"clerk_id": clerk_id})
    txns = await txn_cursor.to_list(length=10000)
    total_net_settled = 0.0
    for t in txns:
        if "net_settled" in t and t["net_settled"] != 0.0:
            total_net_settled += t["net_settled"]
        else:
            g_amt = t.get("gross_amount") or (t.get("shares", 0) * t.get("price", 0.0))
            b_fee = t.get("brokerage_fee", 0.0)
            cgt = t.get("cgt_paid", 0.0)
            act = t.get("action", "Buy")
            n_set = -(g_amt + b_fee) if act == "Buy" else (g_amt - b_fee - cgt)
            total_net_settled += n_set

    # 2. Sum net_dividend across all dividends
    div_cursor = db.dividends.find({"clerk_id": clerk_id})
    divs = await div_cursor.to_list(length=2000)
    total_dividends = sum(d.get("net_dividend", 0.0) for d in divs)

    # 3. Formula: Calculated Cash Balance = Total Cash Deposited + SUM(net_settled) + SUM(net_dividend)
    calculated_cash_balance = settings.total_cash_deposited + total_net_settled + total_dividends
    discrepancy = settings.current_cash_balance - calculated_cash_balance
    is_reconciled = abs(discrepancy) < 0.05

    return CashReconciliationResponse(
        total_cash_deposited=settings.total_cash_deposited,
        current_cash_balance=settings.current_cash_balance,
        total_net_settled=total_net_settled,
        total_dividends=total_dividends,
        calculated_cash_balance=calculated_cash_balance,
        discrepancy=discrepancy,
        is_reconciled=is_reconciled
    )

# --- User Settings Services ---

async def get_user_settings(clerk_id: str) -> UserSettings:
    doc = await db.user_settings.find_one({"clerk_id": clerk_id})
    if not doc:
        return UserSettings(clerk_id=clerk_id)
    return UserSettings(**doc)

async def update_user_settings(
    clerk_id: str,
    broker_name: str,
    fee_type: str,
    fee_value: float,
    sales_tax_rate: float
) -> UserSettings:
    now = datetime.utcnow()
    res = await db.user_settings.find_one_and_update(
        {"clerk_id": clerk_id},
        {
            "$set": {
                "broker_name": broker_name,
                "fee_type": fee_type,
                "fee_value": fee_value,
                "sales_tax_rate": sales_tax_rate,
                "last_updated": now
            }
        },
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return UserSettings(**res)
