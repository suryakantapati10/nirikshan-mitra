const { db: defaultDb } = require('./db');
const RiskEngine = require('../riskEngine');

class InspectionRepository {
  constructor(database = defaultDb) {
    this.db = database;
  }


  async createInspection(data) {
    const inspectionId = data.inspection_id || ('INS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    const brandProductId = data.brand_product_id || null;
    const userId = data.user_id !== undefined ? data.user_id : null;
    const inspectedAt = data.inspected_at || new Date().toISOString();
    const overallScore = typeof data.overall_score === 'number' ? data.overall_score : 0;
    const overallStatus = data.overall_status || 'PENDING';
    const ruleVersion = data.rule_version || '1.0.0';
    const imageCount = data.image_count || 1;
    const createdAt = new Date().toISOString();

    const result = await this.db.run(
      `INSERT INTO inspections (
        inspection_id, brand_product_id, user_id, inspected_at, overall_score,
        overall_status, rule_version, image_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inspectionId, brandProductId, userId, inspectedAt, overallScore,
        overallStatus, ruleVersion, imageCount, createdAt
      ]
    );

    return {
      id: result.lastID,
      inspection_id: inspectionId,
      brand_product_id: brandProductId,
      user_id: userId,
      inspected_at: inspectedAt,
      overall_score: overallScore,
      overall_status: overallStatus,
      rule_version: ruleVersion,
      image_count: imageCount,
      created_at: createdAt
    };
  }

  async saveFields(inspectionId, fields, sources = {}) {
    const now = new Date().toISOString();
    const entries = Object.entries(fields || {});

    for (const [key, value] of entries) {
      if (key.startsWith('_')) continue; // Skip internal metadata properties
      const sourcePanel = sources[key] || 'Main';
      await this.db.run(
        `INSERT INTO inspection_fields (inspection_id, field_key, field_value, source_panel, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [inspectionId, key, value !== null && value !== undefined ? String(value) : null, sourcePanel, now]
      );
    }
  }

  async getInspectionById(inspectionId) {
    const query = `
      SELECT 
        i.*,
        bp.brand_name,
        bp.product_name,
        bp.product_category,
        bp.package_type,
        r.report_reference,
        r.report_status,
        u.name as inspector_name,
        u.email as inspector_email,
        u.role as inspector_role
      FROM inspections i
      LEFT JOIN brands_products bp ON i.brand_product_id = bp.id
      LEFT JOIN reports r ON i.inspection_id = r.inspection_id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.inspection_id = ?
    `;
    const inspection = await this.db.get(query, [inspectionId]);
    if (!inspection) return null;

    // Load extracted fields
    const fieldsRows = await this.db.all(
      'SELECT field_key, field_value, source_panel FROM inspection_fields WHERE inspection_id = ?',
      [inspectionId]
    );
    const fields = {};
    const sources = {};
    fieldsRows.forEach(row => {
      fields[row.field_key] = row.field_value;
      if (row.source_panel) {
        sources[row.field_key] = row.source_panel;
      }
    });

    // Load recorded violations
    const violations = await this.db.all(
      'SELECT * FROM violations WHERE inspection_id = ? ORDER BY id ASC',
      [inspectionId]
    );

    return {
      ...inspection,
      fields,
      sources,
      violations
    };
  }

  async getAllInspections(limit = 50) {
    const query = `
      SELECT 
        i.id,
        i.inspection_id,
        i.brand_product_id,
        i.user_id,
        i.inspected_at,
        i.overall_score,
        i.overall_status,
        i.rule_version,
        i.image_count,
        bp.brand_name,
        bp.product_name,
        bp.product_category,
        bp.package_type,
        u.name as inspector_name,
        u.email as inspector_email,
        COUNT(v.id) AS violation_count
      FROM inspections i
      LEFT JOIN brands_products bp ON i.brand_product_id = bp.id
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN violations v ON i.inspection_id = v.inspection_id
      GROUP BY i.id
      ORDER BY i.inspected_at DESC, i.id DESC
      LIMIT ?
    `;
    const rows = await this.db.all(query, [limit]);
    if (!rows || rows.length === 0) return [];

    // Collect all unique brand_product_ids
    const bpIds = Array.from(new Set(rows.map(r => r.brand_product_id).filter(id => id !== null && id !== undefined)));

    // Pre-calculate risk profiles for these brand products
    const riskMap = {};
    if (bpIds.length > 0) {
      const placeholders = bpIds.map(() => '?').join(',');
      const allInsp = await this.db.all(
        `SELECT * FROM inspections WHERE brand_product_id IN (${placeholders})`,
        bpIds
      );
      const allViol = await this.db.all(
        `SELECT * FROM violations WHERE brand_product_id IN (${placeholders})`,
        bpIds
      );

      bpIds.forEach(bId => {
        const bInspections = allInsp.filter(x => x.brand_product_id === bId);
        const bViolations = allViol.filter(x => x.brand_product_id === bId);
        riskMap[bId] = RiskEngine.calculateRiskMetrics(bInspections, bViolations);
      });
    }

    return rows.map(r => {
      const risk = (r.brand_product_id && riskMap[r.brand_product_id]) || {
        riskScore: 0,
        riskLevel: 'LOW',
        priorityLabel: 'Low Inspection Priority'
      };
      return {
        ...r,
        risk_score: risk.riskScore,
        risk_level: risk.riskLevel,
        priority_label: risk.priorityLabel
      };
    });
  }

  async getStats() {
    const totalRow = await this.db.get('SELECT COUNT(*) as total FROM inspections');
    const compliantRow = await this.db.get("SELECT COUNT(*) as count FROM inspections WHERE overall_status = 'COMPLIANT'");
    const noncompliantRow = await this.db.get("SELECT COUNT(*) as count FROM inspections WHERE overall_status = 'POTENTIAL_VIOLATION' OR overall_status = 'NON_COMPLIANT'");
    const reviewRow = await this.db.get("SELECT COUNT(*) as count FROM inspections WHERE overall_status = 'NEEDS_REVIEW' OR overall_status = 'PENDING'");

    return {
      total: totalRow ? totalRow.total : 0,
      compliant: compliantRow ? compliantRow.count : 0,
      noncompliant: noncompliantRow ? noncompliantRow.count : 0,
      pending: reviewRow ? reviewRow.count : 0
    };
  }
}

module.exports = {
  InspectionRepository,
  inspectionRepository: new InspectionRepository()
};
