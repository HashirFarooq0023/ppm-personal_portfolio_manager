# Graph Report - PPSM  (2026-04-27)

## Corpus Check
- 88 files · ~38,457 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 240 nodes · 460 edges · 8 communities detected
- Extraction: 39% EXTRACTED · 61% INFERRED · 0% AMBIGUOUS · INFERRED: 279 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `MarketWatch` - 37 edges
2. `MarketIndex` - 37 edges
3. `PortfolioResponseItem` - 28 edges
4. `PortfolioSummary` - 27 edges
5. `AIAnalysisRequest` - 26 edges
6. `AIAnalysisResponse` - 26 edges
7. `MarketOverview` - 17 edges
8. `PortfolioAddRequest` - 16 edges
9. `APIModel` - 15 edges
10. `Transaction` - 15 edges

## Surprising Connections (you probably didn't know these)
- `get_bin()` --calls--> `get_deleted_holdings()`  [INFERRED]
  backend\main.py → backend\service.py
- `trigger_scrape()` --calls--> `fetch_psx_data()`  [INFERRED]
  backend\main.py → backend\scraper.py
- `Protected: Returns user portfolio with live P&L.` --uses--> `PortfolioAddRequest`  [INFERRED]
  backend\main.py → backend\models.py
- `Protected: Returns user portfolio with live P&L.` --uses--> `MarketIndex`  [INFERRED]
  backend\main.py → backend\models.py
- `Protected: Returns user portfolio with live P&L.` --uses--> `MarketWatch`  [INFERRED]
  backend\main.py → backend\models.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (30): add_portfolio(), clear_bin(), get_bin(), get_current_user(), get_history(), get_indices(), get_jwks(), get_overview() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (32): delete_portfolio_transaction(), lifespan(), Protected: Soft deletes a holding (moves to bin)., Protected: Deletes a single transaction from the ledger and recomputes totals., Protected: Restores a stock from the bin., remove_holding(), restore(), MarketIndex (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.31
Nodes (27): BaseModel, get_portfolio(), Protected: Returns user portfolio with live P&L., AIAnalysisRequest, AIAnalysisResponse, APIModel, Config, PortfolioHistoryPoint (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (4): CandlestickChart(), LineChartWidget(), Toaster(), useTheme()

### Community 4 - "Community 4"
Cohesion: 0.33
Nodes (7): Toaster(), addToRemoveQueue(), dispatch(), genId(), reducer(), toast(), useToast()

### Community 5 - "Community 5"
Cohesion: 0.36
Nodes (7): fetch_psx_history(), get_top_20x20_symbols(), is_valid_symbol(), main(), Basic validation: All caps, numbers, dots, dashes. No spaces., Identifies the top 20 sectors by total volume,      and within those, the top 20, Fetches EOD history from PSX official API.

### Community 7 - "Community 7"
Cohesion: 0.4
Nodes (2): generateIndexData(), generatePortfolioValueData()

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (3): analyze_stock(), Protected: Generates an AI analysis report (markdown text response)., generate_stock_analysis()

## Knowledge Gaps
- **5 isolated node(s):** `Basic validation: All caps, numbers, dots, dashes. No spaces.`, `Identifies the top 20 sectors by total volume,      and within those, the top 20`, `Fetches EOD history from PSX official API.`, `DEPRECATED: Replaced by run_global_snapshot_task in scraper.py`, `Config`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 7`** (6 nodes): `mockData.ts`, `formatNumber()`, `formatPKR()`, `generateCandleData()`, `generateIndexData()`, `generatePortfolioValueData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MarketWatch` connect `Community 1` to `Community 0`, `Community 2`, `Community 11`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `MarketIndex` connect `Community 1` to `Community 0`, `Community 2`, `Community 11`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `fetch_psx_data()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 35 inferred relationships involving `MarketWatch` (e.g. with `Protected: Returns user portfolio with live P&L.` and `Protected: Adds or updates a stock holding.`) actually correct?**
  _`MarketWatch` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `MarketIndex` (e.g. with `Protected: Returns user portfolio with live P&L.` and `Protected: Adds or updates a stock holding.`) actually correct?**
  _`MarketIndex` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `PortfolioResponseItem` (e.g. with `Protected: Returns user portfolio with live P&L.` and `Protected: Adds or updates a stock holding.`) actually correct?**
  _`PortfolioResponseItem` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `PortfolioSummary` (e.g. with `Protected: Returns user portfolio with live P&L.` and `Protected: Adds or updates a stock holding.`) actually correct?**
  _`PortfolioSummary` has 25 INFERRED edges - model-reasoned connections that need verification._