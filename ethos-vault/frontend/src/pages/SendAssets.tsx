import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type DashboardData } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function SendAssets() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [gasEstimate, setGasEstimate] = useState<{ gasFee: number; gasFeeUsd: number } | null>(null);
  const [asset, setAsset] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard().then(setDashboard).catch(console.error);
    api.getGasEstimate().then(setGasEstimate).catch(console.error);
  }, []);

  const handleSend = async () => {
    if (!amount || !to) return;
    if (!to.startsWith('0x') || to.length < 10) {
      setError('Enter a valid wallet address (0x...)');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await api.sendAssets({ asset, amount: parseFloat(amount), to });
      localStorage.setItem('ev_pending_tx', res.transaction.id);
      navigate('/confirm-transaction');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
      setSending(false);
    }
  };

  const handleMax = () => {
    const selected = dashboard?.assets.find((a) => a.symbol === asset);
    if (selected) {
      setAmount(selected.amount.toString());
    }
  };

  return (
    <AppLayout>
      <TopAppBar title="Send Assets" showBack />

      <main className="mx-auto w-full max-w-lg px-3 pb-24 pt-16 sm:px-4 sm:pt-20 sm:pb-8">
        <div className="mb-6 text-center sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl primary-gradient mx-auto mb-4 flex items-center justify-center">
            <Icon name="send" className="text-2xl sm:text-3xl text-on-secondary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Send Assets</h2>
          <p className="text-sm text-on-surface-variant mt-1">Transfer to another wallet address</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Asset
            </label>
            <div className="flex flex-wrap gap-2">
              {dashboard?.assets.map((a) => (
                <button
                  key={a.symbol}
                  onClick={() => setAsset(a.symbol)}
                  className={`min-h-[44px] flex-1 basis-[calc(33%-0.5rem)] py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    asset === a.symbol
                      ? 'primary-gradient text-on-secondary'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {a.symbol}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                Amount
              </label>
              <button onClick={handleMax} className="text-xs text-primary hover:underline">
                Max
              </button>
            </div>
            <GlassCard className="p-4 !overflow-visible">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-xl sm:text-2xl font-bold text-on-surface outline-none placeholder:text-on-surface-variant/50"
              />
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                ≈ ${amount ? (() => {
                  const selected = dashboard?.assets.find((a) => a.symbol === asset);
                  const price = selected ? selected.value / selected.amount : 0;
                  return (parseFloat(amount) * price).toLocaleString();
                })() : '0.00'} USD
              </p>
            </GlassCard>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Recipient Address
            </label>
            <GlassCard className="p-4 !overflow-visible">
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x..."
                className="w-full bg-transparent text-xs sm:text-sm font-mono text-on-surface outline-none placeholder:text-on-surface-variant/50"
              />
            </GlassCard>
          </div>

          <GlassCard className="p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="local_gas_station" className="text-on-surface-variant text-sm" />
              <span className="text-xs sm:text-sm text-on-surface-variant">Estimated Gas</span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-on-surface">
              {gasEstimate ? `~${gasEstimate.gasFee} ETH ($${gasEstimate.gasFeeUsd})` : 'Loading...'}
            </span>
          </GlassCard>
        </div>

        {error && <p className="text-error text-sm mt-3">{error}</p>}

        <Button
          className="w-full mt-6 min-h-[48px]"
          size="lg"
          onClick={handleSend}
          disabled={!amount || !to || sending}
        >
          {sending ? 'Processing...' : 'Review Transaction'}
        </Button>
      </main>
    </AppLayout>
  );
}
