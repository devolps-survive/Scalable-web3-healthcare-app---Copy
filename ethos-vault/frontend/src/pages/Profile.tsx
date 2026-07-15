import { useEffect, useState } from 'react';
import { api, type UserProfile } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    api.getProfile().then((res) => {
      setProfile(res.profile);
      setFormData({
        displayName: res.profile.displayName,
        contactEmail: res.profile.contactEmail || '',
        contactPhone: res.profile.contactPhone || '',
      });
    });
  }, []);

  const handleSave = async () => {
    try {
      await api.updateProfile(formData);
      api.getProfile().then((res) => setProfile(res.profile));
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  if (!profile) {
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
      <TopAppBar title="Profile" showBack />

      <main className="pt-20 px-container-padding pb-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full primary-gradient mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-on-secondary">
            {profile.avatarInitials}
          </div>
          <h2 className="text-2xl font-bold text-on-surface">{profile.displayName}</h2>
          <p className="text-on-surface-variant capitalize">{profile.role}</p>
          {profile.verified && (
            <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-primary-container/20 text-primary text-xs font-semibold">
              <Icon name="verified" className="text-sm" filled />
              Verified
            </div>
          )}
        </div>

        <div className="space-y-4">
          <GlassCard className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                Personal Information
              </h3>
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-primary hover:underline"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                    Display Name
                  </label>
                  <GlassCard className="p-3 !overflow-visible">
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-transparent text-sm text-on-surface outline-none"
                    />
                  </GlassCard>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                    Email
                  </label>
                  <GlassCard className="p-3 !overflow-visible">
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full bg-transparent text-sm text-on-surface outline-none"
                    />
                  </GlassCard>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                    Phone
                  </label>
                  <GlassCard className="p-3 !overflow-visible">
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full bg-transparent text-sm text-on-surface outline-none"
                    />
                  </GlassCard>
                </div>
                <button
                  onClick={handleSave}
                  className="w-full min-h-[44px] primary-gradient text-on-secondary font-medium rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'ID', value: profile.id },
                  { label: 'Role', value: profile.role, capitalize: true },
                  { label: 'Wallet Address', value: profile.fullAddress, mono: true },
                  { label: 'Email', value: profile.contactEmail || 'Not provided' },
                  { label: 'Phone', value: profile.contactPhone || 'Not provided' },
                  { label: 'Member Since', value: new Date(profile.memberSince).toLocaleDateString() },
                  { label: 'Verification Status', value: profile.verificationStatus || 'pending', capitalize: true },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-start gap-4">
                    <span className="text-sm text-on-surface-variant shrink-0">{row.label}</span>
                    <span
                      className={`text-sm font-medium text-on-surface text-right break-all ${
                        row.mono ? 'font-mono text-xs' : ''
                      } ${row.capitalize ? 'capitalize' : ''}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
              Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Icon name="lock" className="text-primary" />
                <span className="flex-1 text-sm text-on-surface">Wallet Authentication</span>
                <span className="text-xs text-primary font-semibold">Active</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="shield" className="text-primary" />
                <span className="flex-1 text-sm text-on-surface">Data Encryption</span>
                <span className="text-xs text-primary font-semibold">AES-256</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="link" className="text-primary" />
                <span className="flex-1 text-sm text-on-surface">Blockchain Records</span>
                <span className="text-xs text-primary font-semibold">Enabled</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </AppLayout>
  );
}
