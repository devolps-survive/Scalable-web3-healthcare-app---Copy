import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, type AuthStepEvent } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useJoinSession, useSocketEvent } from '../hooks/useSocket';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { Icon } from '../components/ui/Icon';

const steps = [
  'Verifying wallet signature...',
  'Checking institutional credentials...',
  'Validating KYC status...',
  'Establishing secure session...',
];

export function Authenticating() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: contextSessionId } = useAuth();
  // Use sessionId from navigation state first, fallback to context
  const sessionId = (location.state as any)?.sessionId || contextSessionId;
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useJoinSession(sessionId);

  useSocketEvent<AuthStepEvent>(
    'auth:step',
    (data) => {
      setCurrentStep(data.step - 1);
      setProgress(data.progress);
    },
    [sessionId],
  );

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      console.error('[Authenticating] No sessionId available, redirecting to connect-wallet');
      navigate('/connect-wallet');
      return;
    }

    const runAuth = async () => {
      try {
        console.log('[Authenticating] Starting authentication with sessionId:', sessionId);
        const walletAddress = sessionStorage.getItem('ev_wallet_address') || localStorage.getItem('ev_wallet_address') || undefined;
        const walletSignature = sessionStorage.getItem('ev_wallet_signature') || localStorage.getItem('ev_wallet_signature') || undefined;
        console.log('[Authenticating] Retrieved from storage:', { walletAddress, hasSignature: !!walletSignature });
        sessionStorage.removeItem('ev_wallet_address');
        sessionStorage.removeItem('ev_wallet_signature');
        localStorage.removeItem('ev_wallet_address');
        localStorage.removeItem('ev_wallet_signature');
        console.log('[Authenticating] Calling api.authenticate...');
        await api.authenticate(sessionId, walletAddress, walletSignature);
        console.log('[Authenticating] Authentication successful, navigating to /access-granted');
        navigate('/access-granted');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        console.error('[Authenticating] Authentication failed:', message, err);
        setError(message);
        // Don't navigate immediately, show error to user first
        setTimeout(() => {
          navigate('/connect-wallet', { replace: true, state: { error: message } });
        }, 3000);
      }
    };

    runAuth();
  }, [sessionId, navigate]);

  if (!isInitialized) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <AmbientBackground />
        <main className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="mt-4 text-sm text-on-surface-variant">Initializing...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <AmbientBackground />

      <main className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        <div className="relative mb-8 sm:mb-12">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-primary/20 flex items-center justify-center mx-auto">
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"
              style={{ animationDuration: '1.5s' }}
            />
            <Icon name="fingerprint" className="text-4xl sm:text-5xl text-primary" filled />
          </div>
        </div>

        <h1 className="text-xl sm:text-3xl font-bold text-on-surface mb-2">Authenticating...</h1>
        <p className="text-sm sm:text-base text-on-surface-variant mb-6 sm:mb-8">
          Securing your connection with institutional-grade encryption
        </p>

        {error && (
          <div className="w-full mb-4 rounded-2xl border border-error/30 bg-error/10 px-4 py-3">
            <p className="text-error text-sm">{error}</p>
            <p className="text-xs text-on-surface-variant mt-2">Redirecting to connect wallet...</p>
          </div>
        )}

        <div className="w-full mb-6">
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full primary-gradient transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-on-surface-variant mt-2">{progress}% complete</p>
        </div>

        <div className="w-full space-y-3 text-left">
          {steps.map((step, i) => (
            <div
              key={step}
              className={`flex items-center gap-3 transition-opacity ${
                i <= currentStep ? 'opacity-100' : 'opacity-30'
              }`}
            >
              {i < currentStep ? (
                <Icon name="check_circle" className="text-primary shrink-0" filled />
              ) : i === currentStep ? (
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full border border-outline-variant shrink-0" />
              )}
              <span className="text-sm text-on-surface">{step}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
