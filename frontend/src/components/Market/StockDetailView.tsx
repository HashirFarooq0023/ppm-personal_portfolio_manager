import { useMemo } from 'react';
import { ArrowLeft, Trash2, TrendingUp, TrendingDown, ReceiptText } from 'lucide-react';
import { formatPKR, formatNumber, generateCandleData } from '@/data/mockData';
import CandlestickChart from '@/components/charts/CandlestickChart';
import { DetailCard } from '@/components/ui/detail-card';

interface StockDetailViewProps {
  symbol: string;
  name?: string;
  marketData?: any;
  portfolioHolding?: any;
  onBack: () => void;
  onTrade?: () => void;
  onDelete?: () => void;
}

export default function StockDetailView({
  symbol,
  name,
  marketData,
  portfolioHolding,
  onBack,
  onTrade,
  onDelete
}: StockDetailViewProps) {
  const currentPrice = marketData?.currentPrice ?? portfolioHolding?.currentPrice ?? 0;
  const changePercent = marketData?.changePercent ?? portfolioHolding?.profitLossPercent ?? 0;
  const isPositive = changePercent >= 0;
  const candleData = useMemo(() => generateCandleData(90, currentPrice), [symbol, currentPrice]);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-thin space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{symbol}</h1>
            {marketData?.lastUpdated && (
              <span className="w-2 h-2 rounded-full bg-psx-green animate-pulse" title="Live" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{name || symbol}</p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-mono-tabular font-bold">{formatPKR(currentPrice)}</div>
          <div className={`flex items-center justify-end gap-1 font-mono-tabular text-sm font-medium ${isPositive ? 'text-psx-green' : 'text-psx-red'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-3">
        {onTrade && (
          <button 
            onClick={onTrade}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            Execute Trade
          </button>
        )}
        {portfolioHolding && onDelete && (
          <button 
            onClick={onDelete}
            className="w-12 h-12 rounded-xl glass flex items-center justify-center text-psx-red hover:bg-destructive/10 transition-colors"
            title="Remove from portfolio"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <DetailCard 
          label="Current Price" 
          value={formatPKR(currentPrice)} 
        />
        <DetailCard 
          label="Day High" 
          value={formatPKR(marketData?.high ?? currentPrice * 1.02)} 
        />
        <DetailCard 
          label="Day Low" 
          value={formatPKR(marketData?.low ?? currentPrice * 0.98)} 
        />
        <DetailCard 
          label="Volume" 
          value={formatNumber(marketData?.volume ?? 0)} 
        />
        <DetailCard 
          label="Sector" 
          value={marketData?.sector || 'General'} 
        />
        {portfolioHolding && (
          <DetailCard 
            label="Avg Buy Price" 
            value={formatPKR(portfolioHolding.averageBuyPrice)} 
            highlight={portfolioHolding.averageBuyPrice < currentPrice ? 'green' : 'red'}
          />
        )}
      </div>

      {/* Chart Section */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Price History
          </h3>
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
          <CandlestickChart data={candleData} height={350} />
        </div>
      </div>

      {/* Portfolio Section (Conditional) */}
      {portfolioHolding && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2 px-1">
            <ReceiptText className="w-4 h-4 text-psx-green" />
            Your Position
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <DetailCard label="Shares Owned" value={portfolioHolding.shares.toString()} />
            <DetailCard label="Avg Buy Price" value={formatPKR(portfolioHolding.averageBuyPrice)} />
            <DetailCard label="Total Cost" value={formatPKR(portfolioHolding.totalCost)} />
            <DetailCard label="Current Value" value={formatPKR(portfolioHolding.totalValue)} />
            <DetailCard 
              label="Net P/L" 
              value={`${portfolioHolding.profitLoss >= 0 ? '+' : ''}${formatPKR(portfolioHolding.profitLoss)}`} 
              highlight={portfolioHolding.profitLoss >= 0 ? 'green' : 'red'}
            />
            <DetailCard 
              label="Net P/L %" 
              value={`${portfolioHolding.profitLossPercent >= 0 ? '+' : ''}${portfolioHolding.profitLossPercent.toFixed(2)}%`} 
              highlight={portfolioHolding.profitLossPercent >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Transaction Ledger */}
          <div className="glass rounded-2xl overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5">
              <h4 className="font-medium">Transaction Ledger</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground bg-white/5">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium text-right">Qty</th>
                    <th className="px-6 py-3 font-medium text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {portfolioHolding.transactions?.map((txn: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground">{new Date(txn.date).toLocaleDateString()}</td>
                      <td className={`px-6 py-3 font-medium ${txn.action === 'Buy' ? 'text-psx-green' : 'text-psx-red'}`}>
                        {txn.action}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-tabular">{txn.shares}</td>
                      <td className="px-6 py-3 text-right font-mono-tabular">{formatPKR(txn.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
