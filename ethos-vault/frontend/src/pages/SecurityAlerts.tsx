import { useEffect, useState, useCallback } from 'react';
import { api, type SecurityAlert } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useJoinUser, useSocketEvent } from '../hooks/useSocket';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

const severityConfig = {
  high: { icon: 'error', color: 'text-error', bg: 'bg-error-container/30' },
  medium: { icon: 'warning', color: 'text-secondary', bg: 'bg-secondary-container/20' },
  low: { icon: 'info', color: 'text-primary', bg: 'bg-primary-container/20' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SecurityAlerts() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);

  const load = useCallback(() => {
    api.getSecurityAlerts().then((res) => setAlerts(res.alerts)).catch(console.error);
  }, []);

  useJoinUser(profile?.userId || null);
  useSocketEvent('alert:new', () => load(), [profile?.userId]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    const res = await api.markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)));
  };

  const markAllRead = async () => {
    const unread = alerts.filter((a) => !a.read);
    await Promise.all(unread.map((a) => api.markAlertRead(a.id)));
    load();
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <AppLayout>
      <TopAppBar title="Security Alerts" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8 max-w-2xl mx-auto">
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Security Alerts</h2>
            <p className="text-sm text-on-surface-variant">Monitor account security events</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <>
                <span className="px-2.5 py-1 rounded-full bg-error-container text-error text-xs font-bold">
                  {unreadCount} new
                </span>
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline min-h-[44px] px-2"
                >
                  Mark all read
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            return (
              <GlassCard
                key={alert.id}
                className={`p-3 sm:p-4 ${!alert.read ? 'border-primary/30' : ''}`}
                hover={!alert.read}
              >
                <button
                  className="w-full text-left"
                  onClick={() => !alert.read && markRead(alert.id)}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}
                    >
                      <Icon name={config.icon} className={`text-base sm:text-lg ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm sm:text-base font-medium text-on-surface">{alert.title}</p>
                        {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-primary-container shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-1">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] sm:text-xs text-on-surface-variant">
                          {formatDate(alert.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </GlassCard>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
}
