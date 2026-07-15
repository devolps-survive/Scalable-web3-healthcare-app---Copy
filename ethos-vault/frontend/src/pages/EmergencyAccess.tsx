import { useEffect, useState } from 'react';
import { api, type EmergencyRequest, type PatientListing } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { TopAppBar } from '../components/layout/TopAppBar';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { ethers } from 'ethers'; // add this import
import { useEmergencyAccessContract } from '../hooks/useEmergencyAccessContract';

export function EmergencyAccess() {
  const { profile } = useAuth();
  const isDoctor = profile?.role === 'doctor';
  const getEmergencyContract = useEmergencyAccessContract();

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);

  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<PatientListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientListing | null>(null);
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<{ id: string; message: string } | null>(null);

  const loadRequests = () => {
    api.getEmergencyRequests().then((res) => setRequests(res.requests)).catch(console.error);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!isDoctor) return;
    const timeout = setTimeout(() => {
      if (patientSearch.trim().length === 0) {
        setPatients([]);
        return;
      }
      setSearching(true);
      api.getAllPatientsForEmergency(patientSearch)
        .then((res) => setPatients(res.patients))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [patientSearch, isDoctor]);

 const handleApprove = async (requestId: string) => {
  if (approvingId) return;

  const request = requests.find((r) => r.id === requestId);
  if (!request) return;

  if (
    !request.doctor_wallet_address ||
    !request.patient_wallet_address ||
    !ethers.isAddress(request.doctor_wallet_address) ||
    !ethers.isAddress(request.patient_wallet_address)
  ) {
    setApproveError({
      id: requestId,
      message: 'Invalid or missing wallet address for doctor or patient — cannot approve on-chain.',
    });
    return;
  }

  setApprovingId(requestId);
  setApproveError(null);

  try {
    const contract = await getEmergencyContract();
    const tx = await contract.grantEmergencyAccess(
      ethers.getAddress(request.doctor_wallet_address), // normalizes checksum too
      ethers.getAddress(request.patient_wallet_address),
    );
      const receipt = await tx.wait();

      // Pull the actual grantId/expiresAt the contract assigned out of the emitted event,
      // rather than guessing them client-side.
      let expiresAtIso: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'EmergencyAccessGranted') {
            const expiresAtSeconds = parsed.args.expiresAt as bigint;
            expiresAtIso = new Date(Number(expiresAtSeconds) * 1000).toISOString();
            break;
          }
        } catch {
          // not a log this contract's interface recognizes, skip it
        }
      }

      await api.approveEmergencyRequest(requestId, expiresAtIso, receipt.hash);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: 'approved', blockchain_tx_hash: receipt.hash, expires_at: expiresAtIso ?? r.expires_at }
            : r,
        ),
      );
    } catch (err) {
      console.error('Failed to approve request:', err);
      const message = err instanceof Error ? err.message : 'Failed to approve request. Please try again.';
      setApproveError({ id: requestId, message });
    } finally {
      setApprovingId(null);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !reason.trim()) return;

    setRequesting(true);
    setRequestError('');
    setRequestSuccess('');
    try {
      await api.requestEmergencyAccess(selectedPatient.id, reason.trim());
      setRequestSuccess('Emergency access request sent to the patient.');
      setSelectedPatient(null);
      setPatientSearch('');
      setPatients([]);
      setReason('');
      loadRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request emergency access';
      setRequestError(message);
    } finally {
      setRequesting(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColors: Record<string, string> = {
    pending: 'text-secondary',
    approved: 'text-primary',
    rejected: 'text-error',
    expired: 'text-on-surface-variant',
  };

  return (
    <AppLayout>
      <TopAppBar title="Emergency Access" showBack />

      <main className="pt-16 sm:pt-20 px-4 sm:px-container-padding pb-24 sm:pb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Emergency Access</h2>
          <p className="text-sm text-on-surface-variant">
            {isDoctor
              ? 'Request temporary emergency access to a patient\'s records'
              : 'Manage emergency access requests from verified doctors'}
          </p>
        </div>

        {isDoctor && (
          <GlassCard className="p-4 sm:p-6 mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Request Emergency Access
            </h3>

            {!selectedPatient ? (
              <div>
                <GlassCard className="p-3 !overflow-visible mb-2">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search patients by name or ID..."
                    className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                  />
                </GlassCard>

                {searching && (
                  <p className="text-xs text-on-surface-variant px-1">Searching...</p>
                )}

                {!searching && patientSearch.trim().length > 0 && patients.length === 0 && (
                  <p className="text-xs text-on-surface-variant px-1">No patients found.</p>
                )}

                {patients.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/50 hover:bg-primary-container/10 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center text-xs font-bold text-on-secondary shrink-0">
                          {p.avatarInitials || 'PT'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{p.displayName}</p>
                          <p className="text-xs text-on-surface-variant truncate">{p.patientId}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-container/10 border border-primary/20">
                  <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center text-xs font-bold text-on-secondary shrink-0">
                    {selectedPatient.avatarInitials || 'PT'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{selectedPatient.displayName}</p>
                    <p className="text-xs text-on-surface-variant truncate">{selectedPatient.patientId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs text-on-surface-variant hover:text-error shrink-0"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-on-surface-variant mb-1.5 block uppercase tracking-wider font-semibold">
                    Reason for emergency access
                  </label>
                  <GlassCard className="p-3 !overflow-visible">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Describe the emergency and why access is needed"
                      rows={3}
                      className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40 resize-none"
                    />
                  </GlassCard>
                </div>

                {requestError && <p className="text-sm text-error">{requestError}</p>}

                <button
                  type="submit"
                  disabled={requesting || !reason.trim()}
                  className="w-full min-h-[44px] primary-gradient text-on-secondary font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requesting ? 'Sending request...' : 'Request Emergency Access'}
                </button>
              </form>
            )}

            {requestSuccess && (
              <p className="text-sm text-primary mt-3">{requestSuccess}</p>
            )}
          </GlassCard>
        )}

        <div className="space-y-2 sm:space-y-3">
          {requests.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icon name="emergency" className="text-4xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant text-sm">No emergency requests</p>
            </GlassCard>
          ) : (
            requests.map((request) => (
              <GlassCard key={request.id} className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-error-container/20 flex items-center justify-center shrink-0">
                    <Icon name="emergency" className="text-error text-lg sm:text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm sm:text-base font-medium text-on-surface">
                        {isDoctor ? (request.patient_name || 'Patient') : (request.doctor_name || 'Doctor')}
                      </p>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold capitalize shrink-0 ${
                          statusColors[request.status] || 'text-on-surface-variant'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-2">{request.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                      <span>Requested: {formatDate(request.created_at)}</span>
                      {request.expires_at && (
                        <>
                          <span>•</span>
                          <span>Expires: {formatDate(request.expires_at)}</span>
                        </>
                      )}
                    </div>
                    {approveError && approveError.id === request.id && (
                      <p className="text-xs text-error mt-2">{approveError.message}</p>
                    )}
                  </div>
                  {!isDoctor && request.status === 'pending' && (
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={approvingId === request.id}
                      className="px-3 py-2 rounded-lg bg-primary-container/20 text-primary text-xs font-medium hover:bg-primary-container/30 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approvingId === request.id ? 'Approving...' : 'Approve'}
                    </button>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>

        <GlassCard className="mt-6 p-4 flex items-start gap-3">
          <Icon name="warning" className="text-error shrink-0" />
          <p className="text-sm text-on-surface-variant">
            Emergency access grants temporary access to medical records. This should only be used
            for genuine emergency situations and is fully logged and auditable.
          </p>
        </GlassCard>
      </main>
    </AppLayout>
  );
}