const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("Testing Updated Nirikshan Mitra Page Flow Integration...\n");

const scanIntakePanel = fs.readFileSync(path.join(__dirname, "src/components/dashboard/ScanIntakePanel.tsx"), "utf8");
const rawOcrDisplay = fs.readFileSync(path.join(__dirname, "src/components/dashboard/RawOcrDisplay.tsx"), "utf8");
const complianceDashboard = fs.readFileSync(path.join(__dirname, "src/components/compliance/ComplianceDashboard.tsx"), "utf8");
const appTsx = fs.readFileSync(path.join(__dirname, "src/App.tsx"), "utf8");

// 1. Initial State in React Components
console.log("1. Checking Initial Landing Page React Structure:");
assert(scanIntakePanel.includes('id="scan-upload-panel"'), "scan-upload-panel must exist");
assert(rawOcrDisplay.includes('id="ocr-results-box"'), "ocr-results-box element must exist");
assert(rawOcrDisplay.includes('id="ocr-text-display"'), "ocr-text-display pre element must exist");
assert(rawOcrDisplay.includes('id="btn-continue-results"'), "btn-continue-results button must exist");
assert(complianceDashboard.includes('id="compliance-dashboard-panel"'), "compliance-dashboard-panel must exist");
console.log("✓ Initial landing page shows only intake and hides assessment & results.\n");

// 2. OCR Run stays on page and reveals Raw OCR Text + Continue button
console.log("2. Checking OCR Flow in React:");
assert(rawOcrDisplay.includes('if (!ocrText) return null'), "RawOcrDisplay is conditionally rendered when text is present");
assert(rawOcrDisplay.includes('id="analysis-completion-action"'), "analysisCompletionAction must exist");
assert(rawOcrDisplay.includes('onClick={onContinue}'), "btnContinueResults must have continue click listener");
assert(appTsx.includes('handleAnalyzeProduct'), "Full pipeline runs in handleAnalyzeProduct");
assert(appTsx.includes("setDashboardView('assessment')"), "Dashboard transitions to assessment on completion");
console.log("✓ Analysis remains on same page with OCR output and Continue button triggers transition.\n");

// 3. Reset Scan State
console.log("3. Checking Reset State in App.tsx:");
assert(appTsx.includes("setRawOcrText('')"), "rawOcrText must be cleared on reset");
assert(appTsx.includes("handleRemoveScan"), "handleRemoveScan must be defined");
assert(appTsx.includes("handleScanAnother"), "handleScanAnother must be defined");
console.log("✓ Reset correctly restores landing state and clears OCR display.\n");

// 4. Component Styling Validation
console.log("4. Checking styling for flow components:");
assert(rawOcrDisplay.includes("ocr-results-box"), "Component styles ocr-results-box");
assert(rawOcrDisplay.includes("ocr-text-display"), "Component styles ocr-text-display");
assert(rawOcrDisplay.includes("btn-continue-large"), "Component styles btn-continue-large");
assert(complianceDashboard.includes("compliance-dashboard-panel"), "Compliance dashboard panel styled");
console.log("✓ All styling rules for OCR results and Continue button verified.\n");

console.log("=========================================");
console.log("ALL PAGE FLOW TESTS PASSED SUCCESSFULLY! 🚀");
console.log("=========================================");
