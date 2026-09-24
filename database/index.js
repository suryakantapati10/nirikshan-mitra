/**
 * database/index.js — Nirikshan Mitra SQLite Database & Repository Aggregator
 */

const { db, Database, DEFAULT_DB_PATH, DB_PATH, DATABASE_PATH, DATA_DIR, DEFAULT_DB_NAME } = require('./db');
const { initializeSchema } = require('./schema');
const { seedAll, seedRules, seedDemoInspections } = require('./seed');
const { ruleRepository } = require('./ruleRepository');
const { brandProductRepository } = require('./brandProductRepository');
const { inspectionRepository } = require('./inspectionRepository');
const { violationRepository } = require('./violationRepository');
const { reportRepository } = require('./reportRepository');
const { userRepository, UserRepository } = require('./userRepository');

/**
 * Initializes schema and seeds default data on startup
 */
async function initDatabase(dbInstance = db) {
  await dbInstance.open();
  await initializeSchema(dbInstance);
  await seedAll(dbInstance);
  return dbInstance;
}

module.exports = {
  db,
  Database,
  DEFAULT_DB_PATH,
  DB_PATH,
  DATABASE_PATH,
  DATA_DIR,
  DEFAULT_DB_NAME,
  initDatabase,
  initializeSchema,
  seedAll,
  seedRules,
  seedDemoInspections,
  ruleRepository,
  brandProductRepository,
  inspectionRepository,
  violationRepository,
  reportRepository,
  userRepository,
  UserRepository
};
