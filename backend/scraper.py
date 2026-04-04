import asyncio
import httpx
import traceback
import re
import random
from datetime import datetime
from bs4 import BeautifulSoup
from service import upsert_market_indices, upsert_market_watch, db
from models import MarketIndex, MarketWatch

# The PSX Data Portal (DPS) Market Watch URL - much more reliable for real-time tickers
PSX_DATA_PORTAL_URL = "https://dps.psx.com.pk/market-watch"

def extract_number(text: str) -> float:
    """Safely extracts a clean float from strings containing arrows, commas, or dashes."""
    if not text:
        return 0.0
    # Remove commas and percentage signs
    text = text.replace(',', '').replace('%', '')
    # Regex to find an optional minus sign, followed by digits, and an optional decimal
    match = re.search(r'-?\d+\.?\d*', text)
    return float(match.group(0)) if match else 0.0

# PSX Data Portal often serves numerical IDs instead of text for sectors.
# This map translates those internal IDs to human-readable names.
PSX_SECTOR_MAP = {
    "0801": "AUTOMOBILE ASSEMBLER",
    "0802": "AUTOMOBILE PARTS & ACCESSORIES",
    "0803": "ENGINEERING",
    "0804": "CEMENT",
    "0805": "CHEMICAL",
    "0806": "MODARABAS",
    "0807": "COMMERCIAL BANKS",
    "0808": "FERTILIZER",
    "0809": "LEASING COMPANIES",
    "0810": "FOOD & PERSONAL CARE PRODUCTS",
    "0811": "INVESTMENT BANKS / INV. COS. / SECURITIES COS.",
    "0812": "INSURANCE",
    "0813": "INV. BANKS / INV. COS. / SECURITIES COS.",
    "0815": "OIL & GAS EXPLORATION COMPANIES",
    "0816": "OIL & GAS MARKETING COMPANIES",
    "0817": "PAPER & BOARD",
    "0818": "PHARMACEUTICALS",
    "0819": "POWER GENERATION & DISTRIBUTION",
    "0820": "OIL & GAS EXPLORATION COMPANIES",
    "0822": "SUGAR & ALLIED INDUSTRIES",
    "0823": "TECHNOLOGY & COMMUNICATION",
    "0824": "POWER GENERATION & DISTRIBUTION",
    "0825": "REFINERY",
    "0826": "TEXTILE SPINNING",
    "0827": "TRANSPORT",
    "0828": "TECHNOLOGY & COMMUNICATION",
    "0829": "TEXTILE COMPOSITE",
    "0830": "TEXTILE SPINNING",
    "0837": "EXCHANGE TRADED FUNDS",
    "0838": "REAL ESTATE DEVELOPMENT & RESIDENTIAL",
}

async def fetch_psx_data():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    }
    
    print("[BACKEND] Scraper: Connecting to PSX Data Portal...") 
    
    async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
        try:
            resp = await client.get(PSX_DATA_PORTAL_URL)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, "html.parser")
            stocks = []
            
            # The Data Portal uses a single large table (DataTable)
            table = soup.find("table")
            if not table:
                raise ValueError("No table found on PSX Data Portal.")

            # --- Column Header Verification ---
            # We verify the first few headers to ensure PSX hasn't changed the layout.
            thead = table.find("thead")
            if thead:
                headers_text = [th.get_text(strip=True).upper() for th in thead.find_all("th")]
                # Expected: SYMBOL at 0, SECTOR at 1, LDCP at 3, CURRENT at 7
                if len(headers_text) < 8 or "SYMBOL" not in headers_text[0] or "CURRENT" not in headers_text[7]:
                    print(f"[SCRAPER] WARNING: Detected possible layout change! Headers: {headers_text[:8]}")
                    # We still try to proceed, but this log helps us debug if prices go weird.

            rows = table.find_all("tr")[1:] # Skip header
            for row in rows:
                cols = row.find_all("td")
                if len(cols) < 11:
                    continue
                
                try:
                    # Column Mapping (0-indexed) for PSX Data Portal (11 cols):
                    # 0: Symbol, 1: Sector, 2: Listed In, 3: LDCP, 4: Open, 5: High, 
                    # 6: Low, 7: Current, 8: Change, 9: Change%, 10: Volume
                    scrip = cols[0].get_text(strip=True).upper()
                    if not scrip or "," in scrip: # Skip combined index cells
                        continue
                        
                    sector_raw = cols[1].get_text(strip=True)
                    # Translate numeric sector IDs (e.g. "0830") to names
                    if sector_raw.replace(".", "").isdigit() and len(sector_raw) >= 3:
                        sector = PSX_SECTOR_MAP.get(sector_raw[:4], sector_raw)
                    else:
                        sector = sector_raw if sector_raw else "MISCELLANEOUS"
                        
                    ldcp = extract_number(cols[3].text)
                    high = extract_number(cols[5].text)
                    low = extract_number(cols[6].text)
                    current = extract_number(cols[7].text)
                    volume = extract_number(cols[10].text)

                    # Debug: Log MEBL specifically to verify index alignment
                    if scrip == "MEBL":
                        print(f"[DEBUG-SCRAPER] MEBL Row: LDCP={ldcp}, Open={cols[4].text}, High={high}, Low={low}, Current={current}")
                    
                    if current <= 0 or ldcp <= 0:
                        continue

                    # Mathematically calculate change for fresh reliability
                    change = current - ldcp
                    change_percent = (change / ldcp * 100) if ldcp > 0 else 0.0

                    stocks.append(MarketWatch(
                        symbol=scrip,
                        current_price=current,
                        change_percent=change_percent,
                        volume=volume,
                        high=high,
                        low=low,
                        sector=sector.upper(), # Consistent casing
                        last_updated=datetime.utcnow()
                    ))
                except Exception:
                    continue
            
            # 4. Save to Database
            if stocks:
                await upsert_market_watch(stocks)
                print(f"=> INFO: Successfully fetched and updated {len(stocks)} stocks from PSX Data Portal")
            else:
                print("=> Scraper Warning: No stocks were parsed accurately.")

            # --- Dynamic Mock Indices Logic ---
            for sym, base in [("KSE100", 151041.64), ("KSE30", 45230.15)]:
                existing = await db.market_indices.find_one({"symbol": sym})
                current_val = (existing["value"] if existing else base) or base
                
                # Apply +/- 0.02% random movement
                change_pct = random.uniform(-0.0002, 0.0002)
                new_val = round(current_val * (1 + change_pct), 2)
                change = round(new_val - current_val, 2)
                change_percent = round((change / current_val) * 100, 2) if current_val > 0 else 0.0
                
                idx_data = MarketIndex(
                    symbol=sym,
                    value=new_val,
                    change=change,
                    change_percent=change_percent,
                    last_updated=datetime.utcnow()
                )
                await upsert_market_indices([idx_data])
                
                # Record to history
                await db.market_history.insert_one({
                    "symbol": sym,
                    "value": new_val,
                    "time": datetime.utcnow()
                })
            
        except Exception as e:
            print(f"=> Scraper Error: {e}")
            raise e # Reraise for the retry loop

async def run_psx_scraper():
    """Background task with robust error handling and backoff."""
    print("PSX Scraper Background Task Started (5-minute loop)")
    fail_count = 0
    while True:
        try:
            await fetch_psx_data()
            fail_count = 0 # Reset on success
            await asyncio.sleep(300) # 5 minutes
        except Exception as e:
            fail_count += 1
            # Exponential backoff: 30s, 60s, 120s... max 10 mins
            retry_delay = min(30 * (2 ** (fail_count - 1)), 600)
            print(f"[RETRY] Scraper failed ({fail_count}). Retrying in {retry_delay}s...")
            await asyncio.sleep(retry_delay)