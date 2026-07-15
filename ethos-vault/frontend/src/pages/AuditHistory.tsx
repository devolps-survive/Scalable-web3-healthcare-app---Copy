import { useEffect, useState } from 'react';
import { api, type AuditLog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

const actionIcons: Record<string, string> = {
  consent_granted: 'verified_user',
  consent_revoked: 'block',
  record_upload: 'upload',
  record_view: 'visibility',
  emergency_requested: 'emergency',
  emergency_approved: 'check_circle',
  login: 'login',
  logout: 'logout',
};

const actionColors: Record<string, string> = {
  consent_granted: 'text-primary',
  consent_revoked: 'text-error',
  record_upload: 'text-primary',
  record_view: 'text-secondary',
  emergency_requested: 'text-error',
  emergency_approved: 'text-primary',
  login: 'text-on-surface-variant',
  logout: 'text-on-surface-variant',
};

export function AuditHistory() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.getAdminAudit('', '', profile?.userId).then((res) => setLogs(res.logs)).catch(console.error);
  }, [profile?.userId]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <AppLayout>
      <TopAppBar title="Audit History" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Audit History</h2>
          <p className="text-sm text-on-surface-variant">Your blockchain activity and access logs</p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {logs.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="history" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No activity yet</p>
            </GlassCard>
          ) : (
            logs.map((log) => (
              <GlassCard key={log.id} className="p-3 sm:p-4" hover>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0`}
                  >
                    <Icon
                      name={actionIcons[log.action] || 'receipt'}
                      className={`text-base sm:text-lg ${actionColors[log.action] || 'text-on-surface-variant'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm sm:text-base font-medium text-on-surface truncate">
                        {formatAction(log.action)}
                      </p>
                      {log.blockchain_tx_hash && (
                        <span className="text-[10px] sm:text-xs text-primary font-medium shrink-0">
                          On-chain
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-[10px] sm:text-xs text-on-surface-variant truncate">
                        {log.actor_name || 'System'} • {log.entity_type || 'N/A'}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-on-surface-variant mt-0.5">{formatDate(log.created_at)}</p>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </main>
    </AppLayout>
  );
}
