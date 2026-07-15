import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Patient } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function DoctorUpload() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [formData, setFormData] = useState({
    recordType: 'lab_report',
    fileName: '',
    fileUrl: '',
    fileSize: 0,
    description: '',
    patientId: '',
  });

  useEffect(() => {
    api.getDoctorPatients()
      .then((res) => setPatients(res.patients))
      .catch((err) => console.error('Failed to load patients:', err))
      .finally(() => setLoadingPatients(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileName || !formData.fileUrl || !formData.patientId) return;

    setUploading(true);
    try {
      await api.uploadMedicalRecord(formData);
      navigate('/doctor/patients');
    } catch (err) {
      console.error('Failed to upload record:', err);
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <TopAppBar title="Upload Medical Record" showBack />

      <main className="mx-auto w-full max-w-2xl px-3 pb-24 pt-16 sm:px-4 sm:pt-20 sm:pb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-on-surface">Upload Medical Record</h2>
          <p className="text-on-surface-variant">
            Add a medical record to a patient's file
          </p>
        </div>

        <GlassCard className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Patient
              </label>
              <GlassCard className="p-3 !overflow-visible">
                {loadingPatients ? (
                  <p className="text-sm text-on-surface-variant">Loading patients...</p>
                ) : patients.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    No patients with active consent found.
                  </p>
                ) : (
                  <select
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full bg-transparent text-sm text-on-surface outline-none"
                  >
                    <option value="" disabled>Select a patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name} ({p.patient_id})
                      </option>
                    ))}
                  </select>
                )}
              </GlassCard>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Record Type
              </label>
              <div className="flex flex-wrap gap-2">
                {['lab_report', 'prescription', 'imaging', 'consultation', 'other'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, recordType: type })}
                    className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      formData.recordType === type
                        ? 'primary-gradient text-on-secondary'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {type.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                File Name
              </label>
              <GlassCard className="p-3 !overflow-visible">
                <input
                  type="text"
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                  placeholder="e.g., blood_test_results.pdf"
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                />
              </GlassCard>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                File URL
              </label>
              <GlassCard className="p-3 !overflow-visible">
                <input
                  type="text"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  placeholder="IPFS or storage URL"
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                />
              </GlassCard>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Description
              </label>
              <GlassCard className="p-3 !overflow-visible">
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of the record"
                  rows={3}
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 resize-none"
                />
              </GlassCard>
            </div>

            <button
              type="submit"
              disabled={uploading || !formData.fileName || !formData.fileUrl || !formData.patientId}
              className="w-full min-h-[48px] primary-gradient text-on-secondary font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Record'}
            </button>
          </form>
        </GlassCard>

        <GlassCard className="mt-6 p-4 flex items-start gap-3">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-sm text-on-surface-variant">
            Records are encrypted before storage. Only patients with valid consent can access
            their medical records.
          </p>
        </GlassCard>
      </main>
    </AppLayout>
  );
}