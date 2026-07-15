import { Router } from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitToUser } from '../socket.js';

const router = Router();

function buildProfilePayload(row: Record<string, any>, settings: Record<string, any> = {}) {
  // Pick the correct ID based on role (patient_id, doctor_id, admin_id)
  const roleId = row.patient_id || row.doctor_id || row.admin_id || row.user_id || row.id;
  return {
    userId: row.userId ?? row.id ?? row.user_id,
    id: roleId,
    displayName: row.displayName ?? row.display_name,
    role: row.role,
    walletAddress: row.walletAddress ?? row.wallet_address,
    fullAddress: row.fullAddress ?? row.full_address,
    verified: row.verified,
    kycStatus: row.kycStatus ?? row.verification_status,
    memberSince: row.memberSince ?? row.member_since,
    avatarInitials: row.avatarInitials ?? row.avatar_initials,
    bio: settings.profile?.bio ?? '',
    organization: settings.profile?.organization ?? '',
    website: settings.profile?.website ?? '',
  };
}

router.get('/profile', authMiddleware, async (req, res) => {
  const { rows } = await query(
    `SELECT id AS "userId", patient_id, doctor_id, admin_id, display_name AS "displayName", role,
            wallet_address AS "walletAddress", full_address AS "fullAddress",
            verified, verification_status AS "kycStatus", member_since AS "memberSince",
            avatar_initials AS "avatarInitials"
     FROM users WHERE id = $1`,
    [req.user!.userId],
  );
  const existingProfile = rows[0] as Record<string, any> | undefined;
  const settingsRes = await query('SELECT settings FROM user_settings WHERE user_id = $1', [req.user!.userId]);
  const settings = settingsRes.rows[0]?.settings || {};
  const walletAddress = settings.profile?.walletAddress || existingProfile?.walletAddress || existingProfile?.wallet_address || settings.profile?.fullAddress || existingProfile?.fullAddress || existingProfile?.full_address || '';
  const displayName = settings.profile?.displayName || existingProfile?.displayName || existingProfile?.display_name || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Wallet Holder');
  const role = settings.profile?.role || existingProfile?.role || 'Web3 Citizen';
  const fullAddress = settings.profile?.fullAddress || walletAddress;
  res.json({
    profile: buildProfilePayload(
      {
        ...existingProfile,
        displayName,
        role,
        walletAddress,
        fullAddress,
        avatarInitials: settings.profile?.displayName
          ? settings.profile.displayName.slice(0, 2).toUpperCase()
          : existingProfile?.avatarInitials || existingProfile?.avatar_initials || 'WU',
      },
      settings,
    ),
  });
});

router.put('/profile', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { displayName, role, bio, organization, website } = req.body as {
    displayName?: string;
    role?: string;
    bio?: string;
    organization?: string;
    website?: string;
  };

  const updates: string[] = [];
  const values: unknown[] = [];

  if (displayName !== undefined) {
    updates.push(`display_name = $${updates.length + 1}`);
    values.push(displayName);
  }
  if (role !== undefined) {
    updates.push(`role = $${updates.length + 1}`);
    values.push(role);
  }

  if (updates.length > 0) {
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${updates.length + 1}`, [...values, userId]);
  }

  const settingsRes = await query('SELECT settings FROM user_settings WHERE user_id = $1', [userId]);
  const currentSettings = settingsRes.rows[0]?.settings || {};
  const profileSettings = {
    ...(currentSettings.profile || {}),
    ...(displayName !== undefined ? { displayName } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(bio !== undefined ? { bio } : {}),
    ...(organization !== undefined ? { organization } : {}),
    ...(website !== undefined ? { website } : {}),
  };

  const mergedSettings = {
    ...currentSettings,
    profile: profileSettings,
  };

  await query(
    `INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET settings = $2`,
    [userId, JSON.stringify(mergedSettings)],
  );

  const { rows } = await query(
    `SELECT id AS "userId", patient_id, doctor_id, admin_id, display_name AS "displayName", role,
            wallet_address AS "walletAddress", full_address AS "fullAddress",
            verified, verification_status AS "kycStatus", member_since AS "memberSince",
            avatar_initials AS "avatarInitials"
     FROM users WHERE id = $1`,
    [userId],
  );

  res.json({ profile: buildProfilePayload(rows[0], mergedSettings) });
});

router.get('/permissions', authMiddleware, async (req, res) => {
  const { rows } = await query(
    'SELECT id, label, description, granted, scope FROM permissions WHERE user_id = $1',
    [req.user!.userId],
  );
  res.json({ permissions: rows });
});

router.put('/permissions/:id', authMiddleware, async (req, res) => {
  const { granted } = req.body as { granted?: boolean };
  const { rows } = await query(
    `UPDATE permissions SET granted = $1 WHERE id = $2 AND user_id = $3
     RETURNING id, label, description, granted, scope`,
    [granted, req.params.id, req.user!.userId],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'Permission not found' });
    return;
  }

  emitToUser(req.user!.userId, 'permission:updated', { permission: rows[0] });

  res.json({ permission: rows[0] });
});

router.get('/settings', authMiddleware, async (req, res) => {
  const { rows } = await query('SELECT settings FROM user_settings WHERE user_id = $1', [
    req.user!.userId,
  ]);
  res.json({ settings: rows[0]?.settings || {} });
});

router.put('/settings', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const current = await query('SELECT settings FROM user_settings WHERE user_id = $1', [userId]);
  const merged = { ...(current.rows[0]?.settings || {}), ...req.body };

  await query(
    `INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET settings = $2`,
    [userId, JSON.stringify(merged)],
  );

  emitToUser(userId, 'settings:updated', { settings: merged });
  res.json({ settings: merged });
});

router.get('/security-alerts', authMiddleware, async (req, res) => {
  const { rows } = await query(
    `SELECT id, severity, title, message, read, created_at AS timestamp
     FROM security_alerts WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user!.userId],
  );
  res.json({ alerts: rows });
});

router.put('/security-alerts/:id/read', authMiddleware, async (req, res) => {
  const { rows } = await query(
    `UPDATE security_alerts SET read = true WHERE id = $1 AND user_id = $2
     RETURNING id, severity, title, message, read, created_at AS timestamp`,
    [req.params.id, req.user!.userId],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  res.json({ alert: rows[0] });
});

export default router;
