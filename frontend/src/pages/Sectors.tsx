import { useState } from 'react';
import { sectorPerformance as mockSectors, sectorCompanies as mockCompanies, formatPKR, formatNumber } from '@/data/mockData';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import StockDetailView from '@/components/Market/StockDetailView';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function Sectors() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { data: marketOverview, isLoading } = useQuery({
    queryKey: ['marketOverview'],
    queryFn: async () => {
      const res = await fetch('/api/market/overview');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 10000
  });

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

  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const sectors = marketOverview?.sectors?.length > 0 ? marketOverview.sectors : mockSectors;
  const max = Math.max(...sectors.map((s: any) => s.value));

  if (selectedStock) {
    const stockData = marketOverview?.stocks?.find((s: any) => s.symbol === selectedStock);
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

  if (selectedSector) {
    return (
      <SectorDetail 
        sector={selectedSector} 
        onBack={() => setSelectedSector(null)} 
        liveStocks={marketOverview?.stocks || []}
        onSelectStock={setSelectedStock}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-thin space-y-4 md:space-y-6">
      <div>
        <h1 className="text-index font-semibold">Sector Heatmap</h1>
        <p className="text-label text-muted-foreground">Market capitalization distribution and daily performance by sector.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sectors.map((sector: any) => {
          const pct = (sector.value / max) * 100;
          const positive = sector.change >= 0;
          return (
            <motion.button
              key={sector.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSector(sector.name)}
              className="glass rounded-xl p-4 relative overflow-hidden text-left w-full"
            >
              {/* Background bar */}
              <div
                className="absolute inset-y-0 left-0 opacity-10 rounded-xl"
                style={{
                  width: `${pct}%`,
                  backgroundColor: positive ? 'hsl(var(--psx-green))' : 'hsl(var(--psx-red))',
                }}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-body font-semibold">{sector.name}</span>
                  <span className={`font-mono-tabular text-body font-medium ${positive ? 'text-psx-green' : 'text-psx-red'}`}>
                    {positive ? '+' : ''}{sector.change.toFixed(2)}%
                  </span>
                </div>
                <div className="text-label text-muted-foreground mt-1">{sector.value.toFixed(2)}% of total market cap</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function SectorDetail({ sector, onBack, liveStocks, onSelectStock }: { sector: string; onBack: () => void; liveStocks: any[]; onSelectStock: (symbol: string) => void }) {
  const [query, setQuery] = useState('');
  
  // Use live stocks filtered by sector, fallback to mock if empty
  const sectorStocks = liveStocks.filter(s => s.sector === sector);
  const companies = sectorStocks.length > 0 ? sectorStocks : (mockCompanies[sector] || []);

  const filtered = query.length > 0
    ? companies.filter(c =>
        c.symbol.toLowerCase().includes(query.toLowerCase()) ||
        (c.name || '').toLowerCase().includes(query.toLowerCase())
      )
    : [...companies].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)).slice(0, 10);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-thin space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-surface-hover transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-index font-semibold">{sector}</h1>
          <p className="text-label text-muted-foreground">Top companies in this sector</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search company in this sector..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-body glass rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Companies List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((company, i) => (
            <motion.button
              key={company.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSelectStock(company.symbol)}
              className="glass rounded-xl p-4 w-full text-left transition-colors hover:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-body font-semibold">{company.symbol}</span>
                    <span className="text-label text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                      {company.name || company.symbol}
                    </span>
                    {(company.lastUpdated) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-psx-green animate-pulse" title="Live" />
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-label text-muted-foreground font-mono-tabular">
                    <span>Vol: {formatNumber(company.volume)}</span>
                    <span>H: {(company.high ?? 0).toFixed(2)}</span>
                    <span>L: {(company.low ?? 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-tabular text-body font-medium">
                    {formatPKR(company.currentPrice ?? company.price ?? 0)}
                  </div>
                  <span className={`font-mono-tabular text-label ${(company.changePercent ?? 0) >= 0 ? 'text-psx-green' : 'text-psx-red'}`}>
                    {(company.changePercent ?? 0) >= 0 ? '+' : ''}{(company.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-body">No companies found matching "{query}"</div>
        )}
      </div>
    </div>
  );
}
