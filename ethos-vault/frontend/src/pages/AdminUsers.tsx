import { useEffect, useState } from 'react';
import { api, type UserProfile } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getAdminUsers(roleFilter, search).then((res) => setUsers(res.users)).catch(console.error);
  }, [roleFilter, search]);

  const handleSuspend = async (id: string) => {
    try {
      await api.suspendUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, verified: false, verificationStatus: 'suspended' } : u)));
    } catch (err) {
      console.error('Failed to suspend user:', err);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.activateUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, verified: true, verificationStatus: 'verified' } : u)));
    } catch (err) {
      console.error('Failed to activate user:', err);
    }
  };

  return (
    <AppLayout>
      <TopAppBar title="User Management" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">User Management</h2>
          <p className="text-sm text-on-surface-variant">View and manage platform users</p>
        </div>

        <div className="mb-4 space-y-3">
          <GlassCard className="p-3 !overflow-visible">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or wallet..."
              className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
            />
          </GlassCard>
          <div className="flex flex-wrap gap-2">
            {['', 'patient', 'doctor', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`min-h-[36px] px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  roleFilter === role
                    ? 'primary-gradient text-on-secondary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {users.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="people" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No users found</p>
            </GlassCard>
          ) : (
            users.map((user) => (
              <GlassCard key={user.id} className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                    <span className="text-sm sm:text-base font-bold text-primary">
                      {user.avatarInitials || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm sm:text-base font-medium text-on-surface truncate">
                        {user.displayName}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] sm:text-xs font-medium capitalize text-on-surface-variant">
                          {user.role}
                        </span>
                        {user.verified ? (
                          <Icon name="verified" className="text-primary text-sm" filled />
                        ) : (
                          <Icon name="block" className="text-error text-sm" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-1">
                      ID: {user.id}
                    </p>
                    <p className="text-xs text-on-surface-variant mb-1">
                      {user.fullAddress.slice(0, 10)}...{user.fullAddress.slice(-4)}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      Joined: {new Date(user.memberSince).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {user.verified ? (
                      <button
                        onClick={() => handleSuspend(user.userId || user.id)}
                        className="px-3 py-1.5 rounded-lg bg-error-container/20 text-error text-xs font-medium hover:bg-error-container/30 transition-colors"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(user.userId || user.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary-container/20 text-primary text-xs font-medium hover:bg-primary-container/30 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </main>
    </AppLayout>
  );
}
