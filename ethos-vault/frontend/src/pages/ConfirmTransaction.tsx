import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Transaction } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ConfirmTransaction() {
  const navigate = useNavigate();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pendingId = localStorage.getItem('ev_pending_tx');
    if (pendingId) {
      api.getTransaction(pendingId).then((res) => setTx(res.transaction)).catch(() => {
        api.getPendingTransaction().then((res) => setTx(res.transaction)).catch(() => setError('No pending transaction'));
      });
    } else {
      api.getPendingTransaction().then((res) => setTx(res.transaction)).catch(() => setError('No pending transaction'));
    }
  }, []);

  const handleConfirm = async () => {
    if (!tx) return;
    setConfirming(true);
    try {
      await api.confirmTransaction(tx.id);
      localStorage.removeItem('ev_pending_tx');
      navigate('/activity');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
      setConfirming(false);
    }
  };

  if (!tx && !error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error && !tx) {
    return (
      <AppLayout>
        <TopAppBar title="Confirm Transaction" showBack />
        <main className="pt-20 px-4 text-center">
          <Icon name="receipt_long" className="text-4xl text-on-surface-variant mb-4" />
          <p className="text-on-surface-variant mb-4">{error}</p>
          <Button onClick={() => navigate('/send-assets')}>Send Assets</Button>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TopAppBar title="Confirm Transaction" showBack />

      <main className="mx-auto w-full max-w-lg px-3 pb-24 pt-16 sm:px-4 sm:pt-20 sm:pb-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl primary-gradient mx-auto mb-4 flex items-center justify-center">
            <Icon name="receipt_long" className="text-2xl sm:text-3xl text-on-secondary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Review Transaction</h2>
          <p className="text-sm text-on-surface-variant mt-1">Please verify the details below</p>
        </div>

        {tx && (
          <GlassCard className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="text-center py-3 sm:py-4 border-b border-white/10">
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">
                {tx.amount} {tx.asset}
              </p>
              <p className="text-sm text-on-surface-variant">{formatCurrency(tx.usdValue)}</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {[
                { label: 'From', value: truncateAddress(tx.from) },
                { label: 'To', value: truncateAddress(tx.to) },
                { label: 'Network', value: tx.network },
                { label: 'Gas Fee', value: `${tx.gasFee} ETH (${formatCurrency(tx.gasFeeUsd)})` },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <span className="text-xs sm:text-sm text-on-surface-variant">{row.label}</span>
                  <span className="text-right text-xs font-medium text-on-surface font-mono sm:text-sm">{row.value}</span>
                </div>
              ))}
            </div>

            <GlassCard className="p-3 flex items-start gap-2 !bg-error-container/20 !border-error/30">
              <Icon name="warning" className="text-error shrink-0" />
              <p className="text-xs sm:text-sm text-on-surface-variant">
                This action is irreversible. Ensure the recipient address is correct.
              </p>
            </GlassCard>
          </GlassCard>
        )}

        {error && <p className="text-error text-sm mt-3 text-center">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
          <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button className="flex-1 min-h-[48px]" onClick={handleConfirm} disabled={confirming || !tx}>
            {confirming ? 'Confirming...' : 'Confirm'}
          </Button>
        </div>
      </main>
    </AppLayout>
  );
}
