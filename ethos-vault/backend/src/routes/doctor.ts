import { Router } from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitToUser } from '../socket.js';

const router = Router();

router.get('/verification', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { rows } = await query(
    `SELECT * FROM doctor_verifications 
     WHERE user_id = $1 
     ORDER BY 
       CASE WHEN status = 'approved' THEN 0 ELSE 1 END,
       created_at DESC`,
    [userId],
  );

  if (rows.length === 0) {
    res.json({ verification: null });
    return;
  }

  res.json({ verification: rows[0] });
});
router.post('/verification', authMiddleware, async (req, res) => {
 const userId = req.user!.userId;
  
  const existing = await query(
    `SELECT * FROM doctor_verifications WHERE user_id = $1 AND status IN ('pending', 'approved')`,
    [userId],
  );
  if (existing.rows.length > 0) {
    res.status(400).json({ error: 'You already have a pending or approved verification.' });
    return;
  }
  const {
    hospitalName,
    specialization,
    licenseNumber,
    licenseDocumentUrl,
    hospitalDocumentUrl,
    governmentIdUrl,
    yearsOfExperience
  } = req.body as {
    hospitalName?: string;
    specialization?: string;
    licenseNumber?: string;
    licenseDocumentUrl?: string;
    hospitalDocumentUrl?: string;
    governmentIdUrl?: string;
    yearsOfExperience?: number;
  };

  if (!hospitalName || !specialization) {
    res.status(400).json({ error: 'hospitalName and specialization are required' });
    return;
  }

  const { rows } = await query(
    `INSERT INTO doctor_verifications (user_id, hospital_name, specialization, license_number, license_document_url, hospital_document_url, government_id_url, years_of_experience)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      hospitalName,
      specialization,
      licenseNumber || null,
      licenseDocumentUrl || null,
      hospitalDocumentUrl || null,
      governmentIdUrl || null,
      yearsOfExperience || 0
    ],
  );

  const verification = rows[0];

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $1, 'verification_submitted', 'doctor_verification', $2, $3)`,
    [userId, verification.id, JSON.stringify({ hospitalName, specialization })],
  );

  res.json({ verification });
});

router.get('/patients', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { search } = req.query;

  let queryStr = `
    SELECT DISTINCT u.id, u.patient_id, u.display_name, u.wallet_address, u.full_address,
           c.is_active, c.expires_at
    FROM users u
    INNER JOIN consents c ON u.id = c.patient_id
    WHERE c.doctor_id = $1 AND c.is_active = true AND c.expires_at > NOW()
  `;
  const params: any[] = [userId];

  if (search) {
    queryStr += ` AND (u.display_name ILIKE $${params.length + 1} OR u.patient_id ILIKE $${params.length + 1} OR u.full_address ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }

  queryStr += ' ORDER BY u.display_name';

  const { rows } = await query(queryStr, params);
  res.json({ patients: rows });
});

router.get('/patients/:patientId/records', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const patientId = req.params.patientId;

  const consentCheck = await query(
    `SELECT * FROM consents WHERE doctor_id = $1 AND patient_id = $2 AND is_active = true AND expires_at > NOW()`,
    [userId, patientId],
  );

  if (consentCheck.rows.length === 0) {
    res.status(403).json({ error: 'No valid consent for this patient' });
    return;
  }

  const { rows } = await query(
    `SELECT mr.*, u.display_name as uploaded_by_name
     FROM medical_records mr
     LEFT JOIN users u ON mr.uploaded_by = u.id
     WHERE mr.patient_id = $1
     ORDER BY mr.created_at DESC`,
    [patientId],
  );

  res.json({ records: rows });
});

router.get('/all-patients', authMiddleware, async (req, res) => {
  const { search } = req.query;

  let queryStr = `
    SELECT id, patient_id AS "patientId", display_name AS "displayName",
           avatar_initials AS "avatarInitials", full_address AS "fullAddress"
    FROM users
    WHERE role = 'patient'
  `;
  const params: any[] = [];

  if (search) {
    queryStr += ` AND (display_name ILIKE $${params.length + 1} OR patient_id ILIKE $${params.length + 1} OR full_address ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }

  queryStr += ' ORDER BY display_name LIMIT 50';

  const { rows } = await query(queryStr, params);
  res.json({ patients: rows });
});

router.get('/emergency', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;

  const { rows } = role === 'doctor'
    ? await query(
        `SELECT ear.*, u.display_name as patient_name
         FROM emergency_access_requests ear
         LEFT JOIN users u ON ear.patient_id = u.id
         WHERE ear.doctor_id = $1
         ORDER BY ear.created_at DESC`,
        [userId],
      )
    : await query(
        `SELECT ear.*, u.display_name as doctor_name
         FROM emergency_access_requests ear
         LEFT JOIN users u ON ear.doctor_id = u.id
         WHERE ear.patient_id = $1
         ORDER BY ear.created_at DESC`,
        [userId],
      );

  res.json({ requests: rows });
});

router.get('/patients/:patientId/audit', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const patientId = req.params.patientId;

  const consentCheck = await query(
    `SELECT * FROM consents WHERE doctor_id = $1 AND patient_id = $2 AND is_active = true AND expires_at > NOW()`,
    [userId, patientId],
  );

  if (consentCheck.rows.length === 0) {
    res.status(403).json({ error: 'No valid consent for this patient' });
    return;
  }

  const { rows } = await query(
    `SELECT al.*, u.display_name as actor_name
     FROM audit_logs al
     LEFT JOIN users u ON al.actor_id = u.id
     WHERE al.user_id = $1
     ORDER BY al.created_at DESC LIMIT 50`,
    [patientId],
  );

  res.json({ logs: rows });
});

export default router;
