import { useMemo, useState } from 'react';
import { ArrowLeft, Trash2, TrendingUp, TrendingDown, ReceiptText, Loader2 } from 'lucide-react';
import { formatPKR, formatNumber, generateCandleData } from '@/data/mockData';
import { useQuery } from '@tanstack/react-query';
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
  onDeleteTransaction?: (transactionId: string) => void;
}

export default function StockDetailView({
  symbol,
  name,
  marketData,
  portfolioHolding,
  onBack,
  onTrade,
  onDelete,
  onDeleteTransaction
}: StockDetailViewProps) {
  const currentPrice = marketData?.currentPrice ?? portfolioHolding?.currentPrice ?? 0;
  const changePercent = marketData?.changePercent ?? portfolioHolding?.profitLossPercent ?? 0;
  const isPositive = changePercent >= 0;
  const [timeRange, setTimeRange] = useState('3M');

  // 1. Fetch Real History for the Stock
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['stockHistory', symbol, timeRange],
    queryFn: async () => {
      const daysMap: Record<string, number> = {
        'Current': 7,   // 7 days
        '1M': 30,       // 30 days
        '3M': 90,       // 90 days
        '1Y': 365,      // 365 days
        'ALL': 1000     // Roughly all data
      };
      const currentDays = daysMap[timeRange] || 30;
      const res = await fetch(`/api/market/history/${symbol}?days=${currentDays}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 300000, 
  });

  const candleData = useMemo(() => {
    // 2. Prioritize Real Database History
    if (historyData && historyData.length > 0) {
      return historyData.map((pt: any, i: number) => {
        const prev = historyData[i - 1] || pt;
        return {
          time: pt.time,
          open: prev.value,
          high: Math.max(prev.value, pt.value),
          low: Math.min(prev.value, pt.value),
          close: pt.value,
        };
      });
    }

    // 3. Keep fallback for smooth transition when no history points exist yet
    const rangeMap: Record<string, number> = {
      'Current': 7, 
      '1M': 30,
      '3M': 90,
      '1Y': 365
    };
    const days = rangeMap[timeRange] || 90;
    return generateCandleData(days, currentPrice);
  }, [historyData, currentPrice, timeRange]);
  const txnCount = portfolioHolding?.transactions?.length ?? 0;

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
          <div className="text-lg md:text-2xl font-mono-tabular font-bold">{formatPKR(currentPrice)}</div>
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
            {['Current', '1M', '3M', '1Y'].map(range => (
              <button 
                key={range}
                onClick={() => setTimeRange(range)}
                className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-colors ${
                  range === timeRange ? 'bg-primary text-primary-foreground' : 'glass hover:bg-surface-hover'
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
                    <th className="px-6 py-3 font-medium text-right w-[44px]"> </th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium text-right">Qty</th>
                    <th className="px-6 py-3 font-medium text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {portfolioHolding.transactions?.map((txn: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 text-right">
                        {/*
                          If this ledger has only 1 transaction, deleting it should delete the whole holding.
                          Otherwise we delete the individual transaction (needs transactionId).
                        */}
                        {(() => {
                          const txnId = txn.transactionId ?? txn.transaction_id;
                          const canDeleteCompany = txnCount <= 1 && !!onDelete;
                          const canDeleteTxn = txnCount > 1 && !!onDeleteTransaction && !!txnId;
                          const disabled = !(canDeleteCompany || canDeleteTxn);

                          return (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg glass hover:bg-destructive/10 text-psx-red transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                          title="Delete transaction"
                          disabled={disabled}
                          onClick={(e) => {
                            e.stopPropagation();

                            // If this is the only transaction, delete the whole company/holding.
                            if (txnCount <= 1) {
                              if (!onDelete) return;
                              onDelete();
                              return;
                            }

                            // Otherwise delete just this transaction (requires transactionId).
                            if (txnId && onDeleteTransaction) {
                              onDeleteTransaction(txnId);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                          );
                        })()}
                      </td>
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
