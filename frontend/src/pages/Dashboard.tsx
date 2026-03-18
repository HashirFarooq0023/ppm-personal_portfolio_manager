import { indices as mockIndices, sectorPerformance, generateIndexData, generateCandleData, formatNumber, formatPKR } from '@/data/mockData';
import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import CandlestickChart from '@/components/charts/CandlestickChart';
import { useQuery } from '@tanstack/react-query';
import StockDetailView from '@/components/Market/StockDetailView';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const res = await fetch('/api/portfolio', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    }
  });

  const { data: marketOverview, isLoading } = useQuery({
    queryKey: ['marketOverview'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/market/overview');
        if (!res.ok) return null;
        return res.json();
      } catch (e) {
        return null; // Fallback to mocks
      }
    },
    refetchInterval: 10000,
  });

  const { data: indexHistory } = useQuery({
    queryKey: ['indexHistory', 'KSE100'],
    queryFn: async () => {
      const res = await fetch('/api/market/history/KSE100');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Map API data to UI structure, fallback to mock data
  const liveIndices = useMemo(() => {
    if (!marketOverview || !marketOverview.indices || marketOverview.indices.length === 0) {
      return mockIndices;
    }
    
    const k100 = marketOverview.indices.find((i: any) => i.symbol === 'KSE100');
    const k30 = marketOverview.indices.find((i: any) => i.symbol === 'KSE30');

    return {
      kse100: k100 ? { value: k100.value, change: k100.change, changePercent: k100.changePercent } : mockIndices.kse100,
      kse30: k30 ? { value: k30.value, change: k30.change, changePercent: k30.changePercent } : mockIndices.kse30,
      totalVolume: mockIndices.totalVolume
    };
  }, [marketOverview]);

  const kseData = useMemo(() => {
    // For the index candlestick, we'll generate professional OHLC data 
    // seeded by the current live index value
    return generateCandleData(90, liveIndices.kse100?.value || 64000);
  }, [liveIndices.kse100?.value]);

  const liveStocks = marketOverview?.stocks || [];
  const topGainers = [...liveStocks].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0)).slice(0, 4);
  const topLosers = [...liveStocks].sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0)).slice(0, 4);

  if (selectedStock) {
    const stockData = liveStocks.find((s: any) => s.symbol === selectedStock);
    const portfolioHolding = portfolioData?.items?.find((h: any) => h.symbol === selectedStock);
    
    return (
      <StockDetailView
        symbol={selectedStock}
        name={stockData?.name || selectedStock}
        marketData={stockData}
        portfolioHolding={portfolioHolding}
        onBack={() => setSelectedStock(null)}
        onTrade={() => navigate('/portfolio')}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 h-full overflow-y-auto scrollbar-thin">
      {/* Index Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 relative">
        {isLoading && (
          <div className="absolute top-2 right-2 animate-spin text-primary/40">
            <Loader2 className="w-4 h-4" />
          </div>
        )}
        <IndexCard label="KSE-100" value={liveIndices.kse100?.value ?? 0} change={liveIndices.kse100?.change ?? 0} pct={liveIndices.kse100?.changePercent ?? 0} />
        <IndexCard label="KSE-30" value={liveIndices.kse30?.value ?? 0} change={liveIndices.kse30?.change ?? 0} pct={liveIndices.kse30?.changePercent ?? 0} />
        <div className="glass rounded-xl p-4">
          <div className="text-header-caps uppercase tracking-wider text-muted-foreground font-semibold mb-1">Total Volume</div>
          <div className="text-index font-mono-tabular text-foreground">{formatNumber(liveIndices.totalVolume)}</div>
          <div className="flex items-center gap-1 mt-1">
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-label text-muted-foreground">Shares traded today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* KSE-100 Chart */}
        <div className="lg:col-span-8 glass rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <div>
              <h2 className="text-subheader font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                KSE-100 Index History
              </h2>
              <span className="text-label text-muted-foreground">Market Trend Analysis</span>
            </div>
            <div className="flex gap-2">
              {['1D', '1W', '1M', '3M', '1Y'].map(range => (
                <button 
                  key={range}
                  className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-colors ${
                    range === '3M' ? 'bg-primary text-primary-foreground' : 'glass hover:bg-surface-hover'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[350px]">
            <CandlestickChart data={kseData} height={350} />
          </div>
        </div>

        {/* Top Gainers/Losers */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass rounded-xl p-4">
            <h2 className="text-subheader font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-psx-green" />
              Top Gainers
            </h2>
            <div className="space-y-2">
              {topGainers.map(stock => (
                <button 
                  key={stock.symbol} 
                  onClick={() => setSelectedStock(stock.symbol)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-right">
                    <div className="text-sm font-mono-tabular">{formatPKR(stock.currentPrice)}</div>
                    <div className="text-xs text-psx-green flex items-center justify-end gap-0.5">
                      <ArrowUpRight className="w-3 h-3" />
                      +{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
              {topGainers.length === 0 && <div className="text-center text-label text-muted-foreground py-4">Loading gainers...</div>}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h2 className="text-subheader font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-psx-red" />
              Top Losers
            </h2>
            <div className="space-y-2">
              {topLosers.map(stock => (
                <button 
                  key={stock.symbol} 
                  onClick={() => setSelectedStock(stock.symbol)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-right">
                    <div className="text-sm font-mono-tabular">{formatPKR(stock.currentPrice)}</div>
                    <div className="text-xs text-psx-red flex items-center justify-end gap-0.5">
                      <ArrowDownRight className="w-3 h-3" />
                      {stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
              {topLosers.length === 0 && <div className="text-center text-label text-muted-foreground py-4">Loading losers...</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Sector Performance */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-subheader font-semibold">Sector Performance</h2>
          {(marketOverview?.sectors?.length > 0) && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Live</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(marketOverview?.sectors?.length > 0 ? marketOverview.sectors : sectorPerformance).map((sector: any) => (
            <div key={sector.name} className="flex items-center justify-between py-2 px-3 bg-accent/30 rounded-lg transition-colors hover:bg-accent/40">
              <div>
                <div className="text-body font-medium">{sector.name}</div>
                <div className="text-label text-muted-foreground">{sector.value.toFixed(2)}% of market</div>
              </div>
              <span className={`font-mono-tabular text-body font-medium ${(sector.change ?? 0) >= 0 ? 'text-psx-green' : 'text-psx-red'}`}>
                {(sector.change ?? 0) >= 0 ? '+' : ''}{(sector.change ?? 0).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Market Watch (All tracked stocks) */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-subheader font-semibold">Market Watch</h2>
          <span className="text-label text-muted-foreground">{liveStocks.length} Companies Tracked</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-label text-muted-foreground uppercase tracking-wider">
                <th className="pb-3 font-medium">Symbol</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">Change</th>
                <th className="pb-3 font-medium text-right">High</th>
                <th className="pb-3 font-medium text-right">Low</th>
                <th className="pb-3 font-medium text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {liveStocks.map((stock: any) => (
                <tr 
                  key={stock.symbol} 
                  onClick={() => setSelectedStock(stock.symbol)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="py-3 font-semibold group-hover:text-primary transition-colors">{stock.symbol}</td>
                  <td className="py-3 text-right font-mono-tabular">{formatPKR(stock.currentPrice)}</td>
                  <td className={`py-3 text-right font-mono-tabular ${(stock.changePercent ?? 0) >= 0 ? 'text-psx-green' : 'text-psx-red'}`}>
                    {(stock.changePercent ?? 0) >= 0 ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%
                  </td>
                  <td className="py-3 text-right font-mono-tabular text-muted-foreground">{(stock.high ?? 0).toFixed(2)}</td>
                  <td className="py-3 text-right font-mono-tabular text-muted-foreground">{(stock.low ?? 0).toFixed(2)}</td>
                  <td className="py-3 text-right font-mono-tabular text-muted-foreground">{formatNumber(stock.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IndexCard({ label, value, change, pct }: { label: string; value: number; change: number; pct: number }) {
  const positive = pct >= 0;
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-header-caps uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="text-index font-mono-tabular text-foreground">{value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div className="flex items-center gap-1.5 mt-1">
        {positive ? (
          <TrendingUp className="w-3.5 h-3.5 text-psx-green" strokeWidth={1.5} />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-psx-red" strokeWidth={1.5} />
        )}
        <span className={`font-mono-tabular text-label ${positive ? 'text-psx-green' : 'text-psx-red'}`}>
          {positive ? '+' : ''}{(change ?? 0).toFixed(2)} ({positive ? '+' : ''}{(pct ?? 0).toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}
