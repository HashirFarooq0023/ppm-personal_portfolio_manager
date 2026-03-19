from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv
from models import (
    PortfolioItem, PortfolioResponseItem, PortfolioSummary, 
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
    cursor = db.portfolio.find({"clerk_id": clerk_id, "is_deleted": {"$in": [False, None]}})
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

async def add_or_update_holding(clerk_id: str, symbol: str, action: str, shares: int, price: float, reset_history: bool = False):
    existing = await db.portfolio.find_one({"clerk_id": clerk_id, "symbol": symbol})
    
    new_txn = Transaction(
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
        
    # 4. Antigravity Prompt Construction
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    system_prompt = f"""You are an elite Financial Analyst and seasoned Stock Broker for the Pakistan Stock Exchange (PSX).
You have decades of experience navigating the KSE-100 and a reputation for being savvy and street-smart.

**CURRENT PORTFOLIO STATE (AS OF {now_str} UTC):**
{user_context}
(Note: Only rely on this "CURRENT PORTFOLIO STATE". If history contradicts this, ignore history as it is stale information.)

**MARKET DATA FOR {symbol}:**
- Live Price: PKR {live_price}
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
