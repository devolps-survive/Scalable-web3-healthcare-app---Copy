import type { ReactNode } from 'react';
import { AmbientBackground } from './AmbientBackground';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  fullWidth?: boolean;
}

export function AppLayout({ children, showNav = true, fullWidth = false }: AppLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <AmbientBackground />
      {showNav && <DesktopSidebar />}
      <div className={`relative z-10 w-full ${showNav ? 'md:ml-64' : ''} ${showNav ? 'pb-20 md:pb-0' : ''}`}>
        <div className={fullWidth ? 'w-full' : 'w-full max-w-5xl px-0 sm:px-0 lg:px-0'}>
          {children}
        </div>
      </div>
      {showNav && <MobileNav />}
    </div>
  );
}
