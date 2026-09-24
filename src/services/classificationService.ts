import {
  ValidPackageType,
  ClassificationResult,
  PackageTypeGuidance,
  InspectionSession,
  PanelData
} from '../types/package';

async function toBase64(imageSource: string | File | Blob): Promise<string> {
  if (typeof imageSource === 'string' && imageSource.startsWith('data:image/')) {
    return imageSource;
  }
  return new Promise((resolve, reject) => {
    if (!(imageSource instanceof File) && !(imageSource instanceof Blob)) {
      resolve(typeof imageSource === 'string' ? imageSource : '');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(imageSource);
  });
}

export const VALID_PACKAGE_TYPES: ValidPackageType[] = [
  'Can',
  'Bottle',
  'Pouch',
  'Box',
  'Carton',
  'Jar',
  'Other'
];

export const CONFIDENCE_THRESHOLD = 0.60;

export const PACKAGE_GUIDANCE: Record<string, PackageTypeGuidance> = {
  Can: {
    title: 'Can',
    icon: '🥫',
    genericPrompt: 'For a complete assessment, capture additional sides/panels of this package.',
    geometryTip: 'Cylindrical container detected. Inspect front label, rear legal/nutritional text, and stamped top/bottom ends.',
    recommendedPanels: [
      { key: 'front', label: 'Front / Main panel', description: 'Brand, commodity name & net contents' },
      { key: 'back', label: 'Back / Rear panel', description: 'Ingredients, manufacturer & customer care' },
      { key: 'top_bottom', label: 'Top / Bottom lid', description: 'Stamped MRP, batch number & expiry dates' }
    ]
  },
  Bottle: {
    title: 'Bottle',
    icon: '🍾',
    genericPrompt: 'For a complete assessment, capture additional sides/panels of this package.',
    geometryTip: 'Bottle container detected. Inspect front display label, back nutritional panel, and neck/cap stamps.',
    recommendedPanels: [
      { key: 'front', label: 'Front / Main panel', description: 'Principal display, name & net volume' },
      { key: 'back', label: 'Back / Rear panel', description: 'Nutritional declarations, address & consumer care' },
      { key: 'top_bottom', label: 'Cap / Neck label', description: 'Batch code, manufacturing date & MRP stamps' }
    ]
  },
  Pouch: {
    title: 'Pouch',
    icon: '🛍️',
    genericPrompt: 'For a complete assessment, capture additional sides/panels of this package.',
    geometryTip: 'Flexible pouch/packet detected. Inspect front display, back declaration panel, and seal gussets.',
    recommendedPanels: [
      { key: 'front', label: 'Front / Main panel', description: 'Front display panel & commodity identity' },
      { key: 'back', label: 'Back / Rear panel', description: 'Full mandatory legal declarations & address' },
      { key: 'side', label: 'Seal margin / Side', description: 'Embossed crimp date, lot code or MRP' }
    ]
  },
  Box: {
    title: 'Box',
    icon: '📦',
    genericPrompt: 'For a complete assessment, capture additional sides/panels of this package.',
    geometryTip: 'Rigid box packaging detected. Inspect front display panel, back panel, and side/flap panels.',
    recommendedPanels: [
      { key: 'front', label: 'Front / Main panel', description: 'Principal display panel' },
      { key: 'back', label: 'Back / Rear panel', description: 'Nutritional facts & manufacturer info' },
      { key: 'side', label: 'Side / Flap panel', description: 'MRP, batch number & date declarations' }
    ]
  },
  Carton: {
    title: 'Carton',
    icon: '🧃',
    genericPrompt: 'For a complete assessment, capture additional sides/panels of this package.',
    geometryTip: 'Folding carton / aseptic pack detected. Inspect front, back declarations, and closure seals.',
    recommendedPanels: [
      { key: 'front', label: 'Front / Main panel', description: 'Brand & product name' },
      { key: 'back', label: 'Back / Rear panel', description: 'Legal declarations, ingredients & care' },
      { key: 'top_bottom', label: 'Top / Bottom panel', description: 'Batch code & best before date' }
    ]
  },
  Jar: {
    title: 'Jar',
    icon: '🏺',
    genericPrompt: 'For a complete assessment, capture additional sides/panels of this package.',
    geometryTip: 'Wide-mouth jar detected. Inspect wrap-around label, rear mandatory text, and lid/base stamps.',
    recommendedPanels: [
      { key: 'front', label: 'Front / Main panel', description: 'Product identity & net weight' },
      { key: 'back', label: 'Back / Rear panel', description: 'Manufacturer, FSSAI & consumer helpline' },
      { key: 'top_bottom', label: 'Lid / Base stamp', description: 'Embossed date of mfg, batch & price' }
    ]
  },
  Other: {
    title: 'Other',
    icon: '📦',
    genericPrompt: 'For a complete assessment, capture additional sides/panels of this package.',
    geometryTip: 'General packaged commodity. Capture all panels containing printed legal declarations.',
    recommendedPanels: [
      { key: 'front', label: 'Front / Main panel', description: 'Main visible surface' },
      { key: 'back', label: 'Back / Rear panel', description: 'Declaration panel' },
      { key: 'side', label: 'Side / Other panel', description: 'Additional declarations' }
    ]
  }
};

export const LOW_CONFIDENCE_MESSAGE =
  'Package type could not be confidently identified. Continue with general package scanning.';

export function evaluateClassification(
  rawType?: string | null,
  rawConfidence?: number | string | null,
  reasoning?: string | null
): ClassificationResult {
  let type: ValidPackageType = 'Other';
  if (typeof rawType === 'string') {
    const match = VALID_PACKAGE_TYPES.find((t) => t.toLowerCase() === rawType.trim().toLowerCase());
    if (match) type = match;
  }

  let conf = 0.5;
  const num = typeof rawConfidence === 'number' ? rawConfidence : parseFloat(String(rawConfidence));
  if (!isNaN(num)) {
    if (num >= 0 && num <= 1) {
      conf = Math.round(num * 100) / 100;
    } else if (num > 1 && num <= 100) {
      conf = Math.round(num) / 100;
    }
  }

  const isLowConfidence = conf < CONFIDENCE_THRESHOLD || (type === 'Other' && conf < 0.7);
  const percent = Math.round(conf * 100);
  const guidance = PACKAGE_GUIDANCE[type] || PACKAGE_GUIDANCE.Other;

  return {
    packageType: type,
    confidence: conf,
    confidencePercent: percent,
    isLowConfidence,
    displayText: `Package detected: ${type}`,
    confidenceText: `${percent}% confidence`,
    guidancePrompt: isLowConfidence ? LOW_CONFIDENCE_MESSAGE : guidance.genericPrompt,
    geometryTip: isLowConfidence ? LOW_CONFIDENCE_MESSAGE : guidance.geometryTip,
    icon: guidance.icon,
    reasoning: reasoning || '',
    success: true
  };
}

export function createInspectionSession(initialPanelData?: PanelData | null): InspectionSession {
  const sessionId = 'insp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  return {
    id: sessionId,
    packageClassification: null,
    panels: {
      front: initialPanelData || null,
      back: null,
      side: null,
      top_bottom: null
    },
    createdAt: new Date().toISOString()
  };
}

export const classificationService = {
  VALID_PACKAGE_TYPES,
  CONFIDENCE_THRESHOLD,
  PACKAGE_GUIDANCE,
  LOW_CONFIDENCE_MESSAGE,
  evaluateClassification,
  createInspectionSession,

  async classifyImage(imageSource: string | File | Blob): Promise<ClassificationResult> {
    try {
      const imageDataUri = await toBase64(imageSource);
      const response = await fetch('/api/classify-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUri })
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.package_type) {
          return evaluateClassification(result.package_type, result.confidence, result.reasoning);
        }
      }
    } catch (err: any) {
      console.warn('[ClassificationService] fetch error:', err.message);
    }

    return {
      success: false,
      packageType: 'Classification Unavailable',
      confidence: 0,
      confidencePercent: 0,
      isLowConfidence: true,
      isError: true,
      displayText: 'Classification Unavailable',
      confidenceText: 'Retry Needed',
      guidancePrompt:
        'Automatic package classification is temporarily unavailable. Proceed with general package scanning.',
      geometryTip: 'Inspect all accessible surfaces of the package to capture mandatory Legal Metrology declarations.',
      icon: '⚠️',
      reasoning: 'Backend server connection could not be established or AI model unavailable.'
    };
  }
};
