import { useEffect, useState } from 'react';
import { api, type DoctorVerification } from '../api/client';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function DoctorVerification() {
  const [verification, setVerification] = useState<DoctorVerification | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    hospitalName: '',
    specialization: '',
    licenseNumber: '',
    yearsOfExperience: 0,
    licenseDocumentUrl: '',
    hospitalDocumentUrl: '',
    governmentIdUrl: '',
  });

  useEffect(() => {
    api.getDoctorVerification().then((res) => {
      setVerification(res.verification);
      if (res.verification) {
        setFormData({
          hospitalName: res.verification.hospital_name,
          specialization: res.verification.specialization,
          licenseNumber: res.verification.license_number || '',
          yearsOfExperience: res.verification.years_of_experience || 0,
          licenseDocumentUrl: res.verification.license_document_url || '',
          hospitalDocumentUrl: res.verification.hospital_document_url || '',
          governmentIdUrl: res.verification.government_id_url || '',
        });
      }
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitDoctorVerification(formData);
      api.getDoctorVerification().then((res) => setVerification(res.verification));
    } catch (err) {
      console.error('Failed to submit verification:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'text-secondary',
    approved: 'text-primary',
    rejected: 'text-error',
    suspended: 'text-error',
  };

  return (
    <AppLayout>
      <TopAppBar title="Doctor Verification" showBack />

      <main className="mx-auto w-full max-w-2xl px-3 pb-24 pt-16 sm:px-4 sm:pt-20 sm:pb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-on-surface">Doctor Verification</h2>
          <p className="text-on-surface-variant">
            Verify your credentials to access patient records
          </p>
        </div>

        {verification && verification.status !== 'pending' && (
          <GlassCard className="mb-6 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Icon
                name={verification.status === 'approved' ? 'verified' : 'block'}
                className={statusColors[verification.status]}
              />
              <div>
                <p className="font-medium text-on-surface capitalize">{verification.status}</p>
                {verification.rejection_reason && (
                  <p className="text-sm text-error">{verification.rejection_reason}</p>
                )}
              </div>
            </div>
            {verification.verified_at && (
              <p className="text-xs text-on-surface-variant">
                Verified on {new Date(verification.verified_at).toLocaleDateString()}
              </p>
            )}
          </GlassCard>
        )}

        <GlassCard className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Hospital Name
              </label>
              <GlassCard className="p-3 !overflow-visible">
                <input
                  type="text"
                  value={formData.hospitalName}
                  onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  placeholder="Enter hospital name"
                  disabled={verification?.status === 'approved'}
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 disabled:opacity-50"
                />
              </GlassCard>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Specialization
              </label>
              <GlassCard className="p-3 !overflow-visible">
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., Cardiology, Neurology"
                  disabled={verification?.status === 'approved'}
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 disabled:opacity-50"
                />
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  License Number
                </label>
                <GlassCard className="p-3 !overflow-visible">
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="Medical license number"
                    disabled={verification?.status === 'approved'}
                    className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 disabled:opacity-50"
                  />
                </GlassCard>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Years of Experience
                </label>
                <GlassCard className="p-3 !overflow-visible">
                  <input
                    type="number"
                    value={formData.yearsOfExperience || ''}
                    onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                    placeholder="Years of practice"
                    disabled={verification?.status === 'approved'}
                    className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 disabled:opacity-50"
                  />
                </GlassCard>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">
                Required Verification Documents
              </p>

              <div>
                <label className="text-xs text-on-surface-variant mb-1 block">
                  Medical License Document URL
                </label>
                <GlassCard className="p-3 !overflow-visible">
                  <input
                    type="url"
                    value={formData.licenseDocumentUrl}
                    onChange={(e) => setFormData({ ...formData, licenseDocumentUrl: e.target.value })}
                    placeholder="https://example.com/license.pdf"
                    disabled={verification?.status === 'approved'}
                    className="w-full bg-transparent text-xs sm:text-sm font-mono text-on-surface outline-none placeholder:text-on-surface-variant/50 disabled:opacity-50"
                  />
                </GlassCard>
              </div>

              <div>
                <label className="text-xs text-on-surface-variant mb-1 block">
                  Government Issued ID URL
                </label>
                <GlassCard className="p-3 !overflow-visible">
                  <input
                    type="url"
                    value={formData.governmentIdUrl}
                    onChange={(e) => setFormData({ ...formData, governmentIdUrl: e.target.value })}
                    placeholder="https://example.com/id.jpg"
                    disabled={verification?.status === 'approved'}
                    className="w-full bg-transparent text-xs sm:text-sm font-mono text-on-surface outline-none placeholder:text-on-surface-variant/50 disabled:opacity-50"
                  />
                </GlassCard>
              </div>

              <div>
                <label className="text-xs text-on-surface-variant mb-1 block">
                  Hospital Verification Letter URL
                </label>
                <GlassCard className="p-3 !overflow-visible">
                  <input
                    type="url"
                    value={formData.hospitalDocumentUrl}
                    onChange={(e) => setFormData({ ...formData, hospitalDocumentUrl: e.target.value })}
                    placeholder="https://example.com/hospital-letter.pdf"
                    disabled={verification?.status === 'approved'}
                    className="w-full bg-transparent text-xs sm:text-sm font-mono text-on-surface outline-none placeholder:text-on-surface-variant/50 disabled:opacity-50"
                  />
                </GlassCard>
              </div>
            </div>

            {verification?.status !== 'approved' && (
              <button
                type="submit"
                disabled={submitting || !formData.hospitalName || !formData.specialization || !formData.licenseDocumentUrl || !formData.governmentIdUrl || !formData.hospitalDocumentUrl}
                className="w-full min-h-[48px] primary-gradient text-on-secondary font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : verification ? 'Update Verification' : 'Submit Verification'}
              </button>
            )}
          </form>
        </GlassCard>

        <GlassCard className="mt-6 p-4 flex items-start gap-3">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-sm text-on-surface-variant">
            Verification requires admin approval. You will be notified once your credentials
            are reviewed. This process typically takes 1-2 business days.
          </p>
        </GlassCard>
      </main>
    </AppLayout>
  );
}
