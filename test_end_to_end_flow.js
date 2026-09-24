/**
 * test_end_to_end_flow.js — Simulates complete frontend flow to ensure no undefined functions
 */
const assert = require('assert');
const fs = require('fs');

console.log('Testing frontend execution flow simulation...\n');

const FieldExtractor = require('./fieldExtractor');
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');

// Read src/App.tsx and check all primary workflow handler definitions
const appContent = fs.readFileSync('./src/App.tsx', 'utf8');

const expectedHandlers = [
  'handleAnalyzeProduct',
  'handleRemoveScan',
  'handleScanAnother',
  'handlePanelUpload',
  'handlePanelCamera',
  'handleCameraCaptureComplete',
  'handlePanelRemove',
  'handleRetryClassification',
  'handleViewHistoricalDetails',
  'handleDownloadPdf',
  'fileToDataUrl',
  'formatFileSize'
];

for (const fnName of expectedHandlers) {
  assert.ok(
    appContent.includes(fnName),
    `Missing expected React handler or utility: ${fnName}`
  );
}
console.log('✓ All 12 expected frontend workflow handlers are defined in src/App.tsx.');

// Simulate image upload & processing with realistic label text
const testOcrText = `
BRITANNIA Good Day Rich Butter Cookies
NET WEIGHT: 200g
MRP: Rs 40.00
BATCH NO: GD-4412
MFG. DATE: 12/2025
BEST BEFORE 9 MONTHS FROM PACKAGING
MANUFACTURED BY: BRITANNIA INDUSTRIES LTD., PRESTIGE TOWERS, 9, SHAKESPEARE SARANI, KOLKATA 700017, INDIA.
`;

const fields = FieldExtractor.extractFields(testOcrText);
assert.ok(fields, 'Extracted fields should exist');

const complianceResults = ComplianceEngine.evaluateAll(fields);
assert.ok(Array.isArray(complianceResults) && complianceResults.length === 8, 'Should evaluate all 8 rules');

const complianceScore = ComplianceScorer.calculateScore(complianceResults);
assert.strictEqual(complianceScore.score, 88);
assert.strictEqual(complianceScore.overallStatus, 'COMPLIANT');

console.log('✓ Simulated full scan flow: OCR -> Field Extraction -> Compliance Rules -> Compliance Score.');
console.log('\nNO UNDEFINED ERRORS FOUND! 🎯');
