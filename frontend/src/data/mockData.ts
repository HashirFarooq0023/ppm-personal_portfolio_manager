/**
 * mockData.ts
 * Provides fallback data, types, and utility formatters for the PPSM frontend.
 */

// --- Types ---

export interface CandleData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface StockInfo {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  sector?: string;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
}

// --- Formatters ---

/**
 * Formats a number as a PKR currency string (e.g., 1,234.56).
 */
export const formatPKR = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-PK', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
};

/**
 * Formats a number with suffixes (e.g., 1.2M, 10.5K).
 */
export const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// --- Mock Data Constants ---

export const indices = {
  kse100: { value: 65120.45, change: 450.20, changePercent: 0.70 },
  kse30: { value: 22150.10, change: -12.45, changePercent: -0.06 },
  totalVolume: 345000000,
};

export const sectorPerformance = [
  { name: 'Technology', change: 2.45, value: 15 },
  { name: 'Banking', change: 1.20, value: 25 },
  { name: 'Fertilizer', change: -0.50, value: 10 },
  { name: 'Cement', change: 0.85, value: 12 },
  { name: 'Oil & Gas', change: -1.10, value: 18 },
  { name: 'Textile', change: 0.30, value: 20 },
];

/**
 * Curated list of top PSX symbols for auto-completion and suggestions.
 */
export const TOP_PSX_SYMBOLS: StockInfo[] = [
  { symbol: 'SYS', name: 'Systems Limited', sector: 'Technology', price: 450.20, change: 12.5, changePercent: 2.85, volume: 1500000 },
  { symbol: 'TRG', name: 'TRG Pakistan Limited', sector: 'Technology', price: 78.45, change: -1.2, changePercent: -1.5, volume: 3400000 },
  { symbol: 'HUBC', name: 'Hub Power Company', sector: 'Power', price: 120.10, change: 0.45, changePercent: 0.38, volume: 1200000 },
  { symbol: 'ENGRO', name: 'Engro Corporation', sector: 'Fertilizer', price: 345.60, change: 4.2, changePercent: 1.23, volume: 800000 },
  { symbol: 'EFERT', name: 'Engro Fertilizers', sector: 'Fertilizer', price: 142.30, change: 2.1, changePercent: 1.5, volume: 2100000 },
  { symbol: 'LUCK', name: 'Lucky Cement', sector: 'Cement', price: 780.40, change: -5.6, changePercent: -0.71, volume: 450000 },
  { symbol: 'MEBL', name: 'Meezan Bank Limited', sector: 'Banking', price: 185.50, change: 3.4, changePercent: 1.87, volume: 2500000 },
  { symbol: 'MCB', name: 'MCB Bank Limited', sector: 'Banking', price: 210.15, change: 1.25, changePercent: 0.6, volume: 1100000 },
  { symbol: 'UBL', name: 'United Bank Limited', sector: 'Banking', price: 195.40, change: -0.85, changePercent: -0.43, volume: 950000 },
  { symbol: 'HBL', name: 'Habib Bank Limited', sector: 'Banking', price: 112.30, change: 0.65, changePercent: 0.58, volume: 1300000 },
  { symbol: 'OGDC', name: 'Oil & Gas Development Company', sector: 'Oil & Gas', price: 145.20, change: -2.4, changePercent: -1.63, volume: 4200000 },
  { symbol: 'PPL', name: 'Pakistan Petroleum Limited', sector: 'Oil & Gas', price: 118.75, change: -1.15, changePercent: -0.96, volume: 3800000 },
  { symbol: 'PSO', name: 'Pakistan State Oil', sector: 'Oil & Gas', price: 178.40, change: 1.2, changePercent: 0.68, volume: 1700000 },
  { symbol: 'MARI', name: 'Mari Petroleum', sector: 'Oil & Gas', price: 2450.00, change: 45.5, changePercent: 1.89, volume: 120000 },
  { symbol: 'FFC', name: 'Fauji Fertilizer Company', sector: 'Fertilizer', price: 125.80, change: 0.9, changePercent: 0.72, volume: 1400000 },
  { symbol: 'LCI', name: 'Lucky Core Industries', sector: 'Chemicals', price: 650.30, change: -8.4, changePercent: -1.27, volume: 250000 },
  { symbol: 'AIRLINK', name: 'Air Link Communication', sector: 'Technology', price: 62.45, change: 2.15, changePercent: 3.57, volume: 5600000 },
  { symbol: 'AVN', name: 'Avanceon Limited', sector: 'Technology', price: 58.20, change: 0.45, changePercent: 0.78, volume: 1800000 },
  { symbol: 'NETSOL', name: 'Netsol Technologies', sector: 'Technology', price: 92.15, change: -1.4, changePercent: -1.5, volume: 900000 },
  { symbol: 'OCTOPUS', name: 'Octopus Digital', sector: 'Technology', price: 84.50, change: 1.1, changePercent: 1.32, volume: 1100000 },
];

/**
 * Default watchlist for new users or fallback.
 */
export const watchlistStocks: StockInfo[] = [
  { symbol: 'SYS', name: 'Systems Limited', price: 450.20, change: 12.5, changePercent: 2.85 },
  { symbol: 'HUBC', name: 'Hub Power Company', price: 120.10, change: 0.45, changePercent: 0.38 },
  { symbol: 'ENGRO', name: 'Engro Corporation', price: 345.60, change: 4.2, changePercent: 1.23 },
  { symbol: 'MEBL', name: 'Meezan Bank Limited', price: 185.50, change: 3.4, changePercent: 1.87 },
  { symbol: 'TRG', name: 'TRG Pakistan Limited', price: 78.45, change: -1.2, changePercent: -1.5 },
];

// --- Data Generators ---

/**
 * Generates mock OHLC data for charts.
 */
export const generateCandleData = (count: number, basePrice: number): CandleData[] => {
  const data: CandleData[] = [];
  let currentPrice = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * dayInSeconds;
    const open = currentPrice;
    const close = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    data.push({
      time,
      open,
      high,
      low,
      close,
    });
    currentPrice = close;
  }
  return data;
};

/**
 * Generates mock line data for trend charts.
 */
export const generateIndexData = (count: number, basePrice: number) => {
  const data = [];
  let currentPrice = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const interval = 3600; // 1 hour

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * interval;
    currentPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.01);
    data.push({ time, value: currentPrice });
  }
  return data;
};

export const generatePortfolioValueData = () => {
  return generateIndexData(30, 1500000);
};
