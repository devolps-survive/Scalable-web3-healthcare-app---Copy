import { useEffect, useState, type FormEvent } from 'react';
import { api, type Consent, type DoctorListing } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function Consents() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctors, setDoctors] = useState<DoctorListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorListing | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState('');
 const loadConsents = () => {
    api.getConsents().then((res) => setConsents(res.consents)).catch(console.error);
  };

  useEffect(() => {
    loadConsents();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (doctorSearch.trim().length === 0) {
        setDoctors([]);
        return;
      }
      setSearching(true);
      api.getDoctors(doctorSearch)
        .then((res) => setDoctors(res.doctors))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [doctorSearch]);

  const handleRevoke = async (doctorId: string) => {
    try {
      await api.revokeConsent(doctorId);
      setConsents((prev) => prev.map((c) => (c.doctor_id === doctorId ? { ...c, is_active: false } : c)));
    } catch (err) {
      console.error('Failed to revoke consent:', err);
    }
  };
const handleGrant = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !expiresAt) return;

    setGranting(true);
    setGrantError('');
    try {
      await api.grantConsent(selectedDoctor.id, new Date(expiresAt).toISOString());
      setSelectedDoctor(null);
      setDoctorSearch('');
      setDoctors([]);
      setExpiresAt('');
      loadConsents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to grant consent';
      setGrantError(message);
    } finally {
      setGranting(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <AppLayout>
      <TopAppBar title="Consent Management" showBack />

      <main className="mx-auto w-full max-w-2xl px-3 pb-24 pt-16 sm:px-4 sm:pt-20 sm:pb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-on-surface">Consent Management</h2>
          <p className="text-on-surface-variant">
            Manage doctor access to your medical records
          </p>
        </div>

        <GlassCard className="p-4 sm:p-6 mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
            Grant New Consent
          </h3>

          {!selectedDoctor ? (
            <div>
              <GlassCard className="p-3 !overflow-visible mb-2">
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Search doctors by name or specialization..."
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                />
              </GlassCard>

              {searching && (
                <p className="text-xs text-on-surface-variant px-1">Searching...</p>
              )}

              {!searching && doctorSearch.trim().length > 0 && doctors.length === 0 && (
                <p className="text-xs text-on-surface-variant px-1">No approved doctors found.</p>
              )}

              {doctors.length > 0 && (
                <div className="space-y-2 mt-2">
                  {doctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoctor(doc)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/50 hover:bg-primary-container/10 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center text-xs font-bold text-on-secondary shrink-0">
                        {doc.avatarInitials || 'DR'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">{doc.displayName}</p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {doc.specialization || 'General'}{doc.hospitalName ? ` • ${doc.hospitalName}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleGrant} className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-container/10 border border-primary/20">
                <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center text-xs font-bold text-on-secondary shrink-0">
                  {selectedDoctor.avatarInitials || 'DR'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{selectedDoctor.displayName}</p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {selectedDoctor.specialization || 'General'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="text-xs text-on-surface-variant hover:text-error shrink-0"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant mb-1.5 block uppercase tracking-wider font-semibold">
                  Consent expires on
                </label>
                <GlassCard className="p-3 !overflow-visible">
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-transparent text-sm text-on-surface outline-none"
                  />
                </GlassCard>
              </div>

              {grantError && <p className="text-sm text-error">{grantError}</p>}

              <button
                type="submit"
                disabled={granting || !expiresAt}
                className="w-full min-h-[44px] primary-gradient text-on-secondary font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {granting ? 'Granting access...' : 'Grant Consent'}
              </button>
            </form>
          )}
        </GlassCard>

    <div className="space-y-3">
          {consents.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="verified_user" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No consents granted yet</p>
            </GlassCard>
          ) : (
            consents.map((consent) => {
              const expired = isExpired(consent.expires_at);
              return (
                <GlassCard key={consent.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-on-surface">
                          {consent.doctor_name || 'Doctor'}
                        </p>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            expired
                              ? 'bg-error-container/20 text-error'
                              : consent.is_active
                                ? 'bg-primary-container/20 text-primary'
                                : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {expired ? 'Expired' : consent.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant mb-2">
  Doctor ID: {consent.doctor_id_display || (consent.doctor_id ? `${consent.doctor_id.slice(0, 8)}...` : 'Unknown')}
</p>
                      <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                        <span>Granted: {formatDate(consent.granted_at)}</span>
                        <span>•</span>
                        <span>Expires: {formatDate(consent.expires_at)}</span>
                      </div>
                    </div>
                    {consent.is_active && !expired && (
                      <button
                        onClick={() => handleRevoke(consent.doctor_id)}
                        className="px-3 py-2 rounded-lg bg-error-container/20 text-error text-xs font-medium hover:bg-error-container/30 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>

        <GlassCard className="mt-6 p-4 flex items-start gap-3">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-sm text-on-surface-variant">
            Doctors can only access your records while consent is active and not expired.
            You can revoke access at any time.
          </p>
        </GlassCard>
      </main>
    </AppLayout>
  );
}
