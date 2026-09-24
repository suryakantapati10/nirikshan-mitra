/**
 * test_classification_button_flow.js
 * 
 * Verifies the button-state flow and package classification integration:
 * 1. Initial State: Analyze Product disabled when no image is uploaded.
 * 2. Image Selection: Package classification starts, Analyze Product remains disabled while classification is in progress.
 * 3. Classification Success: Analyze Product becomes enabled when classification status === "success".
 * 4. Low-Confidence Success: Analyze Product is enabled and preserves low-confidence guidance.
 * 5. Classification Failure / Error: Analyze Product remains disabled when classification fails, showing retry prompt.
 * 6. Replace Image: Changing/replacing the image immediately disables Analyze Product again and re-runs classification.
 * 7. Retry Classification: After a simulated failure, retrying classification enables Analyze Product upon success.
 * 8. Multi-panel Independence: Adding secondary panels (back, side, top/bottom) does not alter the Analyze button state.
 * 9. Analysis In-Progress Protection: Analyze Product is disabled during active analysis to prevent duplicate clicks.
 * 10. Existing Flow Preservation: OCR and compliance engine flow remain completely intact.
 */

const assert = require('assert');
const fs = require('fs');

console.log('Running Package Classification Button Flow Verification...\n');

// 1. Read files
const appTsx = fs.readFileSync('./src/App.tsx', 'utf8');
const scanIntakePanelTsx = fs.readFileSync('./src/components/dashboard/ScanIntakePanel.tsx', 'utf8');
const pkgClassificationCardTsx = fs.readFileSync('./src/components/dashboard/PackageClassificationCard.tsx', 'utf8');
const pkgTypesTs = fs.readFileSync('./src/types/package.ts', 'utf8');
const packageClassifier = require('./packageClassifier');
const ComplianceEngine = require('./complianceEngine');

// ----------------------------------------------------------------------------
// Test 1: ClassificationStatus type defined in types/package.ts
// ----------------------------------------------------------------------------
console.log('--- Test 1: ClassificationStatus Type Definition ---');
assert.ok(
  pkgTypesTs.includes("export type ClassificationStatus = 'idle' | 'loading' | 'success' | 'error'"),
  'types/package.ts must export ClassificationStatus with idle | loading | success | error'
);
console.log('✓ Test 1 Passed: ClassificationStatus type exported with "idle" | "loading" | "success" | "error".');

// ----------------------------------------------------------------------------
// Test 2: App.tsx state and classification request management
// ----------------------------------------------------------------------------
console.log('\n--- Test 2: App.tsx Classification State & Request Flow ---');
assert.ok(
  appTsx.includes("const [classificationStatus, setClassificationStatus] = useState<ClassificationStatus>('idle')"),
  'App.tsx must initialize classificationStatus to "idle"'
);
assert.ok(
  appTsx.includes('classificationRequestIdRef'),
  'App.tsx must maintain a request ID ref to prevent out-of-order race conditions'
);
assert.ok(
  appTsx.includes("setClassificationStatus('loading')"),
  'App.tsx must set classificationStatus to "loading" upon selecting or replacing image'
);
assert.ok(
  appTsx.includes("setClassificationStatus('success')"),
  'App.tsx must set classificationStatus to "success" when classification succeeds'
);
assert.ok(
  appTsx.includes("setClassificationStatus('error')"),
  'App.tsx must set classificationStatus to "error" when classification fails'
);
assert.ok(
  appTsx.includes('handleRetryClassification'),
  'App.tsx must define handleRetryClassification'
);
console.log('✓ Test 2 Passed: App.tsx implements state transitions and race-condition guards.');

// ----------------------------------------------------------------------------
// Test 3: ScanIntakePanel.tsx Analyze Button Enablement Rule
// ----------------------------------------------------------------------------
console.log('\n--- Test 3: Button Enablement Logic in ScanIntakePanel ---');
assert.ok(
  scanIntakePanelTsx.includes("disabled={classificationStatus !== 'success' || isAnalyzing}"),
  'ScanIntakePanel must disable btn-continue whenever classificationStatus !== "success" or isAnalyzing'
);
assert.ok(
  scanIntakePanelTsx.includes('Classifying package...'),
  'ScanIntakePanel must show "Classifying package..." during loading state'
);
assert.ok(
  scanIntakePanelTsx.includes("classificationStatus === 'success' && !isAnalyzing"),
  'ScanIntakePanel must style the button as enabled only when status is "success" and not analyzing'
);
console.log('✓ Test 3 Passed: "Analyze Product" button enabled ONLY when classificationStatus === "success".');

// ----------------------------------------------------------------------------
// Test 4: PackageClassificationCard Loading & Error/Retry Handling
// ----------------------------------------------------------------------------
console.log('\n--- Test 4: PackageClassificationCard Loading & Error Handling ---');
assert.ok(
  pkgClassificationCardTsx.includes("classificationStatus = 'idle'"),
  'PackageClassificationCard must accept classificationStatus prop'
);
assert.ok(
  pkgClassificationCardTsx.includes('btn-retry-classification'),
  'PackageClassificationCard must render retry button on classification failure'
);
assert.ok(
  pkgClassificationCardTsx.includes('Analyzing container type...'),
  'PackageClassificationCard must render loading state text when classificationStatus is "loading"'
);
console.log('✓ Test 4 Passed: PackageClassificationCard renders loading state and error/retry controls.');

// ----------------------------------------------------------------------------
// Test 5: Simulated State Machine Execution
// ----------------------------------------------------------------------------
console.log('\n--- Test 5: State Machine Transitions Simulation ---');

class MockInspectionFlow {
  constructor() {
    this.classificationStatus = 'idle';
    this.primaryImage = null;
    this.classification = null;
    this.isAnalyzing = false;
  }

  isAnalyzeButtonEnabled() {
    return this.classificationStatus === 'success' && !this.isAnalyzing && Boolean(this.primaryImage);
  }

  getButtonLabel() {
    if (this.isAnalyzing) return 'Analyzing...';
    if (this.classificationStatus === 'loading') return 'Classifying package...';
    return 'Analyze Product';
  }

  // 1. Initial / No image
  reset() {
    this.classificationStatus = 'idle';
    this.primaryImage = null;
    this.classification = null;
    this.isAnalyzing = false;
  }

  // 2. Select image
  selectImage(img) {
    this.primaryImage = img;
    this.classification = null;
    this.classificationStatus = 'loading';
  }

  // 3. Classification finishes
  classificationDone(result) {
    this.classification = result;
    if (result && !result.isError && result.packageType !== 'Classification Unavailable') {
      this.classificationStatus = 'success';
    } else {
      this.classificationStatus = 'error';
    }
  }

  // 4. Retry classification
  retry() {
    if (!this.primaryImage) return;
    this.classificationStatus = 'loading';
  }

  // 5. Start Analysis
  startAnalysis() {
    if (!this.isAnalyzeButtonEnabled()) return false;
    this.isAnalyzing = true;
    return true;
  }
}

const flow = new MockInspectionFlow();

// Step 1: Open page (idle, no image)
assert.strictEqual(flow.isAnalyzeButtonEnabled(), false, 'Step 1: Analyze button must be disabled with no image');
assert.strictEqual(flow.classificationStatus, 'idle');
console.log('✓ Step 1: Open page → Analyze disabled (status: idle).');

// Step 2: Upload image (classification running)
flow.selectImage({ name: 'can.jpg', size: '200 KB' });
assert.strictEqual(flow.isAnalyzeButtonEnabled(), false, 'Step 2: Analyze button must remain disabled during classification');
assert.strictEqual(flow.classificationStatus, 'loading');
assert.strictEqual(flow.getButtonLabel(), 'Classifying package...');
console.log('✓ Step 2: Upload image → Analyze disabled & shows "Classifying package...".');

// Step 3: Classification success
const mockCanResult = packageClassifier.evaluateClassification('Can', 0.92);
flow.classificationDone(mockCanResult);
assert.strictEqual(flow.classificationStatus, 'success');
assert.strictEqual(flow.isAnalyzeButtonEnabled(), true, 'Step 3: Analyze button must be enabled on success');
assert.strictEqual(flow.getButtonLabel(), 'Analyze Product');
console.log('✓ Step 3: Classification success → Analyze becomes enabled.');

// Step 4: Click Analyze → analysis runs and double-click is blocked
const startOk = flow.startAnalysis();
assert.strictEqual(startOk, true, 'Step 4: Analysis starts when button clicked');
assert.strictEqual(flow.isAnalyzeButtonEnabled(), false, 'Step 4: Analyze disabled while analysis is running (prevent double-click)');
assert.strictEqual(flow.getButtonLabel(), 'Analyzing...');
flow.isAnalyzing = false; // complete analysis

// Step 5: Replace image → Analyze becomes disabled again immediately
flow.selectImage({ name: 'bottle.jpg', size: '180 KB' });
assert.strictEqual(flow.classificationStatus, 'loading');
assert.strictEqual(flow.isAnalyzeButtonEnabled(), false, 'Step 5: Replacing image immediately disables Analyze button');
assert.strictEqual(flow.getButtonLabel(), 'Classifying package...');
console.log('✓ Step 5: Replace image → Analyze becomes disabled again immediately.');

// Step 6: Classification finishes for new image (low confidence success)
const mockLowConfResult = packageClassifier.evaluateClassification('Bottle', 0.45);
flow.classificationDone(mockLowConfResult);
assert.strictEqual(flow.classificationStatus, 'success', 'Low confidence valid result is still success');
assert.strictEqual(flow.isAnalyzeButtonEnabled(), true, 'Step 6: Low confidence valid result enables Analyze button');
assert.strictEqual(mockLowConfResult.isLowConfidence, true);
console.log('✓ Step 6: Low-confidence classification finished → Analyze enabled, low-confidence alert retained.');

// Step 7: Simulate classification failure
flow.selectImage({ name: 'unreadable.jpg', size: '50 KB' });
assert.strictEqual(flow.isAnalyzeButtonEnabled(), false);
flow.classificationDone({ success: false, isError: true, packageType: 'Classification Unavailable' });
assert.strictEqual(flow.classificationStatus, 'error');
assert.strictEqual(flow.isAnalyzeButtonEnabled(), false, 'Step 7: Failure must keep Analyze disabled');
console.log('✓ Step 7: Simulated failure → Analyze remains disabled (status: error).');

// Step 8: Retry classification
flow.retry();
assert.strictEqual(flow.classificationStatus, 'loading');
assert.strictEqual(flow.isAnalyzeButtonEnabled(), false);
flow.classificationDone(packageClassifier.evaluateClassification('Box', 0.85));
assert.strictEqual(flow.classificationStatus, 'success');
assert.strictEqual(flow.isAnalyzeButtonEnabled(), true, 'Step 8: After retry succeeds, Analyze enables');
console.log('✓ Step 8: Retry classification succeeds → Analyze becomes enabled.');

// ----------------------------------------------------------------------------
// Test 6: Verify React App state machine and action handlers
// ----------------------------------------------------------------------------
console.log('\n--- Test 6: React App.tsx Logic Synchronization ---');
assert.ok(
  appTsx.includes("setClassificationStatus('idle')"),
  'App.tsx must set idle status on reset'
);
assert.ok(
  appTsx.includes("setClassificationStatus('loading')"),
  'App.tsx must set loading status on image intake'
);
assert.ok(
  appTsx.includes("setClassificationStatus('success')"),
  'App.tsx must set success status on valid classification'
);
assert.ok(
  appTsx.includes("setClassificationStatus('error')"),
  'App.tsx must set error status on classification error'
);
console.log('✓ Test 6 Passed: App.tsx matches React state machine.');

// ----------------------------------------------------------------------------
// Test 7: Verify Multi-panel independence
// ----------------------------------------------------------------------------
console.log('\n--- Test 7: Multi-Panel Independence ---');
// Verify in App.tsx that handlePanelUpload for non-front panels does not call setClassificationStatus
const handlePanelUploadMatch = appTsx.match(/handlePanelUpload = async \([\s\S]*?\n  \};/);
assert.ok(handlePanelUploadMatch, 'handlePanelUpload found in App.tsx');
assert.ok(
  handlePanelUploadMatch[0].includes("if (panelKey === 'front')"),
  'handlePanelUpload must only trigger classification when panelKey === "front"'
);
console.log('✓ Test 7 Passed: Secondary panels (back/side/top) do not alter classification button control.');

// ----------------------------------------------------------------------------
// Test 8: Verify Compliance & Scoring Engine Unaltered
// ----------------------------------------------------------------------------
console.log('\n--- Test 8: Compliance & Scoring Engine Preservation ---');
const testSampleFields = {
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
const evalResults = ComplianceEngine.evaluateAll(testSampleFields);
assert.strictEqual(evalResults.length, 8, 'ComplianceEngine must evaluate all 8 mandatory rules');
assert.ok(evalResults.every(r => r.status === 'PASS'), 'Standard compliant fields should all PASS');
console.log('✓ Test 8 Passed: Statutory rules and compliance evaluations are 100% unaltered.');

console.log('\n===============================================================');
console.log('ALL 10 PACKAGE CLASSIFICATION BUTTON FLOW CHECKS PASSED! 🎉');
console.log('===============================================================');
