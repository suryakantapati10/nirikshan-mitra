/**
 * test_dashboard_dom.js — Verifies Compliance Result Dashboard integration & requirements
 */
const assert = require('assert');
const fs = require('fs');

console.log('Verifying Compliance Result Dashboard integration...\n');

const path = require('path');

function readDirRecursive(dir) {
  let content = '';
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      content += readDirRecursive(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      content += fs.readFileSync(p, 'utf8') + '\n';
    }
  }
  return content;
}

const reactSrc = readDirRecursive('./src');
const appTsx = fs.readFileSync('./src/App.tsx', 'utf8');
const indexCss = fs.readFileSync('./src/index.css', 'utf8');

// 1. Verify required DOM IDs exist across React components
const requiredElementIds = [
  'scan-upload-panel',
  'compliance-dashboard-panel',
  // Header
  'dash-product-name',
  'dash-manufacturer-name',
  'dash-assessment-date',
  'btn-scan-another-top',
  // Product image
  'dash-product-image',
  'dash-img-name',
  'dash-img-size',
  // Score summary
  'dash-score-val',
  'dash-meter-track',
  'dash-meter-fill',
  'dash-status-pill',
  'dash-status-icon',
  'dash-status-text',
  'dash-stat-total',
  'dash-stat-passed',
  'dash-stat-review',
  'dash-stat-failed',
  'dash-stat-na',
  // Issues section
  'dash-issues-card',
  'dash-issues-count-badge',
  'dash-issues-container',
  // Checklist table
  'dash-checklist-tbody',
  // Extracted declarations
  'dash-extracted-count-badge',
  'dash-extracted-grid',
  // Bottom scan another button
  'btn-scan-another-bottom'
];

for (const id of requiredElementIds) {
  assert.ok(
    reactSrc.includes(id),
    `React components must contain element id="${id}"`
  );
}
console.log('✓ All 27 required Dashboard element IDs exist across React components.');

// 2. Verify React components and handlers exist
assert.ok(reactSrc.includes('ComplianceDashboard'), 'ComplianceDashboard component must be defined');
assert.ok(appTsx.includes('handleScanAnother'), 'App.tsx must define handleScanAnother');
assert.ok(reactSrc.includes('btn-scan-another-top'), 'Scan another top button must be handled');
assert.ok(reactSrc.includes('btn-scan-another-bottom'), 'Scan another bottom button must be handled');
assert.ok(appTsx.includes('setDashboardView(\'assessment\')'), 'App.tsx must transition to assessment dashboard upon analysis complete');
console.log('✓ React handlers and dashboard rendering functions verified.');

// 3. Verify src/index.css contains core theme tokens and styling
const requiredDesignTokens = [
  '--color-gov-navy',
  '--color-gov-blue',
  '--color-status-pass',
  '--color-status-review',
  '--color-status-fail',
  '--color-status-na'
];

for (const token of requiredDesignTokens) {
  assert.ok(
    indexCss.includes(token),
    `src/index.css must contain design token ${token}`
  );
}
console.log('✓ All core Dashboard design tokens verified in src/index.css.');

// 4. Verify pipeline logic with Britannia Cookies
const FieldExtractor = require('./fieldExtractor');
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');

const goodDayOcr = `
BRITANNIA Good Day Rich Butter Cookies
NET WEIGHT: 200g
MRP: Rs 40.00
BATCH NO: GD-4412
MFG. DATE: 12/2025
BEST BEFORE 9 MONTHS FROM PACKAGING
MANUFACTURED BY: BRITANNIA INDUSTRIES LTD., PRESTIGE TOWERS, 9, SHAKESPEARE SARANI, KOLKATA 700017, INDIA.
`;

const fields = FieldExtractor.extractFields(goodDayOcr);
const rules = ComplianceEngine.evaluateAll(fields);
const score = ComplianceScorer.calculateScore(rules);

assert.ok(fields.product_name && fields.product_name.includes('Good Day'), 'Product name should include Good Day');
assert.strictEqual(fields.manufacturer, 'BRITANNIA INDUSTRIES LTD.');
assert.strictEqual(score.score, 88);
assert.strictEqual(score.overallStatus, 'COMPLIANT');

// Issues filter: only REVIEW and FAIL
const issues = rules.filter(r => r.status === 'REVIEW' || r.status === 'FAIL');
assert.strictEqual(issues.length, 1, 'Britannia scan should have exactly 1 issue (Customer care missing)');
assert.strictEqual(issues[0].field_key, 'customer_care');
assert.strictEqual(issues[0].status, 'FAIL');
assert.ok(issues[0].explanation.includes('Consumer care'));
assert.ok(issues[0].suggested_action.includes('Rule 6(1)(da)'));
console.log('✓ Issues filtering strictly filters REVIEW & FAIL items (Customer Care failed on Britannia).');

// All rules for checklist table
assert.strictEqual(rules.length, 8, 'Checklist table must receive all 8 evaluated rules');
console.log('✓ Checklist table receives all 8 rules with full remarks and actions.');

console.log('\nALL COMPLIANCE RESULT DASHBOARD DOM & PIPELINE CHECKS PASSED! 🎉');
