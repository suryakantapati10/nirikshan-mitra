/**
 * riskEngine.js — Deterministic Brand & Product Inspection Risk Prioritization
 *
 * Provides a transparent, explainable scoring engine to help enforcement officers
 * prioritize inspection scheduling based on historical compliance records.
 *
 * NOTE: This is an internal administrative risk-prioritization tool.
 * It is NOT an official government blacklist, legal determination, or conviction.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RiskEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RISK_DISCLAIMER = 'Internal Inspection Priority: Calculated from historical database records for inspection scheduling. Does not constitute an official legal classification or penalty.';

  /**
   * Calculates deterministic risk metrics and score from inspection & violation history.
   *
   * @param {Array<object>} inspections - Historical inspections for brand/product
   * @param {Array<object>} violations - Historical violations for brand/product
   * @param {Date|string}   [referenceDate] - Current reference date for recency decay (defaults to now)
   * @returns {object} Comprehensive risk profile with metrics, score, level, and breakdown
   */
  function calculateRiskMetrics(inspections, violations, referenceDate) {
    var inspList = Array.isArray(inspections) ? inspections : [];
    var violList = Array.isArray(violations) ? violations : [];
    var now = referenceDate ? new Date(referenceDate) : new Date();
    var nowMs = isNaN(now.getTime()) ? Date.now() : now.getTime();

    var totalInspections = inspList.length;
    var totalViolations = violList.length;

    // Case 1: No inspections recorded yet
    if (totalInspections === 0) {
      return {
        totalInspections: 0,
        totalViolations: 0,
        repeatedViolations: 0,
        repeatedRules: [],
        severityBreakdown: { CRITICAL: 0, WARNING: 0 },
        recentViolations: 0,
        metrics: {
          frequencyScore: 0,
          severityScore: 0,
          repeatScore: 0,
          recencyScore: 0
        },
        riskScore: 0,
        riskLevel: 'LOW',
        priorityLabel: 'Low Inspection Priority',
        explanation: 'No prior inspection records on file. Baseline low inspection priority.',
        disclaimer: RISK_DISCLAIMER
      };
    }

    // Case 2: Inspections exist but zero violations (clean record)
    if (totalViolations === 0) {
      return {
        totalInspections: totalInspections,
        totalViolations: 0,
        repeatedViolations: 0,
        repeatedRules: [],
        severityBreakdown: { CRITICAL: 0, WARNING: 0 },
        recentViolations: 0,
        metrics: {
          frequencyScore: 0,
          severityScore: 0,
          repeatScore: 0,
          recencyScore: 0
        },
        riskScore: 0,
        riskLevel: 'LOW',
        priorityLabel: 'Low Inspection Priority',
        explanation: 'Clean compliance record: ' + totalInspections + ' inspection(s) with zero recorded violations.',
        disclaimer: RISK_DISCLAIMER
      };
    }

    // --- 1. Violation Frequency Component (0 to 30 points) ---
    // Rate = totalViolations / totalInspections
    // Rate 0.0 -> 0 pts; Rate 1.0 -> 15 pts; Rate >= 2.0 -> 30 pts
    var rawRate = totalViolations / totalInspections;
    var frequencyScore = Math.min(30, Math.round(rawRate * 15));

    // --- 2. Severity Breakdown & Contribution (0 to 30 points) ---
    var criticalCount = 0;
    var warningCount = 0;

    violList.forEach(function (v) {
      var sev = (v.severity || '').toUpperCase();
      var type = (v.violation_type || '').toUpperCase();
      if (sev === 'CRITICAL' || type === 'FAIL') {
        criticalCount++;
      } else {
        warningCount++;
      }
    });

    // Critical = 3 pts weight, Warning = 1 pt weight
    var sevWeighted = (criticalCount * 3) + (warningCount * 1);
    var severityScore = Math.min(30, Math.round(sevWeighted * 4));

    // --- 3. Repeated Violations Contribution (0 to 25 points) ---
    // Group violations by rule_id across distinct inspection_ids
    var ruleInspections = {};
    violList.forEach(function (v) {
      var rId = v.rule_id || v.field_key || 'unknown_rule';
      var inspId = v.inspection_id || ('insp_' + Math.random());
      if (!ruleInspections[rId]) {
        ruleInspections[rId] = {};
      }
      ruleInspections[rId][inspId] = true;
    });

    var repeatedRules = [];
    var repeatedViolationsCount = 0;

    Object.keys(ruleInspections).forEach(function (rId) {
      var count = Object.keys(ruleInspections[rId]).length;
      if (count >= 2) {
        repeatedRules.push(rId);
        repeatedViolationsCount += (count - 1);
      }
    });

    // 10 pts per repeated rule violation incident, capped at 25
    var repeatScore = Math.min(25, repeatedViolationsCount * 10);

    // --- 4. Recency Contribution (0 to 15 points) ---
    // Time decay: <= 30 days = 5 pts, 31-90 days = 2.5 pts, > 90 days = 1 pt
    var recencyPoints = 0;
    var recentViolationsCount = 0; // within 90 days

    violList.forEach(function (v) {
      var dStr = v.detected_at || v.inspected_at;
      var vDate = dStr ? new Date(dStr) : new Date(0);
      var diffDays = (nowMs - vDate.getTime()) / (1000 * 60 * 60 * 24);

      if (isNaN(diffDays) || diffDays < 0) {
        diffDays = 0;
      }

      if (diffDays <= 30) {
        recencyPoints += 5.0;
        recentViolationsCount++;
      } else if (diffDays <= 90) {
        recencyPoints += 2.5;
        recentViolationsCount++;
      } else {
        recencyPoints += 1.0;
      }
    });

    var recencyScore = Math.min(15, Math.round(recencyPoints));

    // --- Total Score & Level Normalization ---
    var rawTotal = frequencyScore + severityScore + repeatScore + recencyScore;
    var riskScore = Math.min(100, Math.max(0, rawTotal));

    var riskLevel = 'LOW';
    var priorityLabel = 'Low Inspection Priority';

    if (riskScore >= 70) {
      riskLevel = 'HIGH';
      priorityLabel = 'High Inspection Priority';
    } else if (riskScore >= 35) {
      riskLevel = 'MEDIUM';
      priorityLabel = 'Medium Inspection Priority';
    }

    // Explanation construction
    var explParts = [];
    explParts.push(riskLevel + ' inspection priority (' + riskScore + '/100)');
    explParts.push(totalViolations + ' violation(s) across ' + totalInspections + ' inspection(s)');

    if (criticalCount > 0) {
      explParts.push(criticalCount + ' critical issue(s)');
    }
    if (repeatedViolationsCount > 0) {
      explParts.push(repeatedViolationsCount + ' repeated rule failure(s)');
    }
    if (recentViolationsCount > 0) {
      explParts.push(recentViolationsCount + ' recent finding(s)');
    }

    var explanation = explParts.join(' • ') + '.';

    return {
      totalInspections: totalInspections,
      totalViolations: totalViolations,
      repeatedViolations: repeatedViolationsCount,
      repeatedRules: repeatedRules,
      severityBreakdown: {
        CRITICAL: criticalCount,
        WARNING: warningCount
      },
      recentViolations: recentViolationsCount,
      metrics: {
        frequencyScore: frequencyScore,
        severityScore: severityScore,
        repeatScore: repeatScore,
        recencyScore: recencyScore
      },
      riskScore: riskScore,
      riskLevel: riskLevel,
      priorityLabel: priorityLabel,
      explanation: explanation,
      disclaimer: RISK_DISCLAIMER
    };
  }

  return {
    calculateRiskMetrics: calculateRiskMetrics,
    RISK_DISCLAIMER: RISK_DISCLAIMER
  };
}));
