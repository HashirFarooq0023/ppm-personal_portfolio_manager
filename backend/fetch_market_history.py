import os
from pymongo import MongoClient
from dotenv import load_dotenv
import pandas as pd

# Load API keys from .env
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

def fetch_market_history():
    print(f"Connecting to MongoDB: {MONGODB_URI}...")
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db.market_history
    
    # Fetch top 10 historical records
    print("Fetching top 10 historical records from market_history...")
    cursor = collection.find().limit(10)
    data = list(cursor)
    
    if data:
        df = pd.DataFrame(data)
        # Drop _id for cleaner output
        if '_id' in df.columns:
            df = df.drop(columns=['_id'])
        print(df.to_string(index=False))
    else:
        print("No historical data found in market_history.")

if __name__ == "__main__":
    fetch_market_history()
