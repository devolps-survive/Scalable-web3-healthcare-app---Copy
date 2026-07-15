import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitToUser } from '../socket.js';

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router.get('/records', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { search, type } = req.query;

  let queryStr = `
    SELECT mr.*, u.display_name as uploaded_by_name
    FROM medical_records mr
    LEFT JOIN users u ON mr.uploaded_by = u.id
    WHERE mr.patient_id = $1
  `;
  const params: any[] = [userId];

  if (search) {
    queryStr += ` AND (mr.file_name ILIKE $${params.length + 1} OR mr.description ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }

  if (type) {
    queryStr += ` AND mr.record_type = $${params.length + 1}`;
    params.push(type);
  }

  queryStr += ' ORDER BY mr.created_at DESC LIMIT 50';

  const { rows } = await query(queryStr, params);
  res.json({ records: rows });
});

router.get('/doctors', authMiddleware, async (req, res) => {
  const { search } = req.query;

  let queryStr = `
    SELECT u.id, u.doctor_id AS "doctorId", u.display_name AS "displayName",
           u.avatar_initials AS "avatarInitials", u.verification_status AS "verificationStatus",
           dv.hospital_name AS "hospitalName", dv.specialization
    FROM users u
    LEFT JOIN doctor_verifications dv ON dv.user_id = u.id AND dv.status = 'approved'
    WHERE u.role = 'doctor' AND u.verification_status = 'approved'
  `;
  const params: any[] = [];

  if (search) {
    queryStr += ` AND (u.display_name ILIKE $${params.length + 1} OR dv.specialization ILIKE $${params.length + 1} OR dv.hospital_name ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }

  queryStr += ' ORDER BY u.display_name LIMIT 50';

  const { rows } = await query(queryStr, params);
  res.json({ doctors: rows });
});

router.get('/records/:id', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { rows } = await query(
    `SELECT mr.*, u.display_name as uploaded_by_name
     FROM medical_records mr
     LEFT JOIN users u ON mr.uploaded_by = u.id
     WHERE mr.id = $1 AND mr.patient_id = $2`,
    [req.params.id, userId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  res.json({ record: rows[0] });
});

router.post('/records/upload', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { recordType, fileName, fileUrl, fileSize, description, patientId } = req.body as {
    recordType?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    description?: string;
    patientId?: string;
  };

  if (!recordType || !fileName || !fileUrl) {
    res.status(400).json({ error: 'recordType, fileName, and fileUrl are required' });
    return;
  }

  const targetPatientId = patientId || userId;

  // ADD THIS VALIDATION:
  if (!UUID_REGEX.test(targetPatientId)) {
    res.status(400).json({ error: 'Invalid patient ID. Please select a valid patient.' });
    return;
  }

  // ADD THIS: confirm the patient actually exists and is really a patient
  const patientCheck = await query('SELECT id FROM users WHERE id = $1 AND role = $2', [targetPatientId, 'patient']);
  if (patientCheck.rows.length === 0) {
    res.status(404).json({ error: 'Patient not found.' });
    return;
  }

  const fileHash = createHash('sha256').update(fileUrl).digest('hex');

  const { rows } = await query(
    `INSERT INTO medical_records (patient_id, uploaded_by, record_type, file_name, file_url, file_size, file_hash, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [targetPatientId, userId, recordType, fileName, fileUrl, fileSize, fileHash, description],
  );

  const record = rows[0];

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $1, 'upload', 'medical_record', $2, $3)`,
    [targetPatientId, record.id, JSON.stringify({ recordType, fileName })],
  );

  emitToUser(targetPatientId, 'notification:new', {
    type: 'record_upload',
    title: 'New Medical Record',
    message: `A new ${recordType} record has been uploaded`,
  });

  res.json({ record });
});

router.get('/consents', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { rows } = await query(
    `SELECT c.id, c.patient_id, c.doctor_id, c.consent_id_blockchain,
            c.granted_at, c.expires_at, c.revoked_at, c.is_active,
            u.display_name AS doctor_name, u.doctor_id AS doctor_id_display
     FROM consents c
     LEFT JOIN users u ON c.doctor_id = u.id
     WHERE c.patient_id = $1
     ORDER BY c.granted_at DESC`,
    [userId],
  );

  res.json({ consents: rows });
});
router.post('/consents/grant', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { doctorId, expiresAt } = req.body as {
    doctorId?: string;
    expiresAt?: string;
  };

  if (!doctorId || !expiresAt) {
    res.status(400).json({ error: 'doctorId and expiresAt are required' });
    return;
  }

  // ADD THIS CHECK:
  const doctorCheck = await query(
    `SELECT id FROM users WHERE id = $1 AND role = 'doctor' AND verification_status = 'approved'`,
    [doctorId],
  );
  if (doctorCheck.rows.length === 0) {
    res.status(404).json({ error: 'Doctor not found or not yet approved.' });
    return;
  }

  const { rows } = await query(
    `INSERT INTO consents (patient_id, doctor_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, doctorId, expiresAt],
  );
  // ... rest unchanged
});

router.post('/consents/revoke', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { doctorId } = req.body as { doctorId?: string };

  if (!doctorId) {
    res.status(400).json({ error: 'doctorId is required' });
    return;
  }

  const { rows } = await query(
    `UPDATE consents SET is_active = false, revoked_at = NOW()
     WHERE patient_id = $1 AND doctor_id = $2 AND is_active = true
     RETURNING *`,
    [userId, doctorId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Active consent not found' });
    return;
  }

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $1, 'consent_revoked', 'consent', $2, $3)`,
    [userId, rows[0].id, JSON.stringify({ doctorId })],
  );

  res.json({ consent: rows[0] });
});

router.get('/emergency', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;

  const { rows } = role === 'doctor'
    ? await query(
        `SELECT ear.*, u.display_name as patient_name, u.wallet_address as patient_wallet_address,
                d.wallet_address as doctor_wallet_address
         FROM emergency_access_requests ear
         LEFT JOIN users u ON ear.patient_id = u.id
         LEFT JOIN users d ON ear.doctor_id = d.id
         WHERE ear.doctor_id = $1
         ORDER BY ear.created_at DESC`,
        [userId],
      )
    : await query(
        `SELECT ear.*, u.display_name as doctor_name, u.wallet_address as doctor_wallet_address,
                p.wallet_address as patient_wallet_address
         FROM emergency_access_requests ear
         LEFT JOIN users u ON ear.doctor_id = u.id
         LEFT JOIN users p ON ear.patient_id = p.id
         WHERE ear.patient_id = $1
         ORDER BY ear.created_at DESC`,
        [userId],
      );

  res.json({ requests: rows });
});

router.post('/emergency/request', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { patientId, reason } = req.body as {
    patientId?: string;
    reason?: string;
  };

  if (!patientId || !reason) {
    res.status(400).json({ error: 'patientId and reason are required' });
    return;
  }

  const { rows } = await query(
    `INSERT INTO emergency_access_requests (patient_id, doctor_id, reason)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [patientId, userId, reason],
  );

  const request = rows[0];

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'emergency_requested', 'emergency_access', $3, $4)`,
    [patientId, userId, request.id, JSON.stringify({ reason })],
  );

  emitToUser(patientId, 'notification:new', {
    type: 'emergency_request',
    title: 'Emergency Access Request',
    message: `A doctor has requested emergency access: ${reason}`,
  });

  res.json({ request });
});

router.post('/emergency/approve', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { requestId, expiresAt } = req.body as {
    requestId?: string;
    expiresAt?: string;
  };

  if (!requestId) {
    res.status(400).json({ error: 'requestId is required' });
    return;
  }

  const { rows } = await query(
    `UPDATE emergency_access_requests
     SET status = 'approved', approved_by = $1, approved_at = NOW(), expires_at = $2
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [userId, expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), requestId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Request not found or already processed' });
    return;
  }

  const request = rows[0];

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'emergency_approved', 'emergency_access', $3, $4)`,
    [request.patient_id, userId, request.id, JSON.stringify({ expiresAt })],
  );

  emitToUser(request.doctor_id, 'notification:new', {
    type: 'emergency_approved',
    title: 'Emergency Access Approved',
    message: 'Your emergency access request has been approved',
  });

  res.json({ request });
});

router.post('/emergency/reject', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { requestId } = req.body as {
    requestId?: string;
  };

  if (!requestId) {
    res.status(400).json({ error: 'requestId is required' });
    return;
  }

  const { rows } = await query(
    `UPDATE emergency_access_requests
     SET status = 'rejected', approved_by = $1, approved_at = NOW()
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [userId, requestId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Request not found or already processed' });
    return;
  }

  const request = rows[0];

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'emergency_rejected', 'emergency_access', $3, $4)`,
    [request.patient_id, userId, request.id, JSON.stringify({})],
  );

  emitToUser(request.doctor_id, 'notification:new', {
    type: 'emergency_rejected',
    title: 'Emergency Access Rejected',
    message: 'Your emergency access request was rejected',
  });

  res.json({ request });
});

export default router;
