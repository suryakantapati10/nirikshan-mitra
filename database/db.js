/**
 * database/db.js — Nirikshan Mitra SQLite Database Connection & Query Interface
 *
 * Provides a clean Promise-based wrapper around sqlite3 with parameterized query support.
 * Automatically ensures the storage directory exists.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_DB_NAME = 'nirikshanmitra.db';
const DEFAULT_DB_PATH = process.env.DB_PATH || process.env.DATABASE_PATH || path.join(DATA_DIR, DEFAULT_DB_NAME);

class Database {
  constructor(dbFilePath = DEFAULT_DB_PATH) {
    this.dbPath = dbFilePath;
    this.db = null;
  }

  /**
   * Opens or creates the SQLite database connection
   */
  async open() {
    if (this.db) return this.db;

    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('[Database] Failed to connect to SQLite:', err.message);
          return reject(err);
        }
        // Enable foreign key constraints
        this.db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
          if (pragmaErr) console.warn('[Database] Failed to enable foreign keys:', pragmaErr.message);
          resolve(this.db);
        });
      });
    });
  }

  /**
   * Executes a parameterized statement (INSERT, UPDATE, DELETE)
   * Returns { lastID, changes }
   */
  async run(sql, params = []) {
    await this.open();
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Fetches a single row
   */
  async get(sql, params = []) {
    await this.open();
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }

  /**
   * Fetches all matching rows
   */
  async all(sql, params = []) {
    await this.open();
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  /**
   * Executes multiple raw SQL statements (schema creation)
   */
  async exec(sql) {
    await this.open();
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  /**
   * Closes the database connection
   */
  async close() {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) return reject(err);
        this.db = null;
        resolve();
      });
    });
  }
}

// Singleton default instance for the application
const defaultDb = new Database();

module.exports = {
  Database,
  db: defaultDb,
  DEFAULT_DB_PATH,
  DB_PATH: DEFAULT_DB_PATH,
  DATABASE_PATH: DEFAULT_DB_PATH,
  DATA_DIR,
  DEFAULT_DB_NAME
};
