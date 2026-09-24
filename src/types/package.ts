export type ValidPackageType =
  | 'Can'
  | 'Bottle'
  | 'Pouch'
  | 'Box'
  | 'Carton'
  | 'Jar'
  | 'Other'
  | 'Classification Unavailable';

export type ClassificationStatus = 'idle' | 'loading' | 'success' | 'error';

export type PanelKey = 'front' | 'back' | 'side' | 'top_bottom';

export interface PanelGuidance {
  key: PanelKey;
  label: string;
  description: string;
}

export interface PackageTypeGuidance {
  title: string;
  icon: string;
  genericPrompt: string;
  geometryTip: string;
  recommendedPanels: PanelGuidance[];
}

export interface ClassificationResult {
  packageType: ValidPackageType;
  confidence: number;
  confidencePercent: number;
  isLowConfidence: boolean;
  displayText: string;
  confidenceText: string;
  guidancePrompt: string;
  geometryTip: string;
  icon: string;
  reasoning: string;
  success?: boolean;
  isError?: boolean;
}

export interface PanelData {
  key: PanelKey;
  label?: string;
  name: string;
  size?: string;
  dataUrl: string;
  file?: File;
  timestamp?: number;
}

export interface InspectionSession {
  id: string;
  packageClassification: ClassificationResult | null;
  panels: Record<PanelKey, PanelData | null>;
  createdAt: string;
}
