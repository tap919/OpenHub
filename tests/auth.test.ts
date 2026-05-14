import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, getDb } from '../src/auth/db.js';
import { SQLiteUserStore } from '../src/auth/ana-user-store.js';

describe('Auth System', () => {
  let store: SQLiteUserStore;

  beforeEach(() => {
    initializeDatabase();
    store = new SQLiteUserStore();
  });

  describe('SQLiteUserStore', () => {
    it('should create a user', async () => {
      const user = await store.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        username: 'testuser',
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.id).toBeDefined();
    });

    it('should find user by email', async () => {
      await store.create({
        email: 'find@example.com',
        password: 'hashedpassword123',
        username: 'finduser',
      });

      const found = await store.findByEmail('find@example.com');
      expect(found).toBeDefined();
      expect(found?.email).toBe('find@example.com');
    });

    it('should find user by id', async () => {
      const created = await store.create({
        email: 'byid@example.com',
        password: 'hashedpassword123',
        username: 'byiduser',
      });

      const found = await store.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should update password', async () => {
      const user = await store.create({
        email: 'pass@example.com',
        password: 'oldpassword',
        username: 'passuser',
      });

      await store.updatePassword(user.id, 'newhashedpassword');
      const updated = await store.findById(user.id);
      expect(updated?.password).toBe('newhashedpassword');
    });

    it('should update refresh token', async () => {
      const user = await store.create({
        email: 'refresh@example.com',
        password: 'password',
        username: 'refreshuser',
      });

      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await store.updateRefreshToken(user.id, 'refreshtoken123', expiry);
      const updated = await store.findById(user.id);
      expect(updated?.refreshToken).toBe('refreshtoken123');
    });

    it('should return null for non-existent user', async () => {
      const found = await store.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('Database Schema', () => {
    it('should have users table with all columns', () => {
      const db = getDb();
      const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password_hash');
      expect(columnNames).toContain('refresh_token');
      expect(columnNames).toContain('totp_secret');
    });

    it('should have webhooks table', () => {
      const db = getDb();
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('webhooks');
      expect(tableNames).toContain('repositories');
      expect(tableNames).toContain('sessions');
    });
  });
});
