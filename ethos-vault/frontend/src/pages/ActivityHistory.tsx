import { useEffect, useState, useCallback } from 'react';
import { api, type ActivityItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useJoinUser, useSocketEvent } from '../hooks/useSocket';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

const typeIcons: Record<string, string> = {
  send: 'north_east',
  receive: 'south_west',
  swap: 'swap_horiz',
  auth: 'login',
  stake: 'savings',
};

const statusColors: Record<string, string> = {
  completed: 'text-primary',
  pending: 'text-secondary',
  pending_confirmation: 'text-secondary',
  failed: 'text-error',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityHistory() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const load = useCallback(() => {
    api.getActivities().then((res) => setActivities(res.activities)).catch(console.error);
  }, []);

  useJoinUser(profile?.userId || null);
  useSocketEvent('transaction:confirmed', () => load(), [profile?.userId]);
  useSocketEvent('transaction:created', () => load(), [profile?.userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppLayout>
      <TopAppBar title="Activity History" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Activity History</h2>
          <p className="text-sm text-on-surface-variant">Your recent transactions and events</p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {activities.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="history" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No activity yet</p>
            </GlassCard>
          ) : (
            activities.map((item) => (
              <GlassCard key={item.id} className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4" hover>
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                    item.type === 'send'
                      ? 'bg-error-container/30'
                      : item.type === 'receive'
                        ? 'bg-primary-container/20'
                        : 'bg-surface-container-high'
                  }`}
                >
                  <Icon
                    name={typeIcons[item.type] || 'receipt'}
                    className={`text-base sm:text-lg ${item.type === 'send' ? 'text-error' : 'text-primary'}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm sm:text-base font-medium text-on-surface truncate">{item.title}</p>
                    {item.amount && (
                      <p className="text-xs sm:text-sm font-medium text-on-surface shrink-0">{item.amount}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-[10px] sm:text-xs text-on-surface-variant truncate">{item.counterparty}</p>
                    <span className={`text-[10px] sm:text-xs capitalize shrink-0 ${statusColors[item.status] || 'text-on-surface-variant'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant mt-0.5">{formatDate(item.timestamp)}</p>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </main>
    </AppLayout>
  );
}
