import {
  IUserStore,
  BaseUser,
} from 'awesome-node-auth';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db.js';

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  email_verified: number;
  role: string | null;
  login_provider: string | null;
  provider_account_id: string | null;
  refresh_token: string | null;
  refresh_expires: string | null;
  totp_secret: string | null;
  is_totp_enabled: number;
  is_email_verified: number;
  magic_link_token: string | null;
  magic_link_expires: string | null;
  reset_token: string | null;
  reset_expires: string | null;
  sms_code: string | null;
  sms_expires: string | null;
  phone_number: string | null;
  require_2fa: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

function rowToBaseUser(row: UserRow): BaseUser {
  return {
    id: row.id,
    email: row.email,
    password: row.password_hash || undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role || undefined,
    loginProvider: row.login_provider || undefined,
    providerAccountId: row.provider_account_id || undefined,
    refreshToken: row.refresh_token || undefined,
    refreshTokenExpiry: row.refresh_expires ? new Date(row.refresh_expires) : undefined,
    totpSecret: row.totp_secret || undefined,
    isTotpEnabled: row.is_totp_enabled === 1,
    isEmailVerified: row.is_email_verified === 1,
    magicLinkToken: row.magic_link_token || undefined,
    magicLinkTokenExpiry: row.magic_link_expires ? new Date(row.magic_link_expires) : undefined,
    resetToken: row.reset_token || undefined,
    resetTokenExpiry: row.reset_expires ? new Date(row.reset_expires) : undefined,
    smsCode: row.sms_code || undefined,
    smsCodeExpiry: row.sms_expires ? new Date(row.sms_expires) : undefined,
    phoneNumber: row.phone_number || undefined,
    require2FA: row.require_2fa === 1,
    lastLogin: row.last_login ? new Date(row.last_login) : undefined,
  };
}

export class SQLiteUserStore implements IUserStore {
  async findByEmail(email: string): Promise<BaseUser | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ? rowToBaseUser(row) : null;
  }

  async findByUsername(username: string): Promise<BaseUser | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    return row ? rowToBaseUser(row) : null;
  }

  async findById(id: string): Promise<BaseUser | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? rowToBaseUser(row) : null;
  }

  async create(data: Partial<BaseUser> & { username?: string }): Promise<BaseUser> {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const username = (data as any).username || data.email.split('@')[0];

    db.prepare(`
      INSERT INTO users (
        id, username, email, password_hash,
        first_name, last_name, role, login_provider,
        email_verified, is_totp_enabled, is_email_verified,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', 1, 0, 1, ?, ?)
    `).run(
      id,
      username,
      data.email,
      data.password || null,
      data.firstName || null,
      data.lastName || null,
      data.role || null,
      now,
      now
    );

    return {
      id,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      loginProvider: data.loginProvider || 'local',
      isEmailVerified: true,
      lastLogin: new Date(now),
    };
  }

  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    const db = getDb();
    db.prepare(`
      UPDATE users SET refresh_token = ?, refresh_expires = ?, updated_at = ?
      WHERE id = ?
    `).run(token, expiry?.toISOString() || null, new Date().toISOString(), userId);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const db = getDb();
    db.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), new Date().toISOString(), userId);
  }

  async updateResetToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    const db = getDb();
    db.prepare(`
      UPDATE users SET reset_token = ?, reset_expires = ?, updated_at = ?
      WHERE id = ?
    `).run(token, expiry?.toISOString() || null, new Date().toISOString(), userId);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const db = getDb();
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
    `).run(hashedPassword, new Date().toISOString(), userId);
  }

  async updateTotpSecret(userId: string, secret: string | null): Promise<void> {
    const db = getDb();
    db.prepare(`
      UPDATE users SET totp_secret = ?, is_totp_enabled = ?, updated_at = ? WHERE id = ?
    `).run(secret, secret ? 1 : 0, new Date().toISOString(), userId);
  }

  async updateMagicLinkToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    const db = getDb();
    db.prepare(`
      UPDATE users SET magic_link_token = ?, magic_link_expires = ?, updated_at = ?
      WHERE id = ?
    `).run(token, expiry?.toISOString() || null, new Date().toISOString(), userId);
  }

  async updateSmsCode(userId: string, code: string | null, expiry: Date | null): Promise<void> {
    const db = getDb();
    db.prepare(`
      UPDATE users SET sms_code = ?, sms_expires = ?, updated_at = ?
      WHERE id = ?
    `).run(code, expiry?.toISOString() || null, new Date().toISOString(), userId);
  }

  async findByResetToken(token: string): Promise<BaseUser | null> {
    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM users WHERE reset_token = ? AND reset_expires > datetime('now')"
    ).get(token) as UserRow | undefined;
    return row ? rowToBaseUser(row) : null;
  }

  async findByMagicLinkToken(token: string): Promise<BaseUser | null> {
    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM users WHERE magic_link_token = ? AND magic_link_expires > datetime('now')"
    ).get(token) as UserRow | undefined;
    return row ? rowToBaseUser(row) : null;
  }

  async findByProviderAccount(provider: string, providerAccountId: string): Promise<BaseUser | null> {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM users WHERE login_provider = ? AND provider_account_id = ?'
    ).get(provider, providerAccountId) as UserRow | undefined;
    return row ? rowToBaseUser(row) : null;
  }

  async updateProfile(userId: string, data: { firstName?: string | null; lastName?: string | null }): Promise<void> {
    const db = getDb();
    db.prepare(`
      UPDATE users SET first_name = ?, last_name = ?, updated_at = ? WHERE id = ?
    `).run(data.firstName ?? null, data.lastName ?? null, new Date().toISOString(), userId);
  }

  async deleteUser(userId: string): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<BaseUser | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber) as UserRow | undefined;
    return row ? rowToBaseUser(row) : null;
  }
}