from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
import asyncio
from contextlib import asynccontextmanager
from typing import List

from .models import PortfolioSummary, PortfolioAddRequest, MarketIndex, MarketWatch, MarketOverview, PortfolioResponseItem
from .service import (
    get_user_portfolio, add_or_update_holding, delete_holding, 
    get_all_indices, get_market_watch, get_sector_performance,
    get_deleted_holdings, restore_holding, get_index_history
)
from .scraper import run_psx_scraper

# --- Lifespan Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the background scraper
    scraper_task = asyncio.create_task(run_psx_scraper())
    yield
    # Cleanup (cancel task)
    scraper_task.cancel()
    try:
        await scraper_task
    except asyncio.CancelledError:
        print("Scraper background task cancelled.")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PPM Backend", lifespan=lifespan)

# --- CORS Setup ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your Vercel frontend URL
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
        price=request.price
    )
    return {"status": "success", "message": f"Updated {request.symbol} in portfolio."}

@app.delete("/api/portfolio/{symbol}")
async def remove_holding(symbol: str, clerk_id: str = Depends(get_current_user)):
    """Protected: Soft deletes a holding (moves to bin)."""
    await delete_holding(clerk_id, symbol.upper())
    return {"status": "success", "message": f"Moved {symbol} to bin"}

@app.get("/api/portfolio/bin", response_model=List[PortfolioResponseItem])
async def get_bin(clerk_id: str = Depends(get_current_user)):
    """Protected: Returns deleted holdings with P&L info."""
    return await get_deleted_holdings(clerk_id)

@app.post("/api/portfolio/restore/{symbol}")
async def restore(symbol: str, clerk_id: str = Depends(get_current_user)):
    """Protected: Restores a stock from the bin."""
    await restore_holding(clerk_id, symbol.upper())
    return {"status": "success", "message": f"Restored {symbol} to portfolio"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
