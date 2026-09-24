/**
 * test_multipanel_flow.js — Complete Verification Suite for Multi-Panel Package Inspection
 *
 * Tests the 10 required scenarios from the specification:
 * 1. Single-image OCR
 * 2. Front + Back OCR
 * 3. Front + Back + Side OCR
 * 4. All four panels (Front + Back + Side + Top/Bottom)
 * 5. Missing optional panels (e.g., Front + Top/Bottom without Back/Side)
 * 6. One panel OCR failure with successful fallback to remaining panels
 * 7. All panel OCR failure handling
 * 8. Duplicate field across panels (deterministic resolution)
 * 9. Field present only on a secondary panel (e.g., manufacturer on Back only)
 * 10. Final compliance evaluation using combined extracted fields
 */

const assert = require('assert');
const FieldExtractor = require('./fieldExtractor');
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');
const OcrService = require('./ocrService');

console.log('Running Multi-Panel Package Inspection Test Suite...\n');

// ---------------------------------------------------------------------------
// Sample panel texts simulating realistic Legal Metrology declarations
// ---------------------------------------------------------------------------
const frontPanelText = `
BRITANNIA 1918
Good Day Rich Butter Cookies
NET WEIGHT: 200g
Delicious Butter Taste
`;

const backPanelText = `
MANUFACTURED BY: BRITANNIA INDUSTRIES LTD.
PRESTIGE TOWERS, 9, SHAKESPEARE SARANI, KOLKATA 700017, INDIA.
MRP: Rs 40.00
BATCH NO: GD-4412
MFG. DATE: 12/2025
BEST BEFORE 9 MONTHS FROM PACKAGING
`;

const sidePanelText = `
CUSTOMER CARE: 1800 233 9999
EMAIL: feedback@britannia.co.in
FOR COMPLAINTS WRITE TO THE CONSUMER CARE CELL
`;

const topBottomPanelText = `
B.NO: GD-4412
EXP: 09/2026
`;

// ===========================================================================
// Test 1: Single-image OCR flow (Backward Compatibility)
// ===========================================================================
console.log('--- Test 1: Single-image OCR flow ---');
const singlePanelResult = FieldExtractor.extractFields(frontPanelText);
assert.strictEqual(singlePanelResult.product_name, 'Good Day Rich Butter Cookies');
assert.strictEqual(singlePanelResult.net_quantity, '200g');
assert.strictEqual(singlePanelResult.manufacturer, null, 'Single panel missing manufacturer should remain null');
assert.strictEqual(singlePanelResult.mrp, null, 'Single panel missing MRP should remain null');
console.log('✓ Test 1 Passed: Single image works identically with null preservation.');

// ===========================================================================
// Test 2: Front + Back OCR
// ===========================================================================
console.log('\n--- Test 2: Front + Back OCR ---');
const frontBackPanels = [
  { key: 'front', label: 'Front / Main', text: frontPanelText },
  { key: 'back', label: 'Back / Rear', text: backPanelText }
];
const fbCombinedText = `=== PANEL: Front / Main ===\n${frontPanelText.trim()}\n\n=== PANEL: Back / Rear ===\n${backPanelText.trim()}`;
const fbMerged = FieldExtractor.extractMultiPanelFields(frontBackPanels, fbCombinedText);

assert.strictEqual(fbMerged.product_name, 'Good Day Rich Butter Cookies');
assert.strictEqual(fbMerged.net_quantity, '200g');
assert.strictEqual(fbMerged.manufacturer, 'BRITANNIA INDUSTRIES LTD.');
assert.strictEqual(fbMerged.mrp, 'Rs 40.00');
assert.strictEqual(fbMerged.batch_code, 'GD-4412');
assert.strictEqual(fbMerged.manufacturing_date, '12/2025');
assert.strictEqual(fbMerged.expiry_date, 'BEST BEFORE 9 MONTHS FROM PACKAGING');
assert.strictEqual(fbMerged.customer_care_phone, null, 'Customer care not yet present');
console.log('✓ Test 2 Passed: Front + Back declarations merged seamlessly.');

// ===========================================================================
// Test 3: Front + Back + Side OCR
// ===========================================================================
console.log('\n--- Test 3: Front + Back + Side OCR ---');
const fbsPanels = [
  { key: 'front', label: 'Front / Main', text: frontPanelText },
  { key: 'back', label: 'Back / Rear', text: backPanelText },
  { key: 'side', label: 'Side / Other', text: sidePanelText }
];
const fbsMerged = FieldExtractor.extractMultiPanelFields(fbsPanels);
assert.strictEqual(fbsMerged.customer_care_phone, '1800 233 9999');
assert.strictEqual(fbsMerged.customer_care_email, 'feedback@britannia.co.in');
assert.strictEqual(fbsMerged.manufacturer, 'BRITANNIA INDUSTRIES LTD.');
console.log('✓ Test 3 Passed: 3-panel inspection captures secondary customer care panel.');

// ===========================================================================
// Test 4: All four panels (Front + Back + Side + Top/Bottom)
// ===========================================================================
console.log('\n--- Test 4: All four panels ---');
const allFourPanels = [
  { key: 'front', label: 'Front / Main', text: frontPanelText },
  { key: 'back', label: 'Back / Rear', text: backPanelText },
  { key: 'side', label: 'Side / Other', text: sidePanelText },
  { key: 'top_bottom', label: 'Top / Bottom', text: topBottomPanelText }
];
const allFourMerged = FieldExtractor.extractMultiPanelFields(allFourPanels);
assert.strictEqual(allFourMerged.product_name, 'Good Day Rich Butter Cookies');
assert.strictEqual(allFourMerged.net_quantity, '200g');
assert.strictEqual(allFourMerged.mrp, 'Rs 40.00');
assert.strictEqual(allFourMerged.batch_code, 'GD-4412');
assert.strictEqual(allFourMerged.customer_care_phone, '1800 233 9999');
console.log('✓ Test 4 Passed: All 4 panels merged in canonical order.');

// ===========================================================================
// Test 5: Missing optional panels (Front + Top/Bottom without Back/Side)
// ===========================================================================
console.log('\n--- Test 5: Missing optional panels ---');
const skipPanels = [
  { key: 'front', label: 'Front / Main', text: frontPanelText },
  { key: 'top_bottom', label: 'Top / Bottom', text: topBottomPanelText }
];
const skipMerged = FieldExtractor.extractMultiPanelFields(skipPanels);
assert.strictEqual(skipMerged.product_name, 'Good Day Rich Butter Cookies');
assert.strictEqual(skipMerged.net_quantity, '200g');
assert.strictEqual(skipMerged.batch_code, 'GD-4412');
assert.strictEqual(skipMerged.expiry_date, '09/2026');
assert.strictEqual(skipMerged.manufacturer, null, 'Omitted panel values remain strictly null');
assert.strictEqual(skipMerged.mrp, null);
console.log('✓ Test 5 Passed: Non-consecutive panels merge correctly without errors.');

// ===========================================================================
// Test 6: One panel OCR failure with successful fallback to remaining panels
// ===========================================================================
console.log('\n--- Test 6: One panel OCR failure with successful fallback ---');
const mockOcrService = Object.create(OcrService);
// Mock processImage to fail for 'back' panel
mockOcrService.processImage = function (source) {
  if (source === 'fail_image') {
    return Promise.resolve({
      success: false,
      text: 'Text could not be reliably read from this image',
      error: 'Blurry or unreadable panel',
      diagnostics: { readable: false }
    });
  }
  return Promise.resolve({
    success: true,
    text: frontPanelText,
    diagnostics: { readable: true, characterCount: frontPanelText.length }
  });
};

mockOcrService.processPanels([
  { key: 'front', label: 'Front / Main', imageSource: 'valid_image' },
  { key: 'back', label: 'Back / Rear', imageSource: 'fail_image' }
]).then(function (result) {
  assert.strictEqual(result.success, true, 'Overall scan should succeed when at least one panel succeeds');
  assert.strictEqual(result.successfulPanels.length, 1);
  assert.strictEqual(result.failedPanels.length, 1);
  assert.strictEqual(result.failedPanels[0].key, 'back');
  assert.ok(result.text.includes('=== PANEL: Front / Main ==='));
  assert.ok(result.text.includes('=== PANEL: Back / Rear (OCR FAILED) ==='));

  // Ensure field extraction safely extracts from successful panel
  const extracted = FieldExtractor.extractMultiPanelFields(result.successfulPanels, result.text);
  assert.strictEqual(extracted.product_name, 'Good Day Rich Butter Cookies');
  console.log('✓ Test 6 Passed: One panel failure preserves successful panels and annotates failure.');

  // ===========================================================================
  // Test 7: All panels OCR failure handling
  // ===========================================================================
  console.log('\n--- Test 7: All panels OCR failure handling ---');
  mockOcrService.processImage = function () {
    return Promise.resolve({
      success: false,
      text: 'Text could not be reliably read from this image',
      error: 'Low light or blurry image',
      diagnostics: { readable: false }
    });
  };

  mockOcrService.processPanels([
    { key: 'front', label: 'Front / Main', imageSource: 'bad1' },
    { key: 'back', label: 'Back / Rear', imageSource: 'bad2' }
  ]).then(function (failResult) {
    assert.strictEqual(failResult.success, false, 'Should fail when all panels fail');
    assert.strictEqual(failResult.successfulPanels.length, 0);
    assert.strictEqual(failResult.failedPanels.length, 2);
    assert.ok(failResult.error, 'Should provide user-facing error message');
    console.log('✓ Test 7 Passed: All-panel failure produces expected user-facing error.');

    // ===========================================================================
    // Test 8: Duplicate field across panels (Deterministic resolution & audit)
    // ===========================================================================
    console.log('\n--- Test 8: Duplicate field across panels ---');
    const frontWithNetQty = 'PRODUCT: Parakh Mustard Oil\nNET QTY: 1 L\nMRP: Rs 150';
    const backWithDiffNetQty = 'MANUFACTURED BY: ABC AGRO LTD.\nNET CONTENTS: 1000 ml\nMRP: Rs 150';

    const dupMerged = FieldExtractor.extractMultiPanelFields([
      { key: 'front', label: 'Front / Main', text: frontWithNetQty },
      { key: 'back', label: 'Back / Rear', text: backWithDiffNetQty }
    ]);

    // Front should take priority for net_quantity ('1 L' vs '1000 ml')
    assert.strictEqual(dupMerged.net_quantity, '1 L', 'Front panel should take deterministic precedence');
    assert.ok(dupMerged._sources.net_quantity === 'Front / Main', 'Audit source should point to Front / Main');
    assert.ok(Array.isArray(dupMerged._duplicates.net_quantity), 'Duplicate list should record secondary values');
    assert.strictEqual(dupMerged._duplicates.net_quantity[0].value, '1000 ml');
    console.log('✓ Test 8 Passed: Duplicate fields resolved deterministically with audit tracking.');

    // ===========================================================================
    // Test 9: Field present ONLY on a secondary panel
    // ===========================================================================
    console.log('\n--- Test 9: Field present ONLY on a secondary panel ---');
    const panelOnlyName = 'Tasty Premium Salt';
    const panelOnlyMfr = 'MANUFACTURED BY: PURE SALTS INDIA LTD.\nREGD. OFFICE: MUMBAI 400001';

    const secMerged = FieldExtractor.extractMultiPanelFields([
      { key: 'front', label: 'Front / Main', text: panelOnlyName },
      { key: 'back', label: 'Back / Rear', text: panelOnlyMfr }
    ]);

    assert.strictEqual(secMerged.product_name, 'Tasty Premium Salt');
    assert.strictEqual(secMerged.manufacturer, 'PURE SALTS INDIA LTD.');
    assert.strictEqual(secMerged._sources.manufacturer, 'Back / Rear');
    console.log('✓ Test 9 Passed: Secondary panel field captured correctly when absent on Front.');

    // ===========================================================================
    // Test 10: Final compliance evaluation using combined extracted fields
    // ===========================================================================
    console.log('\n--- Test 10: Final compliance evaluation using combined extracted fields ---');
    // Using the all-4-panels merged dataset from Test 4
    const complianceResults = ComplianceEngine.evaluateAll(allFourMerged);
    assert.strictEqual(complianceResults.length, 8, 'Should evaluate all 8 Legal Metrology rules');

    const passCount = complianceResults.filter(r => r.status === 'PASS').length;
    assert.strictEqual(passCount, 8, 'All 8 rules should PASS on complete 4-panel data');

    const scoreResult = ComplianceScorer.calculateScore(complianceResults);
    assert.strictEqual(scoreResult.score, 100);
    assert.strictEqual(scoreResult.overallStatus, 'COMPLIANT');
    console.log('✓ Test 10 Passed: Combined 4-panel inspection scores 100 COMPLIANT at product level.');

    console.log('\n=======================================================');
    console.log('ALL 10 MULTI-PANEL INSPECTION TESTS PASSED! 🚀');
    console.log('=======================================================');
  }).catch(function (err) {
    console.error('Test failed:', err);
    process.exit(1);
  });
}).catch(function (err) {
  console.error('Test failed:', err);
  process.exit(1);
});
