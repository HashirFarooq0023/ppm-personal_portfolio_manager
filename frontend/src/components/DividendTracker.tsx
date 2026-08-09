import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { formatPKR } from '@/data/mockData';
import { Plus, Trash2, DollarSign, Loader2, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DividendTracker() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [symbol, setSymbol] = useState('');
  const [netDividend, setNetDividend] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch Dividends
  const { data: dividends = [], isLoading } = useQuery({
    queryKey: ['dividends'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/dividends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dividends');
      return res.json();
    }
  });

  // Add Dividend Mutation
  const addDividendMutation = useMutation({
    mutationFn: async (payload: { symbol: string; net_dividend: number; date_received?: string }) => {
      const token = await getToken();
      const res = await fetch('/api/dividends', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to log dividend');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dividends'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      setSymbol('');
      setNetDividend('');
      setDateReceived('');
      setError(null);
    }
  });

  // Delete Dividend Mutation
  const deleteDividendMutation = useMutation({
    mutationFn: async (dividendId: string) => {
      const token = await getToken();
      const res = await fetch(`/api/dividends/${dividendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete dividend');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dividends'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      setError('Please enter a valid stock symbol.');
      return;
    }
    const amount = parseFloat(netDividend);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a positive dividend amount.');
      return;
    }

    addDividendMutation.mutate({
      symbol: symbol.trim().toUpperCase(),
      net_dividend: amount,
      date_received: dateReceived ? new Date(dateReceived).toISOString() : undefined
    });
  };

  const totalDividends = dividends.reduce((acc: number, d: any) => acc + (d.net_dividend || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <div className="glass-strong border border-border/10 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-1">
            <DollarSign className="w-4 h-4 text-psx-green" />
            <span>Total Dividend Income</span>
          </div>
          <div className="text-3xl font-bold text-psx-green font-mono-tabular">
            {formatPKR(totalDividends)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Net cash payouts credited to bank/broker account</p>
        </div>

        {/* Log Dividend Quick Form */}
        <form onSubmit={handleSubmit} className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 bg-input/20 p-2 border border-border/30 rounded-xl">
          <input
            type="text"
            placeholder="SYMBOL (e.g. MEBL)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-28 h-9 px-3 text-xs bg-input/50 border border-border/50 rounded-lg uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-psx-green/50 font-bold"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Net Amount (Rs.)"
            value={netDividend}
            onChange={(e) => setNetDividend(e.target.value)}
            className="w-36 h-9 px-3 text-xs bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-psx-green/50 font-mono-tabular"
          />
          <input
            type="date"
            value={dateReceived}
            onChange={(e) => setDateReceived(e.target.value)}
            className="h-9 px-2 text-xs bg-input/50 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-psx-green/50"
          />
          <button
            type="submit"
            disabled={addDividendMutation.isPending}
            className="h-9 px-4 bg-psx-green text-black font-semibold text-xs rounded-lg hover:bg-psx-green/90 transition-all flex items-center gap-1.5 shrink-0"
          >
            {addDividendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Log Dividend
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-psx-red text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dividend History Table */}
      <div className="glass-strong border border-border/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/10 flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-psx-green" />
            Dividend History Ledger
          </h3>
          <span className="text-xs text-muted-foreground font-mono-tabular">{dividends.length} Entries</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-psx-green" />
            <span>Loading dividend history...</span>
          </div>
        ) : dividends.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-sm">No dividend records logged yet.</p>
            <p className="text-xs mt-1">Use the form above to add cash dividend payouts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-input/20 border-b border-border/10 uppercase text-muted-foreground font-medium">
                <tr>
                  <th className="py-3 px-4">Date Received</th>
                  <th className="py-3 px-4">Ticker</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {dividends.map((d: any) => (
                  <tr key={d.dividend_id || d.dividendId} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono-tabular">
                      {d.date_received || d.dateReceived ? new Date(d.date_received || d.dateReceived).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">{d.symbol}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-psx-green">
                      +{formatPKR(d.net_dividend)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => deleteDividendMutation.mutate(d.dividend_id || d.dividendId)}
                        disabled={deleteDividendMutation.isPending}
                        className="p-1 text-muted-foreground hover:text-psx-red transition-colors rounded"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
