/**
 * reportGenerator.js — Automated PDF Report Generator for Nirikshan Mitra
 *
 * Uses PDFKit to generate standardized, professional Legal Metrology Inspection Reports
 * from stored SQLite inspection, field, and violation records.
 *
 * Output complies with administrative decision-support guidelines:
 * - Clear, un-hallucinated field data
 * - Statutory Legal Metrology rule citations
 * - Multi-panel evidence attribution
 * - Transparent compliance score & checklist
 * - Prominent administrative decision-support disclaimer
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const DEFAULT_REPORTS_DIR = path.join(__dirname, 'reports');

// Ensure reports output directory exists
if (!fs.existsSync(DEFAULT_REPORTS_DIR)) {
  fs.mkdirSync(DEFAULT_REPORTS_DIR, { recursive: true });
}

// Canonical Legal Metrology 10 mandatory fields display mapping
const MANDATORY_FIELD_DEFS = [
  { key: 'product_name', label: 'Product Name / Identity', ruleCitation: 'Rule 6(1)(a)' },
  { key: 'manufacturer', label: 'Manufacturer / Packer / Importer', ruleCitation: 'Rule 6(1)(a)' },
  { key: 'address', label: 'Premises / Complete Address', ruleCitation: 'Rule 6(1)(a)' },
  { key: 'net_quantity', label: 'Net Quantity (Weight / Measure / Number)', ruleCitation: 'Rule 6(1)(b) & Rule 12' },
  { key: 'mrp', label: 'Maximum Retail Price (MRP incl. of all taxes)', ruleCitation: 'Rule 6(1)(e)' },
  { key: 'manufacturing_date', label: 'Date of Manufacture / Packing / Import', ruleCitation: 'Rule 6(1)(d)' },
  { key: 'expiry_date', label: 'Expiry Date / Best Before Period', ruleCitation: 'Rule 6(1)(d) proviso' },
  { key: 'batch_code', label: 'Batch / Lot / Identification Code', ruleCitation: 'Rule 6(1)(c)' },
  { key: 'customer_care_phone', label: 'Consumer Care Helpline / Phone', ruleCitation: 'Rule 6(1)(da)' },
  { key: 'customer_care_email', label: 'Consumer Care Email / Contact', ruleCitation: 'Rule 6(1)(da)' }
];

/**
 * Sanitizes inspection ID for use in filesystem filenames
 */
function sanitizeFilename(id) {
  return String(id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Generates a unique, standardized report reference string
 */
function generateReportReference(inspectionId) {
  const id = inspectionId ? sanitizeFilename(inspectionId) : ('INSP-' + Date.now());
  return `REP-${id}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Formats ISO timestamp to human-readable date & time
 */
function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' UTC';
}

/**
 * Generates an official Legal Metrology Compliance Inspection Report PDF.
 *
 * @param {object} inspectionData - Complete inspection object from inspectionRepository
 * @param {string} [customOutputPath] - Optional path to save PDF
 * @returns {Promise<{ success: boolean, filePath: string, reportReference: string, filename: string }>}
 */
function generateInspectionPdf(inspectionData, customOutputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      if (!inspectionData || !inspectionData.inspection_id) {
        throw new Error('Invalid inspection data: inspection_id is required.');
      }

      const inspId = inspectionData.inspection_id;
      const reportRef = inspectionData.report_reference || generateReportReference(inspId);
      const safeId = sanitizeFilename(inspId);
      const filename = `report-${safeId}.pdf`;
      let outPath = path.join(DEFAULT_REPORTS_DIR, filename);
      if (customOutputPath) {
        if (typeof customOutputPath !== 'string' || customOutputPath.includes('\0')) {
          throw new Error('Invalid custom output path specified.');
        }
        outPath = path.resolve(customOutputPath);
      }

      // Create PDFKit document with A4 specifications and 40pt margins
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Inspection Report - ${inspId}`,
          Author: 'Nirikshan Mitra Legal Metrology Enforcement System',
          Subject: 'Automated Preliminary Legal Metrology Assessment Report',
          Keywords: 'Legal Metrology, PCR 2011, Compliance, Inspection, Nirikshan Mitra'
        }
      });

      const writeStream = fs.createWriteStream(outPath);
      doc.pipe(writeStream);

      // Color Palette (Govt / Regulatory Theme)
      const cNavy = '#0F2C59';
      const cBlue = '#1E3A8A';
      const cText = '#1F2937';
      const cMuted = '#4B5563';
      const cBorder = '#D1D5DB';
      const cLightBg = '#F3F4F6';
      const cPassBg = '#ECFDF3';
      const cPassText = '#027A48';
      const cReviewBg = '#FFFAEB';
      const cReviewText = '#B54708';
      const cFailBg = '#FEF3F2';
      const cFailText = '#B42318';

      // ─────────────────────────────────────────────────────────────────
      // 1. HEADER SECTION
      // ─────────────────────────────────────────────────────────────────
      // Header Banner Box
      doc.rect(40, 40, 515, 65).fill(cNavy);

      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('NIRIKSHAN MITRA', 55, 52);

      doc.font('Helvetica')
        .fontSize(9.5)
        .fillColor('#E0E7FF')
        .text('Packaged Commodity Legal Metrology Inspection Portal', 55, 71);

      doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#FFFFFF')
        .text('DECISION-SUPPORT INSPECTION REPORT', 55, 87);

      // Document Title & Reference Row
      doc.moveDown(2.5);
      doc.fillColor(cNavy)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('LEGAL METROLOGY COMPLIANCE INSPECTION REPORT', 40, 120, { align: 'center' });

      doc.fillColor(cMuted)
        .font('Helvetica-Oblique')
        .fontSize(8.5)
        .text('Generated under Legal Metrology (Packaged Commodities) Rules, 2011', 40, 137, { align: 'center' });

      // Metadata Summary Box
      const metaTop = 155;
      doc.rect(40, metaTop, 515, 48).fillAndStroke('#F8FAFC', cBorder);

      doc.fillColor(cText).font('Helvetica-Bold').fontSize(8.5);
      doc.text('Report Reference:', 50, metaTop + 8);
      doc.text('Inspection ID:', 50, metaTop + 22);
      doc.text('Report Status:', 50, metaTop + 36);

      doc.font('Helvetica').fontSize(8.5);
      doc.text(reportRef, 145, metaTop + 8);
      doc.text(inspId, 145, metaTop + 22);
      doc.text(inspectionData.report_status || 'FINAL', 145, metaTop + 36);

      doc.font('Helvetica-Bold');
      doc.text('Inspected At:', 310, metaTop + 8);
      doc.text('Generated At:', 310, metaTop + 22);
      doc.text('Rule Version:', 310, metaTop + 36);

      doc.font('Helvetica');
      doc.text(formatDate(inspectionData.inspected_at), 390, metaTop + 8);
      doc.text(formatDate(new Date().toISOString()), 390, metaTop + 22);
      doc.text(`v${inspectionData.rule_version || '1.0.0'}`, 390, metaTop + 36);

      // ─────────────────────────────────────────────────────────────────
      // 2. PRODUCT & PACKAGING SPECIFICATIONS
      // ─────────────────────────────────────────────────────────────────
      let currentY = 215;
      doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(11).text('1. Product & Packaging Specifications', 40, currentY);
      currentY += 16;

      doc.rect(40, currentY, 515, 60).fillAndStroke(cLightBg, cBorder);
      doc.fillColor(cText).font('Helvetica-Bold').fontSize(8.5);

      doc.text('Brand / Manufacturer:', 50, currentY + 8);
      doc.text('Product Name:', 50, currentY + 24);
      doc.text('Product Category:', 50, currentY + 40);

      doc.font('Helvetica');
      doc.text(inspectionData.brand_name || 'Generic / Unspecified', 165, currentY + 8, { width: 140, ellipsis: true });
      doc.text(inspectionData.product_name || 'Packaged Product', 165, currentY + 24, { width: 140, ellipsis: true });
      doc.text(inspectionData.product_category || 'General Packaged Commodity', 165, currentY + 40, { width: 140, ellipsis: true });

      doc.font('Helvetica-Bold');
      doc.text('Package Type:', 320, currentY + 8);
      doc.text('Images / Panels Inspected:', 320, currentY + 24);
      doc.text('Internal Risk Priority:', 320, currentY + 40);

      doc.font('Helvetica');
      doc.text(inspectionData.package_type || 'Other / General', 450, currentY + 8);
      doc.text(`${inspectionData.image_count || 1} panel(s)`, 450, currentY + 24);

      const riskLvl = (inspectionData.risk_level || 'LOW').toUpperCase();
      doc.font('Helvetica-Bold').fillColor(riskLvl === 'HIGH' ? cFailText : (riskLvl === 'MEDIUM' ? cReviewText : cPassText));
      doc.text(`${riskLvl} Priority`, 450, currentY + 40);

      currentY += 75;

      // ─────────────────────────────────────────────────────────────────
      // 3. OVERALL COMPLIANCE SCORE & STATUS
      // ─────────────────────────────────────────────────────────────────
      doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(11).text('2. Overall Compliance Assessment', 40, currentY);
      currentY += 16;

      const score = typeof inspectionData.overall_score === 'number' ? inspectionData.overall_score : 0;
      const status = (inspectionData.overall_status || 'PENDING').toUpperCase();

      let statusBg = cPassBg;
      let statusColor = cPassText;
      let statusLabel = 'COMPLIANT';

      if (status === 'POTENTIAL_VIOLATION' || status === 'NON_COMPLIANT' || score < 60) {
        statusBg = cFailBg;
        statusColor = cFailText;
        statusLabel = 'POTENTIAL VIOLATION DETECTED';
      } else if (status === 'NEEDS_REVIEW' || status === 'PENDING' || score < 85) {
        statusBg = cReviewBg;
        statusColor = cReviewText;
        statusLabel = 'NEEDS REVIEW / VERIFICATION';
      }

      doc.rect(40, currentY, 515, 45).fillAndStroke(statusBg, cBorder);

      // Score box left
      doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(22).text(`${score}`, 55, currentY + 10);
      doc.fontSize(9).fillColor(cMuted).text('/ 100', 95, currentY + 18);

      // Status pill right
      doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(12).text(statusLabel, 160, currentY + 12);
      doc.fillColor(cMuted).font('Helvetica').fontSize(8.5).text('Preliminary automated evaluation score under PCR 2011 rules.', 160, currentY + 28);

      currentY += 60;

      // ─────────────────────────────────────────────────────────────────
      // 4. EXTRACTED DECLARATIONS (MANDATORY FIELDS TABLE)
      // ─────────────────────────────────────────────────────────────────
      doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(11).text('3. Mandatory Declarations Verification (Field Extraction)', 40, currentY);
      currentY += 16;

      // Table Header
      doc.rect(40, currentY, 515, 18).fillAndStroke(cNavy, cNavy);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      doc.text('FIELD / DECLARATION', 46, currentY + 5);
      doc.text('LEGAL CITATION', 200, currentY + 5);
      doc.text('EXTRACTED VALUE FROM LABEL', 300, currentY + 5);
      doc.text('PANEL SOURCE', 450, currentY + 5);
      currentY += 18;

      const fields = inspectionData.fields || {};
      const sources = inspectionData.sources || {};

      MANDATORY_FIELD_DEFS.forEach((fDef, idx) => {
        const val = fields[fDef.key];
        const isPresent = val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim().toUpperCase() !== 'NULL';
        const displayVal = isPresent ? String(val) : '[NOT DETECTED / MISSING]';
        const panel = sources[fDef.key] || 'Main';

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        doc.rect(40, currentY, 515, 18).fillAndStroke(rowBg, '#E5E7EB');

        doc.fillColor(cText).font('Helvetica-Bold').fontSize(7.5);
        doc.text(fDef.label, 46, currentY + 5, { width: 148, ellipsis: true });

        doc.font('Helvetica').fontSize(7.5).fillColor(cMuted);
        doc.text(fDef.ruleCitation, 200, currentY + 5, { width: 95, ellipsis: true });

        if (isPresent) {
          doc.font('Helvetica').fillColor(cText);
          doc.text(displayVal, 300, currentY + 5, { width: 145, ellipsis: true });
        } else {
          doc.font('Helvetica-Bold').fillColor(cFailText);
          doc.text(displayVal, 300, currentY + 5, { width: 145, ellipsis: true });
        }

        doc.font('Helvetica').fillColor(cMuted);
        doc.text(panel, 450, currentY + 5, { width: 95, ellipsis: true });

        currentY += 18;
      });

      // ─────────────────────────────────────────────────────────────────
      // 5. RULE-BY-RULE COMPLIANCE CHECKLIST (PAGE 2)
      // ─────────────────────────────────────────────────────────────────
      doc.addPage();
      currentY = 40;

      doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(11).text('4. Rule-by-Rule Legal Metrology Assessment Matrix', 40, currentY);
      currentY += 16;

      const complianceResults = Array.isArray(inspectionData.compliance_results) ? inspectionData.compliance_results : [];

      if (complianceResults.length > 0) {
        // Table Header
        doc.rect(40, currentY, 515, 18).fillAndStroke(cNavy, cNavy);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        doc.text('RULE REQUIREMENT', 46, currentY + 5);
        doc.text('STATUS', 210, currentY + 5);
        doc.text('FINDING EXPLANATION & ACTION', 280, currentY + 5);
        currentY += 18;

        complianceResults.forEach((cr, idx) => {
          const ruleStatus = (cr.status || 'FAIL').toUpperCase();
          const isPass = ruleStatus === 'PASS';
          const isReview = ruleStatus === 'REVIEW';

          let statusBadgeBg = isPass ? cPassBg : (isReview ? cReviewBg : cFailBg);
          let statusBadgeColor = isPass ? cPassText : (isReview ? cReviewText : cFailText);

          const rowHeight = 32;
          const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
          doc.rect(40, currentY, 515, rowHeight).fillAndStroke(rowBg, '#E5E7EB');

          // Rule Name & Citation
          doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(7.5);
          doc.text(cr.field_name || cr.rule_name || cr.field_key, 46, currentY + 4, { width: 155 });
          doc.font('Helvetica').fontSize(6.8).fillColor(cMuted);
          doc.text(cr.source_reference || cr.rule_id, 46, currentY + 17, { width: 155, ellipsis: true });

          // Status Badge
          doc.rect(210, currentY + 6, 55, 14).fillAndStroke(statusBadgeBg, statusBadgeColor);
          doc.fillColor(statusBadgeColor).font('Helvetica-Bold').fontSize(7.5).text(ruleStatus, 212, currentY + 9, { width: 51, align: 'center' });

          // Explanation & Action
          doc.fillColor(cText).font('Helvetica').fontSize(7.2);
          doc.text(cr.explanation || 'Verification performed.', 280, currentY + 4, { width: 265, ellipsis: true });
          if (cr.suggested_action && !isPass) {
            doc.font('Helvetica-Oblique').fillColor(cFailText);
            doc.text(`Action: ${cr.suggested_action}`, 280, currentY + 16, { width: 265, ellipsis: true });
          }

          currentY += rowHeight;
        });
      } else {
        doc.rect(40, currentY, 515, 30).fillAndStroke(cLightBg, cBorder);
        doc.fillColor(cMuted).font('Helvetica-Oblique').fontSize(8.5).text('Rule checklist evaluation items are recorded in the system audit database.', 50, currentY + 10);
        currentY += 40;
      }

      currentY += 15;

      // ─────────────────────────────────────────────────────────────────
      // 6. RECORDED VIOLATIONS & NON-COMPLIANCE ISSUES
      // ─────────────────────────────────────────────────────────────────
      doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(11).text('5. Non-Compliance Findings & Advisory Notices', 40, currentY);
      currentY += 16;

      const violations = Array.isArray(inspectionData.violations) ? inspectionData.violations : [];

      if (violations.length === 0) {
        doc.rect(40, currentY, 515, 36).fillAndStroke(cPassBg, '#A7E3BE');
        doc.fillColor(cPassText).font('Helvetica-Bold').fontSize(9.5).text('✓ CLEAN INSPECTION — ZERO VIOLATIONS RECORDED', 55, currentY + 8);
        doc.font('Helvetica').fontSize(8).fillColor(cPassText).text('All mandatory declarations met preliminary threshold requirements under PCR 2011.', 55, currentY + 20);
        currentY += 48;
      } else {
        violations.forEach((v, vIdx) => {
          const isCritical = (v.severity || '').toUpperCase() === 'CRITICAL';
          const cardBg = isCritical ? '#FEF3F2' : '#FFFAEB';
          const cardBorder = isCritical ? '#FECDCA' : '#FEDF89';
          const badgeColor = isCritical ? cFailText : cReviewText;

          doc.rect(40, currentY, 515, 42).fillAndStroke(cardBg, cardBorder);

          doc.fillColor(badgeColor).font('Helvetica-Bold').fontSize(8);
          doc.text(`[${(v.severity || 'WARNING').toUpperCase()}] ${(v.rule_name || v.field_key).toUpperCase()}`, 50, currentY + 6);

          doc.font('Helvetica').fontSize(7.5).fillColor(cText);
          doc.text(v.explanation || 'Regulatory requirement not fully satisfied.', 50, currentY + 18, { width: 495 });

          if (v.suggested_action) {
            doc.font('Helvetica-Bold').fontSize(7.2).fillColor(cNavy);
            doc.text(`Recommended Action: ${v.suggested_action}`, 50, currentY + 29, { width: 495 });
          }

          currentY += 48;
        });
      }

      currentY += 10;

      // ─────────────────────────────────────────────────────────────────
      // 7. EVIDENCE & PANEL PROVENANCE
      // ─────────────────────────────────────────────────────────────────
      doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(11).text('6. Evidence & Package Panel Provenance', 40, currentY);
      currentY += 16;

      doc.rect(40, currentY, 515, 38).fillAndStroke(cLightBg, cBorder);
      doc.fillColor(cText).font('Helvetica-Bold').fontSize(8);
      doc.text('Inspected Panels:', 50, currentY + 6);
      doc.font('Helvetica').fontSize(8).fillColor(cMuted);

      const panelNames = [];
      Object.values(sources).forEach(p => {
        if (p && !panelNames.includes(p)) panelNames.push(p);
      });
      const panelSummary = panelNames.length > 0 ? panelNames.join(', ') : 'Front / Main Package Face';
      doc.text(`${panelSummary} (${inspectionData.image_count || 1} image panel(s) evaluated)`, 145, currentY + 6);

      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(cMuted);
      doc.text('Digital packaging image captures and OCR raw vectors are securely archived in the SQLite inspection record under ID: ' + inspId, 50, currentY + 20, { width: 495 });

      currentY += 50;

      // ─────────────────────────────────────────────────────────────────
      // 8. ADMINISTRATIVE NOTICE & LEGAL DISCLAIMER
      // ─────────────────────────────────────────────────────────────────
      doc.rect(40, currentY, 515, 45).fillAndStroke('#F1F5F9', '#CBD5E1');
      doc.fillColor(cNavy).font('Helvetica-Bold').fontSize(8).text('IMPORTANT ADMINISTRATIVE DECISION-SUPPORT NOTICE', 50, currentY + 6);
      doc.fillColor(cMuted).font('Helvetica').fontSize(7.2).text(
        'This automated document is a preliminary regulatory decision-support assessment generated to assist Legal Metrology enforcement officers under the Legal Metrology Act, 2009 and Packaged Commodities Rules, 2011. This assessment does not constitute an official government legal certification, commercial blacklist, statutory clearance, or final determination of guilt. Formal enforcement actions require physical verification by an authorized Legal Metrology Inspector.',
        50,
        currentY + 17,
        { width: 495, lineGap: 1 }
      );

      // ─────────────────────────────────────────────────────────────────
      // 9. PAGE NUMBERS & FOOTERS
      // ─────────────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < (range.start + range.count); i++) {
        doc.switchToPage(i);

        // Top thin rule
        doc.rect(40, 30, 515, 1).fill('#E2E8F0');

        // Bottom footer line
        doc.rect(40, 800, 515, 1).fill('#CBD5E1');

        doc.fillColor(cMuted).font('Helvetica').fontSize(7);
        doc.text('Nirikshan Mitra : Smart Inspection, Trusted Compliance', 40, 806);
        doc.text(`Page ${i + 1} of ${range.count}`, 470, 806, { width: 85, align: 'right' });
        doc.text(`Ref: ${reportRef}`, 200, 806, { width: 200, align: 'center' });
      }

      // Finalize document
      doc.end();

      writeStream.on('finish', () => {
        resolve({
          success: true,
          filePath: outPath,
          reportReference: reportRef,
          filename: filename
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  DEFAULT_REPORTS_DIR,
  MANDATORY_FIELD_DEFS,
  generateReportReference,
  generateInspectionPdf
};
