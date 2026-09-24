export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskMetrics {
  frequencyScore: number;
  severityScore: number;
  repeatScore: number;
  recencyScore: number;
}

export interface RiskProfile {
  totalInspections: number;
  totalViolations: number;
  repeatedViolations: number;
  repeatedRules: string[];
  severityBreakdown: { CRITICAL: number; WARNING: number };
  recentViolations: number;
  metrics: RiskMetrics;
  riskScore: number;
  riskLevel: RiskLevel;
  priorityLabel: string;
  explanation: string;
  disclaimer: string;
}

export interface ViolationRecord {
  violation_id?: string | number;
  inspection_id: string;
  rule_name?: string;
  field_key: string;
  violation_type: 'FAIL' | 'REVIEW';
  severity: 'CRITICAL' | 'WARNING';
  source_reference?: string;
  extracted_value?: string | null;
  explanation: string;
  suggested_action?: string;
  detected_at?: string;
  inspected_at?: string;
}

export interface BrandInfo {
  brand_id?: string | number;
  brand_name: string;
  product_category?: string;
  inspection_count?: number;
}
