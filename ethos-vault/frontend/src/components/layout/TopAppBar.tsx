import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

interface TopAppBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
  showHelp?: boolean;
  minimal?: boolean;
}

export function TopAppBar({
  title = 'ETHOS',
  subtitle,
  showBack = false,
  showSettings = false,
  showHelp = true,
  minimal = false,
}: TopAppBarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (minimal) {
    return (
      <>
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-background/40 backdrop-blur-xl border-b border-white/10 safe-top">
          <div className="flex items-center gap-2 min-w-0">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-white/5 -ml-2"
              >
                <Icon name="arrow_back" className="text-on-surface-variant" />
              </button>
            )}
            <Icon name="security" className="text-primary" />
            <span className="text-lg sm:text-xl font-bold tracking-tighter text-primary">{title}</span>
          </div>
          {showHelp && (
            <button
              onClick={() => setShowHelpModal(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
            >
              Help
            </button>
          )}
        </header>
        {showHelpModal && (
          <HelpModal onClose={() => setShowHelpModal(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface-container-low/40 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-3 sm:px-4 lg:px-6 h-14 sm:h-16 safe-top">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-white/5 transition-colors shrink-0"
            >
              <Icon name="arrow_back" className="text-on-surface-variant" />
            </button>
          )}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary/30 shrink-0">
            <Icon name="shield_lock" className="text-primary text-lg sm:text-xl" filled />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-primary tracking-tight leading-none truncate">{title}</h1>
            {subtitle && (
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-on-surface-variant truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {showHelp && (
            <button
              onClick={() => setShowHelpModal(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
            >
              Help
            </button>
          )}
          {showSettings && (
            <Link
              to="/settings"
              className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-white/5 transition-colors"
            >
              <Icon name="settings" className="text-on-surface-variant" />
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-white/5 transition-colors"
            aria-label="Logout"
          >
            <Icon name="logout" className="text-on-surface-variant" />
          </button>
        </div>
      </header>
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
    </>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-on-surface">Help & Support</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
            <Icon name="close" className="text-on-surface-variant" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant">
          Need assistance with Ethos Vault? Contact institutional support at{' '}
          <a href="mailto:support@ethosvault.io" className="text-primary hover:underline">
            support@ethosvault.io
          </a>
        </p>
        <div className="space-y-2 text-sm">
          <p className="text-on-surface"><Icon name="security" className="text-primary align-middle mr-2 text-base" />256-bit encryption on all sessions</p>
          <p className="text-on-surface"><Icon name="support_agent" className="text-primary align-middle mr-2 text-base" />24/7 institutional support</p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl primary-gradient text-on-secondary font-bold min-h-[48px]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
