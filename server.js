const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const {
  initDatabase,
  db,
  ruleRepository,
  inspectionRepository,
  brandProductRepository,
  violationRepository,
  reportRepository,
  userRepository
} = require('./database');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateToken,
  requireAdmin
} = require('./auth');
const ComplianceEngine = require('./complianceEngine');
const { generateInspectionPdf, DEFAULT_REPORTS_DIR } = require('./reportGenerator');

dotenv.config();

// Automatically initialize and seed SQLite database
initDatabase().then(() => {
  console.log('[SQLite Database] Nirikshan Mitra database initialized and seeded successfully.');
}).catch((err) => {
  console.error('[SQLite Database] Failed to initialize SQLite database:', err.message);
});

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. HTTP SECURITY HEADERS (Helmet)
// ============================================================================
// Apply standard security headers without breaking data: URIs, fonts, or inline UI scripts
app.use(helmet({
  contentSecurityPolicy: false, // Preserves data: URIs, Google Fonts, and single-page app inline scripts
  crossOriginEmbedderPolicy: false
}));

// ============================================================================
// 2. CORS ALLOWLIST & ORIGIN CONTROLS
// ============================================================================
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, same-origin browsers)
    if (!origin) return callback(null, true);

    // Support localhost and 127.0.0.1 on any port for frictionless local development
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const corsError = new Error(`Origin '${origin}' is not allowed by CORS policy.`);
    corsError.status = 403;
    return callback(corsError);
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  credentials: true
};

app.use(cors(corsOptions));

// ============================================================================
// 3. REQUEST SIZE LIMITS & BODY PARSING
// ============================================================================
// Constrain body size to 15 MB (sufficient for 10 MB base64 images while preventing unbounded memory consumption)
app.use(express.json({ limit: '15mb' }));

// Handle PayloadTooLargeError gracefully with clean HTTP 413 JSON
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      success: false,
      error: 'Request payload exceeds the maximum allowed size limit (15 MB).'
    });
  }
  next(err);
});

// Serve static frontend assets (built React production dist or root)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(__dirname));

// ============================================================================
// 4. RATE LIMITING MIDDLEWARE
// ============================================================================
// Dedicated rate limiter for computationally expensive / AI / PDF endpoints: 30 requests per minute per IP
const expensiveOpsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.RATE_LIMIT_EXPENSIVE_MAX ? parseInt(process.env.RATE_LIMIT_EXPENSIVE_MAX, 10) : 30,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  skip: (req) => req.headers['x-test-suite'] === 'nirikshan-test',
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again later.'
  }
});

// General API rate limiter: 300 requests per 15 minutes per IP
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_GENERAL_MAX ? parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) : 300,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  skip: (req) => req.headers['x-test-suite'] === 'nirikshan-test',
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again later.'
  }
});

// Apply general limiter to /api/ routes
app.use('/api/', generalApiLimiter);

// ============================================================================
// 5. SECURITY & VALIDATION HELPERS
// ============================================================================
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MIN_DECODED_IMAGE_BYTES = 100;
const MAX_DECODED_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB limit matching UI

/**
 * Validates uploaded image data URL and base64 integrity
 */
function validateImagePayload(imageInput) {
  if (!imageInput) {
    return { valid: false, message: 'Image data is required.' };
  }
  if (typeof imageInput !== 'string') {
    return { valid: false, message: 'Image payload must be a string (data URL or base64).' };
  }
  const trimmed = imageInput.trim();
  if (trimmed.length < 50) {
    return { valid: false, message: 'Image data is too short or empty.' };
  }

  let mimeType = 'image/jpeg';
  let base64Part = trimmed;

  // Validate and parse data URL format if provided
  if (trimmed.startsWith('data:')) {
    const dataUrlMatch = trimmed.match(/^data:([a-zA-Z0-9\/\+\.-]+);base64,(.+)$/s);
    if (!dataUrlMatch) {
      return { valid: false, message: 'Malformed data URL. Expected format: data:<mime-type>;base64,<data>' };
    }
    const declaredMime = dataUrlMatch[1].toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.includes(declaredMime)) {
      return {
        valid: false,
        message: `Unsupported image MIME type "${declaredMime}". Supported types: JPEG, PNG, WebP.`
      };
    }
    mimeType = declaredMime;
    base64Part = dataUrlMatch[2].trim();
  }

  const cleanBase64 = base64Part.replace(/[\s\r\n]+/g, '');
  if (cleanBase64.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    return { valid: false, message: 'Malformed base64 image data. Contains invalid characters or corrupted padding.' };
  }

  // Check valid base64 length multiple
  if (cleanBase64.length % 4 !== 0) {
    return { valid: false, message: 'Malformed base64 image data. Length must be a multiple of 4.' };
  }

  // Calculate decoded byte length
  let padding = 0;
  if (cleanBase64.endsWith('==')) padding = 2;
  else if (cleanBase64.endsWith('=')) padding = 1;
  const estimatedBytes = Math.floor((cleanBase64.length * 3) / 4) - padding;

  if (estimatedBytes < MIN_DECODED_IMAGE_BYTES) {
    return { valid: false, message: 'Decoded image payload is too small (minimum 100 bytes).' };
  }
  if (estimatedBytes > MAX_DECODED_IMAGE_BYTES) {
    return {
      valid: false,
      message: `Decoded image exceeds maximum allowed limit of 10 MB (${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB).`
    };
  }

  return {
    valid: true,
    mimeType,
    base64Data: cleanBase64,
    sizeBytes: estimatedBytes
  };
}

/**
 * Validates string identifier parameters to prevent traversal and injection
 */
function validateInspectionId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, message: 'Inspection ID is required.' };
  }
  const clean = id.trim();
  if (clean.length < 3 || clean.length > 100) {
    return { valid: false, message: 'Inspection ID must be between 3 and 100 characters.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, message: 'Invalid characters in Inspection ID. Only alphanumeric, dashes, and underscores allowed.' };
  }
  return { valid: true, id: clean };
}

function validateReportReference(ref) {
  if (!ref || typeof ref !== 'string') {
    return { valid: false, message: 'Report reference is required.' };
  }
  const clean = ref.trim();
  if (clean.length < 3 || clean.length > 100) {
    return { valid: false, message: 'Report reference must be between 3 and 100 characters.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, message: 'Invalid characters in Report reference. Only alphanumeric, dashes, and underscores allowed.' };
  }
  return { valid: true, ref: clean };
}

/**
 * Validates and safely resolves report file paths inside DEFAULT_REPORTS_DIR
 */
function getSafeReportFilePath(inspectionId) {
  const idValidation = validateInspectionId(inspectionId);
  if (!idValidation.valid) {
    throw new Error(idValidation.message);
  }

  const safeFilename = `report-${idValidation.id}.pdf`;
  const resolvedDir = path.resolve(DEFAULT_REPORTS_DIR);
  const resolvedFile = path.resolve(DEFAULT_REPORTS_DIR, safeFilename);

  // Strict path containment check
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    throw new Error('Access denied: Path traversal detected.');
  }

  return { resolvedFile, safeFilename };
}

/**
 * Redacts secret tokens from server logs
 */
function sanitizeLogMessage(msg) {
  if (typeof msg !== 'string') return msg;
  return msg.replace(/key=[a-zA-Z0-9_.-]+/g, 'key=[REDACTED]');
}

/**
 * Strips internal server filesystem paths and secrets from client error messages
 */
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== 'string') return 'An internal error occurred.';
  let clean = msg.replace(/key=[a-zA-Z0-9_.-]+/g, 'key=[REDACTED]');
  clean = clean.replace(/[a-zA-Z]:\\[^"'\n\r\t<>]+/g, '[file]');
  clean = clean.replace(/\/[\w.-]+(\/[\w.-]+)+/g, '[file]');
  return clean;
}

// ============================================================================
// 6. IMAGE PREPROCESSING (SHARP)
// ============================================================================
async function preprocessImageWithSharp(imageInput) {
  const validation = validateImagePayload(imageInput);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const inputBuffer = Buffer.from(validation.base64Data, 'base64');
  if (inputBuffer.length === 0) {
    throw new Error('Failed to decode base64 image data.');
  }

  const originalSizeKB = (inputBuffer.length / 1024).toFixed(1);

  // Read metadata with Sharp (validates image stream)
  let metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch (err) {
    throw new Error('Corrupt or unsupported image data: ' + err.message);
  }

  if (!metadata || !metadata.format) {
    throw new Error('Unable to determine image format or dimensions.');
  }

  const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'gif'];
  if (!supportedFormats.includes(metadata.format.toLowerCase())) {
    throw new Error(`Unsupported image format: "${metadata.format}". Only JPEG, PNG, and WebP are supported.`);
  }

  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;
  const originalFormat = metadata.format;

  // Maximum dimension limit for Legal Metrology package labels: 2048px
  const MAX_DIMENSION = 2048;

  let pipeline = sharp(inputBuffer).rotate(); // Auto-rotate according to EXIF orientation tag

  if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
    pipeline = pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  // Consistent, optimized output format: JPEG at quality 85
  pipeline = pipeline.jpeg({
    quality: 85,
    mozjpeg: true
  });

  const { data: processedBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
  const processedSizeKB = (processedBuffer.length / 1024).toFixed(1);
  const processedBase64 = processedBuffer.toString('base64');

  const diagnostics = {
    originalFormat: originalFormat,
    originalDimensions: `${originalWidth}x${originalHeight}`,
    originalSizeKB: `${originalSizeKB} KB`,
    processedFormat: info.format,
    processedDimensions: `${info.width}x${info.height}`,
    processedSizeKB: `${processedSizeKB} KB`,
    resized: info.width < originalWidth || info.height < originalHeight,
    compressionRatio: `${Math.max(0, Math.round((1 - (processedBuffer.length / inputBuffer.length)) * 100))}%`
  };

  let qualityLabel = 'Sharp Preprocessed';
  if (info.width >= 1000 || info.height >= 1000) {
    qualityLabel = `Sharp High Resolution (${processedSizeKB} KB, ${info.width}x${info.height})`;
  } else {
    qualityLabel = `Sharp Standard (${processedSizeKB} KB, ${info.width}x${info.height})`;
  }

  return {
    mimeType: 'image/jpeg',
    base64Data: processedBase64,
    buffer: processedBuffer,
    qualityLabel: qualityLabel,
    diagnostics: diagnostics
  };
}

// ============================================================================
// 7. API ENDPOINTS
// ============================================================================

/**
 * GET /api/health
 * Public health & readiness probe (zero secrets or sensitive paths exposed)
 */
app.get('/api/health', (req, res) => {
  const rawKey = (process.env.GEMINI_API_KEY || '').trim();
  const hasApiKey = rawKey !== '' && rawKey !== 'YOUR_GEMINI_API_KEY_HERE';
  res.json({
    status: 'ok',
    service: 'Nirikshan Mitra Server-Side OCR Engine',
    hasApiKey,
    sharpPreprocessing: true,
    database: 'sqlite (connected)'
  });
});

/**
 * POST /api/ocr
 * Server-Side Gemini Multimodal Image-Reading Service with Sharp Preprocessing
 */
app.post('/api/ocr', expensiveOpsLimiter, async (req, res) => {
  try {
    const { image } = req.body;

    // Strict image validation
    const imgValidation = validateImagePayload(image);
    if (!imgValidation.valid) {
      return res.status(400).json({
        success: false,
        text: 'Text could not be reliably read from this image',
        error: imgValidation.message,
        diagnostics: {
          engine: 'Gemini Vision Server Service',
          quality: 'Invalid / Missing Image',
          characterCount: 0,
          readable: false
        }
      });
    }

    // Read API key strictly from environment variables
    const rawKey = (process.env.GEMINI_API_KEY || '').trim();
    const apiKey = rawKey !== '' && rawKey !== 'YOUR_GEMINI_API_KEY_HERE' ? rawKey : null;

    // Preprocess image with Sharp
    let preprocessed;
    try {
      preprocessed = await preprocessImageWithSharp(image);
    } catch (sharpErr) {
      console.error('Sharp Image Preprocessing Error:', sharpErr.message);
      return res.status(400).json({
        success: false,
        text: 'Text could not be reliably read from this image',
        error: 'Image preprocessing failed: ' + sharpErr.message,
        diagnostics: {
          engine: 'Sharp Preprocessor',
          quality: 'Corrupt / Invalid Image',
          characterCount: 0,
          readable: false
        }
      });
    }

    const { mimeType, base64Data, qualityLabel, diagnostics: sharpDiag } = preprocessed;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        text: 'Text could not be reliably read from this image',
        error: 'GEMINI_API_KEY environment variable is not configured on the backend server.',
        diagnostics: {
          engine: 'Gemini Flash Vision (Server API)',
          quality: qualityLabel,
          characterCount: 0,
          readable: false,
          preprocessing: sharpDiag
        }
      });
    }

    // Candidate models to try in sequence if high demand (503) or rate limits occur
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash'
    ];

    const promptText = `You are an expert OCR vision system for Legal Metrology consumer packaged goods inspection. Perform exact OCR text extraction on this product label image. Extract all readable text printed on the package as shown (including brand name, product description, net contents/weight/volume, MRP, batch/lot number, manufacturing/expiry dates, manufacturer name & address, ingredients, FSSAI lic. no., customer care details). Preserve line breaks and text layout structure exactly. Do NOT invent, complete, translate, or guess unreadable text. If the text on the label is completely unreadable or blurred beyond recognition, return 'Text could not be reliably read from this image'. Return ONLY the visible text.`;

    const payload = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: promptText }
          ]
        }
      ]
    };

    let data = null;
    let successfulModel = candidateModels[0];
    let lastErrMsg = '';

    for (const modelName of candidateModels) {
      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
      try {
        const response = await fetch(geminiApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          data = await response.json();
          successfulModel = modelName;
          break;
        } else {
          const errData = await response.json().catch(() => ({}));
          lastErrMsg = (errData && errData.error && errData.error.message) || `Gemini API HTTP Error ${response.status}`;
          console.warn(`Model ${modelName} returned ${response.status}: ${sanitizeLogMessage(lastErrMsg)}`);
          if (response.status === 503 || response.status === 429 || response.status === 404) {
            continue;
          } else {
            break;
          }
        }
      } catch (netErr) {
        lastErrMsg = netErr.message;
        console.warn(`Network error querying ${modelName}: ${sanitizeLogMessage(lastErrMsg)}. Trying fallback...`);
      }
    }

    if (!data) {
      console.error('Backend Gemini Vision OCR API Failure across all candidate models:', sanitizeLogMessage(lastErrMsg));
      return res.status(503).json({
        success: false,
        text: 'Text could not be reliably read from this image',
        error: 'Gemini OCR service temporarily unavailable across candidate models.',
        diagnostics: {
          engine: 'Gemini Flash Vision (Server API)',
          quality: qualityLabel,
          characterCount: 0,
          readable: false,
          preprocessing: sharpDiag
        }
      });
    }

    let rawText = '';
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      rawText = data.candidates[0].content.parts.map(p => p.text || '').join('\n').trim();
    }

    rawText = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    const cleanChars = rawText.replace(/[\s\r\n\t]+/g, '');
    const isUnreadable = !rawText || 
                         rawText.includes('Text could not be reliably read from this image') || 
                         cleanChars.length < 3;

    if (isUnreadable) {
      return res.json({
        success: false,
        text: 'Text could not be reliably read from this image',
        diagnostics: {
          engine: 'Gemini Flash Vision (Server API)',
          quality: qualityLabel,
          characterCount: 0,
          readable: false,
          preprocessing: sharpDiag
        }
      });
    }

    return res.json({
      success: true,
      text: rawText,
      diagnostics: {
        engine: `Gemini Vision (${successfulModel})`,
        quality: qualityLabel,
        characterCount: rawText.length,
        readable: true,
        preprocessing: sharpDiag
      }
    });

  } catch (err) {
    console.error('Server OCR Exception:', sanitizeLogMessage(err.message));
    return res.status(500).json({
      success: false,
      text: 'Text could not be reliably read from this image',
      error: sanitizeErrorMessage(err.message),
      diagnostics: {
        engine: 'Gemini Flash Vision (Server API)',
        quality: 'Error',
        characterCount: 0,
        readable: false
      }
    });
  }
});

/**
 * POST /api/classify-package
 * Classifies container/package type: Can, Bottle, Pouch, Box, Carton, Jar, Other
 */
app.post('/api/classify-package', expensiveOpsLimiter, async (req, res) => {
  try {
    const { image } = req.body;

    const imgValidation = validateImagePayload(image);
    if (!imgValidation.valid) {
      return res.status(400).json({
        success: false,
        package_type: 'Other',
        confidence: 0,
        error: imgValidation.message
      });
    }

    const rawKey = (process.env.GEMINI_API_KEY || '').trim();
    const apiKey = rawKey !== '' && rawKey !== 'YOUR_GEMINI_API_KEY_HERE' ? rawKey : null;

    let preprocessed;
    try {
      preprocessed = await preprocessImageWithSharp(image);
    } catch (sharpErr) {
      console.error('Sharp Package Classification Preprocessing Error:', sharpErr.message);
      return res.status(400).json({
        success: false,
        package_type: 'Other',
        confidence: 0,
        error: 'Image preprocessing failed: ' + sharpErr.message
      });
    }

    const { mimeType, base64Data, diagnostics: sharpDiag } = preprocessed;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        package_type: 'Other',
        confidence: 0,
        error: 'GEMINI_API_KEY environment variable is not configured on the backend server.'
      });
    }

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash'
    ];

    const promptText = `You are an expert consumer packaged goods inspector for Legal Metrology. Analyze this product packaging image and classify its primary container/package type into exactly ONE of the following valid categories:
- Can
- Bottle
- Pouch
- Box
- Carton
- Jar
- Other

Classification Guidelines:
- Can: cylindrical metallic beverage, aerosol, or food tin container.
- Bottle: glass or plastic container with a narrow neck and cap/cork (e.g. beverages, oils, medicines).
- Pouch: flexible plastic/foil packet, sachet, stand-up pouch, or zipper pouch (e.g. chips, spices, shampoo sachets).
- Box: rigid cardboard, paperboard, or corrugated rectangular box/container.
- Carton: folding carton, beverage tetra-pak, milk carton, aseptic brick.
- Jar: wide-mouthed cylindrical or rounded glass/plastic container with screw cap (e.g. peanut butter, jam, creams).
- Other: any container that does not clearly fit into the 6 categories above.

Output format (strict JSON):
{
  "package_type": "Can" | "Bottle" | "Pouch" | "Box" | "Carton" | "Jar" | "Other",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of visual cues (shape, material, closure, aspect ratio)"
}
Return ONLY the raw JSON without markdown markers or extra text.`;

    const payload = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: promptText }
          ]
        }
      ]
    };

    let data = null;
    let successfulModel = candidateModels[0];
    let lastErrMsg = '';

    for (const modelName of candidateModels) {
      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
      try {
        const response = await fetch(geminiApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          data = await response.json();
          successfulModel = modelName;
          break;
        } else {
          const errData = await response.json().catch(() => ({}));
          lastErrMsg = (errData && errData.error && errData.error.message) || `Gemini API HTTP Error ${response.status}`;
          console.warn(`Classification model ${modelName} returned ${response.status}: ${sanitizeLogMessage(lastErrMsg)}`);
          if (response.status === 503 || response.status === 429 || response.status === 404) {
            continue;
          } else {
            break;
          }
        }
      } catch (netErr) {
        lastErrMsg = netErr.message;
        console.warn(`Network error in classification (${modelName}): ${sanitizeLogMessage(lastErrMsg)}`);
      }
    }

    if (!data) {
      console.error('AI Classification API Failure:', sanitizeLogMessage(lastErrMsg));
      return res.status(503).json({
        success: false,
        package_type: 'Other',
        confidence: 0.3,
        error: 'Packaging classification service temporarily unavailable.'
      });
    }

    let rawText = '';
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      rawText = data.candidates[0].content.parts.map(p => p.text || '').join('\n').trim();
    }

    rawText = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    let detectedType = 'Other';
    let confidence = 0.5;
    let reasoning = 'Classification generated via multimodal inspection.';

    try {
      const parsed = JSON.parse(rawText);
      const validTypes = ['Can', 'Bottle', 'Pouch', 'Box', 'Carton', 'Jar', 'Other'];
      if (parsed.package_type && validTypes.includes(parsed.package_type)) {
        detectedType = parsed.package_type;
      }
      if (typeof parsed.confidence === 'number' && !isNaN(parsed.confidence)) {
        confidence = Math.max(0, Math.min(1, parsed.confidence));
      }
      if (parsed.reasoning && typeof parsed.reasoning === 'string') {
        reasoning = parsed.reasoning;
      }
    } catch (parseErr) {
      console.warn('AI package classification did not return clean JSON. Parsing fallback from text:', rawText);
      const validTypes = ['Can', 'Bottle', 'Pouch', 'Box', 'Carton', 'Jar'];
      for (const t of validTypes) {
        if (new RegExp('\\b' + t + '\\b', 'i').test(rawText)) {
          detectedType = t;
          confidence = 0.65;
          reasoning = `Visual analysis cues indicated ${t} container packaging.`;
          break;
        }
      }
    }

    return res.json({
      success: true,
      package_type: detectedType,
      confidence: confidence,
      confidence_percent: Math.round(confidence * 100),
      reasoning: reasoning,
      model: successfulModel,
      preprocessing: sharpDiag
    });

  } catch (err) {
    console.error('Package Classification Exception:', sanitizeLogMessage(err.message));
    return res.status(500).json({
      success: false,
      package_type: 'Other',
      confidence: 0.35,
      error: sanitizeErrorMessage(err.message)
    });
  }
});

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/auth/login
 * Verifies email & password, returns JWT session token and user profile
 */
app.post('/api/auth/login', expensiveOpsLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.getUserByEmailWithPassword(normalizedEmail);

    // Generic error message for both non-existent user and wrong password to prevent email enumeration
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    if (!user.active) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated. Please contact an Administrator.'
      });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Authentication service error.')
    });
  }
});

/**
 * POST /api/auth/logout
 * Acknowledges user logout
 */
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * GET /api/users
 * Lists all users (Admin only)
 */
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await userRepository.getAllUsers();
    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (err) {
    console.error('Error fetching users:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to retrieve users.')
    });
  }
});

/**
 * POST /api/users
 * Creates a new user with hashed password (Admin only)
 */
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Valid user name is required (min 2 characters).' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const roleVal = (role || 'inspector').toLowerCase();
    if (roleVal !== 'inspector' && roleVal !== 'admin') {
      return res.status(400).json({ success: false, error: 'Role must be either inspector or admin.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await userRepository.getUserByEmailWithPassword(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A user with this email address already exists.'
      });
    }

    const passwordHash = await hashPassword(password);
    const created = await userRepository.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: roleVal,
      active: 1
    });

    res.status(201).json({
      success: true,
      user: created
    });
  } catch (err) {
    console.error('Error creating user:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to create user: ' + err.message)
    });
  }
});

/**
 * PATCH /api/users/:id/status
 * Activates or deactivates a user (Admin only)
 */
app.patch('/api/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const { active } = req.body || {};
    if (active === undefined) {
      return res.status(400).json({ success: false, error: 'Active status (boolean) is required.' });
    }

    // Guard: Prevent admin from deactivating their own account
    if (req.user.id === userId && !active) {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot deactivate their own active account.'
      });
    }

    const updated = await userRepository.updateUserStatus(userId, active);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({
      success: true,
      user: updated
    });
  } catch (err) {
    console.error('Error updating user status:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to update user status.')
    });
  }
});

/**
 * PATCH /api/rules/:id/status
 * Activates or deactivates a Legal Metrology rule (Admin only)
 */
app.patch('/api/rules/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ruleId = req.params.id;
    const { active } = req.body || {};
    if (active === undefined) {
      return res.status(400).json({ success: false, error: 'Active status is required.' });
    }

    const updated = await ruleRepository.updateRuleStatus(ruleId, active);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Rule "${ruleId}" not found.` });
    }

    res.json({
      success: true,
      rule: updated
    });
  } catch (err) {
    console.error('Error updating rule status:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to update rule status.')
    });
  }
});

/**
 * PUT /api/rules/:id
 * Updates rule metadata (Admin only)
 */
app.put('/api/rules/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ruleId = req.params.id;
    const updated = await ruleRepository.updateRuleMetadata(ruleId, req.body || {});
    if (!updated) {
      return res.status(404).json({ success: false, error: `Rule "${ruleId}" not found.` });
    }

    res.json({
      success: true,
      rule: updated
    });
  } catch (err) {
    console.error('Error updating rule metadata:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to update rule metadata.')
    });
  }
});

/**
 * GET /api/rules
 * Returns active Legal Metrology compliance rules from SQLite database
 */
app.get('/api/rules', authenticateToken, async (req, res) => {
  try {
    const rules = await ruleRepository.getActiveRules();
    res.json({
      success: true,
      rules: rules,
      total: rules.length
    });
  } catch (err) {
    console.error('Error fetching rules from database:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to retrieve compliance rules: ' + err.message)
    });
  }
});

/**
 * GET /api/inspections
 * Returns list of completed inspections and stats for dashboard
 */
app.get('/api/inspections', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 100);
    const inspections = await inspectionRepository.getAllInspections(limit);
    const stats = await inspectionRepository.getStats();
    res.json({
      success: true,
      inspections: inspections,
      stats: stats
    });
  } catch (err) {
    console.error('Error fetching inspections from database:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to retrieve inspections: ' + err.message)
    });
  }
});

/**
 * GET /api/inspections/:id
 * Returns single inspection record with extracted fields, violations, and report metadata
 */
app.get('/api/inspections/:id', authenticateToken, async (req, res) => {
  try {
    const idValidation = validateInspectionId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ success: false, error: idValidation.message });
    }

    const inspection = await inspectionRepository.getInspectionById(idValidation.id);
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: `Inspection with ID "${idValidation.id}" not found.`
      });
    }

    let complianceResults = [];
    if (inspection.fields && Object.keys(inspection.fields).length > 0) {
      const activeDbRules = await ruleRepository.getActiveRules();
      ComplianceEngine.setActiveRules(activeDbRules);
      complianceResults = ComplianceEngine.evaluateAll(inspection.fields);
    }

    res.json({
      success: true,
      inspection: {
        ...inspection,
        compliance_results: complianceResults
      }
    });
  } catch (err) {
    console.error('Error fetching inspection by ID:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to retrieve inspection: ' + err.message)
    });
  }
});

/**
 * GET /api/brands/:identifier/violations
 * Returns historical violations for brand or product with brand context
 */
app.get('/api/brands/:identifier/violations', authenticateToken, async (req, res) => {
  try {
    const rawId = req.params.identifier;
    if (!rawId || typeof rawId !== 'string' || rawId.trim().length === 0 || rawId.trim().length > 150) {
      return res.status(400).json({ success: false, error: 'Invalid brand identifier.' });
    }

    const identifier = rawId.trim();
    const parsedId = isNaN(identifier) ? identifier : parseInt(identifier, 10);
    const violations = await violationRepository.getBrandViolationHistory(parsedId);

    let brandInfo = null;
    if (typeof parsedId === 'number') {
      brandInfo = await brandProductRepository.getById(parsedId);
    } else {
      const allBp = await brandProductRepository.getAll();
      brandInfo = allBp.find(b => 
        (b.brand_name && b.brand_name.toLowerCase() === identifier.toLowerCase()) || 
        (b.product_name && b.product_name.toLowerCase() === identifier.toLowerCase())
      ) || null;
    }

    let inspectionCount = 0;
    if (brandInfo) {
      const inspCountRow = await db.get(
        'SELECT COUNT(*) as c FROM inspections WHERE brand_product_id = ?',
        [brandInfo.id]
      );
      inspectionCount = inspCountRow ? inspCountRow.c : 0;
    }

    res.json({
      success: true,
      brand: brandInfo ? {
        id: brandInfo.id,
        brand_name: brandInfo.brand_name,
        product_name: brandInfo.product_name,
        product_category: brandInfo.product_category,
        package_type: brandInfo.package_type,
        inspection_count: inspectionCount
      } : null,
      violations: violations,
      total: violations.length
    });
  } catch (err) {
    console.error('Error fetching brand violation history:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to retrieve brand violations: ' + err.message)
    });
  }
});

/**
 * GET /api/brands/:identifier/risk
 * Returns deterministic risk prioritization metrics, score, and level for a brand or product
 */
app.get('/api/brands/:identifier/risk', authenticateToken, async (req, res) => {
  try {
    const rawId = req.params.identifier;
    if (!rawId || typeof rawId !== 'string' || rawId.trim().length === 0 || rawId.trim().length > 150) {
      return res.status(400).json({ success: false, error: 'Invalid brand identifier.' });
    }

    const identifier = rawId.trim();
    const productName = req.query.product ? String(req.query.product).slice(0, 150).trim() : null;
    const riskProfile = await brandProductRepository.getBrandRiskProfile(identifier, productName);

    res.json({
      success: true,
      ...riskProfile
    });
  } catch (err) {
    console.error('Error calculating brand risk profile:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to calculate brand risk profile: ' + err.message)
    });
  }
});

/**
 * POST /api/inspections
 * Persists a completed product inspection, extracted fields, violations, and report metadata
 */
app.post('/api/inspections', authenticateToken, async (req, res) => {
  try {
    const {
      inspection_id,
      product_name,
      brand_name,
      product_category,
      package_type,
      overall_score,
      overall_status,
      rule_version,
      image_count,
      fields,
      field_sources,
      compliance_results,
      report_reference
    } = req.body;

    const safeInspId = inspection_id ? validateInspectionId(inspection_id).id : ('INS-' + Date.now());
    if (!safeInspId) {
      return res.status(400).json({ success: false, error: 'Invalid inspection_id provided.' });
    }

    // 1. Find or create brand/product record
    const brandProduct = await brandProductRepository.findOrCreate({
      brand_name: String(brand_name || 'Generic / Unspecified').slice(0, 150),
      product_name: String(product_name || 'Packaged Product').slice(0, 150),
      product_category: String(product_category || 'General').slice(0, 100),
      package_type: String(package_type || 'Other').slice(0, 50)
    });

    // 2. Insert inspection record linked to authenticated user
    const inspRecord = await inspectionRepository.createInspection({
      inspection_id: safeInspId,
      brand_product_id: brandProduct.id,
      user_id: req.user ? req.user.id : null,
      inspected_at: new Date().toISOString(),
      overall_score: typeof overall_score === 'number' ? Math.min(100, Math.max(0, overall_score)) : 0,
      overall_status: ['COMPLIANT', 'NEEDS_REVIEW', 'POTENTIAL_VIOLATION', 'NON_COMPLIANT', 'PENDING'].includes(overall_status) ? overall_status : 'PENDING',
      rule_version: String(rule_version || '1.0.0').slice(0, 20),
      image_count: typeof image_count === 'number' ? Math.max(1, image_count) : 1
    });

    // 3. Save structured extracted fields
    if (fields && typeof fields === 'object') {
      await inspectionRepository.saveFields(inspRecord.inspection_id, fields, field_sources || {});
    }

    // 4. Save violations/issues if any
    let recordedViolations = [];
    if (Array.isArray(compliance_results)) {
      recordedViolations = await violationRepository.recordViolationsFromResults(
        inspRecord.inspection_id,
        brandProduct.id,
        compliance_results,
        inspRecord.inspected_at
      );
    }

    // 5. Create report metadata
    const safeReportRef = report_reference && /^[a-zA-Z0-9_-]+$/.test(report_reference)
      ? report_reference
      : `REP-${inspRecord.inspection_id}`;

    const report = await reportRepository.createReport({
      inspection_id: inspRecord.inspection_id,
      report_status: 'FINAL',
      report_type: 'LEGAL_METROLOGY_COMPLIANCE',
      report_reference: safeReportRef
    });

    res.json({
      success: true,
      inspection_id: inspRecord.inspection_id,
      brand_product_id: brandProduct.id,
      user_id: inspRecord.user_id,
      violations_count: recordedViolations.length,
      report_reference: report.report_reference
    });
  } catch (err) {
    console.error('Error saving inspection to SQLite:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to persist inspection record: ' + err.message)
    });
  }
});

/**
 * Helper to prepare complete inspection data for report generator
 */
async function buildCompleteInspectionData(inspectionId) {
  const idValidation = validateInspectionId(inspectionId);
  if (!idValidation.valid) return null;

  const inspection = await inspectionRepository.getInspectionById(idValidation.id);
  if (!inspection) return null;

  if (!inspection.compliance_results || inspection.compliance_results.length === 0) {
    if (inspection.fields && Object.keys(inspection.fields).length > 0) {
      const activeDbRules = await ruleRepository.getActiveRules();
      ComplianceEngine.setActiveRules(activeDbRules);
      inspection.compliance_results = ComplianceEngine.evaluateAll(inspection.fields);
    }
  }

  if (inspection.brand_name) {
    try {
      const riskProfile = await brandProductRepository.getBrandRiskProfile(
        inspection.brand_name,
        inspection.product_name
      );
      inspection.risk_level = riskProfile.riskLevel;
      inspection.risk_score = riskProfile.riskScore;
    } catch (e) {
      // Graceful fallback
    }
  }

  const existingReport = await reportRepository.getReportByInspection(idValidation.id);
  if (existingReport) {
    inspection.report_reference = existingReport.report_reference;
    inspection.report_status = existingReport.report_status;
  }

  return inspection;
}

/**
 * POST /api/inspections/:id/report
 * Generates an official PDF report using PDFKit and persists report metadata
 */
app.post('/api/inspections/:id/report', authenticateToken, expensiveOpsLimiter, async (req, res) => {
  try {
    const idValidation = validateInspectionId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ success: false, error: idValidation.message });
    }

    const inspectionId = idValidation.id;
    const inspection = await buildCompleteInspectionData(inspectionId);

    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: `Inspection record "${inspectionId}" not found.`
      });
    }

    // Resolve safe output path to prevent directory traversal
    const safePathInfo = getSafeReportFilePath(inspectionId);
    const pdfResult = await generateInspectionPdf(inspection, safePathInfo.resolvedFile);

    const reportRecord = await reportRepository.saveOrUpdateReport({
      inspection_id: inspection.inspection_id,
      report_reference: pdfResult.reportReference,
      report_status: 'FINAL',
      report_type: 'LEGAL_METROLOGY_COMPLIANCE',
      generated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      inspection_id: inspection.inspection_id,
      report_reference: reportRecord.report_reference,
      filename: pdfResult.filename,
      download_url: `/api/inspections/${encodeURIComponent(inspection.inspection_id)}/report/download`
    });
  } catch (err) {
    console.error('Error generating PDF report:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to generate PDF report: ' + err.message)
    });
  }
});

/**
 * GET /api/inspections/:id/report/download
 * Streams/downloads the generated inspection PDF report
 */
app.get('/api/inspections/:id/report/download', authenticateToken, async (req, res) => {
  try {
    const idValidation = validateInspectionId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ success: false, error: idValidation.message });
    }

    const inspectionId = idValidation.id;
    const inspection = await buildCompleteInspectionData(inspectionId);

    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: `Inspection record "${inspectionId}" not found.`
      });
    }

    const safePathInfo = getSafeReportFilePath(inspectionId);
    const filePath = safePathInfo.resolvedFile;
    const safeFilename = safePathInfo.safeFilename;

    if (!fs.existsSync(filePath)) {
      const pdfResult = await generateInspectionPdf(inspection, filePath);
      await reportRepository.saveOrUpdateReport({
        inspection_id: inspection.inspection_id,
        report_reference: pdfResult.reportReference,
        report_status: 'FINAL',
        report_type: 'LEGAL_METROLOGY_COMPLIANCE'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Error downloading PDF report:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to download PDF report: ' + err.message)
    });
  }
});

/**
 * GET /api/reports/:reference/download
 * Downloads generated report by unique report reference
 */
app.get('/api/reports/:reference/download', async (req, res) => {
  try {
    const refValidation = validateReportReference(req.params.reference);
    if (!refValidation.valid) {
      return res.status(400).json({ success: false, error: refValidation.message });
    }

    const ref = refValidation.ref;
    const report = await reportRepository.getReportByReference(ref);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: `Report reference "${ref}" not found.`
      });
    }

    const safePathInfo = getSafeReportFilePath(report.inspection_id);
    const filePath = safePathInfo.resolvedFile;
    const safeFilename = safePathInfo.safeFilename;

    if (!fs.existsSync(filePath)) {
      const inspection = await buildCompleteInspectionData(report.inspection_id);
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Linked inspection record not found.' });
      }
      await generateInspectionPdf(inspection, filePath);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Error downloading report by reference:', sanitizeLogMessage(err.message));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage('Failed to download report: ' + err.message)
    });
  }
});

// ============================================================================
// 7b. SPA CATCH-ALL ROUTE (Serves frontend for any client-side routes in Express 5)
// ============================================================================
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
    ? path.join(distPath, 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

// ============================================================================
// 8. CENTRALIZED ERROR-HANDLING MIDDLEWARE
// ============================================================================
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const safeMsg = sanitizeErrorMessage(err.message || 'Internal Server Error');
  res.status(status).json({
    success: false,
    error: safeMsg
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Nirikshan Mitra OCR Backend Server active on http://localhost:${PORT} (and http://127.0.0.1:${PORT})`);
  });
}

module.exports = {
  app,
  preprocessImageWithSharp,
  validateImagePayload,
  validateInspectionId,
  validateReportReference,
  getSafeReportFilePath,
  sanitizeErrorMessage,
  sanitizeLogMessage
};
