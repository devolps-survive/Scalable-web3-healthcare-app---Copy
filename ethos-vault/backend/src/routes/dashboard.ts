import { Router } from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role || 'patient';
  console.log('[Dashboard] req.user:', req.user);
  let dashboardData: any = {};

  if (userRole === 'patient') {
    const { rows: records } = await query(
      'SELECT COUNT(*) as count FROM medical_records WHERE patient_id = $1',
      [userId],
    );
    const { rows: consents } = await query(
      "SELECT COUNT(*) as count FROM consents WHERE patient_id = $1 AND is_active = true AND expires_at > NOW()",
      [userId],
    );
    const { rows: emergencies } = await query(
      "SELECT COUNT(*) as count FROM emergency_access_requests WHERE patient_id = $1 AND status = 'pending'",
      [userId],
    );
    const { rows: recentRecords } = await query(
      'SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId],
    );

    dashboardData = {
      totalRecords: parseInt(records[0].count),
      activeConsents: parseInt(consents[0].count),
      pendingEmergencies: parseInt(emergencies[0].count),
      recentRecords: recentRecords,
      quickActions: [
        { id: 'records', label: 'Medical Records', icon: 'folder', route: '/medical-records' },
        { id: 'consents', label: 'Consents', icon: 'verified_user', route: '/consents' },
        { id: 'emergency', label: 'Emergency', icon: 'emergency', route: '/emergency' },
        { id: 'audit', label: 'Audit Log', icon: 'history', route: '/audit-history' },
      ],
    };
  } else if (userRole === 'doctor') {
    const { rows: patients } = await query(
      "SELECT COUNT(DISTINCT patient_id) as count FROM consents WHERE doctor_id = $1 AND is_active = true AND expires_at > NOW()",
      [userId],
    );
    const { rows: uploads } = await query(
      'SELECT COUNT(*) as count FROM medical_records WHERE uploaded_by = $1',
      [userId],
    );
    const { rows: emergencies } = await query(
      "SELECT COUNT(*) as count FROM emergency_access_requests WHERE doctor_id = $1 AND status = 'pending'",
      [userId],
    );
    const { rows: verification } = await query(
      'SELECT * FROM doctor_verifications WHERE user_id = $1',
      [userId],
    );

    dashboardData = {
      authorizedPatients: parseInt(patients[0].count),
      recentUploads: parseInt(uploads[0].count),
      pendingEmergencies: parseInt(emergencies[0].count),
      verification: verification[0] || null,
      quickActions: [
        { id: 'patients', label: 'Patients', icon: 'people', route: '/doctor/patients' },
        { id: 'upload', label: 'Upload Record', icon: 'upload', route: '/doctor/upload' },
        { id: 'emergency', label: 'Emergency', icon: 'emergency', route: '/doctor/emergency' },
        { id: 'verification', label: 'Verification', icon: 'badge', route: '/doctor/verification' },
      ],
    };
  } else if (userRole === 'admin') {
    const { rows: patients } = await query("SELECT COUNT(*) as count FROM users WHERE role = 'patient'");
    const { rows: doctors } = await query("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'");
    const { rows: pending } = await query("SELECT COUNT(*) as count FROM doctor_verifications WHERE status = 'pending'");
    const { rows: records } = await query('SELECT COUNT(*) as count FROM medical_records');

    dashboardData = {
      totalPatients: parseInt(patients[0].count),
      totalDoctors: parseInt(doctors[0].count),
      pendingVerifications: parseInt(pending[0].count),
      totalRecords: parseInt(records[0].count),
      quickActions: [
        { id: 'verifications', label: 'Verifications', icon: 'verified', route: '/admin/verifications' },
        { id: 'users', label: 'Users', icon: 'people', route: '/admin/users' },
        { id: 'audit', label: 'Audit Log', icon: 'history', route: '/admin/audit' },
        { id: 'status', label: 'Platform Status', icon: 'monitor_heart', route: '/admin/status' },
      ],
    };
  }

  res.json(dashboardData);
});

export default router;
