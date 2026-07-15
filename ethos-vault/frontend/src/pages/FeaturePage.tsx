import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface FeaturePageProps {
  title: string;
  icon: string;
  description: string;
}

export function FeaturePage({ title, icon, description }: FeaturePageProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <TopAppBar title={title} showBack />
      <main className="pt-20 px-4 sm:px-container-padding pb-24 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl primary-gradient mx-auto mb-4 flex items-center justify-center">
            <Icon name={icon} className="text-3xl text-on-secondary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">{title}</h2>
          <p className="text-sm sm:text-base text-on-surface-variant mt-1">{description}</p>
        </div>

        {title === 'Receive Assets' && profile && (
          <GlassCard className="p-6 text-center space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Your Wallet Address
            </p>
            <p className="font-mono text-xs sm:text-sm text-primary break-all">{profile.fullAddress}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(profile.fullAddress)}
            >
              Copy Address
            </Button>
          </GlassCard>
        )}

        {(title === 'Swap Assets' || title === 'Stake Assets') && (
          <GlassCard className="p-6 text-center">
            <Icon name="construction" className="text-4xl text-on-surface-variant mb-3" />
            <p className="text-on-surface-variant text-sm">
              This feature is coming soon. Check back in a future update.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </GlassCard>
        )}
      </main>
    </AppLayout>
  );
}
