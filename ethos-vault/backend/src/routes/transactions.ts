import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitToUser } from '../socket.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { rows } = await query(
    `SELECT id, type, title, asset, amount::float, usd_value::float AS "usdValue",
            from_address AS "from", to_address AS "to", gas_fee::float AS "gasFee",
            gas_fee_usd::float AS "gasFeeUsd", network, status, tx_hash AS "txHash",
            counterparty, created_at AS timestamp
     FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );

  const activities = rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    amount: r.type === 'auth' ? '' : `${r.amount} ${r.asset}`,
    value: r.usdValue ? `$${Number(r.usdValue).toLocaleString()}` : '',
    timestamp: r.timestamp,
    status: r.status,
    counterparty: r.counterparty || r.to || '',
  }));

  res.json({ activities });
});

router.get('/pending', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { rows } = await query(
    `SELECT id, type, asset, amount::float, usd_value::float AS "usdValue",
            from_address AS "from", to_address AS "to", gas_fee::float AS "gasFee",
            gas_fee_usd::float AS "gasFeeUsd", network, status
     FROM transactions WHERE user_id = $1 AND status = 'pending_confirmation'
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'No pending transaction' });
    return;
  }
  res.json({ transaction: rows[0] });
});

router.get('/:id', authMiddleware, async (req, res) => {
  const { rows } = await query(
    `SELECT id, type, asset, amount::float, usd_value::float AS "usdValue",
            from_address AS "from", to_address AS "to", gas_fee::float AS "gasFee",
            gas_fee_usd::float AS "gasFeeUsd", network, status
     FROM transactions WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user!.userId],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json({ transaction: rows[0] });
});

router.get('/gas/estimate', authMiddleware, async (req, res) => {
  res.json({
    gasFee: 0.0042,
    gasFeeUsd: 12.58,
  });
});

router.post('/send', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { asset, amount, to } = req.body as { asset?: string; amount?: number; to?: string };

  if (!asset || !amount || !to) {
    res.status(400).json({ error: 'asset, amount, and to are required' });
    return;
  }

  const userRes = await query('SELECT full_address FROM users WHERE id = $1', [userId]);
  const from = userRes.rows[0].full_address;
  
  const assetRes = await query('SELECT amount, value FROM user_assets WHERE user_id = $1 AND symbol = $2', [userId, asset]);
  const price = assetRes.rows.length > 0 && assetRes.rows[0].amount > 0 ? assetRes.rows[0].value / assetRes.rows[0].amount : 0;
  const usdValue = amount * price;

  const gasFee = 0.0042;
  const gasFeeUsd = 12.58;

  const txRes = await query(
    `INSERT INTO transactions (user_id, type, title, asset, amount, usd_value, from_address, to_address,
      gas_fee, gas_fee_usd, network, status, counterparty)
     VALUES ($1, 'send', $2, $3, $4, $5, $6, $7, $8, $9, 'Ethereum Mainnet', 'pending_confirmation', $7)
     RETURNING id, type, asset, amount::float, usd_value::float AS "usdValue",
               from_address AS "from", to_address AS "to", gas_fee::float AS "gasFee",
               gas_fee_usd::float AS "gasFeeUsd", network, status`,
    [userId, `Send ${amount} ${asset}`, asset, amount, usdValue, from, to, gasFee, gasFeeUsd],
  );

  const tx = txRes.rows[0];

  await query(
    `INSERT INTO security_alerts (user_id, severity, title, message)
     VALUES ($1, 'medium', 'Large Transaction Pending', $2)`,
    [userId, `A transfer of ${amount} ${asset} requires your confirmation`],
  );

  emitToUser(userId, 'transaction:created', { transaction: tx });
  emitToUser(userId, 'alert:new', { severity: 'medium', title: 'Transaction Pending' });

  res.json({ transaction: tx });
});

router.post('/confirm', authMiddleware, async (req, res) => {
  const userId = req.user!.userId;
  const { transactionId } = req.body as { transactionId?: string };

  if (!transactionId) {
    res.status(400).json({ error: 'transactionId is required' });
    return;
  }

  const txHash = `0x${uuid().replace(/-/g, '')}`;
  const result = await query(
    `UPDATE transactions SET status = 'completed', tx_hash = $1
     WHERE id = $2 AND user_id = $3 AND status = 'pending_confirmation'
     RETURNING id, asset, amount::float`,
    [txHash, transactionId, userId],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Transaction not found or already confirmed' });
    return;
  }

  const tx = result.rows[0] as Record<string, any>;
  
  const assetRes = await query('SELECT amount, value FROM user_assets WHERE user_id = $1 AND symbol = $2', [userId, String(tx.asset)]);
  const price = assetRes.rows.length > 0 && assetRes.rows[0].amount > 0 ? assetRes.rows[0].value / assetRes.rows[0].amount : 0;

  await query(
    'UPDATE user_assets SET amount = amount - $1, value = value - $2 WHERE user_id = $3 AND symbol = $4',
    [Number(tx.amount), Number(tx.amount) * price, userId, String(tx.asset)],
  );

  emitToUser(userId, 'transaction:confirmed', { transactionId, status: 'completed', hash: txHash });
  emitToUser(userId, 'dashboard:update', { message: 'Portfolio updated' });

  res.json({ transactionId, status: 'completed', hash: txHash, timestamp: new Date().toISOString() });
});

export default router;
