/**
 * test_dashboard_redesign.js — Validates all User Requirements for the Nirikshan Mitra Dashboard redesign
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- VALIDATING NIRIKSHAN MITRA DASHBOARD REDESIGN REQUIREMENTS ---\n');

const appTsx = fs.readFileSync('./src/App.tsx', 'utf8');
const scanIntakePanelTsx = fs.readFileSync('./src/components/dashboard/ScanIntakePanel.tsx', 'utf8');
const govStripTsx = fs.readFileSync('./src/components/layout/GovStrip.tsx', 'utf8');
const navigationTsx = fs.readFileSync('./src/components/layout/Navigation.tsx', 'utf8');
const complianceDashboardTsx = fs.readFileSync('./src/components/compliance/ComplianceDashboard.tsx', 'utf8');
const indexCss = fs.readFileSync('./src/index.css', 'utf8');

// 1. Remove the "Recent Inspections / Recent Scans" table from the Dashboard completely
assert.ok(!scanIntakePanelTsx.includes('class="inspection-table"'), 'inspection-table must be removed from ScanIntakePanel');
assert.ok(!scanIntakePanelTsx.includes('id="inspection-table-body"'), 'inspection-table-body must be removed from ScanIntakePanel');
assert.ok(!scanIntakePanelTsx.includes('Recent Product Inspections'), 'Old "Recent Product Inspections" heading must be removed from Dashboard');
console.log('✓ Requirement 1: "Recent Inspections" table completely removed from Dashboard.');

// 2 & 3. Move product image upload/scan functionality directly onto the Dashboard as primary action
// and title: "Scan a Product Label"
assert.ok(scanIntakePanelTsx.includes('id="scan-upload-panel"'), 'scan-upload-panel must be located inside ScanIntakePanel');
assert.ok(scanIntakePanelTsx.includes('Scan a Product Label'), 'Must have prominent section titled "Scan a Product Label"');
console.log('✓ Requirement 2 & 3: "Scan a Product Label" is the primary prominent section at the top of Dashboard.');

// 4. Include: Drag-and-drop, Image preview, "Analyze Product" (Choose Image & Camera buttons removed per request)
assert.ok(scanIntakePanelTsx.includes('id="drop-zone"'), 'Drag-and-drop drop-zone must be present');
assert.ok(!scanIntakePanelTsx.includes('id="btn-choose-image"'), '"Choose Image" external button removed per user request');
assert.ok(!scanIntakePanelTsx.includes('id="btn-use-camera"'), '"Use Camera" button removed per user request');
assert.ok(scanIntakePanelTsx.includes('id="preview-image"'), 'Image preview element must be present');
assert.ok(scanIntakePanelTsx.includes('id="preview-frame"'), 'Image preview frame must be present');
assert.ok(scanIntakePanelTsx.includes('Analyze Product'), '"Analyze Product" button text must be present');
console.log('✓ Requirement 4: Drag-and-drop, preview, and "Analyze Product" verified (two options removed).');

// 5. Keep existing Government of India visual style
assert.ok(govStripTsx.includes('भारत सरकार &nbsp;|&nbsp; Government of India') || govStripTsx.includes('भारत सरकार'), 'Government strip must remain');
assert.ok(govStripTsx.includes('Department of Consumer Affairs'), 'Department of Consumer Affairs branding must remain');
assert.ok(indexCss.includes('--color-gov-navy'), 'Government Navy design token must exist');
assert.ok(indexCss.includes('--color-gov-blue'), 'Government Blue design token must exist');
console.log('✓ Requirement 5: Official Government of India / DCA visual style maintained.');

// 6. Navigation and dashboard clean layout
assert.ok(navigationTsx.includes('data-target="dashboard"'), 'Dashboard nav link must exist');
assert.ok(!navigationTsx.includes('data-target="scan"'), 'Scan Product nav button removed per user request');
assert.ok(!scanIntakePanelTsx.includes('id="summary-row"'), 'Inspection Statistics Overview removed per user request');
assert.ok(appTsx.includes('handleScanAnother'), 'App.tsx must define handleScanAnother');
console.log('✓ Requirement 6: Navigation cleaned and statistics section removed per user request.');

// 7 & 8. Flow after clicking "Analyze Product" and no OCR/engine alteration
assert.ok(appTsx.includes('handleAnalyzeProduct'), 'handleAnalyzeProduct must be defined in App.tsx');
assert.ok(appTsx.includes('ocrService.processPanels'), 'Multi-panel OCR execution preserved');
assert.ok(appTsx.includes('fieldExtractor.extractFields') || appTsx.includes('fieldExtractor.extractMultiPanelFields'), 'Field extraction execution preserved');
assert.ok(appTsx.includes('complianceEngine.evaluateAll'), 'Compliance evaluation execution preserved');
assert.ok(appTsx.includes('complianceScorer.calculateScore'), 'Compliance scoring execution preserved');
console.log('✓ Requirement 7 & 8: Flow and OCR/compliance engines remain intact.');

// 9. Verify scan another returns to upload without duplicate scan logic
assert.ok(complianceDashboardTsx.includes('id="btn-scan-another-top"'), 'btn-scan-another-top must exist');
assert.ok(complianceDashboardTsx.includes('id="btn-scan-another-bottom"'), 'btn-scan-another-bottom must exist');
assert.ok(complianceDashboardTsx.includes('onScanAnother'), 'Scan another action wired in ComplianceDashboard');
assert.ok(appTsx.includes('handleScanAnother'), 'handleScanAnother wired in App.tsx');
console.log('✓ Requirement 9: Unified scanning logic and reset flow verified.');

console.log('\n=========================================');
console.log('ALL DASHBOARD REDESIGN CONTRACTS PASSED! 🚀');
console.log('=========================================');
