import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { Welcome } from './pages/Welcome';
import { ConnectWallet } from './pages/ConnectWallet';
import { Authenticating } from './pages/Authenticating';
import { AccessGranted } from './pages/AccessGranted';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { SecurityAlerts } from './pages/SecurityAlerts';
import { MedicalRecords } from './pages/MedicalRecords';
import { Consents } from './pages/Consents';
import { AuditHistory } from './pages/AuditHistory';
import { EmergencyAccess } from './pages/EmergencyAccess';
import { DoctorPatients } from './pages/DoctorPatients';
import { DoctorVerification } from './pages/DoctorVerification';
import { DoctorUpload } from './pages/DoctorUpload';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminVerifications } from './pages/AdminVerifications';
import { AdminUsers } from './pages/AdminUsers';
import { AdminAudit } from './pages/AdminAudit';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route
            path="/connect-wallet"
            element={
              <PublicOnlyRoute>
                <ConnectWallet />
              </PublicOnlyRoute>
            }
          />
          <Route path="/authenticating" element={<Authenticating />} />
          <Route path="/access-granted" element={<AccessGranted />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security-alerts"
            element={
              <ProtectedRoute>
                <SecurityAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medical-records"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <MedicalRecords />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consents"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <Consents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-history"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AuditHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <EmergencyAccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patients"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPatients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/verification"
            element={
              <ProtectedRoute allowedRoles={['doctor']} requireVerified={false}>
                <DoctorVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/upload"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/emergency"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <EmergencyAccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verifications"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminVerifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAudit />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
