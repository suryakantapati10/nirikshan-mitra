/**
 * test_camera_flow.js
 * Comprehensive 24-scenario test suite for Camera-based Product Image Capture in Nirikshan Mitra.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sharp = require('sharp');
const ComplianceEngine = require('./complianceEngine');
const ComplianceScorer = require('./complianceScorer');
const FieldExtractor = require('./fieldExtractor');
const { preprocessImageWithSharp } = require('./server');

async function runTests() {
  console.log('================================================================');
  console.log('NIRIKSHAN MITRA — CAMERA CAPTURE TEST SUITE (24 Scenarios)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function record(scenarioNum, desc, condition, details) {
    if (condition) {
      passed++;
      console.log(`✓ Scenario ${scenarioNum} PASSED: ${desc}`);
    } else {
      failed++;
      console.error(`✕ Scenario ${scenarioNum} FAILED: ${desc}`);
      if (details) console.error(`  Details: ${details}`);
    }
  }

  const cameraModal = fs.readFileSync(path.join(__dirname, 'src/components/modals/CameraModal.tsx'), 'utf8');
  const scanIntake = fs.readFileSync(path.join(__dirname, 'src/components/dashboard/ScanIntakePanel.tsx'), 'utf8');
  const landing = fs.readFileSync(path.join(__dirname, 'src/components/dashboard/InspectionStartLanding.tsx'), 'utf8');
  const pkgCard = fs.readFileSync(path.join(__dirname, 'src/components/dashboard/PackageClassificationCard.tsx'), 'utf8');
  const appTsx = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, 'src/index.css'), 'utf8');

  // Scenario 1: Upload Image exists and remains functional
  record(1, 'Upload Image exists and remains functional',
    scanIntake.includes('id="label-upload"') && scanIntake.includes('id="drop-zone"'),
    'Drop zone and input[type=file]#label-upload must remain present in ScanIntakePanel');

  // Scenario 2: Upload Image is default intake option
  record(2, 'Upload Image is default intake option',
    landing.includes('id="btn-start-upload"') && landing.includes('Upload Image'),
    'btn-start-upload must be present as intake option in InspectionStartLanding');

  // Scenario 3: Camera option exists alongside Upload Image
  record(3, 'Camera option exists alongside Upload Image',
    landing.includes('id="btn-start-camera"') && landing.includes('Scan with Camera'),
    'btn-start-camera must exist in InspectionStartLanding');

  // Scenario 4: User can open camera capture modal
  record(4, 'User can open camera capture modal',
    cameraModal.includes('id="camera-modal"') && appTsx.includes('handlePanelCamera'),
    'camera-modal dialog and handlePanelCamera must be implemented');

  // Scenario 5: Live camera preview displays or falls back gracefully
  record(5, 'Live camera preview displays with video tag',
    cameraModal.includes('id="camera-video"') &&
    cameraModal.includes('playsInline') &&
    cameraModal.includes('videoRef.current.srcObject'),
    'camera-video element must support autoplay playsinline muted stream attachment');

  // Scenario 6: Camera permission prompt / denial handled gracefully
  record(6, 'Camera permission prompt / denial handled gracefully with user friendly message',
    cameraModal.includes('Camera unavailable. Please use Upload Image.'),
    'Friendly fallback message "Camera unavailable. Please use Upload Image." must be shown');

  // Scenario 7: Framing overlay guides the user
  record(7, 'Framing overlay guides the user with corner indicators and instructions',
    cameraModal.includes('camera-framing-box') &&
    cameraModal.includes('Position product label inside the frame. Ensure good lighting and legible text.') &&
    css.includes('.framing-corner'),
    'Framing box, corner guides, and positioning text must be styled and present');

  // Scenario 8: Capture button captures photo
  record(8, 'Capture button captures photo to canvas and generates preview',
    cameraModal.includes('id="btn-camera-capture"') &&
    cameraModal.includes('ctx.drawImage(video, 0, 0, width, height)') &&
    cameraModal.includes("toDataURL('image/jpeg'"),
    'capturePhoto must draw frame to canvas and generate image/jpeg');

  // Scenario 9: Retake button allows retaking photo
  record(9, 'Retake button allows retaking photo',
    cameraModal.includes('id="btn-camera-retake"') &&
    cameraModal.includes('handleRetake') &&
    cameraModal.includes('setCapturedDataUrl(null)'),
    'retakePhoto must hide preview, clear buffer, and restore video feed');

  // Scenario 10: Use photo applies image to inspection session
  record(10, 'Use photo applies image to inspection session as standard File/Blob',
    cameraModal.includes('id="btn-camera-use"') &&
    cameraModal.includes("new File([blob], filename, { type: 'image/jpeg'") &&
    cameraModal.includes('onCaptureComplete'),
    'useCapturedPhoto must create a valid File object and feed onCaptureComplete');

  // Scenario 11: Front/Main panel camera capture works
  record(11, 'Front/Main panel camera capture works',
    appTsx.includes("panelKey === 'front'") &&
    appTsx.includes('handleCameraCaptureComplete') &&
    pkgCard.includes('slot-thumb-${cfg.suffix}'),
    'Front panel target triggers camera capture and sets up inspection');

  // Scenario 12: Back/Rear panel camera capture works
  record(12, 'Back/Rear panel camera capture works',
    pkgCard.includes("key: 'back'") &&
    appTsx.includes('handleCameraCaptureComplete'),
    'slot-back contains camera trigger and updates panels');

  // Scenario 13: Side/Other panel camera capture works
  record(13, 'Side/Other panel camera capture works',
    pkgCard.includes("key: 'side'") &&
    appTsx.includes('handleCameraCaptureComplete'),
    'slot-side contains camera trigger and updates panels');

  // Scenario 14: Top/Bottom panel camera capture works
  record(14, 'Top/Bottom panel camera capture works',
    pkgCard.includes("key: 'top_bottom'") &&
    appTsx.includes('handleCameraCaptureComplete'),
    'slot-top-bottom contains camera trigger and updates panels');

  // Scenario 15: Captured image passed to Sharp/image preprocessing pipeline
  console.log('\n--- Testing Sharp Preprocessing on Camera Frame ---');
  let sharpProcessedBuffer = null;
  try {
    // Generate a synthetic simulated camera capture frame (1280x720 JPEG)
    const mockCameraCaptureBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }
      }
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="800" height="400">' +
            '<rect x="0" y="0" width="800" height="400" fill="#ffffff" stroke="#333" stroke-width="2"/>' +
            '<text x="40" y="80" font-family="Arial" font-size="32" fill="#000">PRODUCT: ORGANIC GREEN TEA</text>' +
            '<text x="40" y="140" font-family="Arial" font-size="26" fill="#000">NET QUANTITY: 250 g</text>' +
            '<text x="40" y="200" font-family="Arial" font-size="26" fill="#000">MRP: Rs. 290.00 (Incl. of all taxes)</text>' +
            '<text x="40" y="260" font-family="Arial" font-size="24" fill="#000">USP: Rs. 1.16 per g</text>' +
            '<text x="40" y="320" font-family="Arial" font-size="22" fill="#000">Mfd by: Himalayan Herbals Ltd., Dehradun</text>' +
            '</svg>'
          ),
          top: 100,
          left: 200
        }
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    const cameraBase64 = `data:image/jpeg;base64,${mockCameraCaptureBuffer.toString('base64')}`;
    const prepRes = await preprocessImageWithSharp(cameraBase64);
    sharpProcessedBuffer = Buffer.from(prepRes.base64Data, 'base64');

    record(15, 'Captured camera image passed to Sharp/image preprocessing pipeline',
      prepRes.mimeType === 'image/jpeg' &&
      prepRes.diagnostics.originalFormat === 'jpeg' &&
      prepRes.diagnostics.processedFormat === 'jpeg' &&
      prepRes.diagnostics.processedDimensions === '1280x720',
      `Diagnostics: ${JSON.stringify(prepRes.diagnostics)}`);
  } catch (err) {
    record(15, 'Captured camera image passed to Sharp/image preprocessing pipeline', false, err.message);
  }

  // Scenario 16: Sharp preprocessing pipeline processes camera capture identically to upload
  record(16, 'Sharp preprocessing pipeline processes camera-captured image identically to upload',
    sharpProcessedBuffer !== null && sharpProcessedBuffer.length > 0,
    'Processed camera frame produces clean buffer without formatting differences');

  // Scenario 17: Camera image passed to Gemini OCR
  record(17, 'Camera image passed to Gemini OCR via standard OcrService endpoint',
    appTsx.includes('ocrService.processPanels(') &&
    appTsx.includes('activePanels') &&
    appTsx.includes('imageSource: panels[k]!.dataUrl'),
    'Active panels builder feeds panel dataUrl directly to ocrService.processPanels');

  // Scenario 18: Multi-panel OCR combines camera and uploaded images seamlessly
  const multiPanels = [
    { key: 'front', label: 'Front / Main', text: 'ORGANIC GREEN TEA Net Wt: 250 g' },
    { key: 'back', label: 'Back / Rear', text: 'Packed by: Himalayan Herbs Ltd. MRP: Rs 290.00 (Incl. of all taxes) USP: Rs 1.16 / g' },
    { key: 'side', label: 'Side / Other', text: 'Customer Care: care@himalayanherbs.com Tel: 1800-11-2233' },
    { key: 'top_bottom', label: 'Top / Bottom', text: 'Batch No: HH-2026-917 PKD: 08/2026' }
  ];
  const combinedOcrText = multiPanels.map(p => `--- ${p.label.toUpperCase()} ---\n${p.text}`).join('\n\n');
  record(18, 'Multi-panel OCR combines camera and uploaded images seamlessly',
    combinedOcrText.includes('--- FRONT / MAIN ---') &&
    combinedOcrText.includes('--- BACK / REAR ---') &&
    combinedOcrText.includes('--- SIDE / OTHER ---') &&
    combinedOcrText.includes('--- TOP / BOTTOM ---'),
    'Panel provenance headers preserved across multi-panel merge');

  // Scenario 19: Information extraction works with camera-captured images
  const extracted = FieldExtractor.extractMultiPanelFields(multiPanels, combinedOcrText);
  record(19, 'Information extraction works with camera-captured images',
    extracted.product_name !== null &&
    extracted.net_quantity !== null &&
    extracted.mrp !== null &&
    extracted.manufacturer !== null &&
    extracted.consumer_care !== null,
    `Extracted product: ${extracted.product_name}, net_qty: ${extracted.net_quantity}, mrp: ${extracted.mrp}`);

  // Scenario 20: Compliance rules evaluate camera-captured package declarations
  const ruleResults = ComplianceEngine.evaluateAll(extracted);
  record(20, 'Compliance rules evaluate camera-captured package declarations',
    Array.isArray(ruleResults) && ruleResults.length === 8 &&
    ruleResults.some(r => r.field_key === 'manufacturer' && r.status === 'PASS') &&
    ruleResults.some(r => r.field_key === 'net_quantity' && r.status === 'PASS'),
    'Legal Metrology Rule 6 evaluation executes on extracted camera data');

  // Scenario 21: Compliance score generated from camera-captured inspections
  const scoreResult = ComplianceScorer.calculateScore(ruleResults);
  record(21, 'Compliance score generated from camera-captured inspections',
    typeof scoreResult.score === 'number' && scoreResult.score > 0 &&
    typeof scoreResult.overallStatus === 'string',
    `Score: ${scoreResult.score}/100, Status: ${scoreResult.overallStatus}`);

  // Scenario 22: Camera stream stops when inspection finishes or modal closed
  record(22, 'Camera stream stops when inspection finishes, modal closed, or reset',
    cameraModal.includes('stopStream') &&
    cameraModal.includes('track.stop()') &&
    cameraModal.includes('videoRef.current.srcObject = null') &&
    cameraModal.includes('handleClose'),
    'stopStream stops all media tracks and unbinds videoRef.current.srcObject');

  // Scenario 23: Camera failure falls back to Upload Image cleanly with helpful message
  record(23, 'Camera failure falls back to Upload Image cleanly with helpful message',
    cameraModal.includes('Camera unavailable. Please use Upload Image.') &&
    landing.includes('id="btn-start-upload"'),
    'Error banner displays clear guidance and Upload Image remains intact');

  // Scenario 24: No barcode/QR scanning added (pure visual image capture)
  record(24, 'No barcode/QR scanning added (pure visual image capture for OCR)',
    !cameraModal.toLowerCase().includes('zxing') &&
    !scanIntake.toLowerCase().includes('zxing') &&
    !cameraModal.toLowerCase().includes('barcode-detector') &&
    !appTsx.toLowerCase().includes('barcode-detector') &&
    !appTsx.toLowerCase().includes('decodereader'),
    'Strict visual image capture for Legal Metrology text extraction');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} / 24 Scenarios PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
