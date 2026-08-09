import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { X, Save, Loader2, Settings, Percent, Hash, Building2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface BrokerSettingsModalProps {
  onClose: () => void;
}

export default function BrokerSettingsModal({ onClose }: BrokerSettingsModalProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [brokerName, setBrokerName] = useState('JS Global');
  const [feeType, setFeeType] = useState<'Percentage' | 'Flat_Per_Share'>('Percentage');
  const [feeValue, setFeeValue] = useState<string>('0.15');
  const [salesTaxRate, setSalesTaxRate] = useState<string>('13.0');
  const [successMsg, setSuccessMsg] = useState(false);

  // Fetch Current Settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/user/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user settings');
      return res.json();
    }
  });

  useEffect(() => {
    if (settings) {
      setBrokerName(settings.broker_name || 'JS Global');
      setFeeType(settings.fee_type === 'Flat_Per_Share' ? 'Flat_Per_Share' : 'Percentage');
      setFeeValue(settings.fee_value !== undefined ? String(settings.fee_value) : '0.15');
      setSalesTaxRate(settings.sales_tax_rate !== undefined ? String(settings.sales_tax_rate) : '13.0');
    }
  }, [settings]);

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: { broker_name: string; fee_type: string; fee_value: number; sales_tax_rate: number }) => {
      const token = await getToken();
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      broker_name: brokerName,
      fee_type: feeType,
      fee_value: parseFloat(feeValue) || 0,
      sales_tax_rate: parseFloat(salesTaxRate) || 0
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-strong rounded-2xl w-full max-w-md p-6 border border-border/30 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-psx-green/20 text-psx-green flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Broker & Fee Settings</h2>
              <p className="text-xs text-muted-foreground">Configure commission slabs & taxes for automatic trade logging</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-psx-green" />
            <span>Loading broker profile...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Broker Name Selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-psx-green" />
                Brokerage Firm
              </label>
              <select
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-input/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:border-psx-green/50 font-bold"
              >
                <option value="JS Global">JS Global Capital Limited</option>
                <option value="AKD Securities">AKD Securities Limited</option>
                <option value="KTrade Securities">KTrade (KASB Securities)</option>
                <option value="MRA Securities">MRA Securities Limited</option>
                <option value="BMA Capital">BMA Capital Management</option>
                <option value="Custom Broker">Custom / Negotiated Slab</option>
              </select>
            </div>

            {/* Commission Type Radio Buttons */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Commission Structure Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-input/30 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFeeType('Percentage')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    feeType === 'Percentage'
                      ? 'bg-psx-green/20 text-psx-green border border-psx-green/30 shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  % Trade Value
                </button>
                <button
                  type="button"
                  onClick={() => setFeeType('Flat_Per_Share')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    feeType === 'Flat_Per_Share'
                      ? 'bg-psx-green/20 text-psx-green border border-psx-green/30 shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  Flat Rs. / Share
                </button>
              </div>
            </div>

            {/* Fee Value & Sales Tax Input Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  {feeType === 'Percentage' ? 'Commission Rate (%)' : 'Flat Fee (Rs. per share)'}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  placeholder={feeType === 'Percentage' ? '0.15' : '0.05'}
                  className="w-full h-10 px-3 text-xs bg-input/50 border border-border/50 rounded-xl text-foreground font-mono-tabular focus:outline-none focus:border-psx-green/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Broker Sales Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={salesTaxRate}
                  onChange={(e) => setSalesTaxRate(e.target.value)}
                  placeholder="13.0"
                  className="w-full h-10 px-3 text-xs bg-input/50 border border-border/50 rounded-xl text-foreground font-mono-tabular focus:outline-none focus:border-psx-green/50"
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed italic bg-white/5 p-2.5 rounded-lg border border-border/10">
              * Example: 1,000 shares @ Rs. 50 (Rs. 50,000 gross). At 0.15% commission + 13% SST, your automated fee is Rs. 84.75.
            </p>

            {successMsg && (
              <div className="p-3 bg-psx-green/10 border border-psx-green/30 rounded-xl text-psx-green text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Broker settings saved & updated!
              </div>
            )}

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full h-10 bg-psx-green text-black font-semibold text-xs rounded-xl hover:bg-psx-green/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-psx-green/20 mt-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Broker Profile
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
