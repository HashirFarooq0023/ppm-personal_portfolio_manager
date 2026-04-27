import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateCandleData, watchlistStocks, formatPKR, TOP_PSX_SYMBOLS } from '@/data/mockData';
import CandlestickChart from '@/components/charts/CandlestickChart';
import { useQuery } from '@tanstack/react-query';
// --- [ NEW ] | Added Sparkles icon for the AI button ---
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Activity, Sparkles } from 'lucide-react';

export default function ChartTerminal() {
  const { symbol = 'MEBL' } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState('3M');

  const stock = useMemo(() => {
    const s = watchlistStocks.find((s) => s.symbol === symbol.toUpperCase()) || 
              TOP_PSX_SYMBOLS.find((s) => s.symbol === symbol.toUpperCase());
    
    if (s) return {
      ...s,
      price: (s as any).price || 100,
      change: (s as any).change || 0,
      changePercent: (s as any).changePercent || 0,
      sector: (s as any).sector || 'Blue Chip',
      volume: (s as any).volume || 1000000,
      open: (s as any).open || ((s as any).price || 100) * 0.99,
      high: (s as any).high || ((s as any).price || 100) * 1.02,
      low: (s as any).low || ((s as any).price || 100) * 0.98
    };
    
    return watchlistStocks[0];
  }, [symbol]);

  const { data: chartData, isLoading: isChartLoading } = useQuery({
    queryKey: ['history', symbol, range],
    queryFn: async () => {
      // Map frontend ranges to backend limits
      const rangeMap: Record<string, number> = {
        '1D': 48,
        '1W': 100,
        '1M': 300,
        '3M': 900,
        '1Y': 2000,
        'ALL': 5000
      };
      const limit = rangeMap[range] || 100;
      const res = await fetch(`/api/market/history/${symbol}?format=candle&limit=${limit}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const candleData = chartData || [];

  const isPositive = stock.change >= 0;

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{stock.symbol}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                {stock.sector}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
          </div>
        </div>

        {/* --- [ NEW ] | Wrapped price and button in a flex column --- */}
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <div className="text-3xl font-mono-tabular font-bold">{formatPKR(stock.price)}</div>
            <div className={`flex items-center justify-end gap-1 font-mono-tabular text-sm font-medium ${isPositive ? 'text-psx-green' : 'text-psx-red'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </div>
          </div>
          
          {/* --- [ NEW ] | AI Action Button --- */}
          <button 
            onClick={() => { /* Trigger your AI Analyst Sheet open state here */ }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI Analyst
          </button>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="flex-1 glass rounded-3xl p-6 flex flex-col gap-6 min-h-[500px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface text-sm font-medium">
              <Activity className="w-4 h-4 text-primary" />
              <span>Real-time Terminal</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Interval: 1D</span>
            </div>
          </div>

          <div className="flex gap-2">
            {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  r === range 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'glass hover:bg-surface-hover'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-[400px] relative">
          {isChartLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 rounded-xl">
              <Activity className="w-8 h-8 text-primary animate-pulse" />
            </div>
          )}
          <CandlestickChart data={candleData} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: formatPKR(stock.open || stock.price * 0.99) },
          { label: 'High', value: formatPKR(stock.high || stock.price * 1.02) },
          { label: 'Low', value: formatPKR(stock.low || stock.price * 0.98) },
          { label: 'Volume', value: (stock.volume / 1000000).toFixed(2) + 'M' }
        ].map(stat => (
          <div key={stat.label} className="glass rounded-2xl p-4">
            <div className="text-label text-muted-foreground mb-1">{stat.label}</div>
            <div className="text-lg font-mono-tabular font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}