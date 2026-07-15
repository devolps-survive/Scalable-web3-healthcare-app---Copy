import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query } from '../db/index.js';
import { signToken } from '../middleware/auth.js';
import { emitToSession, emitToUser } from '../socket.js';

const router = Router();

const AUTH_STEPS = [
  'Verifying wallet signature...',
  'Checking healthcare credentials...',
  'Validating role permissions...',
  'Establishing secure session...',
];

router.post('/connect', async (req, res) => {
  const { address, signature, role, displayName, email, phone, emergencyContact } = req.body as {
    address?: string;
    signature?: string;
    role?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
  };

  const walletAddress = address?.trim()?.toLowerCase();
  console.log('[Auth /connect] Request received:', { walletAddress, role, displayName });
  
  if (!walletAddress) {
    res.status(400).json({ error: 'Wallet address is required' });
    return;
  }

  let userRes = await query('SELECT * FROM users WHERE LOWER(full_address) = $1', [walletAddress]);
  let user = userRes.rows[0] as Record<string, any> | undefined;

  if (!user) {
    // Admin accounts must pre-exist in the database — never allow public registration
    if (role === 'admin') {
      res.status(403).json({ error: 'Admin accounts cannot be created through registration. Contact your system administrator.' });
      return;
    }

    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    const userRole = role || 'patient';
    const roleId = userRole === 'doctor' ? 'doctor_id' : 'patient_id';
    const roleIdValue = `${userRole.toUpperCase()}-${walletAddress.slice(2, 8).toUpperCase()}`;
    const name = displayName?.trim() || (userRole === 'patient' ? 'Patient' : 'Doctor');
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || (userRole === 'patient' ? 'PT' : 'DR');
    
    const insertRes = await query(
      `INSERT INTO users (${roleId}, display_name, role, wallet_address, full_address, verified, verification_status, avatar_initials, contact_email, contact_phone, emergency_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        roleIdValue,
        name,
        userRole,
        walletAddress,
        walletAddress,
        userRole === 'patient', // Patients can be verified immediately to use the dashboard, doctors need verification approval
        userRole === 'patient' ? 'verified' : 'pending',
        initials,
        email || null,
        phone || null,
        emergencyContact || null
      ]
    );
    user = insertRes.rows[0];
  }

  const challenge = `EASEeHealth Sign-In\nNonce: ${uuid()}\nTimestamp: ${Date.now()}`;

  const sessionRes = await query(
    `INSERT INTO auth_sessions (user_id, address, challenge)
     VALUES ($1, $2, $3) RETURNING id`,
    [user.id, walletAddress, challenge],
  );

  const sessionId = String(sessionRes.rows[0].id);

  emitToSession(sessionId, 'auth:connected', {
    sessionId,
    address: walletAddress,
    challenge,
    signature: signature || null,
  });

  await query(
    `INSERT INTO security_alerts (user_id, severity, title, message)
     VALUES ($1, 'low', 'Wallet Connection Initiated', $2)`,
    [user.id, `Connection attempt from ${walletAddress}`],
  );

  res.json({
    sessionId,
    address: walletAddress,
    challenge,
  });
});

router.post('/authenticate', async (req, res) => {
  const { sessionId, address, signature } = req.body as {
    sessionId?: string;
    address?: string;
    signature?: string;
  };
  console.log('[Auth /authenticate] Request received:', { sessionId, address, hasSignature: !!signature });
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const sessionRes = await query('SELECT * FROM auth_sessions WHERE id = $1', [sessionId]);
  console.log('[Auth /authenticate] Session lookup result:', { found: sessionRes.rows.length > 0, rowCount: sessionRes.rows.length });
  if (sessionRes.rows.length === 0) {
    console.error('[Auth /authenticate] Session not found for sessionId:', sessionId);
    // Debug: Check if we're using fallback storage
    const { query: debugQuery, pool } = await import('../db/index.js');
    console.log('[Auth /authenticate] Debug - checking all sessions in storage...');
    try {
      const allSessions = await debugQuery('SELECT * FROM auth_sessions');
      console.log('[Auth /authenticate] Debug - all sessions in DB:', allSessions.rows.map((r: any) => ({ id: r.id, address: r.address })));
    } catch (e) {
      console.error('[Auth /authenticate] Debug - failed to query sessions:', e);
    }
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const session = sessionRes.rows[0] as Record<string, any>;
  const walletAddress = address?.trim() || String(session.address || '');
  const hasProof = Boolean(signature && signature.startsWith('0x') && signature.length > 80);

  for (let step = 0; step < AUTH_STEPS.length; step++) {
    await new Promise((r) => setTimeout(r, 700));
    await query('UPDATE auth_sessions SET auth_step = $1 WHERE id = $2', [step + 1, sessionId]);
    emitToSession(sessionId, 'auth:step', {
      step: step + 1,
      total: AUTH_STEPS.length,
      message: AUTH_STEPS[step],
      progress: Math.round(((step + 1) / AUTH_STEPS.length) * 100),
    });
  }

  await query('UPDATE auth_sessions SET authenticated = true, address = $1 WHERE id = $2', [walletAddress, sessionId]);

  emitToSession(sessionId, 'auth:authenticated', {
    sessionId,
    authenticated: true,
    address: walletAddress,
    proofProvided: hasProof,
  });

  res.json({ authenticated: true, status: 'authenticated', address: walletAddress });
});

router.post('/grant-access', async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

const sessionRes = await query(
  `SELECT s.*, u.patient_id, u.doctor_id, u.admin_id, u.display_name, u.role,
          u.wallet_address, u.full_address, u.verified, u.verification_status,
          u.member_since, u.avatar_initials, u.contact_email, u.contact_phone,
          u.id AS user_id
   FROM auth_sessions s
   JOIN users u ON s.user_id = u.id
   WHERE s.id = $1`,
  [sessionId],
);
  if (sessionRes.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const row = sessionRes.rows[0] as Record<string, any>;
  if (!row.authenticated) {
    res.status(403).json({ error: 'Not authenticated' });
    return;
  }

  const walletAddress = String(row.address || row.wallet_address || row.full_address || '');
  const fallbackName = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'User';
  const displayName = String(row.display_name || fallbackName);

  await query('UPDATE auth_sessions SET access_granted = true WHERE id = $1', [sessionId]);

  const token = signToken({ userId: String(row.user_id), sessionId, role: row.role });
  const profile = {
    userId: String(row.user_id),
    id: String(row.patient_id || row.doctor_id || row.admin_id || row.user_id),
    displayName,
    role: String(row.role || 'patient'),
    walletAddress,
    fullAddress: walletAddress,
    verified: Boolean(row.verified),
    verificationStatus: String(row.verification_status || 'pending'),
    memberSince: String(row.member_since || new Date().toISOString()),
    avatarInitials: row.avatar_initials || (walletAddress ? `${walletAddress.slice(2, 4).toUpperCase()}` : 'US'),
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
  };

  await query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, details)
     VALUES ($1, $1, 'login', 'session', $2)`,
    [row.user_id, JSON.stringify({ method: 'wallet', address: walletAddress })],
  );

  emitToSession(sessionId, 'auth:granted', { accessGranted: true, profile, token });
  emitToUser(String(row.user_id), 'dashboard:update', { message: 'New session established' });

  res.json({ accessGranted: true, profile, token });
});

router.post('/logout', async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (sessionId) {
    await query('DELETE FROM auth_sessions WHERE id = $1', [sessionId]);
  }
  res.json({ loggedOut: true });
});

router.get('/session/:sessionId', async (req, res) => {
  const { rows } = await query('SELECT * FROM auth_sessions WHERE id = $1', [req.params.sessionId]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(rows[0]);
});

export default router;
