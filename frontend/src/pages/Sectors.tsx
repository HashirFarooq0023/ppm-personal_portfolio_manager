import { useState } from 'react';
import { formatPKR, formatNumber } from '@/data/mockData';
import {
  ArrowLeft, Search, Loader2, ChevronRight,
  Landmark, Flame, Droplets, Leaf,
  Building2, Monitor, Shirt, Zap,
  Pill, Beaker, Settings, Car,
  ShieldCheck, Utensils, Candy, Box,
  FileText, Wallet, Coins, Handshake,
  Home, Truck, MoreHorizontal, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import StockDetailView from '@/components/Market/StockDetailView';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

const SECTOR_ICONS: Record<string, any> = {
  "COMMERCIAL BANKS": Landmark,
  "OIL & GAS EXPLORATION COMPANIES": Flame,
  "OIL & GAS MARKETING COMPANIES": Droplets,
  "FERTILIZER": Leaf,
  "CEMENT": Building2,
  "TECHNOLOGY & COMMUNICATION": Monitor,
  "TEXTILE COMPOSITE": Shirt,
  "POWER GENERATION & DISTRIBUTION": Zap,
  "PHARMACEUTICALS": Pill,
  "CHEMICAL": Beaker,
  "ENGINEERING": Settings,
  "AUTOMOBILE ASSEMBLER": Car,
  "INSURANCE": ShieldCheck,
  "FOOD & PERSONAL CARE PRODUCTS": Utensils,
  "SUGAR & ALLIED INDUSTRIES": Candy,
  "GLASS & CERAMICS": Box,
  "PAPER & BOARD": FileText,
  "INVESTMENT BANKS / INVESTMENT COMPANIES / SECURITIES COMPANIES": Wallet,
  "LEASING COMPANIES": Coins,
  "MODARABAS": Handshake,
  "REAL ESTATE INVESTMENT TRUST": Home,
  "TRANSPORT": Truck,
  "INV. BANKS / INV. COS. / SECURITIES COS.": Wallet,
  "MISCELLANEOUS": MoreHorizontal,
  "REFINERY": Droplets,
  "CABLE & ELECTRICAL GOODS": Cpu,
  "AUTOMOBILE PARTS & ACCESSORIES": Settings,
  "SYNTHETIC & RAYON": Shirt,
  "TEXTILE SPINNING": Shirt,
  "TEXTILE WEAVING": Shirt,
};

const getSectorIcon = (name: string) => {
  const upper = name.toUpperCase();
  for (const key in SECTOR_ICONS) {
    if (upper.includes(key) || key.includes(upper)) return SECTOR_ICONS[key];
  }
  return MoreHorizontal;
};

// --- Backend URL Bridge ---
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Sectors() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const { data: marketOverview, isLoading } = useQuery({
    queryKey: ['marketOverview'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/market/overview`);
      if (!res.ok) return null;
      return res.json();
    },
    // Updated: Exactly 5 minutes (300,000 ms) to match the backend scraper
    refetchInterval: 300000
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const res = await fetch(`${API_URL}/api/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 300000 // Poll every 5 minutes
  });

  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const sectors = marketOverview?.sectors ?? [];
  const max = sectors.length ? Math.max(...sectors.map((s: any) => s.value)) : 1;

  // --- Loading State: Prevents blank screen on initial fetch ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 md:p-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        <p className="text-label text-muted-foreground">Loading sector data from PSX...</p>
      </div>
    );
  }

  if (!selectedSector && !selectedStock && !isLoading && sectors.length === 0) {
    return (
      <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-thin space-y-4 md:space-y-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">Sector Heatmap</h1>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.15em] mt-1">No sector data available right now.</p>
      </div>
    );
  }

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
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">Sector Heatmap</h1>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.15em] mt-1">Market capitalization distribution and daily performance by sector.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        {sectors.map((sector: any) => {
          const pct = (sector.value / max) * 100;
          const positive = sector.change >= 0;
          const Icon = getSectorIcon(sector.name);
          return (
            <motion.button
              key={sector.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSector(sector.name)}
              className="glass-strong rounded-xl p-5 relative overflow-hidden text-left w-full group transition-all duration-300 border border-border/60 hover:border-psx-green/30 shadow-sm hover:shadow-md"
            >
              {/* Background bar */}
              <div
                className="absolute inset-y-0 left-0 opacity-[0.05] rounded-xl transition-all duration-500 group-hover:opacity-[0.12]"
                style={{
                  width: `${pct}%`,
                  backgroundColor: positive ? 'hsl(var(--psx-green))' : 'hsl(var(--psx-red))',
                }}
              />

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="relative flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:rotate-12 ${positive ? 'bg-psx-green/10 text-psx-green shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-psx-red/10 text-psx-red shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                  }`}>
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body font-bold truncate group-hover:text-primary transition-colors">{sector.name}</span>
                    <span className={`font-mono-tabular text-body font-bold whitespace-nowrap ${positive ? 'text-psx-green' : 'text-psx-red'}`}>
                      {positive ? '▲' : '▼'} {Math.abs(sector.change).toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                      {sector.value.toFixed(1)}% Relative Size
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-primary group-hover:text-primary transition-all font-bold uppercase tracking-widest">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
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

  const sectorStocks = liveStocks.filter(s => s.sector === sector);
  const companies = sectorStocks;

  const filtered = query.length > 0
    ? companies.filter(c =>
      c.symbol.toLowerCase().includes(query.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(query.toLowerCase())
    )
    : [...companies].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-thin space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-surface-hover transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">{sector}</h1>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] mt-1">Top companies in this sector</p>
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
          className="w-full h-10 pl-9 pr-3 text-body glass-strong border border-border/60 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all font-medium"
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
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSelectStock(company.symbol)}
              className="glass rounded-xl p-4 w-full text-left transition-all duration-300 hover:bg-white/5 group relative overflow-hidden active:bg-white/10"
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="relative flex items-center justify-between">
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono-tabular text-body font-medium">
                      {formatPKR(company.currentPrice ?? company.price ?? 0)}
                    </div>
                    <span className={`font-mono-tabular text-label ${(company.changePercent ?? 0) >= 0 ? 'text-psx-green' : 'text-psx-red'}`}>
                      {(company.changePercent ?? 0) >= 0 ? '+' : ''}{(company.changePercent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary/40 group-hover:text-primary transition-all group-hover:translate-x-1" />
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