import { useState, useMemo, useEffect } from 'react';
import { formatPKR, watchlistStocks, generateCandleData, TOP_PSX_SYMBOLS } from '@/data/mockData';
import CandlestickChart from '@/components/charts/CandlestickChart';
// --- [ NEW ] | Added Wallet, Briefcase, and Activity icons for the summary cards ---
import { Plus, X, ArrowLeft, Loader2, Trash2, AlertTriangle, TrendingUp, TrendingDown, ArchiveRestore, History, Check, Wallet, Briefcase, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import StockDetailView from '@/components/Market/StockDetailView';
import { DetailCard } from '@/components/ui/detail-card';

export default function Portfolio() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [deleteSymbol, setDeleteSymbol] = useState<string | null>(null); 
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);

  // Fetch Portfolio
  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/portfolio', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      return res.json();
    },
    refetchInterval: 300000 // Poll every 5 minutes
  });

  const holdings = portfolioData?.items || [];

  // Fetch Bin
  const { data: binData } = useQuery({
    queryKey: ['portfolio', 'bin'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/portfolio/bin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch bin');
      return res.json();
    }
  });

  const binItems = binData || [];

  // Add Trade Mutation
  const addTradeMutation = useMutation({
    mutationFn: async (trade: { symbol: string; action: string; shares: number; price: number }) => {
      const token = await getToken();
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trade)
      });
      if (!res.ok) throw new Error('Failed to add trade');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setShowModal(false);
    }
  });

  // Delete Holding Mutation
  const deleteMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const token = await getToken();
      const res = await fetch(`/api/portfolio/${symbol}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete holding');
      return res.json();
    },
    onSuccess: (_, deletedSymbol) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'bin'] });
      setDeleteSymbol(null);
      if (selectedSymbol === deletedSymbol) setSelectedSymbol(null);
    }
  });

  // Delete Single Transaction Mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const token = await getToken();
      const res = await fetch(`/api/portfolio/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete transaction');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setDeleteTransactionId(null);
    }
  });

  // Restore Holding Mutation
  const restoreMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const token = await getToken();
      const res = await fetch(`/api/portfolio/restore/${symbol}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to restore holding');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'bin'] });
    }
  });

  // Empty Bin Mutation
  const emptyBinMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/portfolio/bin/all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to clear bin');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'bin'] });
      setShowEmptyBinConfirm(false);
    }
  });

  const [showEmptyBinConfirm, setShowEmptyBinConfirm] = useState(false);

  const selectedHolding = holdings.find((h: any) => h.symbol === selectedSymbol);
  const selectedTransaction =
    deleteTransactionId && selectedHolding?.transactions
      ? selectedHolding.transactions.find((t: any) => (t.transactionId ?? t.transaction_id) === deleteTransactionId)
      : null;

  // --- [ NEW ] | Safe Summary Calculation Logic ---
  // Calculates totals natively to ensure accuracy even if the backend payload shape changes
  const calculatedTotalCost = holdings.reduce((sum: number, h: any) => sum + (h.totalCost || 0), 0);
  const calculatedTotalValue = holdings.reduce((sum: number, h: any) => sum + (h.totalValue || 0), 0);
  const calculatedTotalPL = calculatedTotalValue - calculatedTotalCost;
  const calculatedTotalPLPercent = calculatedTotalCost > 0 ? (calculatedTotalPL / calculatedTotalCost) * 100 : 0;

  const summary = {
    cost: portfolioData?.totalCost ?? calculatedTotalCost,
    value: portfolioData?.totalValue ?? calculatedTotalValue,
    pl: portfolioData?.totalProfitLoss ?? calculatedTotalPL,
    plPercent: portfolioData?.totalProfitLossPercent ?? calculatedTotalPLPercent
  };
  const isTotalPositive = summary.pl >= 0;

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-thin space-y-4 md:space-y-6 relative">
      {selectedSymbol && selectedHolding ? (
        <StockDetailView
          symbol={selectedSymbol}
          name={watchlistStocks.find(s => s.symbol === selectedSymbol)?.name || TOP_PSX_SYMBOLS.find(s => s.symbol === selectedSymbol)?.name}
          portfolioHolding={selectedHolding}
          onBack={() => setSelectedSymbol(null)}
          onTrade={() => {
            setSelectedSymbol(null);
            setShowModal(true);
          }}
          onDelete={() => setDeleteSymbol(selectedHolding.symbol)}
          onDeleteTransaction={(transactionId) => setDeleteTransactionId(transactionId)}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">My Portfolio</h1>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.15em] mt-1">Tap a tile to view detailed breakdown</p>
              </div>
              {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary/40" />}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-body font-medium rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Add Trade
            </button>
          </div>

          {/* --- [ NEW ] | Portfolio Summary Grid --- */}
          {holdings.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 my-6">
              <div className="glass-strong rounded-xl p-4 flex flex-col gap-1.5 border border-border/60">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Total Investment</span>
                </div>
                <span className="text-base md:text-xl font-bold font-mono-tabular text-text-primary">{formatPKR(summary.cost)}</span>
              </div>

              <div className="glass-strong rounded-xl p-4 flex flex-col gap-1.5 border border-border/60">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Current Value</span>
                </div>
                <span className="text-base md:text-xl font-bold font-mono-tabular text-primary">{formatPKR(summary.value)}</span>
              </div>

              <div className="glass-strong rounded-xl p-4 flex flex-col gap-1.5 border border-border/60">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Total P&L</span>
                </div>
                <span className={`text-base md:text-xl font-bold font-mono-tabular ${isTotalPositive ? 'text-psx-green' : 'text-psx-red'}`}>
                  {isTotalPositive ? '+' : ''}{formatPKR(summary.pl)}
                </span>
              </div>

              <div className="glass-strong rounded-xl p-4 flex flex-col gap-1.5 border border-border/60">
                <div className="flex items-center gap-2 text-text-secondary">
                  {isTotalPositive ? <TrendingUp className="w-4 h-4 text-psx-green" /> : <TrendingDown className="w-4 h-4 text-psx-red" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest">Overall Return</span>
                </div>
                <span className={`text-base md:text-xl font-bold font-mono-tabular ${isTotalPositive ? 'text-psx-green' : 'text-psx-red'}`}>
                  {isTotalPositive ? '▲' : '▼'} {Math.abs(summary.plPercent).toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* Tiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {holdings.map((h: any) => (
              <PortfolioTile
                key={h.symbol}
                holding={h}
                onClick={() => setSelectedSymbol(h.symbol)}
                onDelete={() => setDeleteSymbol(h.symbol)}
              />
            ))}
          </div>

          {/* Bin Section (Recently Deleted) */}
          {binItems.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <History className="w-4 h-4" />
                  <h2 className="text-subheader font-semibold">Recently Deleted</h2>
                  <span className="text-label px-2 py-0.5 rounded-full bg-muted">{binItems.length}</span>
                </div>
                
                <button
                  onClick={() => setShowEmptyBinConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-psx-red hover:bg-destructive/10 transition-colors text-label font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Empty Bin
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 opacity-70 grayscale-[0.5] hover:grayscale-0 transition-all">
                {binItems.map((h: any) => (
                  <div key={h.symbol} className="glass rounded-xl p-4 flex items-center justify-between group">
                    <div>
                      <div className="font-semibold">{h.symbol}</div>
                      <div className="text-label text-muted-foreground">Deleted {new Date(h.deletedAt).toLocaleTimeString()}</div>
                    </div>
                    <button
                      onClick={() => restoreMutation.mutate(h.symbol)}
                      disabled={restoreMutation.isPending}
                      className="p-2 rounded-lg bg-psx-green/10 text-psx-green hover:bg-psx-green/20 transition-colors flex items-center gap-1.5 text-label font-medium"
                    >
                      <ArchiveRestore className="w-4 h-4" />
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals Container (Global) */}
      <AnimatePresence>
        {showModal && (
          <AddTradeModal
            onClose={() => setShowModal(false)}
            onAdd={(trade) => addTradeMutation.mutate(trade)}
            isPending={addTradeMutation.isPending}
            currentHoldings={holdings}
            binItems={binItems}
          />
        )}
        {deleteSymbol && (
          <DeleteConfirmModal
            symbol={deleteSymbol}
            onClose={() => setDeleteSymbol(null)}
            onConfirm={() => deleteMutation.mutate(deleteSymbol)}
            isPending={deleteMutation.isPending}
          />
        )}
        {deleteTransactionId && selectedTransaction && (
          <DeleteTransactionConfirmModal
            transaction={selectedTransaction}
            onClose={() => setDeleteTransactionId(null)}
            onConfirm={() => deleteTransactionMutation.mutate(deleteTransactionId)}
            isPending={deleteTransactionMutation.isPending}
          />
        )}
        {showEmptyBinConfirm && (
          <EmptyBinConfirmModal
            onClose={() => setShowEmptyBinConfirm(false)}
            onConfirm={() => emptyBinMutation.mutate()}
            isPending={emptyBinMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteTransactionConfirmModal({
  transaction,
  onClose,
  onConfirm,
  isPending,
}: {
  transaction: any;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const action = transaction?.action;
  const shares = transaction?.shares;
  const price = transaction?.price;
  const date = transaction?.date;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="glass-strong border border-destructive/30 rounded-xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-psx-red" />
        </div>

        <h2 className="text-subheader font-bold mb-2">Delete Transaction</h2>
        <p className="text-body text-muted-foreground mb-4">
          This will remove the {action} of <span className="font-mono-tabular">{shares}</span> shares at{" "}
          <span className="font-mono-tabular">{formatPKR(price)}</span> from the ledger.
        </p>
        <p className="text-[10px] text-muted-foreground mb-6">
          {date ? new Date(date).toLocaleDateString() : '—'}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full py-2 rounded-lg font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Delete
          </button>

          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full py-2 rounded-lg font-medium text-foreground bg-surface hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PortfolioTile({ holding, onClick, onDelete }: { holding: any; onClick: () => void; onDelete: () => void }) {
  const positive = (holding?.profitLoss ?? 0) >= 0;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass rounded-xl p-4 text-left w-full transition-all hover:shadow-lg relative group"
    >
      {/* Delete Icon (shows on hover for desktop, always for mobile) */}
      <div
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-psx-red transition-colors opacity-80 hover:opacity-100 z-10"
      >
        <Trash2 className="w-4 h-4" />
      </div>

      <div className="flex items-center justify-between mb-3 pr-8">
        <span className="text-subheader font-semibold">{holding?.symbol}</span>
        <span className={`text-label font-mono-tabular font-medium px-2 py-0.5 rounded-md ${positive ? 'bg-primary/10 text-psx-green' : 'bg-destructive/10 text-psx-red'
          }`}>
          {positive ? '▲' : '▼'} {Math.abs(holding?.profitLossPercent ?? 0).toFixed(2)}%
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-body">
          <span className="text-muted-foreground">Total Stocks</span>
          <span className="font-mono-tabular font-medium">{holding?.shares}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-muted-foreground">Total Cost</span>
          <span className="font-mono-tabular font-medium">{formatPKR(holding?.totalCost ?? 0)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-muted-foreground">Current Value</span>
          <span className="font-mono-tabular font-medium text-primary">{formatPKR(holding?.totalValue ?? 0)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-muted-foreground">Avg Buy Price</span>
          <span className="font-mono-tabular font-medium">{formatPKR(holding?.averageBuyPrice ?? 0)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-muted-foreground">Current Price</span>
          <span className="font-mono-tabular font-medium">{formatPKR(holding?.currentPrice ?? 0)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-muted-foreground">Profit/Loss</span>
          <span className={`font-mono-tabular font-medium ${positive ? 'text-psx-green' : 'text-psx-red'}`}>
            {formatPKR(holding?.profitLoss ?? 0)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}


function AddTradeModal({ onClose, onAdd, isPending, currentHoldings, binItems = [] }: { onClose: () => void; onAdd: (trade: any) => void, isPending: boolean, currentHoldings: any[], binItems?: any[] }) {
  const { getToken } = useAuth();
  const [symbol, setSymbol] = useState('');
  const [action, setAction] = useState('Buy');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [resetHistory, setResetHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Check if current symbol is in bin
  const isBinned = useMemo(() => {
    return binItems.some((item: any) => item.symbol === symbol.toUpperCase());
  }, [symbol, binItems]);

  // Reset flag if symbol changes and is NOT binned anymore
  useEffect(() => {
    if (!isBinned) setResetHistory(false);
  }, [isBinned]);

  const suggestions = useMemo(() => {
    if (!symbol) return TOP_PSX_SYMBOLS.slice(0, 50);
    return TOP_PSX_SYMBOLS.filter(s =>
      s.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
      s.name.toLowerCase().includes(symbol.toLowerCase())
    ).slice(0, 50);
  }, [symbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedShares = parseInt(shares);
    const parsedPrice = parseFloat(price);
    const upperSymbol = symbol.toUpperCase();

    if (!upperSymbol || !parsedShares || !parsedPrice || isPending) return;

    // 1 | Check if it is in our local Top 50 list
    const isInTop50 = TOP_PSX_SYMBOLS.some(s => s.symbol === upperSymbol);

    // 2 | If not in Top 50, ping the backend to verify it is a real PSX stock
    if (!isInTop50) {
      try {
        const token = await getToken();
        // Efficient verify call (new endpoint)
        const res = await fetch(`/api/market/verify/${upperSymbol}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Verification failed');

        const { exists } = await res.json();
        if (!exists) {
          setError(`Error: Symbol '${upperSymbol}' not found on PSX.`);
          return; 
        }
      } catch (err) {
        setError("Unable to verify symbol right now.");
        return;
      }
    }

    // Validation: Selling more than owned
    if (action === 'Sell') {
      const existingStock = currentHoldings.find(h => h.symbol === upperSymbol);
      const ownedShares = existingStock ? existingStock.shares : 0;

      if (parsedShares > ownedShares) {
        setError(`You only own ${ownedShares} shares of ${upperSymbol}. You cannot sell ${parsedShares}.`);
        return;
      }
    }

    onAdd({ 
      symbol: upperSymbol, 
      action, 
      shares: parsedShares, 
      price: parsedPrice,
      reset_history: resetHistory 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-strong rounded-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-subheader font-semibold">Execute Trade</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-psx-red text-body">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 mb-4 bg-input/30 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => { setAction('Buy'); setError(null); }}
              className={`flex-1 py-1.5 text-body rounded-md transition-colors ${action === 'Buy' ? 'bg-psx-green/20 text-psx-green font-medium' : 'text-muted-foreground'
                }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => { setAction('Sell'); setError(null); }}
              className={`flex-1 py-1.5 text-body rounded-md transition-colors ${action === 'Sell' ? 'bg-psx-red/20 text-psx-red font-medium' : 'text-muted-foreground'
                }`}
            >
              Sell
            </button>
          </div>

          <div className="relative">
            <label className="text-label text-muted-foreground block mb-1.5">Symbol</label>
            <input
              value={symbol}
              onChange={e => {
                setSymbol(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g. SYS"
              className="w-full h-9 px-3 text-body bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors uppercase"
            />

            {/* Symbol Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-20 w-full mt-1 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg overflow-hidden shadow-2xl max-h-[400px] overflow-y-auto scrollbar-thin"
                >
                  <div className="py-1">
                    {suggestions.map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        onClick={() => {
                          setSymbol(s.symbol);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 group border-b border-border/10 last:border-0"
                      >
                        <div className="w-5 h-5 rounded-md border border-border/50 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/50 transition-all shrink-0">
                          <Check className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{s.symbol}</span>
                          <span className="text-[10px] text-muted-foreground uppercase truncate max-w-[220px] leading-tight">
                            {s.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label text-muted-foreground block mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder="100"
                className="w-full h-9 px-3 text-body bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors font-mono-tabular"
              />
            </div>
            <div>
              <label className="text-label text-muted-foreground block mb-1.5">Price (Rs.)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="450.50"
                className="w-full h-9 px-3 text-body bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors font-mono-tabular"
              />
            </div>
          </div>

          {isBinned && action === 'Buy' && (
            <div className="p-3 bg-psx-green/10 border border-psx-green/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-body font-medium text-psx-green">Previously Binned</div>
                  <div className="text-[10px] text-muted-foreground italic">Would you like to reset history for {symbol.toUpperCase()}?</div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetHistory(!resetHistory)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${resetHistory ? 'bg-psx-green' : 'bg-muted'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${resetHistory ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {resetHistory 
                  ? "Old transactions will be deleted. Starting fresh with this trade." 
                  : "Previous transactions will be restored and this trade added to them."}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-9 bg-primary text-primary-foreground text-body font-medium rounded-lg hover:opacity-90 transition-opacity mt-2 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Processing...' : `Confirm ${action}`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// NEW COMPONENT: 5-Second Timer Delete Confirmation Modal
function DeleteConfirmModal({ symbol, onClose, onConfirm, isPending }: { symbol: string; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  const [timer, setTimer] = useState(5);

  useEffect(() => {
    if (timer > 0) {
      const intervalId = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [timer]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="glass-strong border border-destructive/30 rounded-xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-psx-red" />
        </div>

        <h2 className="text-subheader font-bold mb-2">Move {symbol} to Bin?</h2>
        <p className="text-body text-muted-foreground mb-6">
          This holding will be hidden from your main portfolio and moved to the bin. You can restore it any time from the "Recently Deleted" section below.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={timer > 0 || isPending}
            className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${timer > 0
              ? 'bg-destructive/10 text-muted-foreground cursor-not-allowed'
              : 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20'
              }`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {timer > 0 ? `Confirm in ${timer}s` : 'Yes, Delete Asset'}
          </button>

          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full py-2 rounded-lg font-medium text-foreground bg-surface hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyBinConfirmModal({ onClose, onConfirm, isPending }: { onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="glass-strong border border-destructive/30 rounded-xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-psx-red" />
        </div>

        <h2 className="text-subheader font-bold mb-2">Empty Bin?</h2>
        <p className="text-body text-muted-foreground mb-6">
          This will permanently delete all stocks in your "Recently Deleted" section. This action cannot be undone.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full py-2 rounded-lg font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Clear Everything
          </button>

          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full py-2 rounded-lg font-medium text-foreground bg-surface hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}