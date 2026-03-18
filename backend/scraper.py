import asyncio
import httpx
from datetime import datetime
from .service import upsert_market_indices, upsert_market_watch, db
from .models import MarketIndex, MarketWatch

PSX_INDICES_URL = "https://dps.psx.com.pk/indices" # Mocking for now, will use timeseries for real values
PSX_STOCK_URL = "https://dps.psx.com.pk/timeseries/int/"

async def fetch_psx_data():
    async with httpx.AsyncClient() as client:
        try:
            indices = [
                MarketIndex(symbol="KSE100", value=151041.64, change=450.2, change_percent=0.3),
                MarketIndex(symbol="KSE30", value=45230.15, change=120.5, change_percent=0.27)
            ]
            await upsert_market_indices(indices)
            
            # 1.1 Store index history for charts
            for idx in indices:
                await db.market_history.insert_one({
                    "symbol": idx.symbol,
                    "value": idx.value,
                    "time": datetime.utcnow()
                })

            # 2. Fetch Top Stocks (Top 10 per sector where possible)
            symbol_map = {
                # Commercial Banks
                "MEBL": "Commercial Banks", "MCB": "Commercial Banks", "HBL": "Commercial Banks", 
                "UBL": "Commercial Banks", "BAHL": "Commercial Banks", "NBP": "Commercial Banks",
                "FABL": "Commercial Banks", "BOP": "Commercial Banks",
                
                # Technology
                "SYS": "Technology", "TRG": "Technology", "AVN": "Technology", "NETSOL": "Technology",
                
                # Fertilizer
                "FFC": "Fertilizer", "EFERT": "Fertilizer", "FATIMA": "Fertilizer", "DAWH": "Fertilizer",
                
                # Oil & Gas / Energy
                "OGDC": "Oil & Gas", "PPL": "Oil & Gas", "MARI": "Oil & Gas", "POL": "Oil & Gas",
                "PSO": "Oil & Gas", "SNGP": "Oil & Gas", "SSGC": "Oil & Gas",
                
                # Cement
                "LUCK": "Cement", "FCCL": "Cement", "CHCC": "Cement", "DGKC": "Cement", "PIOC": "Cement",
                
                # Power
                "HUBC": "Power", "KEL": "Power",
                
                # Chemicals
                "ENGRO": "Chemicals", "EPCL": "Chemicals", "ICI": "Chemicals", "LOTCHEM": "Chemicals", "DOL": "Chemicals"
            }
            stocks = []
            for sym, sector in symbol_map.items():
                resp = await client.get(f"{PSX_STOCK_URL}{sym}")
                if resp.status_code == 200:
                    data = resp.json()
                    intraday_data = data.get("data")
                    if intraday_data and len(intraday_data) > 0:
                        hist = intraday_data
                        if len(hist) >= 2:
                            last_tick = hist[-1] # [timestamp, price, volume]
                            prev_tick = hist[-2]
                            price = last_tick[1]
                            change_pct = ((price - prev_tick[1]) / prev_tick[1] * 100) if prev_tick[1] > 0 else 0.0
                            
                            # Session metrics from intraday ticks
                            high = max(tick[1] for tick in hist)
                            low = min(tick[1] for tick in hist)
                            volume = last_tick[2]
                        else:
                            price = hist[-1][1]
                            change_pct = 0.0
                            high = price
                            low = price
                            volume = hist[-1][2]

                        stocks.append(MarketWatch(
                            symbol=sym,
                            current_price=price,
                            change_percent=change_pct,
                            volume=volume,
                            high=high,
                            low=low,
                            sector=sector,
                            last_updated=datetime.utcnow()
                        ))
            
            if stocks:
                await upsert_market_watch(stocks)
            
            print(f"Scraper: Successfully updated {len(stocks)} stocks and {len(indices)} indices.")
            
        except Exception as e:
            print(f"Scraper Error: {e}")

async def run_psx_scraper():
    print("PSX Scraper Background Task Started (10s Interval)")
    while True:
        await fetch_psx_data()
        await asyncio.sleep(10) # 10 SECOND DELAY as requested
