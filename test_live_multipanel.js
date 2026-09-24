const fs = require('fs');
const OcrService = require('./ocrService');
const FieldExtractor = require('./fieldExtractor');
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');

async function testLiveMultiPanel() {
  console.log('Testing live multi-panel OCR and combined compliance flow with 2 real images...');

  const img1Buffer = fs.readFileSync('./sample_labels/label1_fortune_oil.jpg');
  const img2Buffer = fs.readFileSync('./sample_labels/label2_good_day_cookies.jpg');

  const panels = [
    { key: 'front', label: 'Front / Main', imageSource: img1Buffer, name: 'label1_fortune_oil.jpg' },
    { key: 'back', label: 'Back / Rear', imageSource: img2Buffer, name: 'label2_good_day_cookies.jpg' }
  ];

  const ocrResult = await OcrService.processPanels(panels, (stage, pct, msg) => {
    console.log(`[Progress] ${stage} (${pct}%): ${msg}`);
  });

  console.log('\nOCR Result Success:', ocrResult.success);
  console.log('Total Panels:', ocrResult.panels.length);
  console.log('Successful Panels:', ocrResult.successfulPanels.length);
  console.log('Diagnostics:', ocrResult.diagnostics);

  console.log('\nExtracting multi-panel fields...');
  const fields = FieldExtractor.extractMultiPanelFields(ocrResult.panels, ocrResult.text);
  console.log('Extracted Product Name:', fields.product_name);
  console.log('Extracted Manufacturer:', fields.manufacturer);
  console.log('Extracted Net Quantity:', fields.net_quantity);
  console.log('Extracted MRP:', fields.mrp);
  console.log('Extracted Mfg Date:', fields.manufacturing_date);
  console.log('Extracted Expiry:', fields.expiry_date);
  console.log('Field Sources:', fields._sources);

  console.log('\nEvaluating Compliance...');
  const complianceResults = ComplianceEngine.evaluateAll(fields);
  const scoreResult = ComplianceScorer.calculateScore(complianceResults);

  console.log('Compliance Score:', scoreResult.score);
  console.log('Compliance Status:', scoreResult.overallStatus);
  console.log('Passed Checks:', scoreResult.passed, '/', scoreResult.totalChecks);

  console.log('\n✓ Live end-to-end multi-panel inspection completed successfully!');
}

testLiveMultiPanel().catch(console.error);
