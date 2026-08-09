import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { formatPKR } from '@/data/mockData';
import { CheckCircle2, AlertOctagon, Scale, Save, Loader2, Info, ArrowUpRight, PlusCircle, MinusCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CashReconciliationWidget() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [totalDeposited, setTotalDeposited] = useState<string>('');
  const [currentCash, setCurrentCash] = useState<string>('');

  // Fetch Cash Reconciliation Data
  const { data: audit, isLoading } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/account/reconciliation', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch cash reconciliation');
      return res.json();
    }
  });

  useEffect(() => {
    if (audit) {
      setTotalDeposited(audit.total_cash_deposited ? String(audit.total_cash_deposited) : '');
      setCurrentCash(audit.current_cash_balance ? String(audit.current_cash_balance) : '');
    }
  }, [audit]);

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: { total_cash_deposited: number; current_cash_balance: number }) => {
      const token = await getToken();
      const res = await fetch('/api/account/reconciliation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update cash settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      total_cash_deposited: parseFloat(totalDeposited) || 0,
      current_cash_balance: parseFloat(currentCash) || 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status Badge */}
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        isLoading
          ? 'glass-strong border-border/10'
          : audit?.is_reconciled
          ? 'bg-psx-green/10 border-psx-green/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
          : 'bg-psx-red/10 border-psx-red/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            audit?.is_reconciled ? 'bg-psx-green/20 text-psx-green' : 'bg-psx-red/20 text-psx-red'
          }`}>
            {audit?.is_reconciled ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : (
              <AlertOctagon className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Zero Balance Cash Reconciliation</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                audit?.is_reconciled
                  ? 'bg-psx-green/20 text-psx-green border border-psx-green/30'
                  : 'bg-psx-red/20 text-psx-red border border-psx-red/30'
              }`}>
                {audit?.is_reconciled ? '✅ Reconciled' : '❌ Discrepancy Found'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {audit?.is_reconciled
                ? 'Your calculated cash balance matches your broker statement perfectly!'
                : `Discrepancy of ${formatPKR(Math.abs(audit?.discrepancy || 0))}. Check for unrecorded trade fees, dividends, or withdrawals.`}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right font-mono-tabular">
          <div className="text-xs text-muted-foreground uppercase font-bold">Calculated Cash Balance</div>
          <div className="text-2xl font-extrabold text-foreground">
            {formatPKR(audit?.calculated_cash_balance || 0)}
          </div>
        </div>
      </div>

      {/* Input Configuration & Formula Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Cash Inputs Form */}
        <div className="glass-strong border border-border/10 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-psx-green" />
            JS Global Account Settings
          </h3>
          <p className="text-xs text-muted-foreground">
            Input your total bank transfers into JS Global and the live cash balance shown on your JS Invest Pro app.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                Total Cash Deposited (Bank → JS Global)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 500000"
                value={totalDeposited}
                onChange={(e) => setTotalDeposited(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-input/50 border border-border/50 rounded-lg text-foreground font-mono-tabular focus:outline-none focus:border-psx-green/50"
              />
              <span className="text-[10px] text-muted-foreground italic">Total lifetime PKR transferred into broker account</span>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                Current Cash Balance (JS Invest Pro App)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 150000"
                value={currentCash}
                onChange={(e) => setCurrentCash(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-input/50 border border-border/50 rounded-lg text-foreground font-mono-tabular focus:outline-none focus:border-psx-green/50"
              />
              <span className="text-[10px] text-muted-foreground italic">Current uninvested cash balance displayed on JS App</span>
            </div>

            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="w-full h-10 bg-psx-green text-black font-semibold text-xs rounded-lg hover:bg-psx-green/90 transition-all flex items-center justify-center gap-2"
            >
              {updateSettingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Audit Account
            </button>
          </form>
        </div>

        {/* Audit Reconciliation Equation Breakdown */}
        <div className="glass-strong border border-border/10 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-psx-green" />
            Reconciliation Mathematical Proof
          </h3>

          <div className="space-y-3 font-mono-tabular text-xs">
            <div className="flex items-center justify-between p-2.5 bg-input/20 rounded-lg border border-border/10">
              <span className="text-muted-foreground font-sans flex items-center gap-1.5">
                Total Cash Deposited
              </span>
              <span className="font-bold text-foreground">{formatPKR(audit?.total_cash_deposited || 0)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-input/20 rounded-lg border border-border/10">
              <span className="text-muted-foreground font-sans flex items-center gap-1.5">
                <MinusCircle className="w-3.5 h-3.5 text-psx-red" /> Net Trade Settlements (Buys + Sells)
              </span>
              <span className={`font-bold ${(audit?.total_net_settled || 0) >= 0 ? 'text-psx-green' : 'text-psx-red'}`}>
                {formatPKR(audit?.total_net_settled || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-input/20 rounded-lg border border-border/10">
              <span className="text-muted-foreground font-sans flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-psx-green" /> Total Dividends Received
              </span>
              <span className="font-bold text-psx-green">+{formatPKR(audit?.total_dividends || 0)}</span>
            </div>

            <div className="h-px bg-border/40 my-2" />

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-border/30 text-sm">
              <span className="font-bold font-sans">Calculated Cash Balance</span>
              <span className="font-extrabold text-foreground">{formatPKR(audit?.calculated_cash_balance || 0)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-border/30 text-sm">
              <span className="font-bold font-sans">App Cash Balance (Entered)</span>
              <span className="font-extrabold text-foreground">{formatPKR(audit?.current_cash_balance || 0)}</span>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border font-bold text-sm ${
              audit?.is_reconciled ? 'bg-psx-green/10 border-psx-green/30 text-psx-green' : 'bg-psx-red/10 border-psx-red/30 text-psx-red'
            }`}>
              <span className="font-sans">Discrepancy (App vs Calc)</span>
              <span>{formatPKR(audit?.discrepancy || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
