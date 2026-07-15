import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';


export function DesktopSidebar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getSidebarItems = () => {
    const role = profile?.role || 'patient';
    if (role === 'admin') {
      return [
        { to: '/admin/dashboard', icon: 'dashboard', label: 'Admin Dashboard' },
        { to: '/admin/verifications', icon: 'verified', label: 'Verifications' },
        { to: '/admin/users', icon: 'people', label: 'Users Directory' },
        { to: '/admin/audit', icon: 'history', label: 'Audit Log' },
        { to: '/settings', icon: 'settings', label: 'Settings' },
      ];
    }
    if (role === 'doctor') {
      return [
        { to: '/dashboard', icon: 'dashboard', label: 'Doctor Dashboard' },
        { to: '/doctor/patients', icon: 'people', label: 'My Patients' },
        { to: '/doctor/upload', icon: 'upload', label: 'Upload Record' },
        { to: '/doctor/emergency', icon: 'emergency', label: 'Emergency Access' },
        { to: '/doctor/verification', icon: 'badge', label: 'Credentials & ID' },
        { to: '/profile', icon: 'person', label: 'Profile' },
        { to: '/settings', icon: 'settings', label: 'Settings' },
      ];
    }
    // Default patient sidebar items
    return [
      { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
      { to: '/medical-records', icon: 'folder', label: 'Medical Records' },
      { to: '/consents', icon: 'verified_user', label: 'Consent Manager' },
      { to: '/emergency', icon: 'emergency', label: 'Emergency Access' },
      { to: '/audit-history', icon: 'history', label: 'Audit Log' },
      { to: '/profile', icon: 'person', label: 'Profile & ID' },
      { to: '/settings', icon: 'settings', label: 'Settings' },
    ];
  };

  const sidebarItems = getSidebarItems();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-surface-container-low/60 backdrop-blur-xl border-r border-white/10 fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary/30">
            <Icon name="shield_lock" className="text-primary" filled />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">EASEeHealth</h2>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest">
              ID: {profile?.id || '09-XF'}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-container/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface'
              }`
            }
          >
            <Icon name={item.icon} />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {profile && (
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full primary-gradient flex items-center justify-center text-xs font-bold text-on-secondary">
              {profile.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.displayName}</p>
              <p className="text-xs text-on-surface-variant truncate">{profile.walletAddress}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-white/5 hover:text-error transition-colors"
          >
            <Icon name="logout" className="text-base" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
