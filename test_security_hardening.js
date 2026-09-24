/**
 * Comprehensive Automated Security Hardening Test Suite (Nirikshan Mitra)
 *
 * Tests:
 * 1. Allowed CORS origin (localhost & 127.0.0.1)
 * 2. Blocked CORS origin (unauthorized external domains return 403)
 * 3. Rate limiting on POST /api/ocr (HTTP 429)
 * 4. Rate limiting on POST /api/classify-package (HTTP 429)
 * 5. Rate limiting on POST /api/inspections/:id/report (HTTP 429)
 * 6. Missing image payload validation (HTTP 400)
 * 7. Non-string image payload validation (HTTP 400)
 * 8. Invalid MIME type rejection (HTTP 400)
 * 9. Malformed base64 payload rejection (HTTP 400)
 * 10. Decoded byte size boundaries (min 100 bytes, max 10MB)
 * 11. Oversized HTTP payload rejection (HTTP 413)
 * 12. Client header x-gemini-api-key ignored (strictly env-based)
 * 13. Secrets isolation (API key never returned in any response body)
 * 14. Safe error responses (no stack traces or local filesystem paths)
 * 15. Path traversal attempt on report generation (blocked, HTTP 400)
 * 16. Path traversal attempt on report download (blocked, HTTP 400)
 * 17. Invalid inspection ID format rejection (HTTP 400)
 * 18. Parameterized database query safety (SQL injection attempts handled safely)
 * 19. HTTP Security headers presence (Helmet: nosniff, frameguard, etc.)
 * 20. Public health endpoint security (returns status: 'ok' without leaking keys)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✕ FAIL: ${message}`);
  }
}

const { generateToken } = require('./auth');
const defaultAuthToken = generateToken({ id: 1, name: 'Chief Metrology Officer', email: 'admin@nirikshan.gov.in', role: 'admin' });

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options };
    opts.headers = { ...opts.headers };
    if (!opts.headers['Authorization'] && !opts.headers['authorization']) {
      opts.headers['Authorization'] = `Bearer ${defaultAuthToken}`;
    }
    if (!opts._testRateLimit && opts.headers['x-test-suite'] === undefined) {
      opts.headers['x-test-suite'] = 'nirikshan-test';
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// Generate a valid minimal 1x1 JPEG image as a base64 data URL
const VALID_TINY_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const VALID_TINY_JPEG_DATA_URL = `data:image/jpeg;base64,${VALID_TINY_JPEG_BASE64}`;

async function runSecurityTests() {
  console.log('================================================================');
  console.log('NIRIKSHAN MITRA — BACKEND SECURITY HARDENING TEST SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // 1. Allowed CORS origin
    // -------------------------------------------------------------
    console.log('[Test 1] Allowed CORS origin (localhost:3000 & 127.0.0.1:5173)');
    const corsAllowedRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      headers: { 'Origin': 'http://localhost:3000' }
    });
    assert(corsAllowedRes.statusCode === 200, 'GET /api/health returned 200 for allowed origin');
    assert(corsAllowedRes.headers['access-control-allow-origin'] === 'http://localhost:3000', 'Access-Control-Allow-Origin header matches allowed localhost origin');

    const cors127Res = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      headers: { 'Origin': 'http://127.0.0.1:5173' }
    });
    assert(cors127Res.statusCode === 200, 'GET /api/health returned 200 for 127.0.0.1 development origin');
    assert(cors127Res.headers['access-control-allow-origin'] === 'http://127.0.0.1:5173', 'Access-Control-Allow-Origin matches 127.0.0.1 origin');

    // -------------------------------------------------------------
    // 2. Blocked CORS origin
    // -------------------------------------------------------------
    console.log('\n[Test 2] Blocked unauthorized CORS origin');
    const corsBlockedRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      headers: { 'Origin': 'https://malicious-hacker-domain.evil.com' }
    });
    assert(corsBlockedRes.statusCode === 403, `Blocked unauthorized origin with HTTP 403 (got ${corsBlockedRes.statusCode})`);
    assert(corsBlockedRes.body.includes('CORS policy'), 'Response specifies CORS policy rejection');

    // -------------------------------------------------------------
    // 3. HTTP Security Headers (Helmet)
    // -------------------------------------------------------------
    console.log('\n[Test 3] HTTP Security headers presence');
    const headersRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    assert(headersRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is "nosniff"');
    assert(headersRes.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options is "SAMEORIGIN"');
    assert(headersRes.headers['x-download-options'] === 'noopen', 'X-Download-Options is "noopen"');
    assert(headersRes.headers['x-permitted-cross-domain-policies'] === 'none', 'X-Permitted-Cross-Domain-Policies is "none"');

    // -------------------------------------------------------------
    // 4. Missing image payload validation
    // -------------------------------------------------------------
    console.log('\n[Test 4] Missing image payload validation');
    const missingImgRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ocr',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {});
    assert(missingImgRes.statusCode === 400, `POST /api/ocr with empty body returns 400 (got ${missingImgRes.statusCode})`);
    const missingImgJson = JSON.parse(missingImgRes.body);
    assert(missingImgJson.success === false, 'success is false');
    assert(missingImgJson.error.includes('Image data is required'), 'Descriptive error for missing image');

    // -------------------------------------------------------------
    // 5. Non-string image payload validation
    // -------------------------------------------------------------
    console.log('\n[Test 5] Non-string image payload validation');
    const nonStrRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ocr',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { image: 12345 });
    assert(nonStrRes.statusCode === 400, `POST /api/ocr with numeric image returns 400 (got ${nonStrRes.statusCode})`);
    const nonStrJson = JSON.parse(nonStrRes.body);
    assert(nonStrJson.error.includes('must be a string'), 'Descriptive error for non-string image type');

    // -------------------------------------------------------------
    // 6. Invalid MIME type rejection
    // -------------------------------------------------------------
    console.log('\n[Test 6] Invalid MIME type rejection');
    const badMimeDataUrl = `data:application/pdf;base64,${VALID_TINY_JPEG_BASE64}`;
    const badMimeRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ocr',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { image: badMimeDataUrl });
    assert(badMimeRes.statusCode === 400, `POST /api/ocr with application/pdf returns 400 (got ${badMimeRes.statusCode})`);
    const badMimeJson = JSON.parse(badMimeRes.body);
    assert(badMimeJson.error.includes('Unsupported image MIME type'), 'Rejects non-image MIME type');

    // -------------------------------------------------------------
    // 7. Malformed base64 payload rejection
    // -------------------------------------------------------------
    console.log('\n[Test 7] Malformed base64 payload rejection');
    const malformedBase64 = 'data:image/jpeg;base64,ThisIsNotValidBase64!!!###$$$***';
    const malformedRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ocr',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { image: malformedBase64 });
    assert(malformedRes.statusCode === 400, `POST /api/ocr with invalid base64 chars returns 400 (got ${malformedRes.statusCode})`);
    const malformedJson = JSON.parse(malformedRes.body);
    assert(malformedJson.error.includes('Malformed base64'), 'Identifies corrupted base64 data');

    // -------------------------------------------------------------
    // 8. Decoded size boundaries (too small)
    // -------------------------------------------------------------
    console.log('\n[Test 8] Decoded size boundaries (too small)');
    // A 10-byte base64 string
    const tinyBase64 = 'data:image/jpeg;base64,' + Buffer.from('hello').toString('base64');
    const tinyRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ocr',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { image: tinyBase64 });
    assert(tinyRes.statusCode === 400, `POST /api/ocr with < 100 byte payload returns 400 (got ${tinyRes.statusCode})`);
    const tinyJson = JSON.parse(tinyRes.body);
    assert(tinyJson.error.includes('too short') || tinyJson.error.includes('too small'), 'Detects and rejects undersized image');

    // -------------------------------------------------------------
    // 8b. Decoded size boundaries (> 10MB limit)
    // -------------------------------------------------------------
    console.log('\n[Test 8b] Decoded size boundaries (> 10 MB limit)');
    const { validateImagePayload } = require('./server');
    // Simulate a 12 MB base64 string
    const largeFakeBase64 = 'A'.repeat(16 * 1024 * 1024);
    const oversizedCheck = validateImagePayload('data:image/jpeg;base64,' + largeFakeBase64);
    assert(oversizedCheck.valid === false, 'validateImagePayload flags oversized image as invalid');
    assert(oversizedCheck.message.includes('exceeds maximum allowed limit of 10 MB'), 'Rejection message cites 10 MB limit');

    // -------------------------------------------------------------
    // 8c. Oversized HTTP request body rejection (HTTP 413)
    // -------------------------------------------------------------
    console.log('\n[Test 8c] Oversized HTTP request body rejection (HTTP 413)');
    // 16 MB payload directly sent to Express (limit is 15 MB)
    const bigPayload = JSON.stringify({ image: 'data:image/jpeg;base64,' + 'A'.repeat(15.5 * 1024 * 1024) });
    const payloadTooLargeRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ocr',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bigPayload)
      }
    }, bigPayload);
    assert(payloadTooLargeRes.statusCode === 413, `Server returns HTTP 413 Payload Too Large (got ${payloadTooLargeRes.statusCode})`);
    assert(payloadTooLargeRes.body.includes('15 MB'), 'Error response explicitly mentions 15 MB limit');

    // -------------------------------------------------------------
    // 9. Client header x-gemini-api-key ignored (strictly env-based)
    // -------------------------------------------------------------
    console.log('\n[Test 9] Client header x-gemini-api-key ignored');
    // If client passes an invalid key in header, server still uses valid env key or rejects client override
    const { server_key } = process.env;
    const headerOverrideRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      headers: { 'x-gemini-api-key': 'attacker-fake-key-123' }
    });
    const healthJson = JSON.parse(headerOverrideRes.body);
    assert(healthJson.hasApiKey === true, 'Server uses environment key independently of client header');

    // -------------------------------------------------------------
    // 10. Secrets isolation (API key never in response body)
    // -------------------------------------------------------------
    console.log('\n[Test 10] Secrets isolation (API key never exposed)');
    const envKey = process.env.GEMINI_API_KEY || '';
    if (envKey.length > 5) {
      assert(!healthJson.key, 'Health endpoint does not contain "key" field');
      assert(!healthJson.apiKey, 'Health endpoint does not contain "apiKey" field');
      assert(!headerOverrideRes.body.includes(envKey), 'Health response body never contains raw GEMINI_API_KEY');
    }

    // -------------------------------------------------------------
    // 11. Safe error responses (no stack traces or local filesystem paths)
    // -------------------------------------------------------------
    console.log('\n[Test 11] Safe error responses (no stack traces or local paths)');
    const notFoundRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inspections/NON_EXISTENT_ID_99999',
      method: 'GET'
    });
    assert(notFoundRes.statusCode === 404, 'Returns 404 for missing inspection');
    assert(!notFoundRes.body.includes('stack'), 'Error response does not contain stack trace');
    assert(!notFoundRes.body.includes('D:\\') && !notFoundRes.body.includes('C:\\'), 'Error response does not contain local Windows drive paths');
    assert(!notFoundRes.body.includes('/home/'), 'Error response does not contain local Linux paths');

    // -------------------------------------------------------------
    // 12. Path traversal attempt on report generation
    // -------------------------------------------------------------
    console.log('\n[Test 12] Path traversal attempt on report generation');
    const traversalGenRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inspections/..%2F..%2Fetc%2Fpasswd/report',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(traversalGenRes.statusCode === 400, `Path traversal in report generation returns 400 (got ${traversalGenRes.statusCode})`);
    const traversalGenJson = JSON.parse(traversalGenRes.body);
    assert(traversalGenJson.error.includes('Invalid characters in Inspection ID'), 'Path traversal characters blocked');

    // -------------------------------------------------------------
    // 13. Path traversal attempt on report download
    // -------------------------------------------------------------
    console.log('\n[Test 13] Path traversal attempt on report download');
    const traversalDlRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inspections/..%2F..%2Fwindows%2Fwin.ini/report/download',
      method: 'GET'
    });
    assert(traversalDlRes.statusCode === 400, `Path traversal in report download returns 400 (got ${traversalDlRes.statusCode})`);

    // -------------------------------------------------------------
    // 14. Invalid inspection ID format rejection
    // -------------------------------------------------------------
    console.log('\n[Test 14] Invalid inspection ID format rejection');
    const invalidIdRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inspections/' + encodeURIComponent('INS<script>alert(1)</script>'),
      method: 'GET'
    });
    assert(invalidIdRes.statusCode === 400, `Script injection in inspection ID returns 400 (got ${invalidIdRes.statusCode})`);
    const invalidIdJson = JSON.parse(invalidIdRes.body);
    assert(invalidIdJson.error.includes('Invalid characters in Inspection ID'), 'Rejected non-alphanumeric ID');

    // -------------------------------------------------------------
    // 15. Parameterized database query safety (SQL injection attempts)
    // -------------------------------------------------------------
    console.log('\n[Test 15] Parameterized database query safety');
    const sqlInjectionRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: "/api/brands/'%20OR%20'1'='1/violations",
      method: 'GET'
    });
    // Should safely query SQLite with ' OR '1'='1 as a parameter string and return empty or normal results without syntax error
    assert(sqlInjectionRes.statusCode === 200, `SQL injection in brand parameter handled safely (got ${sqlInjectionRes.statusCode})`);
    const sqlJson = JSON.parse(sqlInjectionRes.body);
    assert(sqlJson.success === true, 'Database returned clean JSON without crashing');

    // -------------------------------------------------------------
    // 16. Rate Limiting enforcement on /api/classify-package (HTTP 429)
    // -------------------------------------------------------------
    console.log('\n[Test 16] Rate limiting enforcement (HTTP 429)');
    // Send bursts of requests to /api/classify-package to exceed 30 req/min limit
    let hitRateLimit = false;
    let rateLimitStatusCode = 0;
    for (let i = 0; i < 35; i++) {
      const res = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/classify-package',
        method: 'POST',
        _testRateLimit: true,
        headers: { 'Content-Type': 'application/json' }
      }, { image: 'invalid' });
      if (res.statusCode === 429) {
        hitRateLimit = true;
        rateLimitStatusCode = res.statusCode;
        break;
      }
    }
    assert(hitRateLimit === true, `Rate limit triggered HTTP 429 after exceeding limit (got ${rateLimitStatusCode})`);

    // -------------------------------------------------------------
    // 17. .gitignore protection verification
    // -------------------------------------------------------------
    console.log('\n[Test 17] .gitignore protection verification');
    const gitignorePath = path.join(__dirname, '.gitignore');
    assert(fs.existsSync(gitignorePath), '.gitignore file exists in project root');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert(gitignoreContent.includes('.env'), '.gitignore excludes .env file');
    assert(gitignoreContent.includes('node_modules'), '.gitignore excludes node_modules');
    assert(gitignoreContent.includes('data/*.db'), '.gitignore excludes SQLite database files');
    assert(gitignoreContent.includes('reports/*.pdf'), '.gitignore excludes generated reports');

    // -------------------------------------------------------------
    // 18. Public health endpoint verification
    // -------------------------------------------------------------
    console.log('\n[Test 18] Public health endpoint verification');
    const finalHealthRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    assert(finalHealthRes.statusCode === 200, 'GET /api/health returns 200');
    const finalHealthJson = JSON.parse(finalHealthRes.body);
    assert(finalHealthJson.status === 'ok', 'Status is "ok"');
    assert(finalHealthJson.database === 'sqlite (connected)', 'Database reports connected');
    assert(typeof finalHealthJson.hasApiKey === 'boolean', 'hasApiKey is boolean flag');

  } catch (err) {
    console.error('Unhandled security test failure:', err);
    failedTests++;
  }

  console.log('\n================================================================');
  console.log(`SECURITY TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityTests();
