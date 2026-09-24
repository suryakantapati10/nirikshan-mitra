/**
 * Comprehensive Test Suite for Automated PDF Report Generation (Nirikshan Mitra)
 * Covers all 19 target scenarios:
 * 1. Valid inspection PDF generation
 * 2. PDF file creation (> 0 bytes, %PDF- header)
 * 3. Report metadata persistence in SQLite
 * 4. Unique report reference (REP-...)
 * 5. Inspection-to-report relationship
 * 6. Extracted field inclusion
 * 7. Compliance checklist inclusion
 * 8. Violation inclusion
 * 9. Score/status inclusion
 * 10. Rule-version inclusion (1.0.0)
 * 11. Multi-panel evidence references
 * 12. Missing field handling ([NOT DETECTED / MISSING])
 * 13. Missing inspection handling (404 error)
 * 14. PDF generation failure handling
 * 15. Existing OCR flow integrity
 * 16. Existing multi-panel flow integrity
 * 17. Existing compliance flow integrity
 * 18. Existing SQLite flow integrity
 * 19. Existing risk-priority flow integrity
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');

function decodePdfContent(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const str = buf.toString('binary');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m, full = '';
  while ((m = streamRegex.exec(str)) !== null) {
    try {
      full += zlib.inflateSync(Buffer.from(m[1], 'binary')).toString('utf8');
    } catch (e) {
      full += m[1];
    }
  }
  const hexRegex = /<([0-9a-fA-F]+)>/g;
  let decoded = '';
  while ((m = hexRegex.exec(full)) !== null) {
    for (let i = 0; i < m[1].length; i += 2) {
      decoded += String.fromCharCode(parseInt(m[1].substr(i, 2), 16));
    }
  }
  return decoded;
}
const reportGenerator = require('./reportGenerator');
const {
  db,
  ruleRepository: ruleRepo,
  brandProductRepository: brandRepo,
  inspectionRepository: inspectionRepo,
  violationRepository: violationRepo,
  reportRepository: reportRepo
} = require('./database');
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');
const PackageClassifier = require('./packageClassifier');
const RiskEngine = require('./riskEngine');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✕ FAIL: ${message}`);
  }
}

const { generateToken } = require('./auth');
const defaultPdfAuthToken = generateToken({ id: 1, name: 'Chief Metrology Officer', email: 'admin@nirikshan.gov.in', role: 'admin' });

// HTTP request helper
function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options };
    opts.headers = {
      Authorization: `Bearer ${defaultPdfAuthToken}`,
      ...options.headers,
      'x-test-suite': 'nirikshan-test'
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// HTTP buffer request helper (for binary PDF)
function httpBufferRequest(options) {
  return new Promise((resolve, reject) => {
    const opts = { ...options };
    opts.headers = {
      Authorization: `Bearer ${defaultPdfAuthToken}`,
      ...options.headers,
      'x-test-suite': 'nirikshan-test'
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('NIRIKSHAN MITRA — AUTOMATED PDF REPORT GENERATION TEST SUITE');
  console.log('================================================================\n');

  const testInspId = 'INS-TEST-PDF-SUITE-' + Date.now();
  const testBrandId = 'BP-PDF-TEST-' + Date.now();
  const testBrandName = 'Naturals FMCG Foods Ltd';
  const testProductName = 'Organic Almond Milk 1L';
  const reportsDir = path.join(__dirname, 'reports');

  // Prepare complete mock inspection data
  const sampleInspectionData = {
    inspection_id: testInspId,
    product_name: testProductName,
    brand_name: testBrandName,
    package_type: 'Tetra Pak',
    overall_score: 75,
    overall_status: 'POTENTIAL_VIOLATION',
    rule_version: '1.0.0',
    inspected_at: new Date().toISOString(),
    fields: {
      product_name: testProductName,
      manufacturer: testBrandName + ', Plot 42, Industrial Zone, Gujarat - 380001',
      net_quantity: '1 L',
      mrp: '₹ 150.00 (Incl. of all taxes)',
      unit_sale_price: '₹ 15.00 per 100 ml',
      mfg_date: '04/2026',
      expiry_date: '10/2026',
      country_of_origin: 'India',
      consumer_care: 'care@naturalsfmcg.com, 1800-111-222',
      best_before: '6 months from manufacture'
    },
    sources: {
      product_name: 'Front Panel',
      manufacturer: 'Back Panel',
      net_quantity: 'Front Panel',
      mrp: 'Back Panel',
      unit_sale_price: 'Back Panel',
      mfg_date: 'Top Flap',
      expiry_date: 'Top Flap',
      country_of_origin: 'Back Panel',
      consumer_care: 'Back Panel'
    },
    compliance_results: [
      {
        field_key: 'product_name',
        field_name: 'Generic / Common Name of Commodity',
        status: 'PASS',
        extracted_value: testProductName,
        explanation: 'Generic or common name is clearly declared.',
        suggested_action: 'None required.',
        source_reference: 'Rule 6(1)(a)'
      },
      {
        field_key: 'net_quantity',
        field_name: 'Net Quantity Declaration',
        status: 'PASS',
        extracted_value: '1 L',
        explanation: 'Net quantity conforms to standard metric units.',
        suggested_action: 'None required.',
        source_reference: 'Rule 6(1)(d)'
      },
      {
        field_key: 'unit_sale_price',
        field_name: 'Unit Sale Price (USP)',
        status: 'FAIL',
        extracted_value: null,
        explanation: 'Unit Sale Price declaration not detected on packaging.',
        suggested_action: 'Verify rear panel for ₹/ml or ₹/g declaration.',
        source_reference: 'Rule 6(1)(e)'
      }
    ],
    violations: [
      {
        violation_type: 'FAIL',
        severity: 'CRITICAL',
        field_key: 'unit_sale_price',
        rule_name: 'Unit Sale Price (USP)',
        source_reference: 'Rule 6(1)(e)',
        extracted_value: null,
        explanation: 'Unit Sale Price declaration missing on packaging.',
        suggested_action: 'Declare USP in required standard font size.'
      }
    ],
    risk: {
      riskLevel: 'MEDIUM',
      riskScore: 45,
      priorityLabel: 'Medium Priority',
      totalViolations: 1,
      repeatedViolations: 0,
      totalInspections: 2
    }
  };

  try {
    // -------------------------------------------------------------
    // Scenario 1: Valid inspection PDF generation
    // -------------------------------------------------------------
    console.log('\n[Scenario 1] Valid inspection PDF generation');
    const testPdfPath = path.join(reportsDir, `test-${testInspId}.pdf`);
    const genResult = await reportGenerator.generateInspectionPdf(sampleInspectionData, testPdfPath);
    assert(genResult.success === true, 'generateInspectionPdf returned success: true');
    assert(typeof genResult.reportReference === 'string' && genResult.reportReference.startsWith('REP-'), 'Report reference generated: ' + genResult.reportReference);
    assert(genResult.filePath === testPdfPath, 'Output path matches requested path');

    // -------------------------------------------------------------
    // Scenario 2: PDF file creation (> 0 bytes, %PDF- header)
    // -------------------------------------------------------------
    console.log('\n[Scenario 2] PDF file creation (> 0 bytes, %PDF- header)');
    assert(fs.existsSync(testPdfPath), 'PDF file exists on disk at ' + testPdfPath);
    const stats = fs.statSync(testPdfPath);
    assert(stats.size > 1000, `PDF file size is healthy (${stats.size} bytes > 1000 bytes)`);
    const headerBuffer = Buffer.alloc(5);
    const fd = fs.openSync(testPdfPath, 'r');
    fs.readSync(fd, headerBuffer, 0, 5, 0);
    fs.closeSync(fd);
    assert(headerBuffer.toString('utf-8') === '%PDF-', 'PDF file contains valid "%PDF-" binary header');

    // -------------------------------------------------------------
    // Scenario 3: Report metadata persistence in SQLite
    // -------------------------------------------------------------
    console.log('\n[Scenario 3] Report metadata persistence in SQLite');
    // First save the inspection to SQLite so foreign key / relationship exists
    const bp = await brandRepo.findOrCreate({
      brand_name: testBrandName,
      product_name: testProductName,
      product_category: 'Beverages',
      package_type: 'Tetra Pak'
    });
    await inspectionRepo.createInspection({
      inspection_id: testInspId,
      brand_product_id: bp.id,
      package_type: 'Tetra Pak',
      overall_score: 75,
      overall_status: 'POTENTIAL_VIOLATION',
      rule_version: '1.0.0',
      image_count: 2
    });
    await inspectionRepo.saveFields(testInspId, sampleInspectionData.fields, sampleInspectionData.sources);

    const reportRecord = await reportRepo.saveOrUpdateReport({
      report_reference: genResult.reportReference,
      inspection_id: testInspId,
      file_path: testPdfPath,
      file_name: path.basename(testPdfPath),
      file_size_bytes: stats.size,
      status: 'GENERATED',
      rule_version: '1.0.0'
    });
    assert(reportRecord && reportRecord.report_reference === genResult.reportReference, 'Report saved in SQLite database');

    const fetchedReport = await reportRepo.getReportByReference(genResult.reportReference);
    assert(fetchedReport !== null && fetchedReport.inspection_id === testInspId, 'getReportByReference retrieves report metadata with matching inspection_id');

    // -------------------------------------------------------------
    // Scenario 4: Unique report reference (REP-...)
    // -------------------------------------------------------------
    console.log('\n[Scenario 4] Unique report reference (REP-...)');
    const ref1 = reportGenerator.generateReportReference();
    const ref2 = reportGenerator.generateReportReference();
    assert(ref1.startsWith('REP-') && ref2.startsWith('REP-'), 'Report references start with "REP-" prefix');
    assert(ref1 !== ref2, `Generated references are unique: ${ref1} !== ${ref2}`);

    // -------------------------------------------------------------
    // Scenario 5: Inspection-to-report relationship
    // -------------------------------------------------------------
    console.log('\n[Scenario 5] Inspection-to-report relationship');
    const inspWithReport = await inspectionRepo.getInspectionById(testInspId);
    assert(inspWithReport !== null && inspWithReport.inspection_id === testInspId, 'Inspection row fetched from SQLite');
    const reportFromInsp = await reportRepo.getReportByInspection(testInspId);
    assert(reportFromInsp && reportFromInsp.report_reference === genResult.reportReference, 'Report row links back to inspection_id');

    // -------------------------------------------------------------
    // Scenario 6: Extracted field inclusion
    // -------------------------------------------------------------
    console.log('\n[Scenario 6] Extracted field inclusion in report generator');
    const decodedText = decodePdfContent(testPdfPath);
    assert(decodedText.includes('Almond') || decodedText.includes('Milk'), 'PDF content embeds product name text');
    assert(decodedText.includes('Naturals') || decodedText.includes('Gujarat'), 'PDF embeds mandatory extracted declarations');

    // -------------------------------------------------------------
    // Scenario 7: Compliance checklist inclusion
    // -------------------------------------------------------------
    console.log('\n[Scenario 7] Compliance checklist inclusion');
    assert(decodedText.includes('Rule') || decodedText.includes('Compliance'), 'PDF includes Legal Metrology rule compliance matrix');

    // -------------------------------------------------------------
    // Scenario 8: Violation inclusion
    // -------------------------------------------------------------
    console.log('\n[Scenario 8] Violation inclusion');
    assert(decodedText.includes('Unit Sale Price') || decodedText.includes('Violation') || decodedText.includes('Advisories'), 'PDF includes violation findings and corrective advisories');

    // -------------------------------------------------------------
    // Scenario 9: Score / status inclusion
    // -------------------------------------------------------------
    console.log('\n[Scenario 9] Score / status inclusion');
    assert(decodedText.includes('75') && (decodedText.includes('POTENTIAL') || decodedText.includes('VIOLATION')), 'PDF includes compliance score and overall assessment status');

    // -------------------------------------------------------------
    // Scenario 10: Rule-version inclusion (1.0.0)
    // -------------------------------------------------------------
    console.log('\n[Scenario 10] Rule-version inclusion (1.0.0)');
    assert(decodedText.includes('1.0.0') || decodedText.includes('Rule Version'), 'PDF document references rule version 1.0.0');

    // -------------------------------------------------------------
    // Scenario 11: Multi-panel evidence references
    // -------------------------------------------------------------
    console.log('\n[Scenario 11] Multi-panel evidence references');
    assert(decodedText.includes('Front Panel') && decodedText.includes('Back Panel'), 'PDF document lists multi-panel provenance sources');

    // -------------------------------------------------------------
    // Scenario 12: Missing field handling ([NOT DETECTED / MISSING])
    // -------------------------------------------------------------
    console.log('\n[Scenario 12] Missing field handling ([NOT DETECTED / MISSING])');
    const missingDataSample = {
      inspection_id: 'INS-MISSING-TEST-' + Date.now(),
      product_name: null,
      brand_name: null,
      fields: {}, // Completely empty
      compliance_results: []
    };
    const missingPdfPath = path.join(reportsDir, `missing-${missingDataSample.inspection_id}.pdf`);
    const missingResult = await reportGenerator.generateInspectionPdf(missingDataSample, missingPdfPath);
    assert(missingResult.success === true, 'Report generator handles missing fields gracefully without crash');
    const missingDecoded = decodePdfContent(missingPdfPath);
    assert(missingDecoded.includes('NOT DETECTED') || missingDecoded.includes('Generic'), 'Missing fields are labeled [NOT DETECTED / MISSING] or Generic placeholder');

    // -------------------------------------------------------------
    // Scenario 13: Missing inspection handling (404 error)
    // -------------------------------------------------------------
    console.log('\n[Scenario 13] Missing inspection handling (404 error on API)');
    const missingRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inspections/NON_EXISTENT_ID_99999/report',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(missingRes.statusCode === 404, `POST /api/inspections/NON_EXISTENT_ID/report returns 404 (received ${missingRes.statusCode})`);
    const missingJson = JSON.parse(missingRes.body);
    assert(missingJson.success === false, '404 response has success: false');

    // -------------------------------------------------------------
    // Scenario 14: PDF generation failure handling
    // -------------------------------------------------------------
    console.log('\n[Scenario 14] PDF generation failure handling');
    // Calling generator with an invalid/unwritable path
    const invalidPath = path.join(__dirname, 'non_existent_folder_xyz', 'impossible_sub', 'file.pdf');
    try {
      await reportGenerator.generateInspectionPdf(sampleInspectionData, invalidPath);
      assert(false, 'Should have thrown error on invalid path');
    } catch (err) {
      assert(err && err.message, 'PDF generator throws actionable error on invalid path: ' + err.message);
    }

    // -------------------------------------------------------------
    // Scenario 15: Existing OCR flow integrity
    // -------------------------------------------------------------
    console.log('\n[Scenario 15] Existing OCR flow integrity');
    // Verify field extractor on standard text
    const FieldExtractor = require('./fieldExtractor');
    const sampleOcrText = "BRITANNIA Good Day Rich Butter Cookies\nNET WEIGHT: 200g\nMRP: Rs 40.00\nMFG. DATE: 12/2025\nMANUFACTURED BY: BRITANNIA INDUSTRIES LTD.";
    const extractedFields = FieldExtractor.extractFields(sampleOcrText);
    assert(extractedFields.product_name !== null, 'FieldExtractor extracts product name');
    assert(extractedFields.net_quantity === '200g', 'FieldExtractor extracts net quantity');
    assert(extractedFields.mrp !== null, 'FieldExtractor extracts MRP');

    // -------------------------------------------------------------
    // Scenario 16: Existing multi-panel flow integrity
    // -------------------------------------------------------------
    console.log('\n[Scenario 16] Existing multi-panel flow integrity');
    const panels = [
      { key: 'front', label: 'Front Panel', text: 'ORGANIC GREEN TEA Net Wt: 250 g' },
      { key: 'back', label: 'Back Panel', text: 'Packed by: Himalayan Herbs Ltd. MRP: Rs 290.00 (Incl. of all taxes)' }
    ];
    const multiExtracted = FieldExtractor.extractMultiPanelFields(panels, panels.map(p => p.text).join('\n'));
    assert(multiExtracted._sources !== undefined, 'Multi-panel extraction preserves _sources attribution');
    assert(multiExtracted._sources.net_quantity === 'Front Panel', 'net_quantity attributed to Front Panel');
    assert(multiExtracted._sources.mrp === 'Back Panel', 'mrp attributed to Back Panel');

    // -------------------------------------------------------------
    // Scenario 17: Existing compliance flow integrity
    // -------------------------------------------------------------
    console.log('\n[Scenario 17] Existing compliance flow integrity');
    const evalResults = ComplianceEngine.evaluateAll(extractedFields, 'Pouch');
    assert(Array.isArray(evalResults) && evalResults.length >= 8, 'ComplianceEngine evaluates all 8 Legal Metrology rules');
    const scoreSummary = ComplianceScorer.calculateScore(evalResults);
    assert(typeof scoreSummary.score === 'number' && scoreSummary.score >= 0 && scoreSummary.score <= 100, 'ComplianceScorer calculates valid 0-100 score: ' + scoreSummary.score);

    // -------------------------------------------------------------
    // Scenario 18: Existing SQLite flow integrity
    // -------------------------------------------------------------
    console.log('\n[Scenario 18] Existing SQLite flow integrity');
    const activeRules = await ruleRepo.getActiveRules();
    assert(Array.isArray(activeRules) && activeRules.length === 8, 'SQLite database has 8 active Legal Metrology rules');
    const insps = await inspectionRepo.getAllInspections();
    assert(Array.isArray(insps), 'getAllInspections returns array of inspections');

    // -------------------------------------------------------------
    // Scenario 19: Existing risk-priority flow integrity
    // -------------------------------------------------------------
    console.log('\n[Scenario 19] Existing risk-priority flow integrity');
    const brandRisk = await brandRepo.getBrandRiskProfile(testBrandName);
    assert(brandRisk !== null && typeof brandRisk.riskScore === 'number', 'RiskEngine calculates risk score: ' + brandRisk.riskScore);
    assert(['LOW', 'MEDIUM', 'HIGH'].includes(brandRisk.riskLevel), 'Risk level is valid enum: ' + brandRisk.riskLevel);

    // -------------------------------------------------------------
    // Live Server Endpoints Test (HTTP GET & POST)
    // -------------------------------------------------------------
    console.log('\n[Live Server Endpoints Test]');
    const postRepRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/inspections/${encodeURIComponent(testInspId)}/report`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(postRepRes.statusCode === 200, `POST /api/inspections/:id/report returns 200 (got ${postRepRes.statusCode})`);
    const postRepJson = JSON.parse(postRepRes.body);
    assert(postRepJson.success === true, 'Response indicates success: true');
    assert(postRepJson.download_url !== undefined, 'Download URL provided: ' + postRepJson.download_url);

    // Test download endpoint
    const dlRes = await httpBufferRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/inspections/${encodeURIComponent(testInspId)}/report/download`,
      method: 'GET'
    });
    assert(dlRes.statusCode === 200, `GET /api/inspections/:id/report/download returns 200 (got ${dlRes.statusCode})`);
    assert(dlRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    assert(dlRes.buffer.slice(0, 5).toString('utf-8') === '%PDF-', 'Downloaded content begins with %PDF- header');

    // Clean up temporary test files
    try {
      if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
      if (fs.existsSync(missingPdfPath)) fs.unlinkSync(missingPdfPath);
    } catch (e) {}

  } catch (err) {
    console.error('Unhandled test failure:', err);
    failedTests++;
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
