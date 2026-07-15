import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] | unknown }) => Promise<unknown>;
}

const ROLES = [
  { id: 'patient', label: 'Patient', icon: 'person', description: 'Access your medical records and manage consents' },
  { id: 'doctor', label: 'Doctor', icon: 'medical_services', description: 'View patient records and upload medical data' },
];

export function ConnectWallet() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor'>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>(location.state?.error || '');

  // Registration Form Fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const handleConnect = async () => {
    if (!displayName.trim()) {
      setError('Display Name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
      let walletAddress: string | undefined;

      if (!ethereum || typeof ethereum.request !== 'function') {
        throw new Error('No compatible browser wallet was found. Please install MetaMask or another Ethereum wallet.');
      }

      try {
        const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[];
        walletAddress = accounts?.[0];
      } catch (err: any) {
        console.error('eth_requestAccounts failed:', err);
        if (err?.code === 4001) {
          throw new Error('Connection request rejected. Please approve the connection popup in your wallet.');
        } else if (err?.code === -32002) {
          throw new Error('A wallet connection request is already pending. Please check your wallet extension.');
        }
        throw new Error(err?.message || 'Wallet connection was cancelled. Please approve the request to continue.');
      }

      if (!walletAddress) {
        throw new Error('No wallet address found.');
      }

      const res = await api.connectWallet(walletAddress, undefined, selectedRole, {
        displayName,
        email,
        phone,
        emergencyContact
      });
      
      let signature: string | undefined;
      if (res.challenge) {
        try {
          signature = (await ethereum.request({
            method: 'personal_sign',
            params: [res.challenge, walletAddress],
          })) as string;
        } catch (err: any) {
          console.error('personal_sign failed:', err);
          if (err?.code === 4001) {
            throw new Error('Message signing was rejected. Signing is required to verify ownership.');
          } else if (err?.code === -32002) {
            throw new Error('A signing request is already pending. Please check your wallet extension.');
          }
          throw new Error(err?.message || 'Message signing was cancelled.');
        }
      }

      sessionStorage.setItem('ev_wallet_address', walletAddress);
      localStorage.setItem('ev_wallet_address', walletAddress);
      if (signature) {
        sessionStorage.setItem('ev_wallet_signature', signature);
        localStorage.setItem('ev_wallet_signature', signature);
      }

      console.log('[ConnectWallet] Setting session and navigating to /authenticating:', { sessionId: res.sessionId });
      setSession(res.sessionId);
      navigate('/authenticating', { state: { sessionId: res.sessionId } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to connect wallet right now.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <TopAppBar showBack minimal />

      <main className="relative z-10 pt-32 pb-24 px-6 max-w-xl mx-auto flex flex-col items-center">
        <div className="mb-stack-gap-lg relative">
          <div className="w-20 h-20 rounded-3xl primary-gradient animate-pulse-glow flex items-center justify-center rotate-3">
            <Icon name="account_balance_wallet" className="text-4xl text-on-surface" filled />
          </div>
        </div>

        <div className="text-center mb-stack-gap-lg">
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">Connect Wallet</h1>
          <p className="text-on-surface-variant">
            Connect your wallet to register or log in to EASEeHealth
          </p>
        </div>

        {error && (
          <div className="mb-4 w-full rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="w-full mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
            Select your role
          </p>
          <div className="grid grid-cols-1 gap-3">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id as any)}
                className={`glass-card rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] ${
                  selectedRole === role.id
                    ? 'border-primary/50 bg-primary/10'
                    : 'hover:bg-white/5 hover:border-primary/30'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center">
                  <Icon name={role.icon} className="text-primary text-2xl" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-on-surface">{role.label}</p>
                  <p className="text-sm text-on-surface-variant">{role.description}</p>
                </div>
                {selectedRole === role.id && (
                  <Icon name="check_circle" className="text-primary" filled />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Registration Information Form */}
        <div className="w-full mb-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
            Profile Details
          </p>
          
          <div>
            <label className="text-[11px] text-on-surface-variant mb-1.5 block uppercase tracking-wider font-semibold">
              Display Name *
            </label>
            <GlassCard className="p-3 !overflow-visible">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter full or display name"
                className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
              />
            </GlassCard>
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant mb-1.5 block uppercase tracking-wider font-semibold">
              Email (Optional)
            </label>
            <GlassCard className="p-3 !overflow-visible">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
              />
            </GlassCard>
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant mb-1.5 block uppercase tracking-wider font-semibold">
              Phone Number (Optional)
            </label>
            <GlassCard className="p-3 !overflow-visible">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
              />
            </GlassCard>
          </div>

          {selectedRole === 'patient' && (
            <div>
              <label className="text-[11px] text-on-surface-variant mb-1.5 block uppercase tracking-wider font-semibold">
                Emergency Contact (Optional)
              </label>
              <GlassCard className="p-3 !overflow-visible">
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Contact Name / Phone"
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
                />
              </GlassCard>
            </div>
          )}
        </div>

        <button
          onClick={handleConnect}
          disabled={loading || !displayName.trim()}
          className="w-full min-h-[52px] primary-gradient text-on-secondary font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Connecting...' : 'Connect & Register'}
        </button>

        <GlassCard className="mt-stack-gap-lg p-4 w-full flex items-start gap-3">
          <Icon name="info" className="text-primary mt-0.5" />
          <p className="text-sm text-on-surface-variant">
            By connecting, you agree to EASEeHealth&apos;s Terms of Service and acknowledge our
            healthcare data privacy protocols.
          </p>
        </GlassCard>
      </main>
    </div>
  );
}
