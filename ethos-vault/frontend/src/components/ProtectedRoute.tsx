import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireVerified = true
}: { 
  children: React.ReactNode; 
  allowedRoles?: string[];
  requireVerified?: boolean;
}) {
  const { accessGranted, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessGranted) {
    return <Navigate to="/connect-wallet" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Doctors must be verified to access protected pages (except the verification page itself)
  if (
    profile?.role === 'doctor' &&
    requireVerified &&
    profile?.verificationStatus !== 'approved' &&
    location.pathname !== '/doctor/verification'
  ) {
    return <Navigate to="/doctor/verification" replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { accessGranted, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessGranted) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
