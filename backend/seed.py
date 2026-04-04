import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
from dotenv import load_dotenv

# Load .env from the same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

async def seed_database():
    print(f"Connecting to MongoDB at {MONGODB_URI}...")
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env")
        return

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    # 1. Drop existing collections
    print("Dropping existing collections...")
    await db.market_watch.drop()
    await db.market_indices.drop()
    await db.portfolio.drop()

    # 2. Seed Baseline Symbols into market_watch
    print("Seeding market_watch baseline...")
    baseline_stocks = [
        {"symbol": "MEBL", "current_price": 426.19, "sector": "Banking", "last_updated": datetime.utcnow()},
        {"symbol": "HUBC", "current_price": 192.49, "sector": "Energy", "last_updated": datetime.utcnow()},
        {"symbol": "ENGRO", "current_price": 482.0, "sector": "Fertilizer", "last_updated": datetime.utcnow()},
        {"symbol": "SYS", "current_price": 450.0, "sector": "Technology", "last_updated": datetime.utcnow()},
        {"symbol": "LUCK", "current_price": 720.0, "sector": "Cement", "last_updated": datetime.utcnow()}
    ]
    await db.market_watch.insert_many(baseline_stocks)

    # 3. Seed baseline indices
    print("Checking market_indices baseline...")
    existing_indices = await db.market_indices.count_documents({})
    if existing_indices == 0:
        print("Seeding market_indices baseline...")
        baseline_indices = [
            {"symbol": "KSE100", "value": 151041.64, "change": 450.2, "change_percent": 0.3, "last_updated": datetime.utcnow()},
            {"symbol": "KSE30", "value": 45230.15, "change": 120.5, "change_percent": 0.27, "last_updated": datetime.utcnow()}
        ]
        await db.market_indices.insert_many(baseline_indices)
    else:
        print("=> INFO: market_indices already seeded. Skipping baseline reset.")

    print("--- [ DATABASE SEEDED SUCCESSFULLY ] ---")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
