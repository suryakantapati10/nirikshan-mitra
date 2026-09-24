import { ComplianceScore, RuleEvaluation, RuleStatus } from '../types/compliance';

export const DEFAULT_WEIGHTS = {
  PASS: 1.0,
  REVIEW: 0.5,
  FAIL: 0.0,
  'N/A': null
};

export const DEFAULT_THRESHOLDS = {
  COMPLIANT_MIN: 85,
  NEEDS_REVIEW_MIN: 60
};

export const STATUS_LABELS = {
  COMPLIANT: 'COMPLIANT' as const,
  NEEDS_REVIEW: 'NEEDS REVIEW' as const,
  POTENTIAL_VIOLATION: 'POTENTIAL VIOLATION' as const
};

export const DISCLAIMER_TEXT =
  'Preliminary automated assessment under Legal Metrology (Packaged Commodities) Rules, 2011. This assessment does not constitute official legal or government certification.';

function normalizeStatus(status?: string | null): RuleStatus {
  if (!status || typeof status !== 'string') return 'FAIL';
  const upper = status.trim().toUpperCase();
  if (upper === 'PASS' || upper === 'PASSED') return 'PASS';
  if (
    upper === 'REVIEW' ||
    upper === 'NEEDS REVIEW' ||
    upper === 'NEEDS_REVIEW' ||
    upper === 'WARN' ||
    upper === 'WARNING'
  )
    return 'REVIEW';
  if (upper === 'FAIL' || upper === 'FAILED') return 'FAIL';
  if (upper === 'N/A' || upper === 'NA' || upper === 'NOT APPLICABLE' || upper === 'EXEMPT')
    return 'N/A';
  return 'FAIL';
}

export function calculateScore(
  results: RuleEvaluation[],
  options?: {
    weights?: Partial<typeof DEFAULT_WEIGHTS>;
    thresholds?: Partial<typeof DEFAULT_THRESHOLDS>;
  }
): ComplianceScore {
  const weights = { ...DEFAULT_WEIGHTS, ...(options?.weights || {}) };
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options?.thresholds || {}) };

  const safeResults = Array.isArray(results) ? results : [];
  const totalChecks = safeResults.length;

  let passed = 0;
  let review = 0;
  let failed = 0;
  let na = 0;

  let pointsEarned = 0;
  let maxPossiblePoints = 0;
  let applicableChecks = 0;

  for (let i = 0; i < totalChecks; i++) {
    const item = safeResults[i] || {};
    const normStatus = normalizeStatus(item.status);

    if (normStatus === 'N/A') {
      na++;
      continue;
    }

    applicableChecks++;
    maxPossiblePoints += weights.PASS;

    if (normStatus === 'PASS') {
      passed++;
      pointsEarned += weights.PASS;
    } else if (normStatus === 'REVIEW') {
      review++;
      pointsEarned += weights.REVIEW;
    } else {
      failed++;
      pointsEarned += weights.FAIL;
    }
  }

  let normalizedScore = 0;
  if (applicableChecks > 0 && maxPossiblePoints > 0) {
    const rawScore = (pointsEarned / maxPossiblePoints) * 100;
    normalizedScore = Math.round(rawScore);
    normalizedScore = Math.max(0, Math.min(100, normalizedScore));
  }

  let overallStatus: 'COMPLIANT' | 'NEEDS REVIEW' | 'POTENTIAL VIOLATION' =
    STATUS_LABELS.POTENTIAL_VIOLATION;
  let statusKey: 'COMPLIANT' | 'NEEDS_REVIEW' | 'POTENTIAL_VIOLATION' = 'POTENTIAL_VIOLATION';

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
    overallStatus,
    statusKey,
    totalChecks,
    passed,
    review,
    failed,
    na,
    applicableChecks,
    pointsEarned,
    maxPossiblePoints
  };
}

export const complianceScorer = {
  calculateScore,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  STATUS_LABELS,
  DISCLAIMER_TEXT
};
