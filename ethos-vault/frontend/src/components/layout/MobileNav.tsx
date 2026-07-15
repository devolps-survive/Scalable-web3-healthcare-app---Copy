import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';

export function MobileNav() {
  const { profile } = useAuth();

  const getNavItems = () => {
    const role = profile?.role || 'patient';
    if (role === 'admin') {
      return [
        { to: '/admin/dashboard', icon: 'dashboard', label: 'Home' },
        { to: '/admin/verifications', icon: 'verified', label: 'Verifs' },
        { to: '/admin/users', icon: 'people', label: 'Users' },
        { to: '/settings', icon: 'settings', label: 'Settings' },
      ];
    }
    if (role === 'doctor') {
      return [
        { to: '/dashboard', icon: 'dashboard', label: 'Home' },
        { to: '/doctor/patients', icon: 'people', label: 'Patients' },
        { to: '/doctor/upload', icon: 'upload', label: 'Upload' },
        { to: '/profile', icon: 'person', label: 'Profile' },
      ];
    }
    // Default patient navigation
    return [
      { to: '/dashboard', icon: 'dashboard', label: 'Home' },
      { to: '/medical-records', icon: 'folder', label: 'Records' },
      { to: '/consents', icon: 'verified_user', label: 'Consents' },
      { to: '/profile', icon: 'person', label: 'Profile' },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-surface-container-low/90 backdrop-blur-xl border-t border-white/10 safe-bottom">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 pb-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 transition-all active:scale-[0.98] ${
                isActive ? 'bg-primary-container/10 text-primary' : 'text-on-surface-variant'
              }`
            }
          >
            <Icon name={item.icon} className="text-[22px]" />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
