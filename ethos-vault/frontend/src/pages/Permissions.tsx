import { useEffect, useState } from 'react';
import { api, type Permission } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

const scopeColors: Record<string, string> = {
  wallet: 'bg-primary-container/20 text-primary',
  identity: 'bg-secondary-container/20 text-secondary',
  admin: 'bg-error-container/20 text-error',
  compliance: 'bg-tertiary-container/20 text-tertiary',
};

export function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    api.getPermissions().then((res) => setPermissions(res.permissions));
  }, []);

  const togglePermission = async (id: string, granted: boolean) => {
    const res = await api.updatePermission(id, !granted);
    setPermissions((prev) => prev.map((p) => (p.id === id ? res.permission : p)));
  };

  return (
    <AppLayout>
      <TopAppBar title="Permissions & Access" showBack />

      <main className="mx-auto w-full max-w-2xl px-3 pb-24 pt-16 sm:px-4 sm:pt-20 sm:pb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-on-surface">Permissions & Access</h2>
          <p className="text-on-surface-variant">
            Manage what Ethos Vault can do with your wallet and identity
          </p>
        </div>

        <div className="space-y-3">
          {permissions.map((perm) => (
            <GlassCard key={perm.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-on-surface">{perm.label}</p>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        scopeColors[perm.scope] || 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {perm.scope}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant">{perm.description}</p>
                </div>
                <button
                  onClick={() => togglePermission(perm.id, perm.granted)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    perm.granted ? 'bg-primary-container' : 'bg-surface-container-highest'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      perm.granted ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="mt-6 p-4 flex items-start gap-3">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-sm text-on-surface-variant">
            Some permissions require institutional admin approval. Changes may take up to 24 hours
            to propagate across the network.
          </p>
        </GlassCard>
      </main>
    </AppLayout>
  );
}
