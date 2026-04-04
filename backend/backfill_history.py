import os
import yfinance as yf
from pymongo import MongoClient, InsertOne
from dotenv import load_dotenv
from datetime import timezone

# Load API keys from .env
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ppm")

def backfill_history():
    print(f"Connecting to MongoDB: {DB_NAME}...")
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    
    # [ NEW ] Wipe existing history to clear out high-frequency "junk" snapshots
    print("WARNING: Wiping 'market_history' collection for a clean backfill...")
    db.market_history.delete_many({})
    print("=> Collection wiped successfully.")
    
    # 1. Fetch distinct symbols from market_watch
    symbols = list(db.market_watch.distinct("symbol"))
    print(f"Found {len(symbols)} symbols. Preparing backfill...")
    
    # [ INDEX FIX ] Since Yahoo Finance lacks reliable KSE100/KSE30 tickers, 
    # we use LUCK.KA as a representative trend proxy to generate index history.
    print("=> Preparing proxy-based backfill for Indices (KSE100, KSE30)...")
    proxy_ticker = "LUCK.KA"
    
    # Try fetching current from market_indices (where the scraper saves them)
    k100_rec = db.market_indices.find_one({"symbol": "KSE100"})
    k30_rec = db.market_indices.find_one({"symbol": "KSE30"})
    
    # Fallback to scraper base values if for some reason the DB is empty
    val_k100 = float(k100_rec['value']) if k100_rec else 151041.64
    val_k30 = float(k30_rec['value']) if k30_rec else 45230.15
    
    all_ops = []
    
    # 2. Generate Index History
    try:
        proxy = yf.Ticker(proxy_ticker)
        phist = proxy.history(period="1y")
        if not phist.empty:
            last_proxy_val = float(phist['Close'].iloc[-1])
            k100_scale = val_k100 / last_proxy_val
            k30_scale = val_k30 / last_proxy_val
            
            print(f"  => Generating Index history using {proxy_ticker} as trend proxy...")
            for ts, row in phist.iterrows():
                dt = ts.to_pydatetime()
                if dt.tzinfo: dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                
                # KSE100
                all_ops.append(InsertOne({
                    "symbol": "KSE100",
                    "value": round(float(row['Close']) * k100_scale, 2),
                    "time": dt
                }))
                # KSE30
                all_ops.append(InsertOne({
                    "symbol": "KSE30",
                    "value": round(float(row['Close']) * k30_scale, 2),
                    "time": dt
                }))
            
            # [ FIX ] Write indices immediately
            if all_ops:
                print(f"  => Bulk writing {len(all_ops)} Index records...")
                db.market_history.bulk_write(all_ops, ordered=False)
                all_ops = []
                
    except Exception as e:
        print(f"  => ERROR generating Index proxy history: {e}")

    # 3. Iterate and fetch Stocks from yfinance
    for i, symbol in enumerate(symbols):
        # Skip indices in the loop as we just handled them via proxy
        if symbol in ["KSE100", "KSE30"]:
            continue
            
        ticker_sym = f"{symbol}.KA"
        print(f"[{i+1}/{len(symbols)}] Fetching 1y data for {ticker_sym}...")
        
        try:
            ticker = yf.Ticker(ticker_sym)
            hist = ticker.history(period="1y")
            
            if hist.empty:
                print(f"  => No data found for {ticker_sym}")
                continue
                
            # Transform to schema: { symbol, value, time }
            for ts, row in hist.iterrows():
                # Extract datetime and convert to naive UTC for MongoDB
                dt = ts.to_pydatetime()
                if dt.tzinfo:
                    dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                
                all_ops.append(InsertOne({
                    "symbol": symbol,
                    "value": float(row['Close']),
                    "time": dt
                }))
                
            # Batch writing to prevent memory overload
            if len(all_ops) > 5000:
                print(f"  => Bulk writing {len(all_ops)} records...")
                db.market_history.bulk_write(all_ops, ordered=False)
                all_ops = []
                
        except Exception as e:
            print(f"  => ERROR fetching {ticker_sym}: {e}")
            
    # Final bulk write for the remainder
    if all_ops:
        print(f"  => Final bulk write of {len(all_ops)} records...")
        db.market_history.bulk_write(all_ops, ordered=False)
        
    print("Backfill complete! You can now start your FastAPI server.")

if __name__ == "__main__":
    backfill_history()
