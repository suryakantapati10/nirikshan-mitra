const assert = require('assert');
const ComplianceEngine = require('./complianceEngine');

console.log('=== Nirikshan Mitra Compliance Rule Engine Test Suite ===\n');

// 1. Validate engine metadata & structure
assert.strictEqual(ComplianceEngine.RULES.length, 8, 'Engine must evaluate exactly 8 independent rules');
console.log('✓ Exactly 8 independent rules registered.');

// 2. Test 1: Full Compliance Label (Fortune Sunflower Oil)
const fortuneFields = {
  product_name: 'REFINED SUNFLOWER OIL',
  manufacturer: 'ADANI WILMAR LIMITED',
  address: 'FORTUNE HOUSE, NEAR NAVRANGPURA, AHMEDABAD 380009, GUJARAT, INDIA.',
  net_quantity: '1 L (910g)',
  mrp: '₹145.00',
  manufacturing_date: '08/07/26',
  expiry_date: '07/07/27',
  batch_code: 'U 7467AD8G26',
  customer_care_phone: '1800 233 9999',
  customer_care_email: 'care@adaniwilmar.in'
};

const results1 = ComplianceEngine.evaluateAll(fortuneFields);
console.log('Test 1 (Fortune Sunflower Oil evaluation):');
console.log(JSON.stringify(results1, null, 2));

assert.strictEqual(results1.length, 8);
results1.forEach(r => {
  assert.ok(['PASS', 'REVIEW', 'FAIL'].includes(r.status));
  assert.ok(typeof r.field_name === 'string');
  assert.ok(typeof r.is_present === 'boolean');
  assert.ok(typeof r.is_valid === 'boolean');
  assert.ok(typeof r.explanation === 'string');
  assert.ok(typeof r.suggested_action === 'string');
  assert.strictEqual(r.status, 'PASS', `${r.field_name} should PASS`);
});
const summary1 = ComplianceEngine.getSummary(results1);
assert.strictEqual(summary1.pass, 8, 'All 8 rules should PASS for complete label');
assert.strictEqual(summary1.fail, 0);
assert.strictEqual(summary1.review, 0);
console.log('✓ Test 1 (All 8 PASS) Passed!\n');

// 3. Test 2: Britannia Good Day Cookies (Missing customer care details -> Customer Care should be FAIL)
const goodDayFields = {
  product_name: 'Good Day Rich Butter Cookies',
  manufacturer: 'BRITANNIA INDUSTRIES LTD.',
  address: 'PRESTIGE TOWERS, 9, SHAKESPEARE SARANI, KOLKATA 700017, INDIA.',
  net_quantity: '200g',
  mrp: 'Rs 40.00',
  manufacturing_date: '12/2025',
  expiry_date: 'BEST BEFORE 9 MONTHS FROM PACKAGING',
  batch_code: 'GD-4412',
  customer_care_phone: null,
  customer_care_email: null
};

const results2 = ComplianceEngine.evaluateAll(goodDayFields);
console.log('Test 2 (Britannia Good Day Cookies evaluation):');
console.log(JSON.stringify(results2, null, 2));

const ccRule = results2.find(r => r.field_key === 'customer_care');
assert.ok(ccRule, 'Customer care rule should exist');
assert.strictEqual(ccRule.status, 'FAIL', 'Customer care should FAIL when neither phone nor email is detected');
assert.strictEqual(ccRule.is_present, false);
assert.strictEqual(ccRule.is_valid, false);

// Check other 7 rules PASS
const otherRules = results2.filter(r => r.field_key !== 'customer_care');
otherRules.forEach(r => {
  assert.strictEqual(r.status, 'PASS', `${r.field_name} should PASS`);
});
console.log('✓ Test 2 (7 PASS, 1 FAIL) Passed!\n');

// 4. Test 3: Edge Cases for REVIEW status
// - Address without PIN code -> REVIEW
// - Customer care with phone only -> REVIEW
// - Unclear date / vague expiry -> REVIEW
const reviewFields = {
  manufacturer: 'BRITANNIA INDUSTRIES LTD.',
  address: 'PRESTIGE TOWERS, KOLKATA, INDIA', // No 6-digit PIN code
  net_quantity: '200g',
  mrp: 'Rs 40.00',
  manufacturing_date: '12/2025',
  expiry_date: 'BEST BEFORE 9 MONTHS FROM PACKAGING',
  batch_code: 'GD-4412',
  customer_care_phone: '1800 200 1122',
  customer_care_email: null // Phone only -> REVIEW
};

const results3 = ComplianceEngine.evaluateAll(reviewFields);
const addrRule = results3.find(r => r.field_key === 'address');
assert.strictEqual(addrRule.status, 'REVIEW', 'Address without PIN code should trigger REVIEW');
assert.strictEqual(addrRule.is_valid, false);

const ccReviewRule = results3.find(r => r.field_key === 'customer_care');
assert.strictEqual(ccReviewRule.status, 'REVIEW', 'Customer care with only one channel should trigger REVIEW');
console.log('✓ Test 3 (REVIEW Status Scenarios) Passed!\n');

// 5. Test 4: Completely Empty / Null Input -> All 8 FAIL
const emptyResults = ComplianceEngine.evaluateAll({});
assert.strictEqual(emptyResults.length, 8);
emptyResults.forEach(r => {
  assert.strictEqual(r.status, 'FAIL', `Empty input ${r.field_name} must FAIL`);
  assert.strictEqual(r.is_present, false);
  assert.strictEqual(r.is_valid, false);
  assert.strictEqual(r.extracted_value, null);
});
console.log('✓ Test 4 (Strict Non-Hallucination & Empty Input All FAIL) Passed!\n');

console.log('ALL COMPLIANCE ENGINE TESTS PASSED! 🎉');
