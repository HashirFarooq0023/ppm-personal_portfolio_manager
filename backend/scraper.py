import asyncio
import httpx
import traceback
import re
from datetime import datetime
from bs4 import BeautifulSoup
from service import upsert_market_indices, upsert_market_watch, db
from models import MarketIndex, MarketWatch

# The official PSX Market Summary URL
PSX_SUMMARY_URL = "https://www.psx.com.pk/market-summary/"

def extract_number(text: str) -> float:
    """Safely extracts a clean float from strings containing arrows, commas, or dashes."""
    if not text:
        return 0.0
    # Remove commas first (e.g., "1,532.71" -> "1532.71")
    text = text.replace(',', '')
    # Regex to find an optional minus sign, followed by digits, and an optional decimal
    match = re.search(r'-?\d+\.?\d*', text)
    return float(match.group(0)) if match else 0.0

async def fetch_psx_data():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }
    
    print("[BACKEND] Scraper: Attempting to connect to PSX website...") 
    
    # 1. Lowered timeout to 10 seconds to prevent infinite hanging
    # 2. Added follow_redirects=True in case PSX is routing us through Cloudflare
    async with httpx.AsyncClient(timeout=10.0, headers=headers, follow_redirects=True) as client:
        try:
            resp = await client.get(PSX_SUMMARY_URL)
            print(f"[BACKEND] Scraper: PSX Responded with status {resp.status_code}") 
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, "html.parser")
            stocks = []
            sectors_found = set()
            current_sector = "Miscellaneous"
            
            # Find all tables to ensure we hit the right one
            tables = soup.find_all("table")
            
            for table in tables:
                rows = table.find_all("tr")
                for row in rows:
                    cols = row.find_all(["td", "th"])
                    if not cols:
                        continue
                    
                    first_cell = cols[0].text.strip()
                    
                    # 2. Sector Header Detection
                    # Detect if row is a sector (usually spans columns OR the 2nd column is empty)
                    is_sector = False
                    if len(cols) == 1 or (cols[0].has_attr('colspan') and int(cols[0]['colspan']) > 1):
                        is_sector = True
                    elif len(cols) >= 8 and not cols[1].text.strip():
                        is_sector = True
                        
                    if is_sector:
                        if first_cell and first_cell.upper() not in ["SCRIP", "SYMBOL"]:
                            current_sector = first_cell
                            sectors_found.add(current_sector)
                        continue
                    
                    # 3. Stock Row Detection & Parsing
                    if len(cols) >= 8:
                        scrip = first_cell
                        if not scrip or scrip.upper() in ["SCRIP", "SYMBOL"]:
                            continue
                            
                        try:
                            # Using Regex to bypass any hidden characters or arrows
                            ldcp = extract_number(cols[1].text)
                            high = extract_number(cols[3].text)
                            low = extract_number(cols[4].text)
                            current = extract_number(cols[5].text)
                            volume = extract_number(cols[7].text)

                            # Mathematically calculate change to bypass the "↑ 7.93" bug
                            change = current - ldcp
                            change_percent = (change / ldcp * 100) if ldcp > 0 else 0.0

                            stocks.append(MarketWatch(
                                symbol=scrip,
                                current_price=current,
                                change_percent=change_percent,
                                volume=volume,
                                high=high,
                                low=low,
                                sector=current_sector,
                                last_updated=datetime.utcnow()
                            ))
                        except Exception:
                            # Skip severely broken rows without crashing the whole loop
                            continue
            
            # 4. Save to Database
            if stocks:
                await upsert_market_watch(stocks)
                print(f"=> INFO: Successfully fetched and updated {len(stocks)} stocks across {len(sectors_found)} sectors from PSX")
            else:
                print("=> Scraper Warning: No stocks were parsed. (If this happens, PSX might be blocking the scrape)")

            # --- Mock Indices Logic ---
            indices = [
                MarketIndex(symbol="KSE100", value=151041.64, change=450.2, change_percent=0.3),
                MarketIndex(symbol="KSE30", value=45230.15, change=120.5, change_percent=0.27)
            ]
            await upsert_market_indices(indices)
            
            for idx in indices:
                await db.market_history.insert_one({
                    "symbol": idx.symbol,
                    "value": idx.value,
                    "time": datetime.utcnow()
                })
            
        except Exception as e:
            print(f"=> Scraper CRITICAL Error:\n{traceback.format_exc()}")

async def run_psx_scraper():
    print("PSX Scraper Background Task Started (5-minute loop)")
    while True:
        await fetch_psx_data()
        await asyncio.sleep(300)