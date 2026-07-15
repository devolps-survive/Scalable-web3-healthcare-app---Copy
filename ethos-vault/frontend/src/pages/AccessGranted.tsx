import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type UserProfile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useJoinSession} from '../hooks/useSocket';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';


export function AccessGranted() {
  const navigate = useNavigate();
  const { sessionId, setProfile, profile, token } = useAuth();
  const hasRunRef = useRef(false);
  const [draft, setDraft] = useState({
    displayName: profile?.displayName || 'Wallet Holder',
    role: profile?.role || 'Web3 Citizen',
    bio: profile?.bio || '',
    organization: profile?.organization || '',
    website: profile?.website || '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useJoinSession(sessionId);

  useEffect(() => {
    if (!sessionId) {
      navigate('/connect-wallet');
      return;
    }
     if (hasRunRef.current) return;    // ADD THIS LINE
    hasRunRef.current = true; 
    // Don't set a fallback profile - wait for the real profile from API
    // This prevents name flickering between wallet address and real name
    api.grantAccess(sessionId)
      .then((res) => {
        const walletAddress = res.profile.walletAddress || profile?.walletAddress || '';
        const resolvedProfile: UserProfile = {
          ...res.profile,
          walletAddress,
          fullAddress: walletAddress || res.profile.fullAddress,
          displayName: res.profile.displayName || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'User'),
          avatarInitials: res.profile.avatarInitials || (walletAddress ? walletAddress.slice(2, 4).toUpperCase() : 'U'),
        };
        setProfile(resolvedProfile, res.token);
        setDraft({
          displayName: resolvedProfile.displayName || 'User',
          role: resolvedProfile.role || 'Web3 Citizen',
          bio: resolvedProfile.bio || '',
          organization: resolvedProfile.organization || '',
          website: resolvedProfile.website || '',
        });
      })
      .catch((err) => {
        console.error('grantAccess failed:', err);
        navigate('/connect-wallet', { replace: true, state: { error: err?.message || 'Wallet access was not granted.' } });
      });
  }, [sessionId, navigate, setProfile, token]);

  useEffect(() => {
    if (profile) {
      setDraft({
        displayName: profile.displayName || 'Wallet Holder',
        role: profile.role || 'Web3 Citizen',
        bio: profile.bio || '',
        organization: profile.organization || '',
        website: profile.website || '',
      });
    }
  }, [profile]);

  const displayProfile = useMemo(() => {
    if (profile) {
      return {
        ...profile,
        avatarInitials: profile.avatarInitials || profile.displayName?.slice(0, 2).toUpperCase() || 'WU',
      };
    }

    return {
      displayName: 'Wallet Holder',
      role: 'Web3 Citizen',
      walletAddress: '0x0000...0000',
      avatarInitials: 'WU',
      verified: true,
    };
  }, [profile]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');

    try {
      const updated = await api.updateProfile({
        displayName: draft.displayName,
        role: draft.role,
        bio: draft.bio,
        organization: draft.organization,
        website: draft.website,
      });
      if (token) {
        setProfile(updated.profile, token);
      }
      setNotice('Profile updated successfully.');
    } catch {
      setNotice('We could not save your profile yet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <AmbientBackground />

      <main className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        <div className="mb-6 sm:mb-8 relative">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full primary-gradient flex items-center justify-center animate-pulse-glow mx-auto">
            <Icon name="verified_user" className="text-4xl sm:text-5xl text-on-secondary" filled />
          </div>
          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-container flex items-center justify-center">
            <Icon name="check" className="text-on-primary-container text-base" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-on-surface mb-2 text-glow-primary">
          Access Granted
        </h1>
        <p className="text-sm sm:text-base text-on-surface-variant mb-6 sm:mb-8">
          Your wallet has been verified. Welcome to the Ethos Vault institutional gateway.
        </p>

        <GlassCard className="p-4 sm:p-6 w-full mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full primary-gradient flex items-center justify-center text-xs sm:text-sm font-bold text-on-secondary shrink-0">
              {displayProfile.avatarInitials}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-on-surface truncate">{displayProfile.displayName}</p>
              <p className="text-xs sm:text-sm text-on-surface-variant">{displayProfile.role}</p>
              <p className="text-xs text-primary font-mono mt-1 truncate">{displayProfile.walletAddress}</p>
            </div>
            <Icon name="verified" className="text-primary shrink-0" filled />
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleSaveProfile}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-left text-sm text-on-surface-variant">
                <span className="mb-1 block">Display name</span>
                <input
                  value={draft.displayName}
                  onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface outline-none"
                  placeholder="Your preferred name"
                />
              </label>
              <label className="text-left text-sm text-on-surface-variant">
                <span className="mb-1 block">Role</span>
                <input
                  value={draft.role}
                  onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
                  className="w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface outline-none"
                  placeholder="Patient, doctor, researcher..."
                />
              </label>
            </div>
            <label className="block text-left text-sm text-on-surface-variant">
              <span className="mb-1 block">Bio</span>
              <textarea
                value={draft.bio}
                onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface outline-none"
                placeholder="Tell people what you want them to know about you"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-left text-sm text-on-surface-variant">
                <span className="mb-1 block">Organization</span>
                <input
                  value={draft.organization}
                  onChange={(event) => setDraft((current) => ({ ...current, organization: event.target.value }))}
                  className="w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface outline-none"
                  placeholder="Your organization"
                />
              </label>
              <label className="text-left text-sm text-on-surface-variant">
                <span className="mb-1 block">Website</span>
                <input
                  value={draft.website}
                  onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
                  className="w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface outline-none"
                  placeholder="https://example.com"
                />
              </label>
            </div>
            {notice && <p className="text-sm text-primary">{notice}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="md" disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </Button>
              <Button variant="secondary" size="md" onClick={() => navigate('/dashboard')}>
                Skip for now
              </Button>
            </div>
          </form>
        </GlassCard>

        <Button size="lg" className="w-full sm:w-auto min-h-[48px]" onClick={() => navigate('/dashboard')}>
          Enter Dashboard
        </Button>
      </main>
    </div>
  );
}
