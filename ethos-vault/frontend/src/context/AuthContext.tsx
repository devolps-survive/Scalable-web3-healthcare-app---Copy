import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { UserProfile } from '../api/client';
import {
  loadStoredAuth,
  setAuthStorage,
  clearAuthStorage,
  api,
} from '../api/client';
import { disconnectSocket } from '../lib/socket';

interface AuthState {
  sessionId: string | null;
  token: string | null;
  profile: UserProfile | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  accessGranted: boolean;
  hideBalances: boolean;
}

interface AuthContextType extends AuthState {
  setSession: (sessionId: string) => void;
  setProfile: (profile: UserProfile, token: string) => void;
  logout: () => Promise<void>;
  toggleHideBalances: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AuthState>({
    sessionId: null,
    token: null,
    profile: null,
    walletAddress: null,
    isAuthenticated: false,
    accessGranted: false,
    hideBalances: false,
  });

  useEffect(() => {
    const stored = loadStoredAuth();
    if (stored) {
      setState({
        sessionId: stored.sessionId,
        token: stored.token,
        profile: stored.profile,
        walletAddress: stored.profile?.walletAddress || stored.profile?.fullAddress || null,
        isAuthenticated: true,
        accessGranted: true,
        hideBalances: false,
      });
      // Only re-fetch profile if needed, don't cause unnecessary updates
      // api.getProfile()
      //   .then((res) => {
      //     setAuthStorage(stored.token, stored.sessionId, res.profile);
      //     setState((s) => ({ ...s, profile: res.profile }));
      //   })
      //   .catch(() => {});
    }
    setLoading(false);
  }, []);

  const setSession = useCallback((sessionId: string) => {
    setState((s) => ({ ...s, sessionId }));
  }, []);

  const setProfile = useCallback(
    (profile: UserProfile, token: string) => {
      const sessionId = state.sessionId || loadStoredAuth()?.sessionId || '';
      setAuthStorage(token, sessionId, profile);
      setState({
        sessionId,
        token,
        profile,
        walletAddress: profile.walletAddress || profile.fullAddress || null,
        isAuthenticated: true,
        accessGranted: true,
        hideBalances: state.hideBalances,
      });
    },
    [state.sessionId, state.hideBalances],
  );

  const logout = useCallback(async () => {
    if (state.sessionId) {
      try {
        await api.logout(state.sessionId);
      } catch {
        /* proceed */
      }
    }
    clearAuthStorage();
    disconnectSocket();
    setState({
      sessionId: null,
      token: null,
      profile: null,
      walletAddress: null,
      isAuthenticated: false,
      accessGranted: false,
      hideBalances: false,
    });
  }, [state.sessionId]);

  const toggleHideBalances = useCallback(() => {
    setState((s) => ({ ...s, hideBalances: !s.hideBalances }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, setSession, setProfile, logout, toggleHideBalances, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
