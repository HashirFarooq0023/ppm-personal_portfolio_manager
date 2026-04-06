import asyncio
import httpx
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import InsertOne
import os
import re
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

def is_valid_symbol(symbol: str) -> bool:
    """Basic validation: All caps, numbers, dots, dashes. No spaces."""
    pattern = re.compile(r'^[A-Z0-9.\-]+$')
    return bool(pattern.match(symbol)) and " " not in symbol and "(" not in symbol

async def get_top_20x20_symbols(db):
    """
    Identifies the top 20 sectors by total volume, 
    and within those, the top 20 stocks by volume.
    """
    print("[BACKEND] Identifying Top 20 Sectors and Top 20 Stocks per sector...")
    
    # Identify top sectors
    pipeline = [
        {
            "$group": {
                "_id": "$sector",
                "total_volume": {"$sum": "$volume"},
                "stocks": {"$push": {"symbol": "$symbol", "volume": "$volume"}}
            }
        },
        {"$sort": {"total_volume": -1}},
        {"$limit": 20}
    ]
    
    top_sectors = await db.market_watch.aggregate(pipeline).to_list(length=20)
    
    target_symbols = set(["KSE100", "KSE30"])
    
    for sector in top_sectors:
        # Sort stocks in this sector by volume
        stocks = sector["stocks"]
        stocks.sort(key=lambda x: x["volume"], reverse=True)
        # Take top 20 valid symbols
        valid_count = 0
        for s in stocks:
            sym = s["symbol"]
            if is_valid_symbol(sym):
                target_symbols.add(sym)
                valid_count += 1
                if valid_count >= 20:
                    break
            
    print(f"=> Found {len(target_symbols)} high-activity symbols to backfill.")
    return list(target_symbols)

async def fetch_psx_history(symbol, client):
    """Fetches EOD history from PSX official API."""
    url = f"https://dps.psx.com.pk/timeseries/eod/{symbol}"
    try:
        resp = await client.get(url, timeout=15.0)
        if resp.status_code == 404:
            print(f"   [!] 404 Not Found for {symbol}")
            return []
        resp.raise_for_status()
        data = resp.json()
        
        if not data or "data" not in data:
            return []
            
        history_points = []
        # PSX EOD Data Format: [unix_timestamp, open, high, low, close, volume]
        for point in data["data"]:
            if len(point) < 6:
                continue
            
            ts = point[0]
            close_price = float(point[4])
            
            # Convert unix timestamp to naive UTC datetime
            dt = datetime.utcfromtimestamp(ts)
            
            history_points.append({
                "symbol": symbol,
                "value": close_price,
                "time": dt
            })
        return history_points
    except Exception as e:
        print(f"   [!] Error fetching {symbol}: {e}")
        return []

async def main():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    symbols = await get_top_20x20_symbols(db)
    
    # 1. Wipe old history
    print("[BACKEND] Wiping existing market_history collection...")
    await db.market_history.delete_many({})
    
    # 2. Fetch and Parse
    async with httpx.AsyncClient() as http_client:
        all_ops = []
        count = 0
        total = len(symbols)
        
        for symbol in symbols:
            count += 1
            print(f"[{count}/{total}] Fetching {symbol}...")
            
            points = await fetch_psx_history(symbol, http_client)
            if points:
                for p in points:
                    all_ops.append(InsertOne(p))
                print(f"   -> Parsed {len(points)} historical points.")
            else:
                print(f"   -> No data found for {symbol}.")
                
            # Anti-Ban Protection
            await asyncio.sleep(1.5)
            
        # 3. Bulk Write
        if all_ops:
            print(f"[BACKEND] Executing Bulk Write of {len(all_ops)} points...")
            # Use chunks for stability
            chunk_size = 50000
            for i in range(0, len(all_ops), chunk_size):
                chunk = all_ops[i:i + chunk_size]
                await db.market_history.bulk_write(chunk, ordered=False)
            print("=> SUCCESS: History backfilled successfully.")
        else:
            print("=> ERROR: No data points collected to write.")

if __name__ == "__main__":
    asyncio.run(main())
