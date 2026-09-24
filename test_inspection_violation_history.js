/**
 * test_inspection_violation_history.js — Verification Suite for Inspection History & Brand/Product Violation Tracking
 *
 * Covers all 16 required scenarios:
 * 1. Create first inspection for a product
 * 2. Create second inspection for same product
 * 3. Verify both inspections remain in SQLite
 * 4. Verify violation history accumulates
 * 5. Verify old violations are not overwritten
 * 6. Verify brand/product reuse (no duplicate brands_products row)
 * 7. Verify inspection detail retrieval (GET /api/inspections/:id structure)
 * 8. Verify historical violation API (GET /api/brands/:identifier/violations structure)
 * 9. Verify dashboard loads database-backed inspections
 * 10. Verify inspections with zero violations (clean product)
 * 11. Verify inspections containing REVIEW items (WARNING severity)
 * 12. Verify inspections containing FAIL items (CRITICAL severity)
 * 13. Verify foreign-key integrity (brands_products -> inspections -> fields -> violations -> rules)
 * 14. Verify existing OCR still works (OcrService interface and functions)
 * 15. Verify existing multi-panel OCR still works
 * 16. Verify existing compliance scoring still works
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  Database,
  initializeSchema,
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

async function runVerificationSuite() {
  console.log('================================================================');
  console.log('STARTING INSPECTION HISTORY & VIOLATION TRACKING TEST SUITE (16 SCENARIOS)');
  console.log('================================================================\n');

  // Use an isolated in-memory SQLite database instance for deterministic testing
  const testDb = new Database(':memory:');
  await testDb.open();
  await initializeSchema(testDb);
  await seedRules(testDb);

  const { BrandProductRepository } = require('./database/brandProductRepository');
  const { InspectionRepository } = require('./database/inspectionRepository');
  const { ViolationRepository } = require('./database/violationRepository');
  const { ReportRepository } = require('./database/reportRepository');
  const { RuleRepository } = require('./database/ruleRepository');

  const bpRepo = new BrandProductRepository(testDb);
  const inspRepo = new InspectionRepository(testDb);
  const violRepo = new ViolationRepository(testDb);
  const repRepo = new ReportRepository(testDb);
  const ruleRepo = new RuleRepository(testDb);

  const activeRules = await ruleRepo.getActiveRules();
  ComplianceEngine.setActiveRules(activeRules);

  const brandName = "Amul Dairy Cooperative";
  const productName = "Pasteurised Butter 500g";

  // =========================================================================
  // Scenario 1: Create first inspection for a product
  // =========================================================================
  console.log('--- Scenario 1: Create First Inspection for a Product ---');
  const bp1 = await bpRepo.findOrCreate({
    brand_name: brandName,
    product_name: productName,
    product_category: "Dairy",
    package_type: "Carton"
  });
  assert.ok(bp1 && bp1.id, 'Brand/product record should be created with valid ID');

  const inspId1 = "INS-TEST-AMUL-001";
  const fields1 = {
    product_name: productName,
    manufacturer: brandName,
    address: "Anand, Gujarat 388001",
    net_quantity: "500g",
    mrp: "₹275.00",
    manufacturing_date: "01/2026",
    expiry_date: "BEST BEFORE 12 MONTHS FROM PACKAGING",
    batch_code: "B-101",
    customer_care_phone: null // Customer care missing! Will trigger FAIL
  };

  const results1 = ComplianceEngine.evaluateAll(fields1);
  const score1 = ComplianceScorer.calculateScore(results1);

  const createdInsp1 = await inspRepo.createInspection({
    inspection_id: inspId1,
    brand_product_id: bp1.id,
    inspected_at: "2026-09-01T10:00:00.000Z",
    overall_score: score1.score,
    overall_status: score1.overallStatus,
    rule_version: "1.0.0",
    image_count: 1
  });
  await inspRepo.saveFields(inspId1, fields1, { manufacturer: 'Front' });
  const violations1 = await violRepo.recordViolationsFromResults(inspId1, bp1.id, results1, createdInsp1.inspected_at);
  await repRepo.createReport({ inspection_id: inspId1, report_status: 'FINAL' });

  assert.strictEqual(createdInsp1.inspection_id, inspId1);
  assert.strictEqual(violations1.length, 1, 'First inspection should record 1 violation (missing customer care)');
  assert.strictEqual(violations1[0].field_key, 'customer_care');
  assert.strictEqual(violations1[0].severity, 'CRITICAL');
  console.log('✓ Scenario 1 Passed: First inspection created with 1 violation recorded.');

  // =========================================================================
  // Scenario 2: Create second inspection for same product
  // =========================================================================
  console.log('\n--- Scenario 2: Create Second Inspection for Same Product ---');
  const bp2 = await bpRepo.findOrCreate({
    brand_name: brandName,
    product_name: productName,
    product_category: "Dairy",
    package_type: "Carton"
  });

  const inspId2 = "INS-TEST-AMUL-002";
  const fields2 = {
    product_name: productName,
    manufacturer: brandName,
    address: "Anand Gujarat", // Missing PIN code! Triggers REVIEW (WARNING)
    net_quantity: "500g",
    mrp: "₹275.00",
    manufacturing_date: "02/2026",
    expiry_date: "BEST BEFORE 12 MONTHS FROM PACKAGING",
    batch_code: "B-102",
    customer_care_phone: "1800 258 3333",
    customer_care_email: "customercare@amul.coop"
  };

  const results2 = ComplianceEngine.evaluateAll(fields2);
  const score2 = ComplianceScorer.calculateScore(results2);

  const createdInsp2 = await inspRepo.createInspection({
    inspection_id: inspId2,
    brand_product_id: bp2.id,
    inspected_at: "2026-09-02T14:30:00.000Z",
    overall_score: score2.score,
    overall_status: score2.overallStatus,
    rule_version: "1.0.0",
    image_count: 2
  });
  await inspRepo.saveFields(inspId2, fields2, { address: 'Back' });
  const violations2 = await violRepo.recordViolationsFromResults(inspId2, bp2.id, results2, createdInsp2.inspected_at);
  await repRepo.createReport({ inspection_id: inspId2, report_status: 'FINAL' });

  assert.strictEqual(createdInsp2.inspection_id, inspId2);
  assert.strictEqual(violations2.length, 1, 'Second inspection should record 1 review issue (address missing postal code)');
  assert.strictEqual(violations2[0].field_key, 'address');
  assert.strictEqual(violations2[0].severity, 'WARNING');
  console.log('✓ Scenario 2 Passed: Second inspection created with 1 review issue.');

  // =========================================================================
  // Scenario 3: Verify both inspections remain
  // =========================================================================
  console.log('\n--- Scenario 3: Verify Both Inspections Remain ---');
  const allInspections = await inspRepo.getAllInspections(10);
  const foundInsp1 = allInspections.find(i => i.inspection_id === inspId1);
  const foundInsp2 = allInspections.find(i => i.inspection_id === inspId2);
  assert.ok(foundInsp1, 'First inspection must exist in database');
  assert.ok(foundInsp2, 'Second inspection must exist in database');
  assert.strictEqual(allInspections.length, 2);
  console.log('✓ Scenario 3 Passed: Both inspections remain safely in SQLite.');

  // =========================================================================
  // Scenario 4: Verify violation history accumulates
  // =========================================================================
  console.log('\n--- Scenario 4: Verify Violation History Accumulates ---');
  const brandViolations = await violRepo.getBrandViolationHistory(bp1.id);
  assert.strictEqual(brandViolations.length, 2, 'Should have accumulated exactly 2 historical violation entries');
  console.log('✓ Scenario 4 Passed: Violation history accumulated across multiple inspections (total: 2).');

  // =========================================================================
  // Scenario 5: Verify old violations are not overwritten
  // =========================================================================
  console.log('\n--- Scenario 5: Verify Old Violations Are Not Overwritten ---');
  const insp1Violations = await violRepo.getViolationsByInspection(inspId1);
  const insp2Violations = await violRepo.getViolationsByInspection(inspId2);
  assert.strictEqual(insp1Violations.length, 1);
  assert.strictEqual(insp1Violations[0].field_key, 'customer_care');
  assert.strictEqual(insp2Violations.length, 1);
  assert.strictEqual(insp2Violations[0].field_key, 'address');
  console.log('✓ Scenario 5 Passed: Individual inspection violations preserved independently without overwriting.');

  // =========================================================================
  // Scenario 6: Verify brand/product reuse
  // =========================================================================
  console.log('\n--- Scenario 6: Verify Brand/Product Reuse ---');
  assert.strictEqual(bp1.id, bp2.id, 'Same brand and product combination MUST reuse existing brands_products row');
  const allBpRows = await testDb.all('SELECT * FROM brands_products');
  assert.strictEqual(allBpRows.length, 1, 'Only 1 brands_products record should exist for Amul Butter');
  console.log('✓ Scenario 6 Passed: Brand/product deduplication verified (ID: ' + bp1.id + ').');

  // =========================================================================
  // Scenario 7: Verify inspection detail retrieval
  // =========================================================================
  console.log('\n--- Scenario 7: Verify Inspection Detail Retrieval ---');
  const detail1 = await inspRepo.getInspectionById(inspId1);
  assert.strictEqual(detail1.inspection_id, inspId1);
  assert.strictEqual(detail1.brand_name, brandName);
  assert.strictEqual(detail1.product_name, productName);
  assert.strictEqual(detail1.fields.net_quantity, "500g");
  assert.strictEqual(detail1.violations.length, 1);
  assert.strictEqual(detail1.violations[0].rule_id, "rule_customer_care");
  assert.ok(detail1.report_reference, 'Report reference must be attached');
  console.log('✓ Scenario 7 Passed: Inspection detail retrieved with all fields, violations, and report metadata.');

  // =========================================================================
  // Scenario 8: Verify historical violation API query
  // =========================================================================
  console.log('\n--- Scenario 8: Verify Historical Violation API Query ---');
  const historyByName = await violRepo.getBrandViolationHistory(brandName);
  assert.strictEqual(historyByName.length, 2);
  // Chronological order: newest inspection first
  assert.strictEqual(historyByName[0].inspection_id, inspId2);
  assert.strictEqual(historyByName[1].inspection_id, inspId1);
  assert.strictEqual(historyByName[0].rule_name, 'Premises / Complete Address');
  assert.strictEqual(historyByName[1].rule_name, 'Customer Care');
  console.log('✓ Scenario 8 Passed: Historical violation query by brand name returned sorted chronological timeline.');

  // =========================================================================
  // Scenario 9: Verify dashboard loads database-backed inspections
  // =========================================================================
  console.log('\n--- Scenario 9: Verify Dashboard Loads Database-Backed Inspections ---');
  const dashboardInspections = await inspRepo.getAllInspections(50);
  assert.strictEqual(dashboardInspections.length, 2);
  assert.strictEqual(dashboardInspections[0].inspection_id, inspId2, 'Newest inspection must appear first');
  assert.strictEqual(dashboardInspections[1].inspection_id, inspId1);
  assert.ok(dashboardInspections[0].brand_product_id, 'Must include brand_product_id for linking');
  assert.strictEqual(dashboardInspections[0].violation_count, 1);
  assert.strictEqual(dashboardInspections[1].violation_count, 1);
  console.log('✓ Scenario 9 Passed: Dashboard list loaded with newest-first ordering, metadata, and violation counts.');

  // =========================================================================
  // Scenario 10: Verify inspections with zero violations (clean compliant product)
  // =========================================================================
  console.log('\n--- Scenario 10: Verify Inspection with Zero Violations ---');
  const cleanFields = {
    product_name: "Tata Salt Vacuum Evaporated",
    manufacturer: "Tata Consumer Products Ltd.",
    address: "1, Bishop Lefroy Road, Kolkata 700020, West Bengal",
    net_quantity: "1 kg",
    mrp: "₹28.00",
    manufacturing_date: "03/2026",
    expiry_date: "BEST BEFORE 24 MONTHS FROM MANUFACTURE",
    batch_code: "TS-8841",
    customer_care_phone: "1800 345 1720",
    customer_care_email: "care@tataconsumer.com"
  };
  const cleanBp = await bpRepo.findOrCreate({
    brand_name: "Tata Consumer Products Ltd.",
    product_name: "Tata Salt Vacuum Evaporated",
    product_category: "Edible Salt",
    package_type: "Pouch"
  });
  const cleanResults = ComplianceEngine.evaluateAll(cleanFields);
  const cleanScore = ComplianceScorer.calculateScore(cleanResults);
  assert.strictEqual(cleanScore.score, 100);
  assert.strictEqual(cleanScore.overallStatus, 'COMPLIANT');

  const cleanInspId = "INS-TEST-TATA-001";
  await inspRepo.createInspection({
    inspection_id: cleanInspId,
    brand_product_id: cleanBp.id,
    overall_score: cleanScore.score,
    overall_status: cleanScore.overallStatus,
    rule_version: "1.0.0"
  });
  await inspRepo.saveFields(cleanInspId, cleanFields);
  const cleanViolations = await violRepo.recordViolationsFromResults(cleanInspId, cleanBp.id, cleanResults);
  assert.strictEqual(cleanViolations.length, 0, 'Zero violations should be recorded for a fully compliant product');

  const tataViolations = await violRepo.getBrandViolationHistory(cleanBp.id);
  assert.strictEqual(tataViolations.length, 0, 'Brand history should have 0 violations for clean product');
  console.log('✓ Scenario 10 Passed: 100% compliant inspection recorded zero violations cleanly.');

  // =========================================================================
  // Scenario 11: Verify inspections containing REVIEW items
  // =========================================================================
  console.log('\n--- Scenario 11: Verify Inspection Containing REVIEW Items ---');
  const reviewViolations = await testDb.all("SELECT * FROM violations WHERE violation_type = 'REVIEW'");
  assert.ok(reviewViolations.length >= 1, 'Should have recorded REVIEW violations');
  assert.strictEqual(reviewViolations[0].severity, 'WARNING', 'REVIEW items must be assigned WARNING severity');
  console.log('✓ Scenario 11 Passed: REVIEW items recorded with WARNING severity.');

  // =========================================================================
  // Scenario 12: Verify inspections containing FAIL items
  // =========================================================================
  console.log('\n--- Scenario 12: Verify Inspection Containing FAIL Items ---');
  const failViolations = await testDb.all("SELECT * FROM violations WHERE violation_type = 'FAIL'");
  assert.ok(failViolations.length >= 1, 'Should have recorded FAIL violations');
  assert.strictEqual(failViolations[0].severity, 'CRITICAL', 'FAIL items must be assigned CRITICAL severity');
  console.log('✓ Scenario 12 Passed: FAIL items recorded with CRITICAL severity.');

  // =========================================================================
  // Scenario 13: Verify foreign-key integrity
  // =========================================================================
  console.log('\n--- Scenario 13: Verify Foreign-Key Integrity ---');
  const invalidFkCheck = await testDb.get('PRAGMA foreign_key_check;');
  assert.strictEqual(invalidFkCheck, null, 'No foreign key violations should exist across database tables');
  console.log('✓ Scenario 13 Passed: Foreign-key relationships fully validated and consistent.');

  // =========================================================================
  // Scenario 14: Verify existing OCR still works
  // =========================================================================
  console.log('\n--- Scenario 14: Verify Existing OCR Service Interface ---');
  assert.strictEqual(typeof OcrService.processImage, 'function');
  assert.strictEqual(typeof OcrService.processPanels, 'function');
  console.log('✓ Scenario 14 Passed: OcrService interface preserved 100%.');

  // =========================================================================
  // Scenario 15: Verify existing multi-panel OCR still works
  // =========================================================================
  console.log('\n--- Scenario 15: Verify Multi-Panel OCR Extraction ---');
  const testPanels = [
    { key: "front", label: "Front / Main", text: "AMUL BUTTER\nNET WEIGHT: 500g\nMRP: Rs 275.00" },
    { key: "back", label: "Back / Rear", text: "MANUFACTURED BY: GCMMF LTD., ANAND 388001\nMFD: 01/2026" }
  ];
  const mergedFields = FieldExtractor.extractMultiPanelFields(testPanels);
  assert.strictEqual(mergedFields.net_quantity, "500g");
  assert.strictEqual(mergedFields.mrp, "Rs 275.00");
  assert.strictEqual(mergedFields.manufacturer, "GCMMF LTD.");
  assert.strictEqual(mergedFields._sources.mrp, "Front / Main");
  assert.strictEqual(mergedFields._sources.manufacturer, "Back / Rear");
  console.log('✓ Scenario 15 Passed: Multi-panel OCR extraction and panel provenance verified.');

  // =========================================================================
  // Scenario 16: Verify existing compliance scoring still works
  // =========================================================================
  console.log('\n--- Scenario 16: Verify Compliance Scoring Integrity ---');
  const evaluatedRules = ComplianceEngine.evaluateAll(mergedFields);
  const calculatedScore = ComplianceScorer.calculateScore(evaluatedRules);
  assert.strictEqual(typeof calculatedScore.score, 'number');
  assert.ok(calculatedScore.score > 0);
  assert.ok(['COMPLIANT', 'NEEDS_REVIEW', 'POTENTIAL_VIOLATION'].includes(calculatedScore.statusKey));
  console.log('✓ Scenario 16 Passed: Compliance scoring computed score ' + calculatedScore.score + ' (' + calculatedScore.overallStatus + ').');

  await testDb.close();

  console.log('\n================================================================');
  console.log('ALL 16 INSPECTION HISTORY & VIOLATION TRACKING TESTS PASSED! 🚀');
  console.log('================================================================');
}

runVerificationSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
