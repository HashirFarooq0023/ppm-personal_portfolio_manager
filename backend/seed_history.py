import asyncio
import os
import random
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env from the same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

# Symbols and their approximate current prices
SYMBOLS = {
    "KSE100": 151041.64,
    "KSE30": 45230.15,
    "MEBL": 426.19,
    "HUBC": 192.49,
    "ENGRO": 482.0,
    "SYS": 450.0,
    "LUCK": 720.0
}

async def seed_historical_data():
    print(f"Connecting to MongoDB at {MONGODB_URI}...")
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env")
        return

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    # Clear existing history to avoid overlap during seeding
    print("Clearing existing market_history...")
    await db.market_history.delete_many({"symbol": {"$in": list(SYMBOLS.keys())}})

    now = datetime.now(timezone.utc)
    history_points = []

    print("Generating 48 hours of historical data (30-min intervals)...")
    
    for symbol, base_price in SYMBOLS.items():
        current_price = base_price
        # Start 48 hours ago
        start_time = now - timedelta(hours=48)
        
        # Generate points every 30 minutes
        for i in range(96): # 48 * 2
            timestamp = start_time + timedelta(minutes=30 * i)
            
            # Simple random walk: +/- 0.5% max change per interval
            volatility = 0.005 # 0.5%
            change_pct = random.uniform(-volatility, volatility)
            current_price = current_price * (1 + change_pct)
            
            # Round for cleanliness
            current_price = round(current_price, 2)
            
            history_points.append({
                "symbol": symbol,
                "value": current_price,
                "time": timestamp
            })

    if history_points:
        print(f"Inserting {len(history_points)} points into market_history...")
        await db.market_history.insert_many(history_points)
        print("=> SUCCESS: Historical data seeded.")
    else:
        print("=> WARNING: No data generated.")

    client.close()
    print("--- [ HISTORICAL DATA SEEDING COMPLETE ] ---")

if __name__ == "__main__":
    asyncio.run(seed_historical_data())
