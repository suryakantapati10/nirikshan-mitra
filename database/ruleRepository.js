/**
 * database/ruleRepository.js — Legal Metrology Rules Data Access
 */

const { db: defaultDb } = require('./db');

class RuleRepository {
  constructor(database = defaultDb) {
    this.db = database;
  }

  async getActiveRules() {
    const rows = await this.db.all(
      'SELECT * FROM rules WHERE active = 1 ORDER BY id ASC'
    );
    return rows.map(this._parseRule);
  }

  async getRuleById(ruleId) {
    const row = await this.db.get(
      'SELECT * FROM rules WHERE rule_id = ?',
      [ruleId]
    );
    return row ? this._parseRule(row) : null;
  }

  async getRulesByVersion(version) {
    const rows = await this.db.all(
      'SELECT * FROM rules WHERE rule_version = ? AND active = 1 ORDER BY id ASC',
      [version]
    );
    return rows.map(this._parseRule);
  }

  async getAllRules() {
    const rows = await this.db.all(
      'SELECT * FROM rules ORDER BY id ASC'
    );
    return rows.map(this._parseRule);
  }

  async updateRuleStatus(ruleId, active) {
    const activeVal = active ? 1 : 0;
    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE rules SET active = ?, updated_at = ? WHERE rule_id = ?',
      [activeVal, now, ruleId]
    );
    return this.getRuleById(ruleId);
  }

  async updateRuleMetadata(ruleId, data) {
    const existing = await this.getRuleById(ruleId);
    if (!existing) return null;

    const ruleName = data.rule_name !== undefined ? data.rule_name : existing.rule_name;
    const requirement = data.requirement !== undefined ? data.requirement : existing.requirement;
    const sourceRef = data.source_reference !== undefined ? data.source_reference : existing.source_reference;
    const now = new Date().toISOString();

    await this.db.run(
      `UPDATE rules SET rule_name = ?, requirement = ?, source_reference = ?, updated_at = ?
       WHERE rule_id = ?`,
      [ruleName, requirement, sourceRef, now, ruleId]
    );
    return this.getRuleById(ruleId);
  }

  async countRules() {
    const row = await this.db.get('SELECT COUNT(*) as count FROM rules');
    return row ? row.count : 0;
  }

  _parseRule(row) {
    return {
      ...row,
      validation_config: typeof row.validation_config === 'string'
        ? JSON.parse(row.validation_config || '{}')
        : row.validation_config,
      status_logic: typeof row.status_logic === 'string'
        ? JSON.parse(row.status_logic || '{}')
        : row.status_logic
    };
  }
}

module.exports = {
  RuleRepository,
  ruleRepository: new RuleRepository()
};
