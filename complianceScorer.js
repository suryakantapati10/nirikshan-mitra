/**
 * complianceScorer.js — Nirikshan Mitra Transparent Compliance Scoring Engine
 *
 * Calculates a transparent, normalized compliance score (0–100) and overall status
 * from the compliance evaluation results produced by the rule engine.
 *
 * Scoring Model (Configurable MVP):
 * - PASS: full points (1.0)
 * - REVIEW: 50% points (0.5)
 * - FAIL: 0 points (0.0)
 * - N/A: excluded from the calculation (does not affect denominator)
 *
 * Normalization:
 *   Normalized Score = Math.round((pointsEarned / maxPossiblePoints) * 100)
 *   Clamped to 0–100 range.
 *
 * Overall Status:
 * - 85–100       → COMPLIANT
 * - 60–84        → NEEDS REVIEW
 * - Below 60     → POTENTIAL VIOLATION
 *
 * Legal Disclaimer:
 * "Preliminary automated assessment under Legal Metrology (Packaged Commodities) Rules, 2011.
 * This algorithmic score does not constitute official government or legal certification."
 *
 * Modular Architecture:
 * - Standalone UMD module: works in Browser (window.ComplianceScorer) and Node.js (module.exports).
 * - Scoring weights, point values, and thresholds are fully configurable and customizable.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ComplianceScorer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_WEIGHTS = {
    PASS: 1.0,
    REVIEW: 0.5,
    FAIL: 0.0,
    'N/A': null // excluded from calculation
  };

  var DEFAULT_THRESHOLDS = {
    COMPLIANT_MIN: 85,
    NEEDS_REVIEW_MIN: 60
  };

  var STATUS_LABELS = {
    COMPLIANT: 'COMPLIANT',
    NEEDS_REVIEW: 'NEEDS REVIEW',
    POTENTIAL_VIOLATION: 'POTENTIAL VIOLATION'
  };

  var DISCLAIMER_TEXT = 'Preliminary automated assessment under Legal Metrology (Packaged Commodities) Rules, 2011. This assessment does not constitute official legal or government certification.';

  /**
   * Normalizes a raw status string into standard key: 'PASS', 'REVIEW', 'FAIL', 'N/A'
   */
  function normalizeStatus(status) {
    if (!status || typeof status !== 'string') return 'FAIL';
    var upper = status.trim().toUpperCase();
    if (upper === 'PASS' || upper === 'PASSED') return 'PASS';
    if (upper === 'REVIEW' || upper === 'NEEDS REVIEW' || upper === 'NEEDS_REVIEW' || upper === 'WARN' || upper === 'WARNING') return 'REVIEW';
    if (upper === 'FAIL' || upper === 'FAILED') return 'FAIL';
    if (upper === 'N/A' || upper === 'NA' || upper === 'NOT APPLICABLE' || upper === 'EXEMPT') return 'N/A';
    return 'FAIL';
  }

  /**
   * Calculates the transparent compliance score and breakdown from rule engine results.
   *
   * @param {Array<object>} results - Array of rule evaluation results from ComplianceEngine
   * @param {object} [options] - Optional custom weights and threshold overrides
   * @returns {object} Calculated score, status, breakdown metrics, and transparent audit info
   */
  function calculateScore(results, options) {
    var opts = options || {};
    var weights = Object.assign({}, DEFAULT_WEIGHTS, opts.weights || {});
    var thresholds = Object.assign({}, DEFAULT_THRESHOLDS, opts.thresholds || {});

    var safeResults = Array.isArray(results) ? results : [];
    var totalChecks = safeResults.length;

    var counts = {
      passed: 0,
      review: 0,
      failed: 0,
      na: 0
    };

    var pointsEarned = 0;
    var maxPossiblePoints = 0;
    var applicableChecks = 0;

    for (var i = 0; i < totalChecks; i++) {
      var item = safeResults[i] || {};
      var normStatus = normalizeStatus(item.status);

      if (normStatus === 'N/A') {
        counts.na++;
        // N/A checks are excluded from the calculation
        continue;
      }

      applicableChecks++;
      maxPossiblePoints += weights.PASS; // Max possible per applicable check

      if (normStatus === 'PASS') {
        counts.passed++;
        pointsEarned += weights.PASS;
      } else if (normStatus === 'REVIEW') {
        counts.review++;
        pointsEarned += weights.REVIEW;
      } else {
        counts.failed++;
        pointsEarned += weights.FAIL;
      }
    }

    // Calculate normalized score (0–100)
    var rawScore = 0;
    var normalizedScore = 0;

    if (applicableChecks > 0 && maxPossiblePoints > 0) {
      rawScore = (pointsEarned / maxPossiblePoints) * 100;
      normalizedScore = Math.round(rawScore);
      // Clamp to 0-100 range
      normalizedScore = Math.max(0, Math.min(100, normalizedScore));
    }

    // Determine overall status
    var overallStatus = STATUS_LABELS.POTENTIAL_VIOLATION;
    var statusKey = 'POTENTIAL_VIOLATION';

    if (normalizedScore >= thresholds.COMPLIANT_MIN) {
      overallStatus = STATUS_LABELS.COMPLIANT;
      statusKey = 'COMPLIANT';
    } else if (normalizedScore >= thresholds.NEEDS_REVIEW_MIN) {
      overallStatus = STATUS_LABELS.NEEDS_REVIEW;
      statusKey = 'NEEDS_REVIEW';
    } else {
      overallStatus = STATUS_LABELS.POTENTIAL_VIOLATION;
      statusKey = 'POTENTIAL_VIOLATION';
    }

    return {
      score: normalizedScore,
      rawScore: rawScore,
      overallStatus: overallStatus,
      statusKey: statusKey,
      totalChecks: totalChecks,
      passed: counts.passed,
      review: counts.review,
      failed: counts.failed,
      na: counts.na,
      applicableChecks: applicableChecks,
      pointsEarned: pointsEarned,
      maxPossiblePoints: maxPossiblePoints,
      weights: {
        PASS: weights.PASS,
        REVIEW: weights.REVIEW,
        FAIL: weights.FAIL,
        'N/A': 'excluded'
      },
      thresholds: {
        COMPLIANT: thresholds.COMPLIANT_MIN,
        NEEDS_REVIEW: thresholds.NEEDS_REVIEW_MIN
      },
      assessmentType: 'Preliminary Automated Assessment',
      disclaimer: DISCLAIMER_TEXT
    };
  }

  return {
    calculateScore: calculateScore,
    normalizeStatus: normalizeStatus,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    DEFAULT_THRESHOLDS: DEFAULT_THRESHOLDS,
    STATUS_LABELS: STATUS_LABELS,
    DISCLAIMER_TEXT: DISCLAIMER_TEXT
  };
}));
