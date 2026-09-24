/**
 * database/violationRepository.js — Violations & Brand History Data Access
 */

const { db: defaultDb } = require('./db');

class ViolationRepository {
  constructor(database = defaultDb) {
    this.db = database;
  }

  async recordViolation(data) {
    const now = data.detected_at || new Date().toISOString();
    const result = await this.db.run(
      `INSERT INTO violations (
        inspection_id, brand_product_id, rule_id, field_key,
        violation_type, severity, extracted_value, explanation,
        suggested_action, detected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.inspection_id,
        data.brand_product_id || null,
        data.rule_id,
        data.field_key,
        data.violation_type || 'FAIL',
        data.severity || 'CRITICAL',
        data.extracted_value || null,
        data.explanation || '',
        data.suggested_action || '',
        now
      ]
    );

    return {
      id: result.lastID,
      ...data,
      detected_at: now
    };
  }

  async recordViolationsFromResults(inspectionId, brandProductId, evaluationResults, inspectedAt) {
    const violations = [];
    const timestamp = inspectedAt || new Date().toISOString();

    for (const res of evaluationResults || []) {
      if (res.status === 'FAIL' || res.status === 'REVIEW') {
        const severity = res.status === 'FAIL' ? 'CRITICAL' : 'WARNING';
        const v = await this.recordViolation({
          inspection_id: inspectionId,
          brand_product_id: brandProductId,
          rule_id: res.rule_id || ('rule_' + res.field_key),
          field_key: res.field_key,
          violation_type: res.status,
          severity: severity,
          extracted_value: res.extracted_value,
          explanation: res.explanation,
          suggested_action: res.suggested_action,
          detected_at: timestamp
        });
        violations.push(v);
      }
    }
    return violations;
  }

  async getViolationsByInspection(inspectionId) {
    return await this.db.all(
      `SELECT v.*, r.rule_name, r.source_reference
       FROM violations v
       LEFT JOIN rules r ON v.rule_id = r.rule_id
       WHERE v.inspection_id = ?
       ORDER BY v.id ASC`,
      [inspectionId]
    );
  }

  async getBrandViolationHistory(brandProductIdOrName) {
    let query = `
      SELECT 
        v.*,
        r.rule_name,
        r.source_reference,
        i.inspected_at,
        i.overall_score,
        bp.brand_name,
        bp.product_name
      FROM violations v
      JOIN inspections i ON v.inspection_id = i.inspection_id
      JOIN brands_products bp ON v.brand_product_id = bp.id
      JOIN rules r ON v.rule_id = r.rule_id
    `;
    let params = [];

    if (typeof brandProductIdOrName === 'number') {
      query += ' WHERE v.brand_product_id = ? ORDER BY v.detected_at DESC';
      params.push(brandProductIdOrName);
    } else {
      query += ' WHERE LOWER(bp.brand_name) = LOWER(?) OR LOWER(bp.product_name) = LOWER(?) ORDER BY v.detected_at DESC';
      params.push(brandProductIdOrName, brandProductIdOrName);
    }

    return await this.db.all(query, params);
  }
}

module.exports = {
  ViolationRepository,
  violationRepository: new ViolationRepository()
};
