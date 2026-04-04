from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne, IndexModel, ASCENDING, DESCENDING
import os
from datetime import datetime
from typing import List, Optional
from uuid import uuid4
from dotenv import load_dotenv
from models import (
    PortfolioItem, PortfolioResponseItem, PortfolioSummary, PortfolioHistoryPoint,
    MarketIndex, MarketWatch, User, Transaction, SectorPerformance,
    AIAnalysisRequest, AIAnalysisResponse
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
    serverSelectionTimeoutMS=5000
)
db = client[DB_NAME]

async def ensure_indexes():
    """Defines and creates indexes to prevent full scans on Atlas Free Tier."""
    print("[BACKEND] Checking Database Indexes...")
    try:
        # 1. Market History: Critical for charts. Compound index for (symbol, time)
        history_indexes = [
            IndexModel([("symbol", ASCENDING), ("time", DESCENDING)], name="history_symbol_time_idx")
        ]
        await db.market_history.create_indexes(history_indexes)
        
        # 2. Market Watch: Critical for landing page and sector performance
        watch_indexes = [
            IndexModel([("symbol", ASCENDING)], name="watch_symbol_idx"),
            IndexModel([("sector", ASCENDING)], name="watch_sector_idx")
        ]
        await db.market_watch.create_indexes(watch_indexes)
        
        # 3. Portfolio: Critical for user-specific loading
        portfolio_indexes = [
            IndexModel([("clerk_id", ASCENDING)], name="portfolio_user_idx"),
            IndexModel([("symbol", ASCENDING)], name="portfolio_symbol_idx")
        ]
        await db.portfolio.create_indexes(portfolio_indexes)
        
        print("=> SUCCESS: All database indexes verified/created.")
    except Exception as e:
        print(f"=> ERROR creating indexes: {e}")

# --- Market Services ---

async def get_all_indices() -> List[MarketIndex]:
    cursor = db.market_indices.find()
    indices = await cursor.to_list(length=10)
    return [MarketIndex(**i) for i in indices]

async def get_market_watch() -> List[MarketWatch]:
    # Remove the .limit(100) from the query
    cursor = db.market_watch.find() 
    # Increase the length to 1000 so it captures the whole PSX market
    stocks = await cursor.to_list(length=1000) 
    return [MarketWatch(**s) for s in stocks]

from datetime import datetime, timedelta

async def get_index_history(symbol: str, days: int = 30) -> List[dict]:
    """Fetches historical market data points starting from 'days' ago to now."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # Query: Filter by symbol and time >= cutoff, sort by time ascending (1)
    # We use a 5000 point upper bound to prevent extreme memory usage.
    cursor = db.market_history.find({
        "symbol": symbol.upper(),
        "time": {"$gte": cutoff}
    }).sort("time", 1).limit(5000)
    
    history = await cursor.to_list(length=5000)
    
    # Convert to format suitable for lightweight-charts: {time: number, value: number}
    # We ensure unique timestamps by using a map-keyed approach if necessary, 
    # but the backfill data is already daily-clean.
    return [
        {"time": int(h["time"].timestamp()), "value": h["value"]} 
        for h in history
    ]
async def get_sector_performance() -> list[SectorPerformance]:
    """Aggregates individual stock data into sector performance metrics using MongoDB."""
    
    # 1. Get the total number of stocks so we can calculate the percentage share
    total_stocks = await db.market_watch.count_documents({})
    if total_stocks == 0:
        return []
        
    # 2. Let MongoDB do the math! (Much faster than a Python loop)
    pipeline = [
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
    """Captures a full historical snapshot of indices and all stocks."""
    print("[BACKEND] Recording Market History Snapshot...")
    now = datetime.utcnow()
    
    # 1. Snapshot Indices
    indices = await db.market_indices.find().to_list(length=10)
    for idx in indices:
        await db.market_history.insert_one({
            "symbol": idx["symbol"],
            "value": idx["value"],
            "time": now
        })
        
    # 2. Snapshot All Stocks (to enable individual company charting)
    stocks = await db.market_watch.find().to_list(length=1000)
    history_points = []
    for s in stocks:
        history_points.append({
            "symbol": s["symbol"],
            "value": s["current_price"],
            "time": now
        })
    
    if history_points:
        await db.market_history.insert_many(history_points)
        print(f"=> INFO: Recorded {len(history_points)} stock and {len(indices)} index points to history.")

async def record_all_portfolios_snapshot():
    """Iterates through all users and records their total portfolio metrics."""
    print("[BACKEND] Recording All Portfolio Snapshots...")
    # 1. Get all unique users who have at least one holding
    clerk_ids = await db.portfolio.distinct("clerk_id")
    
    now = datetime.utcnow()
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
    cursor = db.portfolio.find({"clerk_id": clerk_id, "is_deleted": {"$in": [False, None]}})
    items = await cursor.to_list(length=100)
    
    if not items:
        return PortfolioSummary(items=[], total_cost=0, total_value=0, total_profit_loss=0, total_profit_loss_percent=0)

    # 1. Bulk Fetch Market Data
    symbols = [item['symbol'] for item in items]
    market_cursor = db.market_watch.find({"symbol": {"$in": symbols}})
    market_docs = await market_cursor.to_list(length=len(symbols))
    market_map = {doc['symbol']: doc for doc in market_docs}
    
    response_items = []
    total_cost = 0.0
    total_value = 0.0
    
    for item in items:
        # Get live price from our pre-fetched map
        market_data = market_map.get(item['symbol'])
        current_price = market_data['current_price'] if market_data else item['average_buy_price']
        
        cost = item['shares'] * item['average_buy_price']
        value = item['shares'] * current_price
        pl = value - cost
        pl_pct = (pl / cost * 100) if cost > 0 else 0
        
        total_cost += cost
        total_value += value
        
        # Normalize transactions (backfill IDs if missing)
        raw_transactions = item.get("transactions", []) or []
        normalized_transactions = []
        needs_update = False
        
        for t in raw_transactions:
            if not t.get("transaction_id"):
                t["transaction_id"] = str(uuid4())
                needs_update = True
            normalized_transactions.append(t)

        # Batch update if IDs were added (Legacy support)
        if needs_update:
            asyncio.create_task(db.portfolio.update_one(
                {"_id": item["_id"]},
                {"$set": {"transactions": normalized_transactions}}
            ))

        response_items.append(PortfolioResponseItem(
            symbol=item['symbol'],
            shares=item['shares'],
            average_buy_price=item['average_buy_price'],
            current_price=current_price,
            total_cost=cost,
            total_value=value,
            profit_loss=pl,
            profit_loss_percent=pl_pct,
            transactions=[Transaction(**t) for t in normalized_transactions]
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

async def add_or_update_holding(clerk_id: str, symbol: str, action: str, shares: int, price: float, reset_history: bool = False):
    existing = await db.portfolio.find_one({"clerk_id": clerk_id, "symbol": symbol})
    
    txn_id = str(uuid4())
    new_txn = Transaction(
        transaction_id=txn_id,
        action=action,
        shares=shares,
        price=price
    )

    if existing:
        is_binned = existing.get('is_deleted', False)
        
        if is_binned and reset_history:
            # Wipe history and start fresh
            new_shares = shares if action == "Buy" else 0
            new_avg_price = price
            await db.portfolio.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "shares": new_shares, 
                        "average_buy_price": new_avg_price,
                        "is_deleted": False,
                        "deleted_at": None,
                        "transactions": [new_txn.model_dump()]
                    }
                }
            )
        else:
            # Normal update (or restore without reset)
            if action == "Buy":
                new_shares = existing['shares'] + shares
                # Weighted Average Cost Calculation
                new_avg_price = ((existing['shares'] * existing['average_buy_price']) + (shares * price)) / new_shares
            else: # Sell
                new_shares = max(0, existing['shares'] - shares)
                # Average buy price doesn't change on sell (it's the cost of remaining shares)
                new_avg_price = existing['average_buy_price']
            
            update_data = {
                "shares": new_shares, 
                "average_buy_price": new_avg_price,
                "is_deleted": False, # Ensure restored if it was binned
                "deleted_at": None
            }
            
            await db.portfolio.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": update_data,
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
    """
    Deletes a single transaction from the ledger and recomputes holding totals.
    """
    holding = await db.portfolio.find_one(
        {"clerk_id": clerk_id, "transactions.transaction_id": transaction_id}
    )
    if not holding:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    transactions = holding.get("transactions", []) or []
    new_transactions = [t for t in transactions if t.get("transaction_id") != transaction_id]

    if len(new_transactions) == len(transactions):
        raise HTTPException(status_code=404, detail="Transaction not found.")

    new_shares, new_avg_price = _recompute_holding_from_transactions(new_transactions)

    # If this was the last transaction, soft-delete the whole holding (move to bin).
    soft_delete = len(new_transactions) == 0 or new_shares == 0

    await db.portfolio.update_one(
        {"_id": holding["_id"]},
        {
            "$set": {
                "transactions": new_transactions,
                "shares": new_shares,
                "average_buy_price": new_avg_price,
                "is_deleted": soft_delete,
                "deleted_at": datetime.utcnow() if soft_delete else None,
            }
        },
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
        
        # Backfill `transaction_id` for older rows so the UI can delete individual transactions.
        raw_transactions = item.get("transactions", []) or []
        txns_changed = False
        normalized_transactions = []
        for t in raw_transactions:
            if t.get("transaction_id"):
                normalized_transactions.append(t)
                continue
            t["transaction_id"] = str(uuid4())
            txns_changed = True
            normalized_transactions.append(t)

        if txns_changed:
            await db.portfolio.update_one(
                {"_id": item["_id"]},
                {"$set": {"transactions": normalized_transactions}},
            )

        response_items.append(PortfolioResponseItem(
            symbol=item['symbol'],
            shares=item['shares'],
            average_buy_price=item['average_buy_price'],
            current_price=current_price,
            total_cost=cost,
            total_value=value,
            profit_loss=pl,
            profit_loss_percent=pl_pct,
            transactions=[Transaction(**t) for t in normalized_transactions],
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

    # ---- MODE 2: GENERAL CHAT (no symbol selected) ----
    if not symbol:
        # Fetch portfolio so the AI knows what the user owns
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
            portfolio_summary += (
                f"\nTotal Portfolio Value: PKR {portfolio.total_value:,.0f} | "
                f"Total P&L: PKR {portfolio.total_profit_loss:,.0f} ({portfolio.total_profit_loss_percent:.1f}%)"
            )
        else:
            portfolio_summary = "The user has no stocks in their current active portfolio."

        system_prompt = f"""You are an elite Financial Analyst and seasoned Stock Broker for the Pakistan Stock Exchange (PSX).
You have decades of experience navigating the KSE-100. Be direct, confident, and street-smart.

**IMPORTANT PORTFOLIO RULE:**
{portfolio_summary}
The list above is the ONLY source of truth for the user's current holdings. If a stock is NOT on this list, they do NOT own it anymore (it may have been sold or moved to the bin). IGNORE any conflicting information about their holdings from the previous chat history below.

CRITICAL RULE: Match the length and energy of the user's message.
- If they say "hi" or "hello", reply with a short, friendly 1-2 sentence greeting. Do NOT dump a market report.
- If they ask a simple question, give a concise answer (3-5 sentences max).
- Only give detailed analysis with bullet points when they explicitly ask for it.
- ALWAYS pivot general knowledge questions (e.g., "What is Islamabad?") back to the PSX. Briefly answer the question, then immediately highlight top PSX companies or sectors related to that topic where they can invest in shares.

{portfolio_summary}

Respond conversationally and accurately. You have full access to the user's portfolio data above — use it when they ask about their holdings. Format using **bold text** and bullet points only when the depth of the question warrants it. Do NOT return JSON."""

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

    # 3.5 Historical Trend Detection (NEW: AI Data Drive)
    history_context = "No recent historical trend data available."
    try:
        cursor = db.market_history.find({"symbol": symbol}).sort("time", -1).limit(10)
        recent_history = await cursor.to_list(length=10)
        if recent_history:
            history_context = "Recent Price Snapshots (Hourly):\n"
            for h in reversed(recent_history):
                h_time = h.get('time', '').split('T')[-1].split('.')[0] if 'T' in h.get('time', '') else str(h.get('time'))
                history_context += f"- At {h_time}: PKR {h.get('current_price', 0.0):.2f}\n"
            
            first_p = recent_history[-1].get('current_price', 0.0) # oldest in set
            last_p = recent_history[0].get('current_price', 0.0)   # newest
            trend_pct = ((last_p - first_p) / first_p * 100) if first_p else 0
            history_context += f"\nApproximate 10-hour trend: {trend_pct:+.2f}%"
    except Exception as e:
        print(f"History context error: {e}")
        
    # 4. Antigravity Prompt Construction
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    system_prompt = f"""You are an elite Financial Analyst and seasoned Stock Broker for the Pakistan Stock Exchange (PSX).
You have decades of experience navigating the KSE-100 and a reputation for being savvy and street-smart.

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
