const assert = require('assert');
const FieldExtractor = require('./fieldExtractor');

console.log('Running Nirikshan Mitra FieldExtractor Test Suite...\n');

// Test 1: Real-world OCR text from Image 2 (Britannia Good Day Cookies)
const goodDayOcrText = `
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

8 901063 021200

VEG

INGREDIENTS: WHEAT FLOUR, SUGAR, VEGETABLE FAT, NNITURAL SATEAR,
SUGAR & ROTRN OXION, CUCHECHABNAT, BURGUSE COI, COVKNO FGIT EFFECT,
PIVFDDT NV ROIGNT MNRWAN, SHYCLIET, KAT ON FATH, COCUNMS, EOEFOSRR4,
BURTER, BAVEATL OONT, MUNATM BATH,
AND SDMEOTS BHOON COODA01EMH.

NUTRITIONAL INFORMATION
(per 100g)
Energy 1250 kcal
Protein 8.3 g
`;

const res1 = FieldExtractor.extractFields(goodDayOcrText);
console.log('Test 1 (Britannia Good Day Cookies):');
console.log(JSON.stringify(res1, null, 2));

assert.strictEqual(res1.net_quantity, '200g', 'Net quantity should be 200g');
assert.strictEqual(res1.mrp, 'Rs 40.00', 'MRP should be Rs 40.00');
assert.strictEqual(res1.batch_code, 'GD-4412', 'Batch code should be GD-4412');
assert.strictEqual(res1.manufacturing_date, '12/2025', 'MFG date should be 12/2025');
assert.strictEqual(res1.expiry_date, 'BEST BEFORE 9 MONTHS FROM PACKAGING', 'Expiry should be relative duration statement');
assert.strictEqual(res1.manufacturer, 'BRITANNIA INDUSTRIES LTD.', 'Manufacturer should be BRITANNIA INDUSTRIES LTD.');
assert.ok(res1.address && res1.address.includes('KOLKATA 700017'), 'Address should include Kolkata 700017');
assert.ok(res1.product_name && res1.product_name.includes('Good Day'), 'Product name should include Good Day');
assert.strictEqual(res1.customer_care_phone, null, 'Phone not present should be null');
assert.strictEqual(res1.customer_care_email, null, 'Email not present should be null');
console.log('✓ Test 1 Passed!\n');

// Test 2: Fortune Sunflower Oil Label with Customer Care Details
const fortuneOcrText = `
Fortune
Sunlite Refined Sunflower Oil

COMMODITY: REFINED SUNFLOWER OIL
NET QUANTITY: 1 L (910g)
MAX RETAIL PRICE (MRP): ₹145.00
(INCL. OF ALL TAXES)
BATCH / LOT NO: U 7467AD8G26
DATE OF PACKING: 08/07/26
EXPIRY DATE: 07/07/27

MANUFACTURED & PACKED BY:
ADANI WILMAR LIMITED
FORTUNE HOUSE, NEAR NAVRANGPURA RAILWAY CROSSING,
AHMEDABAD 380009, GUJARAT, INDIA.

CUSTOMER CARE CELL:
FOR CONSUMER FEEDBACK / COMPLAINTS:
TOLL FREE: 1800 233 9999
EMAIL: care@adaniwilmar.in
`;

const res2 = FieldExtractor.extractFields(fortuneOcrText);
console.log('Test 2 (Fortune Sunflower Oil with all 10 fields):');
console.log(JSON.stringify(res2, null, 2));

assert.strictEqual(res2.product_name, 'REFINED SUNFLOWER OIL', 'Product name should match commodity descriptor');
assert.strictEqual(res2.manufacturer, 'ADANI WILMAR LIMITED', 'Manufacturer should match Adani Wilmar Limited');
assert.ok(res2.address && res2.address.includes('AHMEDABAD 380009'), 'Address should include Ahmedabad 380009');
assert.strictEqual(res2.net_quantity, '1 L (910g)', 'Net quantity should include 1 L (910g)');
assert.strictEqual(res2.mrp, '₹145.00', 'MRP should be ₹145.00');
assert.strictEqual(res2.manufacturing_date, '08/07/26', 'Manufacturing date should be 08/07/26');
assert.strictEqual(res2.expiry_date, '07/07/27', 'Expiry date should be 07/07/27');
assert.strictEqual(res2.batch_code, 'U 7467AD8G26', 'Batch code should be U 7467AD8G26');
assert.strictEqual(res2.customer_care_phone, '1800 233 9999', 'Customer care phone should be 1800 233 9999');
assert.strictEqual(res2.customer_care_email, 'care@adaniwilmar.in', 'Customer care email should be care@adaniwilmar.in');
console.log('✓ Test 2 Passed!\n');

// Test 3: Blank / Missing fields test (Non-Hallucination verification)
const emptyRes = FieldExtractor.extractFields('');
for (const key of Object.keys(emptyRes)) {
  assert.strictEqual(emptyRes[key], null, `Empty input field ${key} must be null`);
}
console.log('✓ Test 3 (Strict Null on Empty/Missing Input) Passed!\n');

// Test 4: Minimal partial label (only MRP and Net Quantity present)
const partialOcrText = `
SNACK CRUNCH
NET WT: 50g
MRP: Rs 10.00
`;
const res4 = FieldExtractor.extractFields(partialOcrText);
console.log('Test 4 (Partial label with missing fields):');
console.log(JSON.stringify(res4, null, 2));
assert.strictEqual(res4.net_quantity, '50g');
assert.strictEqual(res4.mrp, 'Rs 10.00');
assert.strictEqual(res4.manufacturing_date, null, 'MFD should be null if absent');
assert.strictEqual(res4.expiry_date, null, 'Expiry should be null if absent');
assert.strictEqual(res4.batch_code, null, 'Batch code should be null if absent');
assert.strictEqual(res4.customer_care_phone, null, 'Phone should be null if absent');
assert.strictEqual(res4.customer_care_email, null, 'Email should be null if absent');
console.log('✓ Test 4 Passed!\n');

// Test 5: Complex date and contact formatting
const label5 = `
NANDINI SPECIAL TONED MILK
NET QUANTITY: 500 ml
M.R.P.: ₹28.00 (INCLUSIVE OF ALL TAXES)
PKD: 15 OCT 2026
EXP: 17 OCT 2026
LOT: L-9812A
PACKED BY:
KARNATAKA MILK FEDERATION
KMF COMPLEX, P.B. NO. 2915, D.R. COLLEGE POST,
BENGALURU 560029
CONTACT: 080-26096800
EMAIL: customercare@kmfnandini.coop
`;
const res5 = FieldExtractor.extractFields(label5);
console.log('Test 5 (Dairy label with month abbreviations & landline):');
console.log(JSON.stringify(res5, null, 2));
assert.strictEqual(res5.product_name, 'NANDINI SPECIAL TONED MILK');
assert.strictEqual(res5.net_quantity, '500 ml');
assert.strictEqual(res5.mrp, '₹28.00');
assert.strictEqual(res5.manufacturing_date, '15 OCT 2026');
assert.strictEqual(res5.expiry_date, '17 OCT 2026');
assert.strictEqual(res5.batch_code, 'L-9812A');
assert.strictEqual(res5.manufacturer, 'KARNATAKA MILK FEDERATION');
assert.ok(res5.address.includes('BENGALURU 560029'));
assert.strictEqual(res5.customer_care_phone, '080-26096800');
assert.strictEqual(res5.customer_care_email, 'customercare@kmfnandini.coop');
console.log('✓ Test 5 Passed!\n');

console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');

