export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  marketCap?: number;
  pe?: number;
}

export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PortfolioHolding {
  symbol: string;
  type: 'Stock' | 'ETF';
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
}

export const indices = {
  kse100: { value: 60000.43, change: 768.21, changePercent: 1.2 },
  kse30: { value: 28456.12, change: 312.45, changePercent: 1.11 },
  totalVolume: 428_500_000,
};

export const watchlistStocks: StockQuote[] = [
  { symbol: 'MEBL', name: 'Meezan Bank', sector: 'Commercial Banks', price: 285.50, change: 8.75, changePercent: 3.16, volume: 12_400_000, high: 287.00, low: 275.50, open: 276.75, marketCap: 428_000_000_000, pe: 8.2 },
  { symbol: 'SYS', name: 'Systems Ltd', sector: 'Technology', price: 452.30, change: -12.40, changePercent: -2.67, volume: 8_200_000, high: 468.00, low: 448.50, open: 464.70, marketCap: 65_000_000_000, pe: 22.5 },
  { symbol: 'LUCK', name: 'Lucky Cement', sector: 'Cement', price: 892.15, change: 15.60, changePercent: 1.78, volume: 3_100_000, high: 895.00, low: 872.00, open: 876.55, marketCap: 289_000_000_000, pe: 12.1 },
  { symbol: 'OGDC', name: 'Oil & Gas Dev', sector: 'Oil & Gas', price: 134.80, change: -2.15, changePercent: -1.57, volume: 18_700_000, high: 138.50, low: 133.00, open: 137.00, marketCap: 579_000_000_000, pe: 5.8 },
  { symbol: 'HBL', name: 'Habib Bank', sector: 'Commercial Banks', price: 178.25, change: 4.30, changePercent: 2.47, volume: 9_800_000, high: 180.00, low: 173.50, open: 173.95, marketCap: 261_000_000_000, pe: 6.4 },
  { symbol: 'ENGRO', name: 'Engro Corp', sector: 'Chemicals', price: 324.60, change: -5.80, changePercent: -1.76, volume: 5_400_000, high: 332.00, low: 322.00, open: 330.40, marketCap: 187_000_000_000, pe: 9.7 },
  { symbol: 'FFC', name: 'Fauji Fertilizer', sector: 'Fertilizer', price: 168.90, change: 3.25, changePercent: 1.96, volume: 7_600_000, high: 170.50, low: 164.00, open: 165.65, marketCap: 215_000_000_000, pe: 7.3 },
  { symbol: 'PPL', name: 'Pakistan Petroleum', sector: 'Oil & Gas', price: 98.45, change: 1.10, changePercent: 1.13, volume: 14_200_000, high: 99.50, low: 96.00, open: 97.35, marketCap: 389_000_000_000, pe: 4.9 },
  { symbol: 'UBL', name: 'United Bank', sector: 'Commercial Banks', price: 215.75, change: -3.60, changePercent: -1.64, volume: 6_300_000, high: 220.00, low: 214.00, open: 219.35, marketCap: 265_000_000_000, pe: 7.1 },
  { symbol: 'HUBC', name: 'Hub Power', sector: 'Power', price: 112.40, change: 2.85, changePercent: 2.60, volume: 11_100_000, high: 113.50, low: 108.90, open: 109.55, marketCap: 146_000_000_000, pe: 6.8 },
];

export const topGainers: StockQuote[] = watchlistStocks.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
export const topLosers: StockQuote[] = watchlistStocks.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
export const volumeLeaders: StockQuote[] = [...watchlistStocks].sort((a, b) => b.volume - a.volume).slice(0, 5);

export const sectorPerformance = [
  { name: 'Commercial Banks', value: 32, change: 2.1 },
  { name: 'Cement', value: 15, change: 1.4 },
  { name: 'Fertilizer', value: 12, change: 0.8 },
  { name: 'Oil & Gas', value: 18, change: -0.9 },
  { name: 'Technology', value: 8, change: -1.5 },
  { name: 'Power', value: 10, change: 1.8 },
  { name: 'Chemicals', value: 5, change: -0.3 },
];

export const TOP_PSX_SYMBOLS = [
  { symbol: 'MEBL', name: 'Meezan Bank Limited' },
  { symbol: 'SYS', name: 'Systems Limited' },
  { symbol: 'HUBC', name: 'Hub Power Company' },
  { symbol: 'FFC', name: 'Fauji Fertilizer Company' },
  { symbol: 'ENGRO', name: 'Engro Corporation' },
  { symbol: 'OGDC', name: 'Oil & Gas Development Co.' },
  { symbol: 'LUCK', name: 'Lucky Cement' },
  { symbol: 'HBL', name: 'Habib Bank Limited' },
  { symbol: 'PPL', name: 'Pakistan Petroleum Limited' },
  { symbol: 'MARI', name: 'Mari Petroleum' },
  { symbol: 'TRG', name: 'TRG Pakistan' },
  { symbol: 'PSO', name: 'Pakistan State Oil' },
  { symbol: 'MCB', name: 'MCB Bank Limited' },
  { symbol: 'UBL', name: 'United Bank Limited' },
  { symbol: 'BAHL', name: 'Bank AL Habib' },
  { symbol: 'POL', name: 'Pakistan Oilfields' },
  { symbol: 'FCCL', name: 'Fauji Cement Company' },
  { symbol: 'CHCC', name: 'Cherat Cement' },
  { symbol: 'EFERT', name: 'Engro Fertilizers' },
  { symbol: 'MTL', name: 'Millat Tractors' },
  { symbol: 'DAWH', name: 'Dawood Hercules' },
  { symbol: 'KEL', name: 'K-Electric Limited' },
  { symbol: 'NBP', name: 'National Bank of Pakistan' },
  { symbol: 'SAZEW', name: 'Sazgar Engineering' },
  { symbol: 'THALL', name: 'Thal Limited' },
  { symbol: 'DGKC', name: 'DG Khan Cement' },
  { symbol: 'SEARL', name: 'The Searle Company' },
  { symbol: 'ATRL', name: 'Attock Refinery' },
  { symbol: 'NRL', name: 'National Refinery' },
  { symbol: 'INIL', name: 'International Industries' },
  { symbol: 'ISL', name: 'International Steels' },
  { symbol: 'FABL', name: 'Faysal Bank' },
  { symbol: 'MEHT', name: 'Mehran Sugar' },
  { symbol: 'PKGS', name: 'Packages Limited' },
  { symbol: 'BOP', name: 'Bank of Punjab' },
  { symbol: 'EPCL', name: 'Engro Polymer' },
  { symbol: 'PAEL', name: 'Pak Elektron' },
  { symbol: 'GATM', name: 'Gul Ahmed Textile' },
  { symbol: 'ILP', name: 'Interloop Limited' },
  { symbol: 'AVN', name: 'Avanceon Limited' },
  { symbol: 'NETSOL', name: 'NetSol Technologies' },
  { symbol: 'PRL', name: 'Pakistan Refinery' },
  { symbol: 'SNGP', name: 'Sui Northern Gas' },
  { symbol: 'SSGC', name: 'Sui Southern Gas' },
  { symbol: 'PIOC', name: 'Pioneer Cement' },
  { symbol: 'FATIMA', name: 'Fatima Fertilizer' },
  { symbol: 'MUREB', name: 'Murree Brewery' },
  { symbol: 'HONDA', name: 'Honda Atlas Cars' },
  { symbol: 'HCAR', name: 'Honda Atlas' },
  { symbol: 'PSMC', name: 'Pak Suzuki Motor' }
];

// Top companies by sector for the sector drill-down
export const sectorCompanies: Record<string, StockQuote[]> = {
  'Commercial Banks': [
    { symbol: 'MEBL', name: 'Meezan Bank', sector: 'Commercial Banks', price: 285.50, change: 8.75, changePercent: 3.16, volume: 12_400_000, high: 287.00, low: 275.50, open: 276.75 },
    { symbol: 'HBL', name: 'Habib Bank', sector: 'Commercial Banks', price: 178.25, change: 4.30, changePercent: 2.47, volume: 9_800_000, high: 180.00, low: 173.50, open: 173.95 },
    { symbol: 'UBL', name: 'United Bank', sector: 'Commercial Banks', price: 215.75, change: -3.60, changePercent: -1.64, volume: 6_300_000, high: 220.00, low: 214.00, open: 219.35 },
    { symbol: 'BAFL', name: 'Bank Alfalah', sector: 'Commercial Banks', price: 58.90, change: -0.65, changePercent: -1.09, volume: 4_800_000, high: 60.00, low: 58.50, open: 59.55 },
    { symbol: 'MCB', name: 'MCB Bank', sector: 'Commercial Banks', price: 198.40, change: 2.10, changePercent: 1.07, volume: 5_200_000, high: 200.00, low: 195.00, open: 196.30 },
    { symbol: 'ABL', name: 'Allied Bank', sector: 'Commercial Banks', price: 112.80, change: 1.50, changePercent: 1.35, volume: 3_800_000, high: 114.00, low: 110.50, open: 111.30 },
    { symbol: 'BAHL', name: 'Bank Al-Habib', sector: 'Commercial Banks', price: 95.60, change: -0.40, changePercent: -0.42, volume: 2_900_000, high: 96.50, low: 94.80, open: 96.00 },
    { symbol: 'AKBL', name: 'Askari Bank', sector: 'Commercial Banks', price: 28.45, change: 0.35, changePercent: 1.25, volume: 6_100_000, high: 29.00, low: 27.80, open: 28.10 },
    { symbol: 'NBP', name: 'National Bank', sector: 'Commercial Banks', price: 42.30, change: -0.80, changePercent: -1.86, volume: 7_500_000, high: 43.50, low: 41.80, open: 43.10 },
    { symbol: 'SNBL', name: 'Soneri Bank', sector: 'Commercial Banks', price: 15.20, change: 0.10, changePercent: 0.66, volume: 1_200_000, high: 15.50, low: 14.90, open: 15.10 },
  ],
  'Cement': [
    { symbol: 'LUCK', name: 'Lucky Cement', sector: 'Cement', price: 892.15, change: 15.60, changePercent: 1.78, volume: 3_100_000, high: 895.00, low: 872.00, open: 876.55 },
    { symbol: 'DGKC', name: 'DG Khan Cement', sector: 'Cement', price: 98.50, change: 1.20, changePercent: 1.23, volume: 8_500_000, high: 99.00, low: 96.50, open: 97.30 },
    { symbol: 'MLCF', name: 'Maple Leaf Cement', sector: 'Cement', price: 42.60, change: -0.35, changePercent: -0.81, volume: 12_000_000, high: 43.50, low: 42.00, open: 42.95 },
    { symbol: 'PIOC', name: 'Pioneer Cement', sector: 'Cement', price: 78.90, change: 0.80, changePercent: 1.02, volume: 4_200_000, high: 79.50, low: 77.50, open: 78.10 },
    { symbol: 'FCCL', name: 'Fauji Cement', sector: 'Cement', price: 25.40, change: 0.15, changePercent: 0.59, volume: 9_800_000, high: 25.80, low: 25.00, open: 25.25 },
    { symbol: 'KOHC', name: 'Kohat Cement', sector: 'Cement', price: 185.30, change: -2.10, changePercent: -1.12, volume: 1_500_000, high: 188.00, low: 184.00, open: 187.40 },
    { symbol: 'BWCL', name: 'Bestway Cement', sector: 'Cement', price: 145.70, change: 3.20, changePercent: 2.25, volume: 2_300_000, high: 146.50, low: 141.50, open: 142.50 },
    { symbol: 'ACPL', name: 'Attock Cement', sector: 'Cement', price: 162.40, change: -1.80, changePercent: -1.10, volume: 800_000, high: 165.00, low: 161.00, open: 164.20 },
    { symbol: 'CHCC', name: 'Cherat Cement', sector: 'Cement', price: 138.20, change: 1.50, changePercent: 1.10, volume: 1_100_000, high: 139.00, low: 136.00, open: 136.70 },
    { symbol: 'GWLC', name: 'Gharibwal Cement', sector: 'Cement', price: 22.80, change: -0.10, changePercent: -0.44, volume: 5_400_000, high: 23.20, low: 22.50, open: 22.90 },
  ],
  'Fertilizer': [
    { symbol: 'FFC', name: 'Fauji Fertilizer', sector: 'Fertilizer', price: 168.90, change: 3.25, changePercent: 1.96, volume: 7_600_000, high: 170.50, low: 164.00, open: 165.65 },
    { symbol: 'EFERT', name: 'Engro Fertilizers', sector: 'Fertilizer', price: 92.30, change: 1.40, changePercent: 1.54, volume: 5_100_000, high: 93.00, low: 90.50, open: 90.90 },
    { symbol: 'FFBL', name: 'Fauji Bin Qasim', sector: 'Fertilizer', price: 32.10, change: -0.20, changePercent: -0.62, volume: 8_400_000, high: 32.80, low: 31.80, open: 32.30 },
    { symbol: 'FATIMA', name: 'Fatima Fertilizer', sector: 'Fertilizer', price: 45.60, change: 0.50, changePercent: 1.11, volume: 6_200_000, high: 46.00, low: 44.80, open: 45.10 },
    { symbol: 'DAWH', name: 'Dawood Hercules', sector: 'Fertilizer', price: 128.70, change: -1.30, changePercent: -1.00, volume: 2_800_000, high: 130.50, low: 127.50, open: 130.00 },
  ],
  'Oil & Gas': [
    { symbol: 'OGDC', name: 'Oil & Gas Dev', sector: 'Oil & Gas', price: 134.80, change: -2.15, changePercent: -1.57, volume: 18_700_000, high: 138.50, low: 133.00, open: 137.00 },
    { symbol: 'PPL', name: 'Pakistan Petroleum', sector: 'Oil & Gas', price: 98.45, change: 1.10, changePercent: 1.13, volume: 14_200_000, high: 99.50, low: 96.00, open: 97.35 },
    { symbol: 'PSO', name: 'Pakistan State Oil', sector: 'Oil & Gas', price: 268.40, change: -3.80, changePercent: -1.40, volume: 3_200_000, high: 273.00, low: 266.50, open: 272.20 },
    { symbol: 'SSGC', name: 'Sui Southern Gas', sector: 'Oil & Gas', price: 32.50, change: 0.30, changePercent: 0.93, volume: 9_600_000, high: 33.00, low: 32.00, open: 32.20 },
    { symbol: 'SNGP', name: 'Sui Northern Gas', sector: 'Oil & Gas', price: 45.80, change: -0.50, changePercent: -1.08, volume: 7_800_000, high: 46.50, low: 45.20, open: 46.30 },
    { symbol: 'MARI', name: 'Mari Petroleum', sector: 'Oil & Gas', price: 1850.00, change: 22.50, changePercent: 1.23, volume: 450_000, high: 1855.00, low: 1820.00, open: 1827.50 },
    { symbol: 'POL', name: 'Pakistan Oilfields', sector: 'Oil & Gas', price: 520.30, change: -4.20, changePercent: -0.80, volume: 890_000, high: 526.00, low: 518.00, open: 524.50 },
    { symbol: 'APL', name: 'Attock Petroleum', sector: 'Oil & Gas', price: 485.60, change: 5.10, changePercent: 1.06, volume: 620_000, high: 487.00, low: 478.00, open: 480.50 },
    { symbol: 'HASCOL', name: 'Hascol Petroleum', sector: 'Oil & Gas', price: 8.90, change: -0.15, changePercent: -1.66, volume: 15_200_000, high: 9.20, low: 8.70, open: 9.05 },
    { symbol: 'BYCO', name: 'Byco Petroleum', sector: 'Oil & Gas', price: 12.40, change: 0.20, changePercent: 1.64, volume: 22_500_000, high: 12.60, low: 12.10, open: 12.20 },
  ],
  'Technology': [
    { symbol: 'SYS', name: 'Systems Ltd', sector: 'Technology', price: 452.30, change: -12.40, changePercent: -2.67, volume: 8_200_000, high: 468.00, low: 448.50, open: 464.70 },
    { symbol: 'TRG', name: 'TRG Pakistan', sector: 'Technology', price: 148.50, change: -1.80, changePercent: -1.20, volume: 6_500_000, high: 151.00, low: 147.00, open: 150.30 },
    { symbol: 'NETSOL', name: 'NetSol Technologies', sector: 'Technology', price: 185.20, change: 2.40, changePercent: 1.31, volume: 3_400_000, high: 186.50, low: 182.00, open: 182.80 },
    { symbol: 'AVN', name: 'Avanceon', sector: 'Technology', price: 92.70, change: 1.10, changePercent: 1.20, volume: 2_100_000, high: 93.50, low: 91.00, open: 91.60 },
    { symbol: 'OCTOPUS', name: 'Octopus Digital', sector: 'Technology', price: 68.40, change: -0.60, changePercent: -0.87, volume: 1_800_000, high: 69.50, low: 67.80, open: 69.00 },
  ],
  'Power': [
    { symbol: 'HUBC', name: 'Hub Power', sector: 'Power', price: 112.40, change: 2.85, changePercent: 2.60, volume: 11_100_000, high: 113.50, low: 108.90, open: 109.55 },
    { symbol: 'KEL', name: 'K-Electric', sector: 'Power', price: 5.20, change: 0.08, changePercent: 1.56, volume: 35_000_000, high: 5.25, low: 5.10, open: 5.12 },
    { symbol: 'KAPCO', name: 'Kot Addu Power', sector: 'Power', price: 32.80, change: -0.30, changePercent: -0.91, volume: 4_200_000, high: 33.30, low: 32.50, open: 33.10 },
    { symbol: 'NCPL', name: 'Nishat Chunian Power', sector: 'Power', price: 18.90, change: 0.15, changePercent: 0.80, volume: 2_800_000, high: 19.10, low: 18.60, open: 18.75 },
    { symbol: 'NPL', name: 'Nishat Power', sector: 'Power', price: 28.40, change: 0.40, changePercent: 1.43, volume: 3_100_000, high: 28.80, low: 27.80, open: 28.00 },
    { symbol: 'LPGL', name: 'Lalpir Power', sector: 'Power', price: 15.60, change: -0.20, changePercent: -1.27, volume: 1_500_000, high: 16.00, low: 15.40, open: 15.80 },
  ],
  'Chemicals': [
    { symbol: 'ENGRO', name: 'Engro Corp', sector: 'Chemicals', price: 324.60, change: -5.80, changePercent: -1.76, volume: 5_400_000, high: 332.00, low: 322.00, open: 330.40 },
    { symbol: 'EPCL', name: 'Engro Polymer', sector: 'Chemicals', price: 42.80, change: 0.60, changePercent: 1.42, volume: 7_200_000, high: 43.20, low: 42.00, open: 42.20 },
    { symbol: 'ICI', name: 'ICI Pakistan', sector: 'Chemicals', price: 820.50, change: -8.40, changePercent: -1.01, volume: 320_000, high: 830.00, low: 818.00, open: 828.90 },
    { symbol: 'LOTCHEM', name: 'Lotte Chemical', sector: 'Chemicals', price: 22.10, change: 0.15, changePercent: 0.68, volume: 4_500_000, high: 22.40, low: 21.80, open: 21.95 },
    { symbol: 'DOL', name: 'Descon Oxychem', sector: 'Chemicals', price: 145.30, change: 1.80, changePercent: 1.25, volume: 680_000, high: 146.00, low: 143.00, open: 143.50 },
  ],
};

export const portfolioHoldings: PortfolioHolding[] = [
  { symbol: 'MEBL', type: 'Stock', shares: 500, avgBuyPrice: 262.00, currentPrice: 285.50 },
  { symbol: 'SYS', type: 'Stock', shares: 200, avgBuyPrice: 480.00, currentPrice: 452.30 },
  { symbol: 'LUCK', type: 'Stock', shares: 100, avgBuyPrice: 845.00, currentPrice: 892.15 },
  { symbol: 'HBL', type: 'Stock', shares: 300, avgBuyPrice: 165.00, currentPrice: 178.25 },
  { symbol: 'FFC', type: 'Stock', shares: 400, avgBuyPrice: 155.00, currentPrice: 168.90 },
  { symbol: 'OGDC', type: 'Stock', shares: 1000, avgBuyPrice: 128.50, currentPrice: 134.80 },
];

export function generateCandleData(days: number, targetPrice: number = 280): CandleData[] {
  const data: CandleData[] = [];
  let price = targetPrice;
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate data backwards from today
    const volatility = price * 0.03; // 3% volatility based on price
    const direction = Math.random() > 0.48 ? 1 : -1;
    
    const close = price;
    const open = close - (direction * Math.random() * volatility);
    const high = Math.max(open, close) + (Math.random() * volatility * 0.2);
    const low = Math.min(open, close) - (Math.random() * volatility * 0.2);

    data.unshift({
      time: Math.floor(date.getTime() / 1000),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
    });

    price = open;
  }
  return data;
}

export function generateIndexData(days: number) {
  const data: { time: number; value: number }[] = [];
  let value = 62000;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    value += (Math.random() - 0.42) * 300;
    data.push({
      time: Math.floor(date.getTime() / 1000),
      value: +value.toFixed(2),
    });
  }
  return data;
}

export function generatePortfolioValueData(days: number) {
  const data: { time: number; value: number }[] = [];
  let value = 850000;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    value += (Math.random() - 0.45) * 8000;
    data.push({
      time: Math.floor(date.getTime() / 1000),
      value: +value.toFixed(2),
    });
  }
  return data;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}

export function formatPKR(n: number): string {
  return 'Rs. ' + n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
