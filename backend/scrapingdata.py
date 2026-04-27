# PSX Scraper Utility
import asyncio
from playwright.async_api import async_playwright
from collections import defaultdict

async def scrape_companies_by_sector():
    url = "https://dps.psx.com.pk/listings"
    print(f"[*] Attempting to connect to {url} via Playwright...")

    async with async_playwright() as p:
        # Using args to bypass simple bot detection
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        # Setting a standard user agent to avoid bot detection
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 800}
        )
        # Bypassing the 'webdriver' check
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        page = await context.new_page()
        
        try:
            # Using domcontentloaded as it's more reliable for JS-heavy sites
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            print("[+] Page loaded. Waiting for JavaScript to render the table...")
            
            # Wait for the table container to be present
            print("[*] Waiting for table container (#DataTables_Table_0)...")
            try:
                await page.wait_for_selector("#DataTables_Table_0", state="attached", timeout=30000)
                print("[+] Table container found.")
            except:
                print("[-] Table container not found. Checking for iframes...")
                iframes = page.frames
                print(f"[*] Number of iframes: {len(iframes)}")
                for i, frame in enumerate(iframes):
                    print(f"    - Frame {i}: {frame.url}")
            
            # Now wait for the rows
            await page.wait_for_selector("#DataTables_Table_0 tbody tr", state="attached", timeout=30000)
            print("[+] Table rows detected. Waiting for visibility...")
            # Small extra wait to ensure data is populated
            await page.wait_for_timeout(2000)
            print("[+] Table rendered. Parsing data...")
            
            sector_groups = defaultdict(list)
            total_companies = 0
            page_num = 1
            
            while True:
                print(f"    -> Scraping page {page_num}...")
                # Extracting data
                rows = await page.query_selector_all("table tbody tr")
                for row in rows:
                    cols = await row.query_selector_all("td")
                    if len(cols) >= 3:
                        symbol = await cols[0].inner_text()
                        company_name = await cols[1].inner_text()
                        sector = await cols[2].inner_text()
                        
                        symbol = symbol.strip()
                        company_name = company_name.strip()
                        sector = sector.strip()
                        
                        if symbol and company_name and sector:
                            # Avoid duplicates just in case
                            if not any(s == symbol for s, n in sector_groups[sector]):
                                sector_groups[sector].append((symbol, company_name))
                                total_companies += 1

                # Check for the Next button
                next_btn = await page.query_selector(".paginate_button.next:not(.disabled)")
                if next_btn:
                    await next_btn.click()
                    await page.wait_for_timeout(1500)
                    page_num += 1
                else:
                    break
                        
        except Exception as e:
            print(f"[-] Error during scraping: {e}")
            try:
                content = await page.content()
                print(f"[*] Page content length: {len(content)}")
                if len(content) < 5000:
                    print("[!] Warning: Page content seems too small. Might be blocked or failed to load.")
            except:
                pass
            await browser.close()
            return
            
        await browser.close()

    if not sector_groups:
        print("[-] No valid data found in the table.")
        return

    # Sort sectors alphabetically
    sorted_sectors = sorted(sector_groups.keys())

    # Summary
    print("\n[+] Scraping complete!")
    print(f"    Distinct Sectors Found: {len(sorted_sectors)}")
    print(f"    Total Companies Found:  {total_companies}\n")

    # Output formatting
    for idx, sector in enumerate(sorted_sectors, start=1):
        companies = sector_groups[sector]
        print("=============================================")
        print(f"[{idx:02d}] {sector.upper()} ({len(companies)} Companies)")
        for symbol, name in companies:
            print(f"  - {symbol:<6} : {name}")
    print("=============================================")

if __name__ == "__main__":
    asyncio.run(scrape_companies_by_sector())
