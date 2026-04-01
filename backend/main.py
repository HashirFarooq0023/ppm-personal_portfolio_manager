from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
import asyncio
from contextlib import asynccontextmanager
from typing import List
from fastapi.responses import RedirectResponse

from models import (
    PortfolioSummary, PortfolioAddRequest, MarketIndex, MarketWatch, MarketOverview, PortfolioResponseItem,
    AIAnalysisRequest, AIAnalysisResponse
)
from service import (
    get_user_portfolio, add_or_update_holding, delete_holding, 
    get_all_indices, get_market_watch, get_sector_performance,
    get_deleted_holdings, restore_holding, get_index_history,
    generate_stock_analysis, empty_bin_items, delete_transaction,
    record_market_snapshot, record_all_portfolios_snapshot,
    ensure_indexes
)
from scraper import run_psx_scraper

# --- Lifespan Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Verify Database Indexes (Critical for Atlas Free Tier)
    await ensure_indexes()
    
    # 2. Start the background scraper (5-minute loop)
    scraper_task = asyncio.create_task(run_psx_scraper())
    # 3. Start the history snapshot task (1-hour loop)
    history_task = asyncio.create_task(run_history_task())
    yield
    # Cleanup (cancel tasks)
    scraper_task.cancel()
    history_task.cancel()
    try:
        await asyncio.gather(scraper_task, history_task)
    except asyncio.CancelledError:
        print("Background tasks cancelled.")

async def run_history_task():
    """Background worker that records market and portfolio snapshots every hour."""
    print("[BACKEND] History Snapshot Background Task Started (1-hour loop)")
    while True:
        try:
            # 1. Record Market Snapshot (Stock & Index Prices)
            await record_market_snapshot()
            # 2. Record Portfolio Snapshots (User Net Worth)
            await record_all_portfolios_snapshot()
        except Exception as e:
            print(f"[BACKEND] ERROR in history snapshot: {e}")
            
        print("=> History Task: Sleeping for 1 hour...")
        await asyncio.sleep(3600)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PPM Backend", lifespan=lifespan)

# --- CORS Setup ---
# Read origins from env var (comma-separated), with safe local defaults.
# On Render: set CORS_ORIGINS to your Vercel URL(s) in the dashboard.
_raw_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,https://ppm-personal-portfolio-manager.vercel.app"
)
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# --- Clerk Auth Dependency ---
def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    token = auth.credentials
    try:
        # Note: In production, verify against Clerk's PEM public key or JWKS
        # For this implementation, we decode to extract the 'sub' (clerk_id)
        payload = jwt.decode(token, "", options={"verify_signature": False})
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise HTTPException(status_code=401, detail="Invalid token - sub missing")
        return clerk_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Token: {str(e)}")

# --- Endpoints ---
@app.head("/")
def health_check():
    return None

@app.get("/api/ping")
async def ping():
    return {"status": "awake", "message": "Backend is active!"}

@app.get("/")
def redirect_to_dashboard():
    # Redirecting to your Vercel frontend
    return RedirectResponse(url="https://ppm-personal-portfolio-manager.vercel.app/dashboard")


@app.get("/api/portfolio", response_model=PortfolioSummary)
async def get_portfolio(clerk_id: str = Depends(get_current_user)):
    """Protected: Returns user portfolio with live P&L."""
    return await get_user_portfolio(clerk_id)

@app.post("/api/portfolio")
async def add_portfolio(request: PortfolioAddRequest, clerk_id: str = Depends(get_current_user)):
    """Protected: Adds or updates a stock holding."""
    await add_or_update_holding(
        clerk_id=clerk_id,
        symbol=request.symbol,
        action=request.action,
        shares=request.shares,
        price=request.price,
        reset_history=request.reset_history
    )
    return {"status": "success", "message": f"Updated {request.symbol} in portfolio."}

@app.delete("/api/portfolio/{symbol}")
async def remove_holding(symbol: str, clerk_id: str = Depends(get_current_user)):
    """Protected: Soft deletes a holding (moves to bin)."""
    await delete_holding(clerk_id, symbol.upper())
    return {"status": "success", "message": f"Moved {symbol} to bin"}

@app.delete("/api/portfolio/transactions/{transaction_id}")
async def delete_portfolio_transaction(transaction_id: str, clerk_id: str = Depends(get_current_user)):
    """Protected: Deletes a single transaction from the ledger and recomputes totals."""
    await delete_transaction(clerk_id, transaction_id)
    return {"status": "success", "message": "Transaction deleted."}

@app.get("/api/portfolio/bin", response_model=List[PortfolioResponseItem])
async def get_bin(clerk_id: str = Depends(get_current_user)):
    """Protected: Returns deleted holdings with P&L info."""
    return await get_deleted_holdings(clerk_id)

@app.post("/api/portfolio/restore/{symbol}")
async def restore(symbol: str, clerk_id: str = Depends(get_current_user)):
    """Protected: Restores a stock from the bin."""
    await restore_holding(clerk_id, symbol.upper())
    return {"status": "success", "message": f"Restored {symbol} to portfolio"}

@app.delete("/api/portfolio/bin/all")
async def clear_bin(clerk_id: str = Depends(get_current_user)):
    """Protected: Permanently deletes all items in the bin."""
    await empty_bin_items(clerk_id)
    return {"status": "success", "message": "Bin cleared permanently"}

@app.get("/api/market/indices", response_model=List[MarketIndex])
async def get_indices():
    """Public: Returns live KSE-100 and KSE-30 data."""
    return await get_all_indices()

@app.get("/api/market/watch", response_model=List[MarketWatch])
async def get_watch():
    """Public: Returns all live stock prices."""
    return await get_market_watch()

@app.get("/api/market/overview", response_model=MarketOverview)
async def get_overview():
    """Public: Returns a consolidated view of the market."""
    indices = await get_all_indices()
    stocks = await get_market_watch()
    sectors = await get_sector_performance()
    return MarketOverview(indices=indices, stocks=stocks, sectors=sectors)

@app.get("/api/market/history/{symbol}")
async def get_history(symbol: str, limit: int = 100):
    """Public: Returns historical data points for a symbol (index or stock)."""
    return await get_index_history(symbol, limit)

@app.post("/api/ai/analyze")
async def analyze_stock(request: AIAnalysisRequest, clerk_id: str = Depends(get_current_user)):
    """Protected: Generates an AI analysis report (markdown text response)."""
    analysis = await generate_stock_analysis(clerk_id, request.symbol, request.question, request.history)
    return analysis

if __name__ == "__main__":
    import uvicorn
    # Grab the port Render assigns, or default to 8000 locally
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
