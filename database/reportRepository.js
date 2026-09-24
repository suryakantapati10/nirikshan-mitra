/**
 * database/reportRepository.js — Inspection Reports Metadata Data Access
 */

const { db: defaultDb } = require('./db');

class ReportRepository {
  constructor(database = defaultDb) {
    this.db = database;
  }

  async createReport(data) {
    const now = new Date().toISOString();
    const reportReference = data.report_reference || (`REP-${data.inspection_id}-${Date.now()}`);
    const reportStatus = data.report_status || 'FINAL';
    const reportType = data.report_type || 'LEGAL_METROLOGY_COMPLIANCE';
    const generatedAt = data.generated_at || now;

    const result = await this.db.run(
      `INSERT INTO reports (
        inspection_id, report_status, report_type, report_reference, generated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.inspection_id,
        reportStatus,
        reportType,
        reportReference,
        generatedAt,
        now
      ]
    );

    return {
      id: result.lastID,
      inspection_id: data.inspection_id,
      report_status: reportStatus,
      report_type: reportType,
      report_reference: reportReference,
      generated_at: generatedAt,
      created_at: now
    };
  }

  async getReportByInspection(inspectionId) {
    return await this.db.get(
      'SELECT * FROM reports WHERE inspection_id = ? ORDER BY id DESC LIMIT 1',
      [inspectionId]
    );
  }

  async getReportByReference(reportReference) {
    return await this.db.get(
      'SELECT * FROM reports WHERE report_reference = ? ORDER BY id DESC LIMIT 1',
      [reportReference]
    );
  }

  async saveOrUpdateReport(data) {
    const existing = await this.getReportByInspection(data.inspection_id);
    const now = new Date().toISOString();
    const reportReference = data.report_reference || (existing ? existing.report_reference : `REP-${data.inspection_id}-${Date.now()}`);
    const reportStatus = data.report_status || 'FINAL';
    const reportType = data.report_type || 'LEGAL_METROLOGY_COMPLIANCE';
    const generatedAt = data.generated_at || now;

    if (existing) {
      await this.db.run(
        `UPDATE reports 
         SET report_status = ?, report_type = ?, report_reference = ?, generated_at = ?
         WHERE id = ?`,
        [reportStatus, reportType, reportReference, generatedAt, existing.id]
      );
      return {
        id: existing.id,
        inspection_id: data.inspection_id,
        report_status: reportStatus,
        report_type: reportType,
        report_reference: reportReference,
        generated_at: generatedAt,
        created_at: existing.created_at
      };
    }

    return await this.createReport({
      ...data,
      report_reference: reportReference,
      generated_at: generatedAt
    });
  }
}

module.exports = {
  ReportRepository,
  reportRepository: new ReportRepository()
};
