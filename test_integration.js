const assert = require('assert');
const FieldExtractor = require('./fieldExtractor');

console.log('=== VERIFYING INTEGRATION & USER REQUIREMENTS ===\n');

// 1. Verify exact 10 fields exist in definition
const requiredKeys = [
  'product_name',
  'manufacturer',
  'address',
  'net_quantity',
  'mrp',
  'manufacturing_date',
  'expiry_date',
  'batch_code',
  'customer_care_phone',
  'customer_care_email'
];

assert.strictEqual(FieldExtractor.FIELD_DEFINITIONS.length, 10, 'Must define exactly 10 fields');
const defKeys = FieldExtractor.FIELD_DEFINITIONS.map(d => d.key);
for (const key of requiredKeys) {
  assert.ok(defKeys.includes(key), `Field definition missing key: ${key}`);
}
console.log('✓ 10 Mandatory Legal Metrology field definitions verified.');

// 2. Test Britannia Good Day Cookies Actual OCR Text
const goodDayOcr = `
BRITANNIA 1918
Good Day
Rich Butter Cookies

NET WEIGHT: 200g
MRP: Rs
(Incl. of all taxes) Rs 40.00
BATCH NO: GD-4412
MFG. DATE: 12/2025
BEST BEFORE 9 MONTHS FROM PACKAGING

fssai
LIC. NO: 10015043001129
MANUFACTURED BY:
BRITANNIA INDUSTRIES LTD.,
PRESTIGE TOWERS, 9, SHAKESPEARE SARANI,
KOLKATA 700017, INDIA.
`;

const extracted1 = FieldExtractor.extractFields(goodDayOcr);

console.log('\n--- Britannia Good Day Extracted Result ---');
console.log(JSON.stringify(extracted1, null, 2));

assert.strictEqual(extracted1.product_name, 'Good Day Rich Butter Cookies');
assert.strictEqual(extracted1.manufacturer, 'BRITANNIA INDUSTRIES LTD.');
assert.strictEqual(extracted1.address, 'PRESTIGE TOWERS, 9, SHAKESPEARE SARANI, KOLKATA 700017, INDIA.');
assert.strictEqual(extracted1.net_quantity, '200g');
assert.strictEqual(extracted1.mrp, 'Rs 40.00');
assert.strictEqual(extracted1.manufacturing_date, '12/2025');
assert.strictEqual(extracted1.expiry_date, 'BEST BEFORE 9 MONTHS FROM PACKAGING');
assert.strictEqual(extracted1.batch_code, 'GD-4412');
assert.strictEqual(extracted1.customer_care_phone, null);
assert.strictEqual(extracted1.customer_care_email, null);

console.log('✓ Actual Britannia scan extraction accurate with strict nulls for absent phone/email.');

// 3. Fortune Sunflower Oil with care contact
const fortuneOcr = `
Fortune
COMMODITY: REFINED SUNFLOWER OIL
NET QUANTITY: 1 L
MRP: ₹145.00
MFD: 08/07/26
EXPIRY: 07/07/27
BATCH CODE: U 7467AD8G26
MANUFACTURED BY:
ADANI WILMAR LIMITED
FORTUNE HOUSE, AHMEDABAD 380009
CUSTOMER CARE TOLL FREE: 1800 233 9999
EMAIL: care@adaniwilmar.in
`;

const extracted2 = FieldExtractor.extractFields(fortuneOcr);
console.log('\n--- Fortune Sunflower Oil Extracted Result ---');
console.log(JSON.stringify(extracted2, null, 2));

assert.strictEqual(extracted2.product_name, 'REFINED SUNFLOWER OIL');
assert.strictEqual(extracted2.manufacturer, 'ADANI WILMAR LIMITED');
assert.strictEqual(extracted2.net_quantity, '1 L');
assert.strictEqual(extracted2.mrp, '₹145.00');
assert.strictEqual(extracted2.manufacturing_date, '08/07/26');
assert.strictEqual(extracted2.expiry_date, '07/07/27');
assert.strictEqual(extracted2.batch_code, 'U 7467AD8G26');
assert.strictEqual(extracted2.customer_care_phone, '1800 233 9999');
assert.strictEqual(extracted2.customer_care_email, 'care@adaniwilmar.in');

// 4. Verify Compliance Engine & Scorer Integration
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');

const rules1 = ComplianceEngine.evaluateAll(extracted1);
const score1 = ComplianceScorer.calculateScore(rules1);
console.log('\n--- Britannia Good Day Compliance Score ---');
console.log(`Score: ${score1.score} / 100 | Status: ${score1.overallStatus} | Passed: ${score1.passed} | Failed: ${score1.failed} | Review: ${score1.review} | N/A: ${score1.na}`);
assert.strictEqual(score1.score, 88);
assert.strictEqual(score1.overallStatus, 'COMPLIANT');
assert.strictEqual(score1.passed, 7);
assert.strictEqual(score1.failed, 1);
assert.strictEqual(score1.review, 0);
assert.strictEqual(score1.na, 0);

const rules2 = ComplianceEngine.evaluateAll(extracted2);
const score2 = ComplianceScorer.calculateScore(rules2);
console.log('\n--- Fortune Sunflower Oil Compliance Score ---');
console.log(`Score: ${score2.score} / 100 | Status: ${score2.overallStatus} | Passed: ${score2.passed} | Failed: ${score2.failed} | Review: ${score2.review} | N/A: ${score2.na}`);
assert.strictEqual(score2.score, 100);
assert.strictEqual(score2.overallStatus, 'COMPLIANT');
assert.strictEqual(score2.passed, 8);
assert.strictEqual(score2.failed, 0);
assert.strictEqual(score2.review, 0);
assert.strictEqual(score2.na, 0);

console.log('✓ ComplianceScorer seamlessly integrates with ComplianceEngine output.');
console.log('\nALL VERIFICATION CHECKS PASSED PERFECTLY! 🎯');

