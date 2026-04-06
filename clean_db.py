import asyncio
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

async def analyze_and_clean():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    print("--- Analyzing Symbols in market_watch ---")
    all_symbols = await db.market_watch.distinct("symbol")
    print(f"Total distinct symbols in DB: {len(all_symbols)}")
    
    invalid_symbols = []
    valid_pattern = re.compile(r'^[A-Z0-9.\-]+$') # PSX symbols are usually CAPS and numbers, maybe dots
    
    for sym in all_symbols:
        if not valid_pattern.match(sym) or " " in sym or "(" in sym:
            invalid_symbols.append(sym)
            
    print(f"Found {len(invalid_symbols)} potentially invalid symbols.")
    if invalid_symbols:
        print(f"Examples: {invalid_symbols[:10]}")
        
        # Clean them up
        print("Cleaning up invalid records from market_watch...")
        result = await db.market_watch.delete_many({"symbol": {"$in": invalid_symbols}})
        print(f"Deleted {result.deleted_count} invalid records.")
        
        # Also clean them from market_history if they exist
        result_hist = await db.market_history.delete_many({"symbol": {"$in": invalid_symbols}})
        print(f"Deleted {result_hist.deleted_count} invalid records from history.")
    else:
        print("All symbols look valid.")

if __name__ == "__main__":
    asyncio.run(analyze_and_clean())
