/**
 * test_compliance_scorer.js — Test suite for Nirikshan Mitra ComplianceScorer
 * 
 * Verifies scoring logic, rule weights, deductions, and tier thresholds.
 */
const assert = require('assert');
const ComplianceScorer = require('./complianceScorer');

console.log('Running Nirikshan Mitra ComplianceScorer Test Suite...\n');

// Test 1: All 8 checks PASS -> 100 / COMPLIANT
{
  const checks = Array(8).fill(null).map((_, i) => ({
    field_key: `rule_${i}`,
    status: 'PASS'
  }));

  const result = ComplianceScorer.calculateScore(checks);
  console.log('Test 1 (All 8 PASS):', result.score, result.overallStatus);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.overallStatus, 'COMPLIANT');
  assert.strictEqual(result.statusKey, 'COMPLIANT');
  assert.strictEqual(result.totalChecks, 8);
  assert.strictEqual(result.passed, 8);
  assert.strictEqual(result.review, 0);
  assert.strictEqual(result.failed, 0);
  assert.strictEqual(result.na, 0);
  assert.strictEqual(result.applicableChecks, 8);
  assert.strictEqual(result.pointsEarned, 8.0);
  assert.strictEqual(result.assessmentType, 'Preliminary Automated Assessment');
  assert(result.disclaimer.includes('Preliminary automated assessment'));
  console.log('✓ Test 1 Passed!\n');
}

// Test 2: 7 PASS, 1 FAIL -> 87.5% -> 88 / COMPLIANT (e.g. Britannia scan with missing customer care)
{
  const checks = [
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'FAIL' }
  ];

  const result = ComplianceScorer.calculateScore(checks);
  console.log('Test 2 (7 PASS, 1 FAIL):', result.score, result.overallStatus);
  assert.strictEqual(result.score, 88);
  assert.strictEqual(result.overallStatus, 'COMPLIANT');
  assert.strictEqual(result.totalChecks, 8);
  assert.strictEqual(result.passed, 7);
  assert.strictEqual(result.review, 0);
  assert.strictEqual(result.failed, 1);
  assert.strictEqual(result.pointsEarned, 7.0);
  console.log('✓ Test 2 Passed!\n');
}

// Test 3: 4 PASS, 4 REVIEW -> (4 + 2) / 8 = 75 / NEEDS REVIEW
{
  const checks = [
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'REVIEW' },
    { status: 'REVIEW' },
    { status: 'REVIEW' },
    { status: 'REVIEW' }
  ];

  const result = ComplianceScorer.calculateScore(checks);
  console.log('Test 3 (4 PASS, 4 REVIEW):', result.score, result.overallStatus);
  assert.strictEqual(result.score, 75);
  assert.strictEqual(result.overallStatus, 'NEEDS REVIEW');
  assert.strictEqual(result.statusKey, 'NEEDS_REVIEW');
  assert.strictEqual(result.passed, 4);
  assert.strictEqual(result.review, 4);
  assert.strictEqual(result.failed, 0);
  assert.strictEqual(result.pointsEarned, 6.0);
  console.log('✓ Test 3 Passed!\n');
}

// Test 4: Threshold Boundary Checks
{
  // 84 / 100 -> NEEDS REVIEW (84 is just below 85)
  // Let's test with 50 checks: 42 pass = 84%
  const checks84 = Array(42).fill({ status: 'PASS' }).concat(Array(8).fill({ status: 'FAIL' }));
  const res84 = ComplianceScorer.calculateScore(checks84);
  assert.strictEqual(res84.score, 84);
  assert.strictEqual(res84.overallStatus, 'NEEDS REVIEW');

  // 85 / 100 -> COMPLIANT
  const checks85 = Array(17).fill({ status: 'PASS' }).concat(Array(3).fill({ status: 'FAIL' }));
  const res85 = ComplianceScorer.calculateScore(checks85);
  assert.strictEqual(res85.score, 85);
  assert.strictEqual(res85.overallStatus, 'COMPLIANT');

  // 60 / 100 -> NEEDS REVIEW
  const checks60 = Array(3).fill({ status: 'PASS' }).concat(Array(2).fill({ status: 'FAIL' }));
  const res60 = ComplianceScorer.calculateScore(checks60);
  assert.strictEqual(res60.score, 60);
  assert.strictEqual(res60.overallStatus, 'NEEDS REVIEW');

  // 59 / 100 -> POTENTIAL VIOLATION
  const checks59 = Array(59).fill({ status: 'PASS' }).concat(Array(41).fill({ status: 'FAIL' }));
  const res59 = ComplianceScorer.calculateScore(checks59);
  assert.strictEqual(res59.score, 59);
  assert.strictEqual(res59.overallStatus, 'POTENTIAL VIOLATION');
  console.log('✓ Test 4 (Threshold boundaries 85, 84, 60, 59) Passed!\n');
}

// Test 5: All FAIL -> 0 / POTENTIAL VIOLATION
{
  const checks = Array(8).fill({ status: 'FAIL' });
  const result = ComplianceScorer.calculateScore(checks);
  console.log('Test 5 (All FAIL):', result.score, result.overallStatus);
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.overallStatus, 'POTENTIAL VIOLATION');
  assert.strictEqual(result.passed, 0);
  assert.strictEqual(result.failed, 8);
  console.log('✓ Test 5 Passed!\n');
}

// Test 6: N/A Exclusion behavior
{
  // 6 PASS, 2 N/A -> 6/6 applicable = 100% COMPLIANT
  const checks = [
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'PASS' },
    { status: 'N/A' },
    { status: 'N/A' }
  ];

  const result = ComplianceScorer.calculateScore(checks);
  console.log('Test 6 (6 PASS, 2 N/A):', result.score, result.overallStatus);
  assert.strictEqual(result.totalChecks, 8);
  assert.strictEqual(result.applicableChecks, 6);
  assert.strictEqual(result.passed, 6);
  assert.strictEqual(result.na, 2);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.overallStatus, 'COMPLIANT');
  console.log('✓ Test 6 Passed!\n');
}

// Test 7: Edge cases: empty array / null input / all N/A
{
  const emptyRes = ComplianceScorer.calculateScore([]);
  assert.strictEqual(emptyRes.score, 0);
  assert.strictEqual(emptyRes.totalChecks, 0);
  assert.strictEqual(emptyRes.overallStatus, 'POTENTIAL VIOLATION');

  const nullRes = ComplianceScorer.calculateScore(null);
  assert.strictEqual(nullRes.score, 0);
  assert.strictEqual(nullRes.totalChecks, 0);

  const allNaRes = ComplianceScorer.calculateScore([{ status: 'N/A' }, { status: 'N/A' }]);
  assert.strictEqual(allNaRes.score, 0);
  assert.strictEqual(allNaRes.applicableChecks, 0);
  assert.strictEqual(allNaRes.na, 2);
  console.log('✓ Test 7 (Edge cases) Passed!\n');
}

// Test 8: Custom weights and threshold overrides
{
  const customOpts = {
    weights: {
      PASS: 2.0,
      REVIEW: 1.0,
      FAIL: 0.0
    },
    thresholds: {
      COMPLIANT_MIN: 90,
      NEEDS_REVIEW_MIN: 70
    }
  };

  // 8 checks: 7 PASS (14 pts) + 1 FAIL (0 pts) = 14 / 16 = 87.5% -> 88
  // With 90 min threshold, 88 is now NEEDS REVIEW
  const checks = [
    { status: 'PASS' }, { status: 'PASS' }, { status: 'PASS' }, { status: 'PASS' },
    { status: 'PASS' }, { status: 'PASS' }, { status: 'PASS' }, { status: 'FAIL' }
  ];

  const result = ComplianceScorer.calculateScore(checks, customOpts);
  assert.strictEqual(result.score, 88);
  assert.strictEqual(result.overallStatus, 'NEEDS REVIEW');
  console.log('✓ Test 8 (Custom weights & thresholds) Passed!\n');
}

// Test 9: Realistic Label Scans (End-to-End Pipeline)
{
  const FieldExtractor = require('./fieldExtractor');
  const ComplianceEngine = require('./complianceEngine');

  // Case A: Full compliance label (Fortune Sunflower Oil with all 8 rules passing)
  const fullLabelText = [
    'Fortune Sunlite Refined Sunflower Oil',
    'COMMODITY: REFINED SUNFLOWER OIL',
    'NET QUANTITY: 1 L (910g)',
    'MAX RETAIL PRICE (MRP): ₹145.00',
    'BATCH / LOT NO: U 7467AD8G26',
    'DATE OF PACKING: 08/07/26',
    'EXPIRY DATE: 07/07/27',
    'MANUFACTURED & PACKED BY:',
    'ADANI WILMAR LIMITED',
    'FORTUNE HOUSE, NEAR NAVRANGPURA RAILWAY CROSSING, AHMEDABAD 380009, GUJARAT, INDIA.',
    'CUSTOMER CARE: 1800 233 9999',
    'EMAIL: care@adaniwilmar.in'
  ].join('\n');

  const fieldsA = FieldExtractor.extractFields(fullLabelText);
  const rulesA = ComplianceEngine.evaluateAll(fieldsA);
  const scoreA = ComplianceScorer.calculateScore(rulesA);

  console.log('Test 9A (Fortune Full Scan):', scoreA.score, scoreA.overallStatus);
  assert.strictEqual(scoreA.score, 100);
  assert.strictEqual(scoreA.overallStatus, 'COMPLIANT');
  assert.strictEqual(scoreA.passed, 8);
  assert.strictEqual(scoreA.failed, 0);

  // Case B: Britannia Good Day (missing customer care)
  const britanniaLabelText = [
    'BRITANNIA Good Day Rich Butter Cookies',
    'NET WEIGHT: 200g',
    'MRP: Rs 40.00',
    'BATCH NO: GD-4412',
    'MFG. DATE: 12/2025',
    'BEST BEFORE 9 MONTHS FROM PACKAGING',
    'MANUFACTURED BY: BRITANNIA INDUSTRIES LTD., PRESTIGE TOWERS, 9, SHAKESPEARE SARANI, KOLKATA 700017, INDIA.'
  ].join('\n');

  const fieldsB = FieldExtractor.extractFields(britanniaLabelText);
  const rulesB = ComplianceEngine.evaluateAll(fieldsB);
  const scoreB = ComplianceScorer.calculateScore(rulesB);

  console.log('Test 9B (Britannia Scan - Missing Customer Care):', scoreB.score, scoreB.overallStatus);
  assert.strictEqual(scoreB.score, 88);
  assert.strictEqual(scoreB.overallStatus, 'COMPLIANT');
  assert.strictEqual(scoreB.passed, 7);
  assert.strictEqual(scoreB.failed, 1);

  // Case C: Deficient label with only 2 fields -> POTENTIAL VIOLATION
  const poorLabelText = 'CRUNCH CHIPS NET WT 50g MRP Rs 10.00';
  const fieldsC = FieldExtractor.extractFields(poorLabelText);
  const rulesC = ComplianceEngine.evaluateAll(fieldsC);
  const scoreC = ComplianceScorer.calculateScore(rulesC);

  console.log('Test 9C (Deficient Scan):', scoreC.score, scoreC.overallStatus);
  assert.strictEqual(scoreC.score, 25); // 2 of 8 pass = 25%
  assert.strictEqual(scoreC.overallStatus, 'POTENTIAL VIOLATION');
  assert.strictEqual(scoreC.passed, 2);
  assert.strictEqual(scoreC.failed, 6);
  console.log('✓ Test 9 (Realistic Scans Pipeline) Passed!\n');
}

console.log('ALL COMPLIANCE SCORER TESTS PASSED PERFECTLY! 🎯');

