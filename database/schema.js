/**
 * database/schema.js — Nirikshan Mitra SQLite Schema Definitions & Migration
 *
 * Defines tables for:
 * 1. users (Inspectors & Admins with hashed credentials and roles)
 * 2. rules (Legal Metrology rule definitions)
 * 3. brands_products (Brand & product catalog)
 * 4. inspections (Product scan & inspection records, linked to user_id)
 * 5. inspection_fields (Structured extracted declarations)
 * 6. violations (Historical violation & review records)
 * 7. reports (Generated inspection report metadata)
 */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('inspector', 'admin')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id TEXT UNIQUE NOT NULL,
  rule_name TEXT NOT NULL,
  requirement TEXT NOT NULL,
  field_key TEXT NOT NULL,
  validation_type TEXT NOT NULL,
  validation_config TEXT,
  status_logic TEXT,
  rule_version TEXT NOT NULL DEFAULT '1.0.0',
  effective_date TEXT,
  source_reference TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rules_rule_id ON rules (rule_id);
CREATE INDEX IF NOT EXISTS idx_rules_active ON rules (active);

CREATE TABLE IF NOT EXISTS brands_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT,
  product_name TEXT NOT NULL,
  product_category TEXT,
  package_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bp_brand_name ON brands_products (brand_name);
CREATE INDEX IF NOT EXISTS idx_bp_product_name ON brands_products (product_name);

CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id TEXT UNIQUE NOT NULL,
  brand_product_id INTEGER,
  user_id INTEGER,
  inspected_at TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  overall_status TEXT NOT NULL,
  rule_version TEXT NOT NULL DEFAULT '1.0.0',
  image_count INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (brand_product_id) REFERENCES brands_products (id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inspections_id ON inspections (inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspections_brand_prod ON inspections (brand_product_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections (inspected_at);

CREATE TABLE IF NOT EXISTS inspection_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_value TEXT,
  source_panel TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections (inspection_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fields_inspection_id ON inspection_fields (inspection_id);

CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id TEXT NOT NULL,
  brand_product_id INTEGER,
  rule_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  extracted_value TEXT,
  explanation TEXT,
  suggested_action TEXT,
  detected_at TEXT NOT NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections (inspection_id) ON DELETE CASCADE,
  FOREIGN KEY (brand_product_id) REFERENCES brands_products (id) ON DELETE SET NULL,
  FOREIGN KEY (rule_id) REFERENCES rules (rule_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_violations_inspection ON violations (inspection_id);
CREATE INDEX IF NOT EXISTS idx_violations_brand_prod ON violations (brand_product_id);
CREATE INDEX IF NOT EXISTS idx_violations_rule ON violations (rule_id);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id TEXT NOT NULL,
  report_status TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'LEGAL_METROLOGY_COMPLIANCE',
  report_reference TEXT,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections (inspection_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_inspection ON reports (inspection_id);
`;

/**
 * Initializes database schema idempotently and handles seamless migrations
 */
async function initializeSchema(dbInstance) {
  await dbInstance.exec(SCHEMA_SQL);

  // Migration check: Add user_id column to inspections table if it doesn't exist
  try {
    const tableInfo = await dbInstance.all("PRAGMA table_info(inspections)");
    const hasUserId = tableInfo.some(col => col.name === 'user_id');
    if (!hasUserId) {
      await dbInstance.run("ALTER TABLE inspections ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL");
    }
    await dbInstance.run("CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections (user_id)");
  } catch (err) {
    console.warn("Migration warning for inspections.user_id:", err.message);
  }
}

module.exports = {
  SCHEMA_SQL,
  initializeSchema
};
