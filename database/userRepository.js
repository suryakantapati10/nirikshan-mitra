/**
 * database/userRepository.js — User Data Access Object for Nirikshan Mitra
 *
 * Manages inspector and admin accounts in SQLite.
 * Ensures password_hash is never exposed in general user listings or profile queries.
 */

const { db: defaultDb } = require('./db');

class UserRepository {
  constructor(database = defaultDb) {
    this.db = database;
  }

  /**
   * Creates a new user record.
   * Expects password_hash to already be hashed (never plaintext).
   */
  async createUser(data) {
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const passwordHash = data.password_hash;
    const role = (data.role || 'inspector').toLowerCase();
    const active = data.active !== undefined ? (data.active ? 1 : 0) : 1;
    const now = new Date().toISOString();

    if (!name) throw new Error('User name is required.');
    if (!email) throw new Error('User email is required.');
    if (!passwordHash) throw new Error('Password hash is required.');
    if (role !== 'inspector' && role !== 'admin') {
      throw new Error('Invalid user role. Must be inspector or admin.');
    }

    const result = await this.db.run(
      `INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, passwordHash, role, active, now, now]
    );

    return {
      id: result.lastID,
      name,
      email,
      role,
      active,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Retrieves a user by email, INCLUDING password_hash for authentication comparison.
   * Internal auth use only.
   */
  async getUserByEmailWithPassword(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const user = await this.db.get(
      `SELECT id, name, email, password_hash, role, active, created_at, updated_at
       FROM users WHERE LOWER(email) = ?`,
      [normalized]
    );
    return user || null;
  }

  /**
   * Retrieves a sanitized user by ID (without password_hash).
   */
  async getUserById(id) {
    if (!id) return null;
    const user = await this.db.get(
      `SELECT id, name, email, role, active, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
    return user || null;
  }

  /**
   * Retrieves all users (without password_hash) for admin management.
   */
  async getAllUsers() {
    const users = await this.db.all(
      `SELECT id, name, email, role, active, created_at, updated_at
       FROM users ORDER BY id ASC`
    );
    return users || [];
  }

  /**
   * Toggles or sets user active status (1 for active, 0 for deactivated).
   */
  async updateUserStatus(id, active) {
    const activeVal = active ? 1 : 0;
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE users SET active = ?, updated_at = ? WHERE id = ?`,
      [activeVal, now, id]
    );
    return this.getUserById(id);
  }

  /**
   * Updates user role ('inspector' or 'admin').
   */
  async updateUserRole(id, role) {
    const roleVal = (role || '').toLowerCase();
    if (roleVal !== 'inspector' && roleVal !== 'admin') {
      throw new Error('Invalid role. Must be inspector or admin.');
    }
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE users SET role = ?, updated_at = ? WHERE id = ?`,
      [roleVal, now, id]
    );
    return this.getUserById(id);
  }

  /**
   * Returns total count of users in database.
   */
  async countUsers() {
    const row = await this.db.get('SELECT COUNT(*) as count FROM users');
    return row ? row.count : 0;
  }
}

module.exports = {
  UserRepository,
  userRepository: new UserRepository()
};
