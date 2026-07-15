import { useEffect, useState } from 'react';
import { api, type AdminDashboard } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboard | null>(null);

  useEffect(() => {
    api.getAdminDashboard().then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TopAppBar title="Admin Dashboard" showSettings />

      <main className="w-full pt-16 px-3 sm:px-4 lg:px-6 pb-24 sm:pb-8 space-y-4 sm:space-y-6">
        <GlassCard className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
              Platform Overview
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold text-on-surface text-glow-primary">
              EASEeHealth Admin
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {[
              { id: 'verifications', label: 'Verifications', icon: 'verified', route: '/admin/verifications', count: data.pendingVerifications },
              { id: 'users', label: 'Users', icon: 'people', route: '/admin/users', count: data.totalPatients + data.verifiedDoctors },
              { id: 'audit', label: 'Audit Log', icon: 'history', route: '/admin/audit' },
              { id: 'status', label: 'Platform Status', icon: 'monitor_heart', route: '/admin/status' },
            ].map((action) => (
              <div
                key={action.id}
                className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-container-high/50 p-2.5 sm:gap-2 sm:p-3"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full primary-gradient flex items-center justify-center">
                  <Icon name={action.icon} className="text-on-secondary text-base sm:text-lg" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-on-surface">{action.label}</span>
                {action.count !== undefined && (
                  <span className="text-lg font-bold text-primary">{action.count}</span>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="person" className="text-primary" />
              <span className="text-sm text-on-surface-variant">Total Patients</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.totalPatients}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="medical_services" className="text-primary" />
              <span className="text-sm text-on-surface-variant">Verified Doctors</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.verifiedDoctors}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="pending" className="text-secondary" />
              <span className="text-sm text-on-surface-variant">Pending Verifications</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.pendingVerifications}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="folder" className="text-primary" />
              <span className="text-sm text-on-surface-variant">Medical Records</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.medicalRecords}</p>
          </GlassCard>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="emergency" className="text-error" />
              <span className="text-sm text-on-surface-variant">Emergency Requests</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.emergencyRequests}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="security" className="text-primary" />
              <span className="text-sm text-on-surface-variant">Platform Security</span>
            </div>
            <p className="text-lg font-bold text-primary">All Systems Operational</p>
          </GlassCard>
        </section>
      </main>
    </AppLayout>
  );
}
