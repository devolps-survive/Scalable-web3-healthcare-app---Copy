import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuid } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));

type Row = Record<string, any>;
type QueryResult<T extends Row = Row> = {
  rows: T[];
  rowCount: number | null;
  command: string;
};

type FallbackState = {
  users: Row[];
  walletProviders: Row[];
  userAssets: Row[];
  permissions: Row[];
  userSettings: Row[];
  transactions: Row[];
  securityAlerts: Row[];
  authSessions: Row[];
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ethos_vault',
});

let usingFallback = false;
let fallbackState: FallbackState | null = null;

function getFallbackState(): FallbackState {
  if (fallbackState) return fallbackState;

  fallbackState = {
    users: [],
    walletProviders: [],
    userAssets: [],
    permissions: [],
    userSettings: [],
    transactions: [],
    securityAlerts: [],
    authSessions: [],
  };

  return fallbackState;
}

function createResult<T extends Row>(rows: T[], command = 'SELECT'): QueryResult<T> {
  return { rows, rowCount: rows.length, command };
}

function asRecord(value: unknown): Record<string, any> {
  return (value ?? {}) as Record<string, any>;
}

function handleFallbackQuery<T extends Row>(text: string, params?: unknown[]): QueryResult<T> {
  const sql = text.trim().toUpperCase();
  const state = getFallbackState();

  if (sql.includes('SELECT COUNT(*)')) {
    return createResult([{ count: state.users.length }] as unknown as T[]);
  }

  if (sql.startsWith('SELECT ID, NAME, ICON, DESCRIPTION FROM WALLET_PROVIDERS ORDER BY NAME')) {
    return createResult(state.walletProviders as unknown as T[]);
  }

  if (sql.startsWith('SELECT * FROM WALLET_PROVIDERS WHERE ID = $1')) {
    const id = params?.[0];
    const row = state.walletProviders.find((entry) => entry.id === id);
    return createResult(row ? [row as Row] : [], 'SELECT') as QueryResult<T>;
  }

  if (sql.startsWith('SELECT * FROM USERS LIMIT 1')) {
    return createResult(state.users.slice(0, 1) as unknown as T[]);
  }

  if (sql.startsWith('INSERT INTO AUTH_SESSIONS')) {
    const session = {
      id: `session-${uuid()}`,
      user_id: params?.[0],
      wallet_id: params?.[1],
      address: params?.[2],
      challenge: params?.[3],
      auth_step: 0,
      authenticated: false,
      access_granted: false,
      created_at: new Date().toISOString(),
    };
    state.authSessions.push(session);
    return createResult([{ id: session.id }] as unknown as T[]);
  }

  if (sql.startsWith('INSERT INTO SECURITY_ALERTS')) {
    const alert = {
      id: `alert-${uuid()}`,
      user_id: params?.[0],
      severity: params?.[1],
      title: params?.[2],
      message: params?.[3],
      read: Boolean(params?.[4]),
      created_at: new Date().toISOString(),
    };
    state.securityAlerts.push(alert);
    return createResult([] as T[]);
  }

  if (sql.startsWith('SELECT * FROM AUTH_SESSIONS WHERE ID = $1')) {
    const id = params?.[0];
    const row = state.authSessions.find((entry) => entry.id === id);
    return createResult(row ? [row as Row] : [], 'SELECT') as QueryResult<T>;
  }

  if (sql.startsWith('UPDATE AUTH_SESSIONS SET AUTH_STEP = $1 WHERE ID = $2')) {
    const [, step, id] = params || [];
    const session = state.authSessions.find((entry) => entry.id === id);
    if (session) {
      session.auth_step = step;
    }
    return createResult([], 'UPDATE');
  }

  if (sql.startsWith('UPDATE AUTH_SESSIONS SET AUTHENTICATED = TRUE, ADDRESS = $1 WHERE ID = $2')) {
    const [address, id] = params || [];
    const session = state.authSessions.find((entry) => entry.id === id);
    if (session) {
      session.authenticated = true;
      session.address = address;
    }
    return createResult([], 'UPDATE');
  }

  if (sql.startsWith('UPDATE AUTH_SESSIONS SET AUTHENTICATED = TRUE WHERE ID = $1')) {
    const id = params?.[0];
    const session = state.authSessions.find((entry) => entry.id === id);
    if (session) session.authenticated = true;
    return createResult([], 'UPDATE');
  }

  if (sql.startsWith('SELECT S.*, U.PATIENT_ID') || sql.startsWith('SELECT S.*, U.DOCTOR_ID') || sql.startsWith('SELECT S.*, U.ADMIN_ID')) {
    const id = params?.[0];
    const session = state.authSessions.find((entry) => entry.id === id);
    const user = state.users[0];
    const wallet = state.walletProviders.find((entry) => entry.id === session?.wallet_id);
    if (!session) return createResult([] as T[]);

    // Pick the correct ID based on role
    const roleId = user.patient_id || user.doctor_id || user.admin_id || user.id;

    return createResult([
      {
        ...session,
        patient_id: user.patient_id,
        doctor_id: user.doctor_id,
        admin_id: user.admin_id,
        display_name: user.display_name,
        role: user.role,
        wallet_address: user.wallet_address,
        full_address: user.full_address,
        verified: user.verified,
        verification_status: user.verification_status,
        member_since: user.member_since,
        avatar_initials: user.avatar_initials,
        user_id: session.user_id,
        wallet_name: wallet?.name ?? null,
      },
    ] as unknown as T[]);
  }

  if (sql.startsWith('UPDATE AUTH_SESSIONS SET ACCESS_GRANTED = TRUE WHERE ID = $1')) {
    const id = params?.[0];
    const session = state.authSessions.find((entry) => entry.id === id);
    if (session) session.access_granted = true;
    return createResult([], 'UPDATE');
  }

  if (sql.startsWith('INSERT INTO TRANSACTIONS')) {
    const transaction = {
      id: `tx-${uuid()}`,
      user_id: params?.[0],
      type: params?.[1] === 'auth' ? 'auth' : 'send',
      title: typeof params?.[1] === 'string' && params[1] !== 'auth' ? params[1] : 'Wallet Connected',
      asset: typeof params?.[2] === 'string' ? params[2] : 'ETH',
      amount: Number(params?.[3] ?? params?.[4] ?? 0),
      usd_value: Number(params?.[4] ?? params?.[5] ?? 0),
      status: params?.[5] ?? params?.[11] ?? 'completed',
      counterparty: params?.[6] ?? '',
      from_address: params?.[7] ?? '',
      to_address: typeof params?.[6] === 'string' ? params[6] : '',
      gas_fee: Number(params?.[7] ?? 0),
      gas_fee_usd: Number(params?.[8] ?? 0),
      network: 'Ethereum Mainnet',
      tx_hash: null,
      created_at: new Date().toISOString(),
    };
    state.transactions.push(transaction);
    return createResult([{ id: transaction.id, type: transaction.type, asset: transaction.asset, amount: transaction.amount, usdValue: transaction.usd_value, from: transaction.from_address, to: transaction.to_address, gasFee: transaction.gas_fee, gasFeeUsd: transaction.gas_fee_usd, network: transaction.network, status: transaction.status }] as unknown as T[]);
  }

  if (sql.startsWith('DELETE FROM AUTH_SESSIONS WHERE ID = $1')) {
    const id = params?.[0];
    state.authSessions = state.authSessions.filter((entry) => entry.id !== id);
    return createResult([], 'DELETE');
  }

  if (sql.startsWith('SELECT SYMBOL, NAME, AMOUNT::FLOAT')) {
    const userId = params?.[0];
    const rows = state.userAssets.filter((entry) => entry.user_id === userId).map((entry) => ({
      symbol: entry.symbol,
      name: entry.name,
      amount: Number(entry.amount),
      value: Number(entry.value),
      change: Number(entry.change_percent),
    }));
    return createResult(rows as unknown as T[]);
  }

  if (sql.startsWith('SELECT ID, TYPE, TITLE, ASSET, AMOUNT::FLOAT')) {
    const userId = params?.[0];
    const rows = state.transactions.filter((entry) => entry.user_id === userId).sort((a, b) => Number(new Date(String(b.created_at))) - Number(new Date(String(a.created_at)))).slice(0, 50).map((entry) => ({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      asset: entry.asset,
      amount: Number(entry.amount),
      usdValue: Number(entry.usd_value),
      from: entry.from_address,
      to: entry.to_address,
      gasFee: Number(entry.gas_fee),
      gasFeeUsd: Number(entry.gas_fee_usd),
      network: entry.network,
      status: entry.status,
      txHash: entry.tx_hash,
      counterparty: entry.counterparty,
      timestamp: entry.created_at,
    }));
    return createResult(rows as unknown as T[]);
  }

  if (text.includes("status = 'pending_confirmation'")) {
    const userId = params?.[0];
    const rows = state.transactions.filter((entry) => entry.user_id === userId && entry.status === 'pending_confirmation').sort((a, b) => Number(new Date(String(b.created_at))) - Number(new Date(String(a.created_at)))).slice(0, 1).map((entry) => ({
      id: entry.id,
      type: entry.type,
      asset: entry.asset,
      amount: Number(entry.amount),
      usdValue: Number(entry.usd_value),
      from: entry.from_address,
      to: entry.to_address,
      gasFee: Number(entry.gas_fee),
      gasFeeUsd: Number(entry.gas_fee_usd),
      network: entry.network,
      status: entry.status,
    }));
    return createResult(rows as unknown as T[]);
  }

  if (text.includes('WHERE id = $1 AND user_id = $2')) {
    const transactionId = params?.[0];
    const userId = params?.[1];
    const row = state.transactions.find((entry) => entry.id === transactionId && entry.user_id === userId);
    return createResult(
      row
        ? ([{
            id: row.id,
            type: row.type,
            asset: row.asset,
            amount: Number(row.amount),
            usdValue: Number(row.usd_value),
            from: row.from_address,
            to: row.to_address,
            gasFee: Number(row.gas_fee),
            gasFeeUsd: Number(row.gas_fee_usd),
            network: row.network,
            status: row.status,
          }] as unknown as T[])
        : ([] as T[]),
    );
  }

  if (sql.startsWith('SELECT FULL_ADDRESS FROM USERS WHERE ID = $1')) {
    const userId = params?.[0];
    const user = state.users.find((entry) => entry.id === userId);
    return createResult(user ? [{ full_address: user.full_address }] as unknown as T[] : [] as T[]);
  }

  if (sql.startsWith('SELECT ID AS "USERID"')) {
    const userId = params?.[0];
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return createResult([] as T[]);
    // Pick the correct ID based on role
    const roleId = user.patient_id || user.doctor_id || user.admin_id || user.id;
    return createResult([{
      userId: user.id,
      id: roleId,
      patient_id: user.patient_id,
      doctor_id: user.doctor_id,
      admin_id: user.admin_id,
      displayName: user.display_name,
      role: user.role,
      walletAddress: user.wallet_address,
      fullAddress: user.full_address,
      verified: user.verified,
      kycStatus: user.verification_status,
      memberSince: user.member_since,
      avatarInitials: user.avatar_initials,
    }] as unknown as T[]);
  }

  if (sql.startsWith('SELECT ID, LABEL, DESCRIPTION, GRANTED, SCOPE FROM PERMISSIONS WHERE USER_ID = $1')) {
    const userId = params?.[0];
    const rows = state.permissions.filter((entry) => entry.user_id === userId);
    return createResult(rows as unknown as T[]);
  }

  if (sql.startsWith('UPDATE PERMISSIONS SET GRANTED = $1 WHERE ID = $2 AND USER_ID = $3')) {
    const [granted, id, userId] = params || [];
    const permission = state.permissions.find((entry) => entry.id === id && entry.user_id === userId);
    if (permission) permission.granted = Boolean(granted);
    return createResult(permission ? [{ ...permission }] as unknown as T[] : [] as T[]);
  }

  if (sql.startsWith('SELECT SETTINGS FROM USER_SETTINGS WHERE USER_ID = $1')) {
    const userId = params?.[0];
    const settings = state.userSettings.find((entry) => entry.user_id === userId);
    return createResult(settings ? [{ settings: settings.settings }] as unknown as T[] : [] as T[]);
  }

  if (sql.startsWith('INSERT INTO USER_SETTINGS')) {
    const userId = params?.[0];
    const settings = params?.[1];
    const entry = state.userSettings.find((item) => item.user_id === userId);
    if (entry) entry.settings = settings;
    else state.userSettings.push({ user_id: userId, settings });
    return createResult([], 'INSERT');
  }

  if (sql.startsWith('SELECT ID, SEVERITY, TITLE, MESSAGE, READ, CREATED_AT AS TIMESTAMP FROM SECURITY_ALERTS')) {
    const userId = params?.[0];
    const rows = state.securityAlerts.filter((entry) => entry.user_id === userId).map((entry) => ({
      id: entry.id,
      severity: entry.severity,
      title: entry.title,
      message: entry.message,
      read: entry.read,
      timestamp: entry.created_at,
    }));
    return createResult(rows as unknown as T[]);
  }

  if (sql.startsWith('UPDATE SECURITY_ALERTS SET READ = TRUE WHERE ID = $1 AND USER_ID = $2')) {
    const [id, userId] = params || [];
    const alert = state.securityAlerts.find((entry) => entry.id === id && entry.user_id === userId);
    if (alert) alert.read = true;
    return createResult(alert ? [{
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      read: alert.read,
      timestamp: alert.created_at,
    }] as unknown as T[] : [] as T[]);
  }

  if (sql.startsWith('UPDATE TRANSACTIONS SET STATUS =')) {
    const [txHash, transactionId, userId] = params || [];
    const transaction = state.transactions.find((entry) => entry.id === transactionId && entry.user_id === userId);
    if (transaction) {
      transaction.status = 'completed';
      transaction.tx_hash = txHash;
    }
    return createResult(transaction ? [{ id: transaction.id, asset: transaction.asset, amount: Number(transaction.amount) }] as unknown as T[] : [] as T[]);
  }

  if (sql.startsWith('UPDATE USER_ASSETS SET AMOUNT = AMOUNT - $1, VALUE = VALUE - $2 WHERE USER_ID = $3 AND SYMBOL = $4')) {
    const [amount, value, userId, symbol] = params || [];
    const asset = state.userAssets.find((entry) => entry.user_id === userId && entry.symbol === symbol);
    if (asset) {
      asset.amount = Number(asset.amount) - Number(amount);
      asset.value = Number(asset.value) - Number(value);
    }
    return createResult([], 'UPDATE');
  }

  return createResult([] as T[]);
}

export async function query<T extends Row = Row>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  if (usingFallback) {
    return handleFallbackQuery<T>(text, params);
  }

  try {
    const result = await pool.query<T>(text, params);
    return result as QueryResult<T>;
  } catch (err) {
    console.warn('Postgres unavailable, switching to in-memory fallback data.', err);
    usingFallback = true;
    return handleFallbackQuery<T>(text, params);
  }
}

export async function initDb(): Promise<void> {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schema);
    // Explicitly update existing tables for continuation tasks
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255)');
    await pool.query('ALTER TABLE doctor_verifications ADD COLUMN IF NOT EXISTS government_id_url TEXT');
    await pool.query('ALTER TABLE doctor_verifications ADD COLUMN IF NOT EXISTS years_of_experience INT DEFAULT 0');
    usingFallback = false;
    console.log('Database schema initialized');
  } catch (err) {
    usingFallback = true;
    getFallbackState();
    console.warn('Database unavailable, using in-memory fallback data.', err);
  }
}

export async function seedDb(): Promise<void> {
  // Demo users and hardcoded crypto data seeding removed to keep database clean.
  console.log('Database seeding bypassed');
}

export { pool };
