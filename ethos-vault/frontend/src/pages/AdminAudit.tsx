import { useEffect, useState } from 'react';
import { api, type AuditLog } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    api.getAdminAudit(actionFilter, entityFilter).then((res) => setLogs(res.logs)).catch(console.error);
  }, [actionFilter, entityFilter]);

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
      <TopAppBar title="Platform Audit Log" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Platform Audit Log</h2>
          <p className="text-sm text-on-surface-variant">Blockchain activity and system events</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="min-h-[36px] px-4 py-2 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium outline-none"
          >
            <option value="">All Actions</option>
            <option value="consent_granted">Consent Granted</option>
            <option value="consent_revoked">Consent Revoked</option>
            <option value="record_upload">Record Upload</option>
            <option value="emergency_requested">Emergency Request</option>
            <option value="doctor_verified">Doctor Verified</option>
            <option value="user_suspended">User Suspended</option>
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="min-h-[36px] px-4 py-2 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium outline-none"
          >
            <option value="">All Entities</option>
            <option value="consent">Consent</option>
            <option value="medical_record">Medical Record</option>
            <option value="doctor_verification">Doctor Verification</option>
            <option value="user">User</option>
          </select>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {logs.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="history" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No audit logs found</p>
            </GlassCard>
          ) : (
            logs.map((log) => (
              <GlassCard key={log.id} className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <Icon name="receipt" className="text-base sm:text-lg text-on-surface-variant" />
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
