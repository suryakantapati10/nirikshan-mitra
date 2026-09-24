import { ExtractedFields, RuleEvaluation } from './compliance';
import { RiskLevel } from './risk';

export interface InspectionRecord {
  inspection_id: string;
  product_name: string;
  brand_name: string;
  package_type: string;
  overall_score: number;
  overall_status: 'COMPLIANT' | 'NEEDS_REVIEW' | 'POTENTIAL_VIOLATION' | 'PENDING' | 'NON_COMPLIANT';
  rule_version: string;
  image_count: number;
  inspector_name?: string;
  inspected_at?: string;
  fields?: ExtractedFields;
  field_sources?: Record<string, string>;
  compliance_results?: RuleEvaluation[];
  violation_count?: number;
  risk_score?: number;
  risk_level?: RiskLevel;
  brand_product_id?: string;
  report_reference?: string;
  manufacturer?: string;
  raw_ocr_text?: string;
  ocr_diagnostics?: OcrDiagnostics;
}

export interface SaveInspectionPayload {
  inspection_id?: string;
  product_name: string;
  brand_name: string;
  package_type: string;
  overall_score: number;
  overall_status: string;
  rule_version?: string;
  image_count?: number;
  fields?: ExtractedFields;
  field_sources?: Record<string, string>;
  compliance_results?: RuleEvaluation[];
  report_reference?: string;
  manufacturer?: string;
  risk_level?: string;
  ocr_diagnostics?: OcrDiagnostics;
  raw_ocr_text?: string;
}

export interface InspectionDetail extends InspectionRecord {
  // Can contain additional joined data if available
}

export interface OcrDiagnostics {
  engine: string;
  quality: string;
  characterCount: number;
  readable: boolean;
  panelCount?: number;
  successfulCount?: number;
  failedCount?: number;
}

export interface PanelOcrResult {
  key: string;
  label: string;
  name: string;
  success: boolean;
  text: string;
  diagnostics: OcrDiagnostics;
  error: string | null;
}

export interface OcrResponseData {
  success: boolean;
  text: string;
  combinedText?: string;
  panels?: PanelOcrResult[];
  successfulPanels?: PanelOcrResult[];
  failedPanels?: PanelOcrResult[];
  diagnostics: OcrDiagnostics;
  error?: string;
  isConnectionError?: boolean;
}
