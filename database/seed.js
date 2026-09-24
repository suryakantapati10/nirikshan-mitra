/**
 * database/seed.js — Nirikshan Mitra Database Seeder
 *
 * Seeds:
 * 1. The 8 Legal Metrology Compliance Rules migrated from complianceEngine.js.
 * 2. Prototype demo inspection records (migrated from script.js dummy data).
 *
 * Idempotent: Can be run multiple times safely without duplicating rows.
 */

const SEED_RULES = [
  {
    rule_id: 'rule_manufacturer',
    rule_name: 'Manufacturer / Packer / Importer',
    requirement: 'Declaration of the name and identity of the manufacturer, packer, or importer.',
    field_key: 'manufacturer',
    validation_type: 'string_length',
    validation_config: JSON.stringify({ min_length: 3 }),
    status_logic: JSON.stringify({
      pass: 'Manufacturer name declared with length >= 3',
      review: 'Manufacturer name detected but length < 3',
      fail: 'Manufacturer name not detected on packaging'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011',
    active: 1
  },
  {
    rule_id: 'rule_address',
    rule_name: 'Premises / Complete Address',
    requirement: 'Complete address of premises of manufacturer or packer including postal PIN code or identifiable location.',
    field_key: 'address',
    validation_type: 'address_postal_code',
    validation_config: JSON.stringify({ pin_regex: '\\b[1-9][0-9]{5}\\b', min_length: 8 }),
    status_logic: JSON.stringify({
      pass: 'Complete premises address with 6-digit PIN code detected',
      review: 'Address detected but missing 6-digit postal PIN code',
      fail: 'Address of manufacturer/packer not detected'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011',
    active: 1
  },
  {
    rule_id: 'rule_net_quantity',
    rule_name: 'Net Quantity',
    requirement: 'Net quantity declaration in terms of standard unit of weight, measure, or number.',
    field_key: 'net_quantity',
    validation_type: 'metric_unit',
    validation_config: JSON.stringify({
      allowed_units: ['kg', 'g', 'gm', 'gms', 'l', 'ltr', 'ml', 'unit', 'piece', 'n']
    }),
    status_logic: JSON.stringify({
      pass: 'Net quantity declared in standard metric units (kg, g, L, ml, units)',
      review: 'Quantity declared but missing recognized metric unit',
      fail: 'Net quantity declaration not detected on packaging'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(b) & Rule 12, Legal Metrology (Packaged Commodities) Rules, 2011',
    active: 1
  },
  {
    rule_id: 'rule_mrp',
    rule_name: 'Maximum Retail Price (MRP)',
    requirement: 'Retail sale price in Indian Rupees inclusive of all taxes.',
    field_key: 'mrp',
    validation_type: 'price_numeric',
    validation_config: JSON.stringify({ require_currency: true }),
    status_logic: JSON.stringify({
      pass: 'MRP declared with valid currency indicator (Rs / ₹) and positive price',
      review: 'Numeric price detected but currency symbol missing or ambiguous',
      fail: 'MRP declaration not detected on packaging'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011',
    active: 1
  },
  {
    rule_id: 'rule_manufacturing_date',
    rule_name: 'Manufacturing / MFD Information',
    requirement: 'Month and year in which commodity is manufactured, packed, or imported.',
    field_key: 'manufacturing_date',
    validation_type: 'date_format',
    validation_config: JSON.stringify({
      accepted_formats: ['MM/YYYY', 'DD/MM/YYYY', 'Month Year']
    }),
    status_logic: JSON.stringify({
      pass: 'Manufacturing or packaging date clearly declared in recognized format',
      review: 'Date detected but format is ambiguous',
      fail: 'Date of manufacture / packing not detected'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011',
    active: 1
  },
  {
    rule_id: 'rule_expiry_date',
    rule_name: 'Expiry / Use By / Best Before',
    requirement: 'Expiry date, use-by date, or best-before period declaration where applicable.',
    field_key: 'expiry_date',
    validation_type: 'expiry_statement',
    validation_config: JSON.stringify({
      allow_relative: true,
      relative_keyword: 'BEST BEFORE'
    }),
    status_logic: JSON.stringify({
      pass: 'Expiry date or standard "Best Before" duration clearly declared',
      review: 'Relative durability statement detected but duration appears incomplete',
      fail: 'Expiry / Best Before declaration not detected'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(d) proviso & Food Safety / Legal Metrology guidelines',
    active: 1
  },
  {
    rule_id: 'rule_batch_code',
    rule_name: 'Batch / Lot / Code',
    requirement: 'Batch number, lot number, or lot identification code for product traceability.',
    field_key: 'batch_code',
    validation_type: 'alphanumeric_code',
    validation_config: JSON.stringify({ min_length: 2 }),
    status_logic: JSON.stringify({
      pass: 'Batch / Lot identification code present',
      review: 'Batch text detected but appears very short (1 character) or ambiguous',
      fail: 'Batch / Lot identification code not detected'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(c), Legal Metrology (Packaged Commodities) Rules, 2011',
    active: 1
  },
  {
    rule_id: 'rule_customer_care',
    rule_name: 'Customer Care',
    requirement: 'Name, address, telephone number, and email address of consumer care cell.',
    field_key: 'customer_care',
    validation_type: 'contact_channels',
    validation_config: JSON.stringify({ require_both_channels: true }),
    status_logic: JSON.stringify({
      pass: 'Both telephone helpline and email contact declared',
      review: 'One contact channel detected, but the other is missing',
      fail: 'Consumer care contact details not detected'
    }),
    rule_version: '1.0.0',
    effective_date: '2011-04-01',
    source_reference: 'Rule 6(1)(da), Legal Metrology (Packaged Commodities) Rules, 2011',
    active: 1
  }
];

// Demo inspection records removed: fresh database initializations will contain 0 inspections.
const SEED_DEMO_INSPECTIONS = [];

/**
 * Seeds compliance rules idempotently (All 8 Legal Metrology Rules)
 */
async function seedRules(dbInstance) {
  const now = new Date().toISOString();
  for (const r of SEED_RULES) {
    await dbInstance.run(
      `INSERT OR IGNORE INTO rules (
        rule_id, rule_name, requirement, field_key, validation_type,
        validation_config, status_logic, rule_version, effective_date,
        source_reference, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.rule_id, r.rule_name, r.requirement, r.field_key, r.validation_type,
        r.validation_config, r.status_logic, r.rule_version, r.effective_date,
        r.source_reference, r.active, now, now
      ]
    );
  }
}

const bcrypt = require('bcryptjs');

/**
 * Seeds initial Administrator and Inspector accounts idempotently.
 * Uses environment variables if configured, with secure defaults for prototype evaluation.
 * Passwords are never logged or stored in plaintext.
 */
async function seedUsers(dbInstance) {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nirikshan.gov.in').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const adminName = process.env.ADMIN_NAME || 'Chief Metrology Officer';

  const inspectorEmail = (process.env.INSPECTOR_EMAIL || 'inspector@nirikshan.gov.in').trim().toLowerCase();
  const inspectorPassword = process.env.INSPECTOR_PASSWORD || 'Inspector@12345';
  const inspectorName = process.env.INSPECTOR_NAME || 'Legal Metrology Inspector';

  const now = new Date().toISOString();

  // Seed Admin if not exists
  const existingAdmin = await dbInstance.get('SELECT id FROM users WHERE LOWER(email) = ?', [adminEmail]);
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await dbInstance.run(
      `INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', 1, ?, ?)`,
      [adminName, adminEmail, adminHash, now, now]
    );
  }

  // Seed Inspector if not exists
  const existingInspector = await dbInstance.get('SELECT id FROM users WHERE LOWER(email) = ?', [inspectorEmail]);
  if (!existingInspector) {
    const inspectorHash = await bcrypt.hash(inspectorPassword, 10);
    await dbInstance.run(
      `INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'inspector', 1, ?, ?)`,
      [inspectorName, inspectorEmail, inspectorHash, now, now]
    );
  }
}

/**
 * No-op: Demo inspections are no longer seeded into the database.
 * Preserved as an async function for API/import backward compatibility.
 */
async function seedDemoInspections(dbInstance) {
  // Demo inspections removed: Only real inspections performed by users are stored.
}

/**
 * Runs full idempotent seeding: Seeds the 8 Legal Metrology compliance rules and default user accounts.
 */
async function seedAll(dbInstance) {
  await seedRules(dbInstance);
  await seedUsers(dbInstance);
}

module.exports = {
  SEED_RULES,
  SEED_DEMO_INSPECTIONS,
  seedRules,
  seedDemoInspections,
  seedUsers,
  seedAll
};
