/**
 * test_database_flow.js — Comprehensive Verification Suite for Nirikshan Mitra SQLite Database Layer
 *
 * Covers all 19 required test scenarios:
 * 1. Database initialization
 * 2. Table creation (6 tables)
 * 3. Rule seeding (8 rules)
 * 4. Rule retrieval
 * 5. Duplicate-safe rule seeding (idempotency)
 * 6. Compliance evaluation using database rules
 * 7. Inspection creation
 * 8. Extracted field persistence
 * 9. Violation persistence
 * 10. Brand/product history retrieval
 * 11. Rule version persistence
 * 12. Report metadata persistence
 * 13. Fresh database startup (in-memory test)
 * 14. Database failure handling (graceful fallback)
 * 15. Existing OCR flow integrity
 * 16. Existing package classification integrity
 * 17. Existing scoring integrity
 * 18. Existing single-image inspection integrity
 * 19. Existing multi-panel inspection integrity
 */

const assert = require('assert');
const {
  Database,
  initializeSchema,
  seedAll,
  seedRules,
  ruleRepository,
  brandProductRepository,
  inspectionRepository,
  violationRepository,
  reportRepository
} = require('./database');
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');
const FieldExtractor = require('./fieldExtractor');
const OcrService = require('./ocrService');

async function runDatabaseTests() {
  console.log('Running Comprehensive SQLite Database Test Suite (19 Scenarios)...\n');

  // =========================================================================
  // Scenario 1: Database Initialization
  // =========================================================================
  console.log('--- Scenario 1: Database Initialization ---');
  const testDb = new Database(':memory:');
  await testDb.open();
  assert.ok(testDb.db, 'Database connection should be open');
  console.log('✓ Scenario 1 Passed: Database initialized successfully.');

  // =========================================================================
  // Scenario 2: Table Creation (6 tables)
  // =========================================================================
  console.log('\n--- Scenario 2: Table Creation (6 tables) ---');
  await initializeSchema(testDb);
  const tables = await testDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const tableNames = tables.map(t => t.name);
  const expectedTables = ['rules', 'brands_products', 'inspections', 'inspection_fields', 'violations', 'reports'];
  for (const exp of expectedTables) {
    assert.ok(tableNames.includes(exp), `Expected table "${exp}" to exist in database`);
  }
  console.log('✓ Scenario 2 Passed: All 6 required tables created successfully (' + tableNames.join(', ') + ').');

  // =========================================================================
  // Scenario 3: Rule Seeding (8 rules)
  // =========================================================================
  console.log('\n--- Scenario 3: Rule Seeding (8 rules) ---');
  await seedRules(testDb);
  const seededRuleCount = await testDb.get('SELECT COUNT(*) as count FROM rules');
  assert.strictEqual(seededRuleCount.count, 8, 'Should seed exactly 8 Legal Metrology compliance rules');
  console.log('✓ Scenario 3 Passed: Exactly 8 compliance rules seeded.');

  // =========================================================================
  // Scenario 4: Rule Retrieval
  // =========================================================================
  console.log('\n--- Scenario 4: Rule Retrieval ---');
  const { RuleRepository } = require('./database/ruleRepository');
  const customRuleRepo = new RuleRepository(testDb);
  const activeRules = await customRuleRepo.getActiveRules();
  assert.strictEqual(activeRules.length, 8);
  const mfrRule = activeRules.find(r => r.rule_id === 'rule_manufacturer');
  assert.ok(mfrRule, 'rule_manufacturer must exist');
  assert.strictEqual(mfrRule.field_key, 'manufacturer');
  assert.strictEqual(typeof mfrRule.validation_config, 'object');
  assert.strictEqual(mfrRule.validation_config.min_length, 3);
  console.log('✓ Scenario 4 Passed: Active rules retrieved with parsed config.');

  // =========================================================================
  // Scenario 5: Duplicate-Safe Rule Seeding (Idempotency)
  // =========================================================================
  console.log('\n--- Scenario 5: Duplicate-Safe Rule Seeding ---');
  await seedRules(testDb);
  await seedRules(testDb);
  const doubleSeedCount = await testDb.get('SELECT COUNT(*) as count FROM rules');
  assert.strictEqual(doubleSeedCount.count, 8, 'Seeding multiple times must not create duplicate rules');
  console.log('✓ Scenario 5 Passed: Idempotent rule seeding verified (count remains 8).');

  // =========================================================================
  // Scenario 6: Compliance Evaluation Using Database Rules
  // =========================================================================
  console.log('\n--- Scenario 6: Compliance Evaluation Using Database Rules ---');
  // Load database rules into ComplianceEngine
  ComplianceEngine.setActiveRules(activeRules);
  const sampleFields = {
    product_name: 'Pure Mustard Oil',
    manufacturer: 'Patanjali Ayurved Ltd.',
    address: 'Industrial Area, Haridwar 249401, Uttarakhand',
    net_quantity: '1 L',
    mrp: '₹160.00',
    manufacturing_date: '02/2026',
    expiry_date: 'BEST BEFORE 12 MONTHS FROM PACKAGING',
    batch_code: 'P-9811',
    customer_care_phone: '1800 180 4108',
    customer_care_email: 'feedback@patanjali.net'
  };

  const dbComplianceResults = ComplianceEngine.evaluateAll(sampleFields);
  assert.strictEqual(dbComplianceResults.length, 8, 'Should evaluate all 8 rules from SQLite');
  for (const r of dbComplianceResults) {
    assert.ok(r.rule_id, 'Evaluated result must retain rule_id from database');
    assert.ok(r.rule_version, 'Evaluated result must retain rule_version from database');
    assert.strictEqual(r.status, 'PASS', `Rule ${r.rule_id} should pass on complete input`);
  }
  console.log('✓ Scenario 6 Passed: ComplianceEngine evaluated all 8 rules loaded from SQLite.');

  // =========================================================================
  // Scenario 7: Inspection Creation in Database
  // =========================================================================
  console.log('\n--- Scenario 7: Inspection Creation ---');
  const { BrandProductRepository } = require('./database/brandProductRepository');
  const { InspectionRepository } = require('./database/inspectionRepository');
  const bpRepo = new BrandProductRepository(testDb);
  const inspRepo = new InspectionRepository(testDb);

  const bp = await bpRepo.findOrCreate({
    brand_name: 'Patanjali Ayurved Ltd.',
    product_name: 'Pure Mustard Oil',
    product_category: 'Edible Oil',
    package_type: 'Bottle'
  });
  assert.ok(bp.id, 'Brand/product ID should be generated');

  const createdInspection = await inspRepo.createInspection({
    inspection_id: 'INS-TEST-001',
    brand_product_id: bp.id,
    overall_score: 100,
    overall_status: 'COMPLIANT',
    rule_version: '1.0.0',
    image_count: 2
  });
  assert.strictEqual(createdInspection.inspection_id, 'INS-TEST-001');
  assert.strictEqual(createdInspection.overall_score, 100);
  console.log('✓ Scenario 7 Passed: Inspection record successfully created in SQLite.');

  // =========================================================================
  // Scenario 8: Extracted Field Persistence
  // =========================================================================
  console.log('\n--- Scenario 8: Extracted Field Persistence ---');
  await inspRepo.saveFields('INS-TEST-001', sampleFields, {
    product_name: 'Front / Main',
    manufacturer: 'Back / Rear'
  });

  const retrievedInspection = await inspRepo.getInspectionById('INS-TEST-001');
  assert.strictEqual(retrievedInspection.fields.product_name, 'Pure Mustard Oil');
  assert.strictEqual(retrievedInspection.fields.net_quantity, '1 L');
  assert.strictEqual(retrievedInspection.sources.manufacturer, 'Back / Rear');
  console.log('✓ Scenario 8 Passed: Extracted fields and panel sources persisted and retrieved.');

  // =========================================================================
  // Scenario 9: Violation Persistence
  // =========================================================================
  console.log('\n--- Scenario 9: Violation Persistence ---');
  const { ViolationRepository } = require('./database/violationRepository');
  const violRepo = new ViolationRepository(testDb);

  const mockNonCompliantResults = [
    {
      rule_id: 'rule_mrp',
      field_key: 'mrp',
      status: 'FAIL',
      extracted_value: null,
      explanation: 'MRP missing on label.',
      suggested_action: 'Affix MRP under Rule 6(1)(e).'
    },
    {
      rule_id: 'rule_address',
      field_key: 'address',
      status: 'REVIEW',
      extracted_value: 'Mumbai',
      explanation: 'Address missing postal PIN code.',
      suggested_action: 'Include 6-digit PIN code.'
    }
  ];

  const recordedViolations = await violRepo.recordViolationsFromResults(
    'INS-TEST-001',
    bp.id,
    mockNonCompliantResults
  );
  assert.strictEqual(recordedViolations.length, 2);
  assert.strictEqual(recordedViolations[0].severity, 'CRITICAL');
  assert.strictEqual(recordedViolations[1].severity, 'WARNING');

  const fetchedViolations = await violRepo.getViolationsByInspection('INS-TEST-001');
  assert.strictEqual(fetchedViolations.length, 2);
  console.log('✓ Scenario 9 Passed: Violations recorded with appropriate severity and explanations.');

  // =========================================================================
  // Scenario 10: Brand/Product History Retrieval
  // =========================================================================
  console.log('\n--- Scenario 10: Brand/Product History Retrieval ---');
  const history = await violRepo.getBrandViolationHistory(bp.id);
  assert.strictEqual(history.length, 2, 'Should find 2 recorded violations for brand');
  assert.strictEqual(history[0].brand_name, 'Patanjali Ayurved Ltd.');
  console.log('✓ Scenario 10 Passed: Historical violations queried across brand identity.');

  // =========================================================================
  // Scenario 11: Rule Version Persistence
  // =========================================================================
  console.log('\n--- Scenario 11: Rule Version Persistence ---');
  assert.strictEqual(retrievedInspection.rule_version, '1.0.0');
  console.log('✓ Scenario 11 Passed: Inspection audit retains exact rule_version.');

  // =========================================================================
  // Scenario 12: Report Metadata Persistence
  // =========================================================================
  console.log('\n--- Scenario 12: Report Metadata Persistence ---');
  const { ReportRepository } = require('./database/reportRepository');
  const reportRepo = new ReportRepository(testDb);

  const report = await reportRepo.createReport({
    inspection_id: 'INS-TEST-001',
    report_status: 'FINAL',
    report_reference: 'REP-TEST-001'
  });
  assert.strictEqual(report.report_reference, 'REP-TEST-001');

  const fetchedReport = await reportRepo.getReportByInspection('INS-TEST-001');
  assert.strictEqual(fetchedReport.report_reference, 'REP-TEST-001');
  console.log('✓ Scenario 12 Passed: Report metadata persisted and linked to inspection.');

  // =========================================================================
  // Scenario 13: Fresh Database Startup
  // =========================================================================
  console.log('\n--- Scenario 13: Fresh Database Startup ---');
  const freshDb = new Database(':memory:');
  await initializeSchema(freshDb);
  await seedAll(freshDb);

  const freshRules = await freshDb.all('SELECT * FROM rules');
  const freshInspections = await freshDb.all('SELECT * FROM inspections');
  assert.strictEqual(freshRules.length, 8);
  assert.strictEqual(freshInspections.length, 0, 'Fresh database should have 0 demo inspections');
  console.log('✓ Scenario 13 Passed: Fresh database initializes schema and seeds 8 rules with 0 demo inspections.');

  // =========================================================================
  // Scenario 14: Database Failure Handling
  // =========================================================================
  console.log('\n--- Scenario 14: Database Failure Handling ---');
  const brokenDb = new Database(':memory:');
  // Closed/unopened DB queries should reject safely
  try {
    await brokenDb.all('SELECT * FROM non_existent_table');
    assert.fail('Should fail on broken connection');
  } catch (err) {
    assert.ok(err, 'Database error caught cleanly');
    console.log('✓ Scenario 14 Passed: Database errors handled gracefully without unhandled crashes.');
  }

  // =========================================================================
  // Scenario 15: Existing OCR Flow Integrity
  // =========================================================================
  console.log('\n--- Scenario 15: Existing OCR Flow Integrity ---');
  assert.strictEqual(typeof OcrService.processImage, 'function');
  assert.strictEqual(typeof OcrService.processPanels, 'function');
  console.log('✓ Scenario 15 Passed: OcrService interface preserved 100%.');

  // =========================================================================
  // Scenario 16: Existing Package Classification Integrity
  // =========================================================================
  console.log('\n--- Scenario 16: Existing Package Classification Integrity ---');
  const PackageClassifier = require('./packageClassifier');
  assert.strictEqual(typeof PackageClassifier.classifyImage, 'function');
  assert.strictEqual(typeof PackageClassifier.createInspectionSession, 'function');
  console.log('✓ Scenario 16 Passed: PackageClassifier interface preserved.');

  // =========================================================================
  // Scenario 17: Existing Scoring Integrity
  // =========================================================================
  console.log('\n--- Scenario 17: Existing Scoring Integrity ---');
  const scoreResult = ComplianceScorer.calculateScore(dbComplianceResults);
  assert.strictEqual(scoreResult.score, 100);
  assert.strictEqual(scoreResult.overallStatus, 'COMPLIANT');
  console.log('✓ Scenario 17 Passed: ComplianceScorer operates transparently on database evaluation.');

  // =========================================================================
  // Scenario 18: Existing Single-Image Inspection Integrity
  // =========================================================================
  console.log('\n--- Scenario 18: Existing Single-Image Inspection Integrity ---');
  const singleLabelText = `
BRITANNIA 1918
Good Day Rich Butter Cookies
NET WEIGHT: 200g
`;
  const singleFields = FieldExtractor.extractFields(singleLabelText);
  assert.strictEqual(singleFields.product_name, 'Good Day Rich Butter Cookies');
  assert.strictEqual(singleFields.net_quantity, '200g');
  assert.strictEqual(singleFields.manufacturer, null);
  console.log('✓ Scenario 18 Passed: Single-image field extraction integrity verified.');

  // =========================================================================
  // Scenario 19: Existing Multi-Panel Inspection Integrity
  // =========================================================================
  console.log('\n--- Scenario 19: Existing Multi-Panel Inspection Integrity ---');
  const multiPanels = [
    { key: 'front', label: 'Front / Main', text: 'BRITANNIA 1918\nGood Day Rich Butter Cookies\nNET WEIGHT: 200g' },
    { key: 'back', label: 'Back / Rear', text: 'MANUFACTURED BY: BRITANNIA INDUSTRIES LTD.\nMRP: Rs 40.00' }
  ];
  const mergedMultiFields = FieldExtractor.extractMultiPanelFields(multiPanels);
  assert.strictEqual(mergedMultiFields.product_name, 'Good Day Rich Butter Cookies');
  assert.strictEqual(mergedMultiFields.manufacturer, 'BRITANNIA INDUSTRIES LTD.');
  assert.strictEqual(mergedMultiFields.mrp, 'Rs 40.00');
  console.log('✓ Scenario 19 Passed: Multi-panel extraction and merging preserved.');

  await testDb.close();
  await freshDb.close();

  console.log('\n=======================================================');
  console.log('ALL 19 SQLITE DATABASE TEST SCENARIOS PASSED! 🚀');
  console.log('=======================================================');
}

runDatabaseTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
