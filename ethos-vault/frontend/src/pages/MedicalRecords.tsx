import { useEffect, useState, useCallback } from 'react';
import { api, type MedicalRecord } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useJoinUser } from '../hooks/useSocket';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function MedicalRecords() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const loadRecords = useCallback(() => {
    api.getMedicalRecords(search, filter).then((res) => setRecords(res.records)).catch(console.error);
  }, [search, filter]);

  useJoinUser(profile?.userId || null);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <AppLayout>
      <TopAppBar title="Medical Records" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Medical Records</h2>
          <p className="text-sm text-on-surface-variant">Your encrypted medical history</p>
        </div>

        <div className="mb-4 space-y-3">
          <GlassCard className="p-3 !overflow-visible">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records..."
              className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
            />
          </GlassCard>
          <div className="flex flex-wrap gap-2">
            {['', 'lab_report', 'prescription', 'imaging', 'consultation'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`min-h-[36px] px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  filter === type
                    ? 'primary-gradient text-on-secondary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {type ? type.replace('_', ' ').toUpperCase() : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {records.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="folder_open" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No medical records found</p>
            </GlassCard>
          ) : (
            records.map((record) => (
              <GlassCard key={record.id} className="p-3 sm:p-4 cursor-pointer" hover onClick={() => window.open(record.file_url, '_blank', 'noopener,noreferrer')}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-container/20 flex items-center justify-center shrink-0">
                    <Icon name="description" className="text-primary text-lg sm:text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm sm:text-base font-medium text-on-surface truncate">
                        {record.file_name}
                      </p>
                      <span className="text-[10px] sm:text-xs font-medium text-primary uppercase tracking-wider shrink-0">
                        {record.record_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-1 line-clamp-2">
                      {record.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs text-on-surface-variant">
                      <span>{formatDate(record.created_at)}</span>
                      <span>•</span>
                      <span>{formatFileSize(record.file_size)}</span>
                      {record.uploaded_by_name && (
                        <>
                          <span>•</span>
                          <span>Uploaded by {record.uploaded_by_name}</span>
                        </>
                      )}
                    </div>
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
