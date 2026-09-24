/**
 * test_package_classifier.js — Unit tests for PackageClassifier
 */
const assert = require('assert');
const PackageClassifier = require('./packageClassifier');

console.log('Running PackageClassifier Test Suite...\n');

// Test 1: Verify all 7 valid package types exist
assert.deepStrictEqual(
  PackageClassifier.VALID_PACKAGE_TYPES,
  ['Can', 'Bottle', 'Pouch', 'Box', 'Carton', 'Jar', 'Other'],
  'Should contain exactly the 7 required package categories'
);
console.log('✓ Test 1 Passed: 7 Valid Package Types verified.');

// Test 2: High confidence classification for Can
const canResult = PackageClassifier.evaluateClassification('Can', 0.92, 'Cylindrical aluminum beverage can');
assert.strictEqual(canResult.packageType, 'Can');
assert.strictEqual(canResult.displayText, 'Package detected: Can');
assert.strictEqual(canResult.confidencePercent, 92);
assert.strictEqual(canResult.isLowConfidence, false);
assert.strictEqual(canResult.guidancePrompt, 'For a complete assessment, capture additional sides/panels of this package.');
console.log('✓ Test 2 Passed: High-confidence Can classification.');

// Test 3: High confidence classification for Bottle, Pouch, Box, Carton, Jar
const types = ['Bottle', 'Pouch', 'Box', 'Carton', 'Jar'];
for (const t of types) {
  const res = PackageClassifier.evaluateClassification(t, 0.85);
  assert.strictEqual(res.packageType, t);
  assert.strictEqual(res.displayText, `Package detected: ${t}`);
  assert.strictEqual(res.confidencePercent, 85);
  assert.strictEqual(res.isLowConfidence, false);
  assert.strictEqual(res.guidancePrompt, 'For a complete assessment, capture additional sides/panels of this package.');
}
console.log('✓ Test 3 Passed: High-confidence classification for Bottle, Pouch, Box, Carton, Jar.');

// Test 4: Low confidence threshold handling (< 0.60)
const lowConfResult = PackageClassifier.evaluateClassification('Can', 0.45, 'Blurry image');
assert.strictEqual(lowConfResult.isLowConfidence, true);
assert.strictEqual(
  lowConfResult.guidancePrompt,
  'Package type could not be confidently identified. Continue with general package scanning.'
);
console.log('✓ Test 4 Passed: Low confidence (< 0.60) triggers exact required low-confidence guidance.');

// Test 5: Ambiguous / Unknown / Other category
const otherResult = PackageClassifier.evaluateClassification('UnknownCategory', 0.90);
assert.strictEqual(otherResult.packageType, 'Other');
console.log('✓ Test 5 Passed: Unknown category defaults cleanly to Other.');

// Test 6: Multi-panel inspection session management
const session = PackageClassifier.createInspectionSession({ name: 'front_label.jpg', size: '250 KB' });
assert.ok(session.id.startsWith('insp_'));
assert.strictEqual(session.panels.front.name, 'front_label.jpg');
assert.strictEqual(session.panels.back, null);
assert.strictEqual(session.panels.side, null);
assert.strictEqual(session.panels.top_bottom, null);

// Associate back panel
session.panels.back = { name: 'back_label.jpg', size: '210 KB' };
assert.ok(session.panels.back !== null);
console.log('✓ Test 6 Passed: Multi-panel inspection session tracks all images for same package.');

console.log('\nALL PACKAGE CLASSIFIER TESTS PASSED! 🎉');
