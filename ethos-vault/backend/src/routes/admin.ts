import { Router } from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitToUser } from '../socket.js';

const router = Router();

const requireAdmin = async (req: any, res: any, next: any) => {
  const userId = req.user!.userId;
  const { rows } = await query('SELECT role FROM users WHERE id = $1', [userId]);
  
  if (rows.length === 0 || rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
};

router.get('/dashboard', authMiddleware, requireAdmin, async (req, res) => {
  const { rows: patients } = await query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['patient']);
  const { rows: doctors } = await query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['doctor']);
  const { rows: pending } = await query("SELECT COUNT(*) as count FROM doctor_verifications WHERE status = 'pending'");
  const { rows: records } = await query('SELECT COUNT(*) as count FROM medical_records');
  const { rows: emergencies } = await query("SELECT COUNT(*) as count FROM emergency_access_requests WHERE status = 'pending'");

  res.json({
    totalPatients: parseInt(patients[0].count),
    verifiedDoctors: parseInt(doctors[0].count),
    pendingVerifications: parseInt(pending[0].count),
    medicalRecords: parseInt(records[0].count),
    emergencyRequests: parseInt(emergencies[0].count),
  });
});

router.get('/verifications', authMiddleware, requireAdmin, async (req, res) => {
  const { status } = req.query;
  
  let queryStr = `
    SELECT dv.*, u.display_name, u.wallet_address, u.full_address
    FROM doctor_verifications dv
    LEFT JOIN users u ON dv.user_id = u.id
  `;
  const params: any[] = [];

  if (status) {
    queryStr += ` WHERE dv.status = $${params.length + 1}`;
    params.push(status);
  }

  queryStr += ' ORDER BY dv.created_at DESC';

  const { rows } = await query(queryStr, params);
  res.json({ verifications: rows });
});

router.post('/verifications/:id/approve', authMiddleware, requireAdmin, async (req, res) => {
  const adminId = req.user!.userId;
  const verificationId = req.params.id;

  const { rows } = await query(
    `UPDATE doctor_verifications
     SET status = 'approved', verified_by = $1, verified_at = NOW()
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [adminId, verificationId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Verification not found or already processed' });
    return;
  }

  const verification = rows[0];

await query(
  `UPDATE users SET verified = true, verification_status = 'approved' WHERE id = $1`,
  [verification.user_id],
);

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'doctor_verified', 'doctor_verification', $3, $4)`,
    [verification.user_id, adminId, verification.id, JSON.stringify({ hospital: verification.hospital_name })],
  );

  emitToUser(verification.user_id, 'notification:new', {
    type: 'verification_approved',
    title: 'Verification Approved',
    message: 'Your doctor verification has been approved',
  });

  res.json({ verification });
});

router.post('/verifications/:id/reject', authMiddleware, requireAdmin, async (req, res) => {
  const adminId = req.user!.userId;
  const verificationId = req.params.id;
  const { rejectionReason } = req.body as { rejectionReason?: string };

  const { rows } = await query(
    `UPDATE doctor_verifications
     SET status = 'rejected', verified_by = $1, rejection_reason = $2
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [adminId, rejectionReason, verificationId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Verification not found or already processed' });
    return;
  }

  const verification = rows[0];

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'doctor_rejected', 'doctor_verification', $3, $4)`,
    [verification.user_id, adminId, verification.id, JSON.stringify({ reason: rejectionReason })],
  );

  emitToUser(verification.user_id, 'notification:new', {
    type: 'verification_rejected',
    title: 'Verification Rejected',
    message: rejectionReason || 'Your doctor verification has been rejected',
  });

  res.json({ verification });
});

router.post('/verifications/:id/suspend', authMiddleware, requireAdmin, async (req, res) => {
  const adminId = req.user!.userId;
  const verificationId = req.params.id;

  const { rows } = await query(
    `UPDATE doctor_verifications
     SET status = 'suspended'
     WHERE id = $1 AND status = 'approved'
     RETURNING *`,
    [verificationId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Verification not found or cannot be suspended' });
    return;
  }

  const verification = rows[0];

 await query(
  `UPDATE users SET verified = true, verification_status = 'approved' WHERE id = $1`,
  [verification.user_id],
);

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'doctor_suspended', 'doctor_verification', $3, $4)`,
    [verification.user_id, adminId, verification.id, JSON.stringify({})],
  );

  emitToUser(verification.user_id, 'notification:new', {
    type: 'verification_suspended',
    title: 'Account Suspended',
    message: 'Your doctor account has been suspended',
  });

  res.json({ verification });
});

router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  const { role, search, status } = req.query;

  let queryStr = `
    SELECT
      id, patient_id AS "patientId", doctor_id AS "doctorId", admin_id AS "adminId",
      display_name AS "displayName", role, wallet_address AS "walletAddress",
      full_address AS "fullAddress", verified, verification_status AS "verificationStatus",
      member_since AS "memberSince", avatar_initials AS "avatarInitials",
      contact_email AS "contactEmail", contact_phone AS "contactPhone",
      emergency_contact AS "emergencyContact", created_at AS "createdAt"
    FROM users WHERE 1=1
  `;
  const params: any[] = [];

  if (role) {
    queryStr += ` AND role = $${params.length + 1}`;
    params.push(role);
  }

  if (search) {
    queryStr += ` AND (display_name ILIKE $${params.length + 1} OR patient_id ILIKE $${params.length + 1} OR doctor_id ILIKE $${params.length + 1} OR full_address ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }

  if (status === 'verified') {
    queryStr += ` AND verified = true`;
  } else if (status === 'unverified') {
    queryStr += ` AND verified = false`;
  }

  queryStr += ' ORDER BY created_at DESC LIMIT 100';

  const { rows } = await query(queryStr, params);
  res.json({ users: rows });
});

router.post('/users/:id/suspend', authMiddleware, requireAdmin, async (req, res) => {
  const adminId = req.user!.userId;
  const userId = req.params.id;

  const { rows } = await query(
    `UPDATE users SET verified = false, verification_status = 'suspended' WHERE id = $1 RETURNING *`,
    [userId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'user_suspended', 'user', $3, $4)`,
    [userId, adminId, userId, JSON.stringify({})],
  );

  emitToUser(Array.isArray(userId) ? userId[0] : String(userId), 'notification:new', {
    type: 'account_suspended',
    title: 'Account Suspended',
    message: 'Your account has been suspended by an admin',
  });

  res.json({ user: rows[0] });
});
router.post('/users/:id/activate', authMiddleware, requireAdmin, async (req, res) => {
  const adminId = req.user!.userId;
  const userId = req.params.id;

  const { rows } = await query(
    `UPDATE users SET verified = true, verification_status = 'approved' WHERE id = $1 RETURNING *`,
    [userId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'user_activated', 'user', $3, $4)`,
    [userId, adminId, userId, JSON.stringify({})],
  );

  emitToUser(Array.isArray(userId) ? userId[0] : String(userId), 'notification:new', {
    type: 'account_activated',
    title: 'Account Activated',
    message: 'Your account has been activated',
  });

  res.json({ user: rows[0] });
});

router.get('/audit', authMiddleware, requireAdmin, async (req, res) => {
  const { action, entityType, userId } = req.query;

  let queryStr = `
    SELECT al.*, u.display_name as actor_name, u.role as actor_role
    FROM audit_logs al
    LEFT JOIN users u ON al.actor_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (action) {
    queryStr += ` AND al.action = $${params.length + 1}`;
    params.push(Array.isArray(action) ? action[0] : action);
  }

  if (entityType) {
    queryStr += ` AND al.entity_type = $${params.length + 1}`;
    params.push(Array.isArray(entityType) ? entityType[0] : entityType);
  }

  if (userId) {
    queryStr += ` AND al.user_id = $${params.length + 1}`;
    params.push(Array.isArray(userId) ? userId[0] : userId);
  }

  queryStr += ' ORDER BY al.created_at DESC LIMIT 100';

  const { rows } = await query(queryStr, params);
  res.json({ logs: rows });
});

router.get('/status', authMiddleware, requireAdmin, async (req, res) => {
  const { rows: dbCheck } = await query('SELECT NOW()');
  
  res.json({
    blockchain: 'connected',
    backend: 'operational',
    database: dbCheck.length > 0 ? 'connected' : 'disconnected',
    api: 'healthy',
    connectedWallets: 0,
  });
});

export default router;
