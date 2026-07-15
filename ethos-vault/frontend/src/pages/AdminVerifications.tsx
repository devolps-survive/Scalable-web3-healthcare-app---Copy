import { useEffect, useState } from 'react';
import { api, type DoctorVerification } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function AdminVerifications() {
  const [verifications, setVerifications] = useState<DoctorVerification[]>([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    api.getAdminVerifications(filter).then((res) => setVerifications(res.verifications)).catch(console.error);
  }, [filter]);

  const handleApprove = async (id: string) => {
    try {
      await api.approveVerification(id);
      setVerifications((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'approved' } : v)));
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.rejectVerification(id, reason);
      setVerifications((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'rejected', rejection_reason: reason } : v)));
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await api.suspendVerification(id);
      setVerifications((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'suspended' } : v)));
    } catch (err) {
      console.error('Failed to suspend:', err);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'text-secondary',
    approved: 'text-primary',
    rejected: 'text-error',
    suspended: 'text-error',
  };

  return (
    <AppLayout>
      <TopAppBar title="Doctor Verifications" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Doctor Verifications</h2>
          <p className="text-sm text-on-surface-variant">Review and manage doctor verification requests</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {['pending', 'approved', 'rejected', 'suspended'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`min-h-[36px] px-4 py-2 rounded-full text-xs font-medium transition-all ${
                filter === status
                  ? 'primary-gradient text-on-secondary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-2 sm:space-y-3">
          {verifications.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="verified" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No verifications found</p>
            </GlassCard>
          ) : (
            verifications.map((verification) => (
              <GlassCard key={verification.id} className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                    <span className="text-sm sm:text-base font-bold text-primary">
                      {verification.hospital_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm sm:text-base font-medium text-on-surface truncate">
                        {verification.hospital_name}
                      </p>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold capitalize shrink-0 ${
                          statusColors[verification.status] || 'text-on-surface-variant'
                        }`}
                      >
                        {verification.status}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-1">
                      {verification.specialization}
                    </p>
                    {verification.license_number && (
                      <p className="text-xs text-on-surface-variant mb-1">
                        License: {verification.license_number}
                      </p>
                    )}
                    {verification.rejection_reason && (
                      <p className="text-xs text-error mb-1">{verification.rejection_reason}</p>
                    )}
                    <p className="text-[10px] text-on-surface-variant">
                      Submitted: {new Date(verification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {verification.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(verification.id)}
                          className="px-3 py-1.5 rounded-lg bg-primary-container/20 text-primary text-xs font-medium hover:bg-primary-container/30 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(verification.id)}
                          className="px-3 py-1.5 rounded-lg bg-error-container/20 text-error text-xs font-medium hover:bg-error-container/30 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {verification.status === 'approved' && (
                      <button
                        onClick={() => handleSuspend(verification.id)}
                        className="px-3 py-1.5 rounded-lg bg-error-container/20 text-error text-xs font-medium hover:bg-error-container/30 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
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
