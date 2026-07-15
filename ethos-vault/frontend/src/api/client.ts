const API_BASE = '/api';
const TOKEN_KEY = 'ev_token';
const SESSION_KEY = 'ev_session';
const PROFILE_KEY = 'ev_profile';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthStorage(token: string, sessionId: string, profile: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, sessionId);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem('ev_pending_tx');
}

export function loadStoredAuth(): { token: string; sessionId: string; profile: UserProfile } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const sessionId = localStorage.getItem(SESSION_KEY);
  const profileRaw = localStorage.getItem(PROFILE_KEY);
  if (!token || !sessionId || !profileRaw) return null;
  try {
    return { token, sessionId, profile: JSON.parse(profileRaw) };
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  console.log(`[API Request] ${path}`, { method: options?.method, hasToken: !!token, hasCredentials: (options as any)?.credentials });
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  console.log(`[API Response] ${path}`, { status: res.status, ok: res.ok });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    console.error(`[API Error] ${path}`, err);
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string; database?: string }>('/health'),

  connectWallet: (
    address?: string,
    signature?: string,
    role?: string,
    registrationData?: {
      displayName?: string;
      email?: string;
      phone?: string;
      emergencyContact?: string;
    }
  ) =>
    request<{ sessionId: string; address: string; challenge: string }>(
      '/auth/connect',
      { method: 'POST', body: JSON.stringify({ address, signature, role, ...registrationData }) },
    ),
  authenticate: (sessionId: string, address?: string, signature?: string) =>
    request<{ authenticated: boolean; status: string; address?: string }>('/auth/authenticate', {
      method: 'POST',
      body: JSON.stringify({ sessionId, address, signature }),
    }),
  grantAccess: (sessionId: string) =>
    request<{ accessGranted: boolean; profile: UserProfile; token: string }>(
      '/auth/grant-access',
      { method: 'POST', body: JSON.stringify({ sessionId }) },
    ),
  logout: (sessionId: string) =>
    request<{ loggedOut: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  getDashboard: () => request<DashboardData>('/dashboard'),

  getProfile: () => request<{ profile: UserProfile }>('/profile'),
  updateProfile: (profile: Partial<UserProfile>) =>
    request<{ profile: UserProfile }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  getSettings: () => request<{ settings: AppSettings }>('/settings'),
  updateSettings: (settings: Partial<AppSettings>) =>
    request<{ settings: AppSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  getSecurityAlerts: () => request<{ alerts: SecurityAlert[] }>('/security-alerts'),
  markAlertRead: (id: string) =>
    request<{ alert: SecurityAlert }>(`/security-alerts/${id}/read`, { method: 'PUT' }),

  getMedicalRecords: (search?: string, type?: string) =>
    request<{ records: MedicalRecord[] }>(`/medical/records?search=${search || ''}&type=${type || ''}`),
  getMedicalRecord: (id: string) =>
    request<{ record: MedicalRecord }>(`/medical/records/${id}`),
  uploadMedicalRecord: (data: {
    recordType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    description?: string;
    patientId?: string;
  }) =>
    request<{ record: MedicalRecord }>('/medical/records/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
   getConsents: () =>
    request<{ consents: Consent[] }>('/medical/consents'),
  getDoctors: (search?: string) =>
    request<{ doctors: DoctorListing[] }>(`/medical/doctors?search=${search || ''}`),
  grantConsent: (doctorId: string, expiresAt: string) =>
    request<{ consent: Consent }>('/medical/consents/grant', {
      method: 'POST',
      body: JSON.stringify({ doctorId, expiresAt }),
    }),
  revokeConsent: (doctorId: string) =>
    request<{ consent: Consent }>('/medical/consents/revoke', {
      method: 'POST',
      body: JSON.stringify({ doctorId }),
    }),
  getEmergencyRequests: () =>
    request<{ requests: EmergencyRequest[] }>('/medical/emergency'),
  requestEmergencyAccess: (patientId: string, reason: string) =>
    request<{ request: EmergencyRequest }>('/medical/emergency/request', {
      method: 'POST',
      body: JSON.stringify({ patientId, reason }),
    }),
  approveEmergencyRequest: (requestId: string, expiresAt?: string, txHash?: string) =>
    request<{ request: EmergencyRequest }>('/medical/emergency/approve', {
      method: 'POST',
      body: JSON.stringify({ requestId, expiresAt, txHash }),
    }),

  getDoctorVerification: () =>
    request<{ verification: DoctorVerification | null }>('/doctor/verification'),
  submitDoctorVerification: (data: {
    hospitalName: string;
    specialization: string;
    licenseNumber?: string;
    licenseDocumentUrl?: string;
    hospitalDocumentUrl?: string;
    governmentIdUrl?: string;
    yearsOfExperience?: number;
  }) =>
    request<{ verification: DoctorVerification }>('/doctor/verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDoctorPatients: (search?: string) =>
    request<{ patients: Patient[] }>(`/doctor/patients?search=${search || ''}`),
  getPatientRecords: (patientId: string) =>
    request<{ records: MedicalRecord[] }>(`/doctor/patients/${patientId}/records`),
  getPatientAudit: (patientId: string) =>
    request<{ logs: AuditLog[] }>(`/doctor/patients/${patientId}/audit`),

  getAdminDashboard: () =>
    request<AdminDashboard>('/admin/dashboard'),
  getAdminVerifications: (status?: string) =>
    request<{ verifications: DoctorVerification[] }>(`/admin/verifications?status=${status || ''}`),
  approveVerification: (id: string) =>
    request<{ verification: DoctorVerification }>(`/admin/verifications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  rejectVerification: (id: string, rejectionReason: string) =>
    request<{ verification: DoctorVerification }>(`/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    }),
  suspendVerification: (id: string) =>
    request<{ verification: DoctorVerification }>(`/admin/verifications/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getAdminUsers: (role?: string, search?: string, status?: string) =>
    request<{ users: UserProfile[] }>(`/admin/users?role=${role || ''}&search=${search || ''}&status=${status || ''}`),
  suspendUser: (id: string) =>
    request<{ user: UserProfile }>(`/admin/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  activateUser: (id: string) =>
    request<{ user: UserProfile }>(`/admin/users/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getAdminAudit: (action?: string, entityType?: string, userId?: string) =>
    request<{ logs: AuditLog[] }>(`/admin/audit?action=${action || ''}&entityType=${entityType || ''}&userId=${userId || ''}`),
  getPlatformStatus: () =>
    request<PlatformStatus>('/admin/status'),
  getAllPatientsForEmergency: (search?: string) =>
  request<{ patients: PatientListing[] }>(`/doctor/all-patients?search=${search || ''}`),
};

export interface UserProfile {
  userId?: string;
  id: string;
  displayName: string;
  role: string;
  walletAddress: string;
  fullAddress: string;
  verified: boolean;
  verificationStatus?: string;
  memberSince: string;
  avatarInitials: string;
  contactEmail?: string;
  contactPhone?: string;
  bio?: string;
  organization?: string;
  website?: string;
}

export interface AppSettings {
  notifications: { push: boolean; email: boolean; securityAlerts: boolean };
  security: { twoFactor: boolean; biometric: boolean; sessionTimeout: number };
  display: { currency: string; language: string; theme: string };
  privacy: { hideBalances: boolean; anonymousMode: boolean };
}

export interface PatientListing {
  id: string;
  patientId: string;
  displayName: string;
  avatarInitials: string;
  fullAddress: string;
}

export interface SecurityAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardData {
  totalRecords?: number;
  activeConsents?: number;
  pendingEmergencies?: number;
  recentRecords?: MedicalRecord[];
  authorizedPatients?: number;
  recentUploads?: number;
  verification?: DoctorVerification | null;
  totalPatients?: number;
  totalDoctors?: number;
  pendingVerifications?: number;
  quickActions: { id: string; label: string; icon: string; route: string }[];
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  uploaded_by: string;
  record_type: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_hash: string;
  encryption_key_hash?: string;
  ipfs_cid?: string;
  blockchain_tx_hash?: string;
  description?: string;
  upload_status: string;
  created_at: string;
  uploaded_by_name?: string;
}

export interface Consent {
  id: string;
  patient_id: string;
  doctor_id: string;
  consent_id_blockchain?: string;
  granted_at: string;
  expires_at: string;
  revoked_at?: string;
  is_active: boolean;
  doctor_name?: string;
  doctor_id_display?: string;
}

export interface DoctorListing {
  id: string;
  doctorId: string;
  displayName: string;
  avatarInitials: string;
  verificationStatus: string;
  hospitalName?: string;
  specialization?: string;
}

export interface EmergencyRequest {
  id: string;
  patient_id: string;
  doctor_id: string;
  reason: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  expires_at?: string;
  blockchain_tx_hash?: string;
  created_at: string;
  doctor_name?: string;
  patient_name?: string;
  doctor_wallet_address?: string;
  patient_wallet_address?: string;
}

export interface DoctorVerification {
  id: string;
  user_id: string;
  hospital_name: string;
  specialization: string;
  license_number?: string;
  license_document_url?: string;
  hospital_document_url?: string;
  status: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  created_at: string;
  government_id_url?: string;
  years_of_experience?: number;
}

export interface Patient {
  id: string;
  patient_id: string;
  display_name: string;
  wallet_address: string;
  full_address: string;
  is_active: boolean;
  expires_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  actor_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: any;
  blockchain_tx_hash?: string;
  created_at: string;
  actor_name?: string;
  actor_role?: string;
}

export interface AdminDashboard {
  totalPatients: number;
  verifiedDoctors: number;
  pendingVerifications: number;
  medicalRecords: number;
  emergencyRequests: number;
}

export interface PlatformStatus {
  blockchain: string;
  backend: string;
  database: string;
  api: string;
  connectedWallets: number;
}

export interface AuthStepEvent {
  step: number;
  total: number;
  message: string;
  progress: number;
}