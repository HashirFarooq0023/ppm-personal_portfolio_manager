import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

async def check():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    print("--- Market Watch Sample ---")
    sample = await db.market_watch.find_one()
    print(sample)
    
    print("\n--- Market Indices Sample ---")
    idx_sample = await db.market_indices.find_one()
    print(idx_sample)

if __name__ == "__main__":
    asyncio.run(check())
