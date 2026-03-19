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

# --- Transaction Model ---
class Transaction(APIModel):
    date: datetime = Field(default_factory=datetime.utcnow)
    action: str # "Buy" or "Sell"
    shares: int
    price: float

# --- Portfolio Model ---
class PortfolioItem(APIModel):
    clerk_id: str
    symbol: str
    shares: int
    average_buy_price: float
    transactions: List[Transaction] = []
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

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
    transactions: List[Transaction] = []
    deleted_at: Optional[datetime] = None

class PortfolioSummary(APIModel):
    items: List[PortfolioResponseItem]
    total_cost: float
    total_value: float
    total_profit_loss: float
    total_profit_loss_percent: float

# --- Market Watch Model ---
class MarketWatch(APIModel):
    symbol: str
    current_price: float
    change_percent: float = 0.0
    volume: float = 0.0
    high: float = 0.0
    low: float = 0.0
    sector: str
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class SectorPerformance(APIModel):
    name: str
    change: float
    value: float # Percentage of market share

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
