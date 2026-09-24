/**
 * Nirikshan Mitra Package Classifier Module
 * 
 * Provides automated package-type classification and guided scanning prompts:
 * - Can, Bottle, Pouch, Box, Carton, Jar, Other
 * - Confidence percentage display
 * - Multi-panel image session management
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PackageClassifier = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VALID_PACKAGE_TYPES = [
    'Can',
    'Bottle',
    'Pouch',
    'Box',
    'Carton',
    'Jar',
    'Other'
  ];

  var CONFIDENCE_THRESHOLD = 0.60;

  var PACKAGE_GUIDANCE = {
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

  var LOW_CONFIDENCE_MESSAGE = 'Package type could not be confidently identified. Continue with general package scanning.';

  /**
   * Evaluates classification result and applies thresholding
   */
  function evaluateClassification(rawType, rawConfidence, reasoning) {
    var type = 'Other';
    if (typeof rawType === 'string') {
      var match = VALID_PACKAGE_TYPES.find(function (t) {
        return t.toLowerCase() === rawType.trim().toLowerCase();
      });
      if (match) type = match;
    }

    var conf = 0.5;
    var num = parseFloat(rawConfidence);
    if (!isNaN(num)) {
      if (num >= 0 && num <= 1) {
        conf = Math.round(num * 100) / 100;
      } else if (num > 1 && num <= 100) {
        conf = Math.round(num) / 100;
      }
    }

    var isLowConfidence = (conf < CONFIDENCE_THRESHOLD) || (type === 'Other' && conf < 0.70);
    var percent = Math.round(conf * 100);
    var guidance = PACKAGE_GUIDANCE[type] || PACKAGE_GUIDANCE.Other;

    return {
      packageType: type,
      confidence: conf,
      confidencePercent: percent,
      isLowConfidence: isLowConfidence,
      displayText: 'Package detected: ' + type,
      confidenceText: percent + '% confidence',
      guidancePrompt: isLowConfidence ? LOW_CONFIDENCE_MESSAGE : guidance.genericPrompt,
      geometryTip: isLowConfidence ? LOW_CONFIDENCE_MESSAGE : guidance.geometryTip,
      icon: guidance.icon,
      reasoning: reasoning || ''
    };
  }

  /**
   * Creates a new inspection session tracking multi-panel image captures
   */
  function createInspectionSession(initialPanelData) {
    var sessionId = 'insp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    var session = {
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

    return session;
  }

  /**
   * Dynamic backend endpoint resolution for classification
   */
  function getClassificationEndpoints() {
    var endpoints = [];
    if (typeof window !== 'undefined' && window.location) {
      var protocol = window.location.protocol;
      var hostname = window.location.hostname || '';
      var port = window.location.port;
      var isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || protocol === 'file:';

      if (isLocal) {
        if (protocol === 'file:') {
          endpoints.push('http://localhost:3000/api/classify-package');
          endpoints.push('http://127.0.0.1:3000/api/classify-package');
        } else if (port === '3000') {
          endpoints.push('/api/classify-package');
          endpoints.push('http://localhost:3000/api/classify-package');
          endpoints.push('http://127.0.0.1:3000/api/classify-package');
        } else {
          // Local development server on different port (e.g. 5500 Live Server)
          endpoints.push('http://localhost:3000/api/classify-package');
          endpoints.push('http://127.0.0.1:3000/api/classify-package');
          endpoints.push('/api/classify-package');
        }
      } else {
        // Production/remote deployment (e.g. Netlify) — NEVER query local device/localhost to avoid unwanted device/app permission requests
        endpoints.push('/api/classify-package');
      }
    } else {
      // Node.js test environment
      endpoints.push('http://localhost:3000/api/classify-package');
      endpoints.push('/api/classify-package');
    }
    return endpoints;
  }

  /**
   * Sends actual uploaded product image to backend Gemini Vision classification service
   */
  async function classifyImage(imageDataUri) {
    var endpoints = getClassificationEndpoints();
    var lastError = null;

    for (var i = 0; i < endpoints.length; i++) {
      var url = endpoints[i];
      try {
        var response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageDataUri })
        });

        if (response.ok) {
          var result = await response.json();
          if (result && result.package_type) {
            return evaluateClassification(result.package_type, result.confidence, result.reasoning);
          }
        } else {
          lastError = new Error('HTTP ' + response.status + ' from ' + url);
        }
      } catch (err) {
        lastError = err;
      }
    }

    // If backend Gemini service fails or is unreachable:
    // Do not silently treat "Other" as the real classification.
    // Return explicit failure / retry guidance.
    return {
      success: false,
      packageType: 'Classification Unavailable',
      confidence: 0,
      confidencePercent: 0,
      isLowConfidence: true,
      isError: true,
      displayText: 'Classification Unavailable',
      confidenceText: 'Retry Needed',
      guidancePrompt: (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'Automatic package classification is temporarily unavailable. Verify that the backend server is running on http://localhost:3000, or proceed with general package scanning.'
        : 'Automatic package classification is temporarily unavailable. Proceed with general package scanning.',
      geometryTip: 'Inspect all accessible surfaces of the package to capture mandatory Legal Metrology declarations.',
      icon: '⚠️',
      reasoning: lastError ? ('AI classification service unreachable: ' + lastError.message) : 'Backend server connection could not be established.'
    };
  }

  return {
    VALID_PACKAGE_TYPES: VALID_PACKAGE_TYPES,
    CONFIDENCE_THRESHOLD: CONFIDENCE_THRESHOLD,
    PACKAGE_GUIDANCE: PACKAGE_GUIDANCE,
    LOW_CONFIDENCE_MESSAGE: LOW_CONFIDENCE_MESSAGE,
    evaluateClassification: evaluateClassification,
    createInspectionSession: createInspectionSession,
    classifyImage: classifyImage,
    getClassificationEndpoints: getClassificationEndpoints
  };
});
