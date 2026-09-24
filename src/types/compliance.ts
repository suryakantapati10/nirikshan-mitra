export type RuleStatus = 'PASS' | 'REVIEW' | 'FAIL' | 'N/A';

export interface RuleEvaluation {
  field_key: string;
  field_name: string;
  extracted_value: string | null;
  status: RuleStatus;
  is_present: boolean;
  is_valid: boolean;
  explanation: string;
  suggested_action: string;
  severity?: 'CRITICAL' | 'WARNING';
}

export interface ComplianceScore {
  score: number;
  overallStatus: 'COMPLIANT' | 'NEEDS REVIEW' | 'POTENTIAL VIOLATION';
  statusKey: 'COMPLIANT' | 'NEEDS_REVIEW' | 'POTENTIAL_VIOLATION';
  totalChecks: number;
  passed: number;
  review: number;
  failed: number;
  na: number;
  applicableChecks: number;
  pointsEarned: number;
  maxPossiblePoints: number;
}

export interface ComplianceSummary {
  total: number;
  pass: number;
  review: number;
  fail: number;
  na: number;
}

export interface RuleDefinition {
  rule_id: string;
  rule_name: string;
  field_key: string;
  source_reference: string;
  category: string;
  mandatory: boolean;
  active: boolean;
  validation_pattern?: string | null;
}

export interface ExtractedFields {
  product_name?: string | null;
  brand_name?: string | null;
  manufacturer?: string | null;
  address?: string | null;
  net_quantity?: string | null;
  mrp?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  batch_code?: string | null;
  customer_care_phone?: string | null;
  customer_care_email?: string | null;
  customer_care?: string | null;
  _sources?: Record<string, string>;
  _rawText?: string;
  _duplicates?: Record<string, any[]>;
  _panelExtractions?: Record<string, any>;
  [key: string]: any;
}
