import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, type DashboardData } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useJoinUser, useSocketEvent } from '../hooks/useSocket';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function Dashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDashboard();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      console.error('[Dashboard] Error loading dashboard:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useJoinUser(profile?.userId || null);

  useSocketEvent('dashboard:update', () => loadDashboard(), [profile?.userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen px-4">
          <GlassCard className="max-w-md w-full p-6 text-center">
            <Icon name="error" className="text-error text-4xl mb-4" />
            <h2 className="text-xl font-bold text-on-surface mb-2">Failed to load dashboard</h2>
            <p className="text-sm text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={loadDashboard}
              className="px-4 py-2 rounded-lg bg-primary text-on-secondary font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </GlassCard>
        </div>
      </AppLayout>
    );
  }

  const isPatient = profile?.role === 'patient';
  const isDoctor = profile?.role === 'doctor';
  const isAdmin = profile?.role === 'admin';

  return (
    <AppLayout>
      <TopAppBar
        title="EASEeHealth"
        subtitle={`${isPatient ? 'Patient' : isDoctor ? 'Doctor' : 'Admin'} Portal`}
        showSettings
      />

      <main className="w-full pt-16 px-3 sm:px-4 lg:px-6 pb-24 sm:pb-8 space-y-4 sm:space-y-6">
        <GlassCard className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
                Welcome back
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold text-on-surface text-glow-primary truncate">
                {profile?.displayName || 'User'}
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1 capitalize">
                {profile?.role || 'patient'}
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full primary-gradient flex items-center justify-center text-on-secondary text-xl font-bold">
              {profile?.avatarInitials || 'U'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {(data.quickActions || []).map((action) => (
              <Link
                key={action.id}
                to={action.route}
                className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-container-high/50 p-2.5 transition-all hover:bg-primary-container/10 active:scale-95 sm:gap-2 sm:p-3"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full primary-gradient flex items-center justify-center">
                  <Icon name={action.icon} className="text-on-secondary text-base sm:text-lg" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-on-surface">{action.label}</span>
              </Link>
            ))}
          </div>
        </GlassCard>

        {isPatient && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="folder" className="text-primary" />
                <span className="text-sm text-on-surface-variant">Medical Records</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.totalRecords || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="verified_user" className="text-primary" />
                <span className="text-sm text-on-surface-variant">Active Consents</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.activeConsents || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="emergency" className="text-error" />
                <span className="text-sm text-on-surface-variant">Emergency Requests</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.pendingEmergencies || 0}</p>
            </GlassCard>
          </section>
        )}

        {isDoctor && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="people" className="text-primary" />
                <span className="text-sm text-on-surface-variant">Authorized Patients</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.authorizedPatients || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="upload" className="text-primary" />
                <span className="text-sm text-on-surface-variant">Recent Uploads</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.recentUploads || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="badge" className={data.verification?.status === 'approved' ? 'text-primary' : 'text-secondary'}>
                </Icon>
                <span className="text-sm text-on-surface-variant">Verification</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-on-surface capitalize">
                {data.verification?.status || 'pending'}
              </p>
            </GlassCard>
          </section>
        )}

        {isAdmin && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="person" className="text-primary" />
                <span className="text-sm text-on-surface-variant">Total Patients</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.totalPatients || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="medical_services" className="text-primary" />
                <span className="text-sm text-on-surface-variant">Verified Doctors</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.totalDoctors || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="pending" className="text-secondary" />
                <span className="text-sm text-on-surface-variant">Pending Verifications</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.pendingVerifications || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="folder" className="text-primary" />
                <span className="text-sm text-on-surface-variant">Medical Records</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-on-surface">{data.totalRecords || 0}</p>
            </GlassCard>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[
            { to: '/profile', icon: 'person', label: 'Profile' },
            { to: '/settings', icon: 'settings', label: 'Settings' },
            { to: '/security-alerts', icon: 'shield', label: 'Security Alerts' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:bg-white/5 active:scale-[0.98] transition-all"
            >
              <Icon name={link.icon} className="text-primary" />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </section>
      </main>
    </AppLayout>
  );
}
