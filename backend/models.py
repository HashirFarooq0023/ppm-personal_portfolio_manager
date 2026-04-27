from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

def to_camel(string: str) -> str:
    parts = string.split('_')
    if not parts:
        return ""
    first, *others = parts
    return first + "".join(word.capitalize() for word in others)

class APIModel(BaseModel):
    class Config:
        alias_generator = to_camel
        populate_by_name = True

# --- User Model ---
class User(APIModel):
    clerk_id: str
    email: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)

# --- Company Model (Slow Data: Normalized) ---
class Company(APIModel):
    symbol: str
    company_name: str
    sector: str
    indices: List[str] = Field(default_factory=list)

# --- Transaction Model (Stand-alone Ledger: Scalable) ---
class Transaction(APIModel):
    transaction_id: str
    clerk_id: str
    symbol: str
    date: datetime = Field(default_factory=datetime.utcnow)
    action: str # "Buy" or "Sell"
    shares: int
    price: float

# --- Portfolio Model (Current State: Non-unbounded) ---
class PortfolioItem(APIModel):
    clerk_id: str
    symbol: str
    shares: int
    average_buy_price: float
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    last_modified: datetime = Field(default_factory=datetime.utcnow)

class PortfolioAddRequest(APIModel):
    symbol: str
    action: str # "Buy" or "Sell"
    shares: int
    price: float
    reset_history: Optional[bool] = False

class PortfolioResponseItem(APIModel):
    symbol: str
    shares: int
    average_buy_price: float
    current_price: float
    total_cost: float
    total_value: float
    profit_loss: float
    profit_loss_percent: float
    transactions: List[Transaction] = Field(default_factory=list)
    deleted_at: Optional[datetime] = None

class PortfolioSummary(APIModel):
    items: List[PortfolioResponseItem]
    total_cost: float
    total_value: float
    total_profit_loss: float
    total_profit_loss_percent: float

class PortfolioHistoryPoint(APIModel):
    clerk_id: str
    total_value: float
    total_cost: float
    total_profit_loss: float
    total_profit_loss_percent: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- Market Watch Model (Fast Data: Optimized) ---
class MarketWatch(APIModel):
    symbol: str
    current_price: float
    change_percent: float = 0.0
    volume: float = 0.0
    high: float = 0.0
    low: float = 0.0
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    # These will be hydrated from the Companies collection in the service layer
    company_name: Optional[str] = None
    sector: Optional[str] = "Miscellaneous"

class SectorPerformance(APIModel):
    name: str
    change: float
    value: float # Percentage of market share

# --- Market History Model (Time Series Ready) ---
class MarketHistoryPoint(APIModel):
    symbol: str
    price: float
    volume: int
    time: datetime

# --- Market Index Model ---
class MarketIndex(APIModel):
    symbol: str
    value: float
    change: float
    change_percent: float
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class MarketOverview(APIModel):
    indices: List[MarketIndex]
    stocks: List[MarketWatch]
    sectors: List[SectorPerformance] = Field(default_factory=list)
    status: str = "Open"

# --- AI Analyst Feature Models ---
class AIAnalysisRequest(APIModel):
    symbol: Optional[str] = None
    question: Optional[str] = None
    history: Optional[List[dict]] = None  # [{role: "user"/"assistant", content: "..."}]

class AIAnalysisResponse(APIModel):
    verdict: str  # "BUY", "HOLD", "SELL"
    reasoning_personalized: str
    trend: str    # "Bullish", "Bearish", "Neutral"
    projects: List[str]
    links: List[str]
    risk_score: int # 1-10

class CandleData(APIModel):
    time: int # Unix timestamp
    open: float
    high: float
    low: float
    close: float
