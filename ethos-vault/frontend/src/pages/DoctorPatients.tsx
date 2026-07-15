import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Patient } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getDoctorPatients(search).then((res) => setPatients(res.patients)).catch(console.error);
  }, [search]);

  return (
    <AppLayout>
      <TopAppBar title="My Patients" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Authorized Patients</h2>
          <p className="text-sm text-on-surface-variant">Patients who have granted you access</p>
        </div>

        <GlassCard className="mb-4 p-3 !overflow-visible">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, patient ID, or wallet..."
            className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
          />
        </GlassCard>

        <div className="space-y-2 sm:space-y-3">
          {patients.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="people" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No authorized patients found</p>
            </GlassCard>
          ) : (
            patients.map((patient) => (
              <Link
                key={patient.id}
                to={`/doctor/patient/${patient.id}`}
                className="block"
              >
                <GlassCard className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                    <span className="text-sm sm:text-base font-bold text-primary">
                      {patient.display_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium text-on-surface truncate">
                      {patient.display_name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      ID: {patient.patient_id}
                    </p>
                  </div>
                  <Icon name="chevron_right" className="text-on-surface-variant" />
                </GlassCard>
              </Link>
            ))
          )}
        </div>
      </main>
    </AppLayout>
  );
}
