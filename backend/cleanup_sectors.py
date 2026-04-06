import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

async def cleanup_history():
    print(f"Connecting to MongoDB at {MONGODB_URI}...")
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env")
        return

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    print("Fetching active valid symbols from market_watch...")
    active_stocks = await db.market_watch.find({}, {"symbol": 1}).to_list(length=1000)
    
    # We must also keep index symbols!
    active_indices = await db.market_indices.find({}, {"symbol": 1}).to_list(length=10)
    
    valid_symbols = [s['symbol'] for s in active_stocks] + [i['symbol'] for i in active_indices]
    print(f"Total valid active symbols: {len(valid_symbols)}")

    print("Deleting orphaned historical data...")
    result = await db.market_history.delete_many({"symbol": {"$nin": valid_symbols}})
    print(f"=> SUCCESS: Deleted {result.deleted_count} orphaned history records.")

    client.close()
    print("--- [ CLEANUP COMPLETE ] ---")

if __name__ == "__main__":
    asyncio.run(cleanup_history())
