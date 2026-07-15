import { useEffect, useState } from 'react';
import { api, type AppSettings } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        value ? 'bg-primary-container' : 'bg-surface-container-highest'
      }`}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    api.getSettings().then((res) => {
      const s = res.settings || {};
      setSettings({
        notifications: s.notifications || { push: false, email: false, securityAlerts: false },
        security: s.security || { twoFactor: false, biometric: false, sessionTimeout: 30 },
        display: s.display || { currency: 'USD', language: 'en', theme: 'system' },
        privacy: s.privacy || { hideBalances: false, anonymousMode: false },
      });
    });
  }, []);

  const update = async (partial: Partial<AppSettings>) => {
    if (!settings) return;
    const merged = { ...settings, ...partial };
    const res = await api.updateSettings(merged);
    setSettings(res.settings);
  };

  if (!settings) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const sections = [
    {
      title: 'Notifications',
      icon: 'notifications',
      items: [
        { key: 'push' as const, label: 'Push Notifications', group: 'notifications' as const },
        { key: 'email' as const, label: 'Email Alerts', group: 'notifications' as const },
        { key: 'securityAlerts' as const, label: 'Security Alerts', group: 'notifications' as const },
      ],
    },
    {
      title: 'Security',
      icon: 'security',
      items: [
        { key: 'twoFactor' as const, label: 'Two-Factor Authentication', group: 'security' as const },
        { key: 'biometric' as const, label: 'Biometric Login', group: 'security' as const },
      ],
    },
    {
      title: 'Privacy',
      icon: 'visibility_off',
      items: [
        { key: 'hideBalances' as const, label: 'Hide Balances', group: 'privacy' as const },
        { key: 'anonymousMode' as const, label: 'Anonymous Mode', group: 'privacy' as const },
      ],
    },
  ];

  return (
    <AppLayout>
      <TopAppBar title="Settings" showBack />

      <main className="mx-auto w-full max-w-2xl px-3 pb-8 pt-20 sm:px-4 lg:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-on-surface">Settings</h2>
          <p className="text-on-surface-variant">Customize your Ethos Vault experience</p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <GlassCard key={section.title} className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name={section.icon} className="text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                  {section.title}
                </h3>
              </div>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-on-surface">{item.label}</span>
                    <Toggle
                      value={settings[item.group][item.key as keyof typeof settings[typeof item.group]] as boolean}
                      onChange={(v) =>
                        update({ [item.group]: { ...settings[item.group], [item.key]: v } })
                      }
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="display_settings" className="text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                Display
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface">Currency</span>
                <select
                  value={settings.display.currency}
                  onChange={(e) =>
                    update({ display: { ...settings.display, currency: e.target.value } })
                  }
                  className="bg-surface-container-high text-on-surface text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface">Language</span>
                <select
                  value={settings.display.language}
                  onChange={(e) =>
                    update({ display: { ...settings.display, language: e.target.value } })
                  }
                  className="bg-surface-container-high text-on-surface text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </AppLayout>
  );
}
