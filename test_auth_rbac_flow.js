/**
 * test_auth_rbac_flow.js
 * Comprehensive automated verification for Nirikshan Mitra Authentication & RBAC
 */

const http = require('http');
const { db, initDatabase, userRepository, ruleRepository, inspectionRepository } = require('./database');
const { hashPassword, verifyPassword, generateToken, verifyToken } = require('./auth');

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'x-test-suite': 'nirikshan-test',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json !== null ? json : data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(bodyStr));
      req.write(bodyStr);
    }
    req.end();
  });
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAuthRbacTestSuite() {
  console.log('===============================================================');
  console.log('NIRIKSHAN MITRA — AUTHENTICATION & ROLE-BASED ACCESS CONTROL');
  console.log('===============================================================\n');

  // Test 1: Database Schema and Tables
  console.log('[Phase 1] Verifying SQLite Users Table Schema & Indexes...');
  const tableInfo = await db.all("PRAGMA table_info(users)");
  const colNames = tableInfo.map(c => c.name);
  assert(colNames.includes('id') && colNames.includes('name') && colNames.includes('email') &&
         colNames.includes('password_hash') && colNames.includes('role') && colNames.includes('active'),
         'users table contains all required columns (id, name, email, password_hash, role, active)');

  const inspCols = await db.all("PRAGMA table_info(inspections)");
  assert(inspCols.some(c => c.name === 'user_id'), 'inspections table has user_id foreign key column');

  // Test 2: Password hashing & verification
  console.log('\n[Phase 2] Verifying bcrypt password hashing & security...');
  const testPlain = 'SecretPass@2026';
  const testHash = await hashPassword(testPlain);
  assert(testHash.startsWith('$2'), 'Password hashed with bcrypt cost factor ($2a$ or $2b$)');
  assert(testHash !== testPlain, 'Password hash is non-reversible and not plaintext');
  const matchOk = await verifyPassword(testPlain, testHash);
  const matchFail = await verifyPassword('WrongPassword', testHash);
  assert(matchOk === true, 'verifyPassword returns true for matching password');
  assert(matchFail === false, 'verifyPassword returns false for non-matching password');

  // Test 3: Default Seeded Accounts
  console.log('\n[Phase 3] Verifying Default Seeded Accounts...');
  const adminUser = await userRepository.getUserByEmailWithPassword('admin@nirikshan.gov.in');
  assert(adminUser !== null, 'Seeded Admin account exists (admin@nirikshan.gov.in)');
  assert(adminUser.role === 'admin', 'Admin account has role = admin');
  assert(await verifyPassword('Admin@12345', adminUser.password_hash), 'Admin default password matches');

  const inspectorUser = await userRepository.getUserByEmailWithPassword('inspector@nirikshan.gov.in');
  assert(inspectorUser !== null, 'Seeded Inspector account exists (inspector@nirikshan.gov.in)');
  assert(inspectorUser.role === 'inspector', 'Inspector account has role = inspector');
  assert(await verifyPassword('Inspector@12345', inspectorUser.password_hash), 'Inspector default password matches');

  // Test 4: Login Endpoint Tests
  console.log('\n[Phase 4] Testing POST /api/auth/login Endpoint...');
  const adminLoginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@nirikshan.gov.in', password: 'Admin@12345' }
  });
  assert(adminLoginRes.status === 200 && adminLoginRes.data.success === true, 'Admin login succeeds with HTTP 200');
  assert(typeof adminLoginRes.data.token === 'string' && adminLoginRes.data.token.length > 20, 'Admin login returns JWT token');
  assert(adminLoginRes.data.user.role === 'admin', 'Admin user payload role is admin');
  assert(!adminLoginRes.data.user.password_hash, 'Admin user payload NEVER contains password_hash');
  const adminToken = adminLoginRes.data.token;

  const inspectorLoginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'inspector@nirikshan.gov.in', password: 'Inspector@12345' }
  });
  assert(inspectorLoginRes.status === 200 && inspectorLoginRes.data.success === true, 'Inspector login succeeds with HTTP 200');
  assert(inspectorLoginRes.data.user.role === 'inspector', 'Inspector user payload role is inspector');
  const inspectorToken = inspectorLoginRes.data.token;

  // Test 5: Login Failure & Email Enumeration Resistance
  console.log('\n[Phase 5] Testing Login Rejections & Enumeration Protection...');
  const wrongPassRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@nirikshan.gov.in', password: 'WrongPassword999' }
  });
  assert(wrongPassRes.status === 401 && wrongPassRes.data.success === false, 'Wrong password returns HTTP 401');

  const unknownEmailRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'nonexistent@nirikshan.gov.in', password: 'AnyPassword123' }
  });
  assert(unknownEmailRes.status === 401 && unknownEmailRes.data.success === false, 'Unknown email returns HTTP 401');
  assert(wrongPassRes.data.error === unknownEmailRes.data.error,
         'Wrong password and unknown email return identical generic error message (prevents user enumeration)');

  const missingBodyRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {}
  });
  assert(missingBodyRes.status === 400, 'Missing credentials returns HTTP 400');

  // Test 6: GET /api/auth/me Profile Endpoint
  console.log('\n[Phase 6] Testing GET /api/auth/me Endpoint...');
  const meAdminRes = await makeRequest('/api/auth/me', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(meAdminRes.status === 200 && meAdminRes.data.user.email === 'admin@nirikshan.gov.in',
         'GET /api/auth/me with Admin token returns admin profile');

  const meInspectorRes = await makeRequest('/api/auth/me', {
    headers: { Authorization: `Bearer ${inspectorToken}` }
  });
  assert(meInspectorRes.status === 200 && meInspectorRes.data.user.email === 'inspector@nirikshan.gov.in',
         'GET /api/auth/me with Inspector token returns inspector profile');

  const meNoAuthRes = await makeRequest('/api/auth/me');
  assert(meNoAuthRes.status === 401, 'GET /api/auth/me without token returns HTTP 401');

  const meBadTokenRes = await makeRequest('/api/auth/me', {
    headers: { Authorization: 'Bearer invalid.token.payload' }
  });
  assert(meBadTokenRes.status === 401, 'GET /api/auth/me with invalid token returns HTTP 401');

  // Test 7: Unauthenticated Access to Protected Endpoints
  console.log('\n[Phase 7] Testing Protected Endpoints Reject Unauthenticated Access...');
  const unauthRules = await makeRequest('/api/rules');
  assert(unauthRules.status === 401, 'GET /api/rules rejects unauthenticated request with HTTP 401');

  const unauthInspections = await makeRequest('/api/inspections');
  assert(unauthInspections.status === 401, 'GET /api/inspections rejects unauthenticated request with HTTP 401');

  const unauthPostInsp = await makeRequest('/api/inspections', { method: 'POST', body: {} });
  assert(unauthPostInsp.status === 401, 'POST /api/inspections rejects unauthenticated request with HTTP 401');

  const unauthUsers = await makeRequest('/api/users');
  assert(unauthUsers.status === 401, 'GET /api/users rejects unauthenticated request with HTTP 401');

  // Test 8: Inspector RBAC Guard (Inspector must be blocked from Admin endpoints)
  console.log('\n[Phase 8] Testing RBAC Enforcement (Inspector blocked from Admin endpoints)...');
  const inspUsersGet = await makeRequest('/api/users', {
    headers: { Authorization: `Bearer ${inspectorToken}` }
  });
  assert(inspUsersGet.status === 403, 'Inspector token on GET /api/users returns HTTP 403 Forbidden');

  const inspUsersPost = await makeRequest('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${inspectorToken}` },
    body: { name: 'Test', email: 'test@gov.in', role: 'inspector', password: 'Pass@123' }
  });
  assert(inspUsersPost.status === 403, 'Inspector token on POST /api/users returns HTTP 403 Forbidden');

  const inspRuleStatus = await makeRequest('/api/rules/rule_mrp/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${inspectorToken}` },
    body: { active: false }
  });
  assert(inspRuleStatus.status === 403, 'Inspector token on PATCH /api/rules/:id/status returns HTTP 403 Forbidden');

  const inspRulePut = await makeRequest('/api/rules/rule_mrp', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${inspectorToken}` },
    body: { rule_name: 'Modified Rule' }
  });
  assert(inspRulePut.status === 403, 'Inspector token on PUT /api/rules/:id returns HTTP 403 Forbidden');

  // Test 9: Admin User Management
  console.log('\n[Phase 9] Testing Admin User Management Endpoints...');
  const adminUsersGet = await makeRequest('/api/users', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminUsersGet.status === 200 && Array.isArray(adminUsersGet.data.users), 'Admin GET /api/users succeeds with HTTP 200');

  const newEmail = `officer_${Date.now()}@nirikshan.gov.in`;
  const createUserRes = await makeRequest('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: 'Field Officer Verma',
      email: newEmail,
      role: 'inspector',
      password: 'Officer@Pass123'
    }
  });
  assert(createUserRes.status === 201 && createUserRes.data.success === true, 'Admin POST /api/users creates new inspector');
  const createdUserId = createUserRes.data.user.id;

  // Duplicate email check
  const duplicateUserRes = await makeRequest('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: 'Duplicate Officer',
      email: newEmail,
      role: 'inspector',
      password: 'Officer@Pass123'
    }
  });
  assert(duplicateUserRes.status === 409, 'Creating user with duplicate email returns HTTP 409 Conflict');

  // Status update: deactivate new user
  const deactRes = await makeRequest(`/api/users/${createdUserId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { active: false }
  });
  assert(deactRes.status === 200 && deactRes.data.user.active === 0, 'Admin can deactivate user (active = 0)');

  // Deactivated user login rejection
  const deactLoginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: newEmail, password: 'Officer@Pass123' }
  });
  assert(deactLoginRes.status === 401 && deactLoginRes.data.error.includes('deactivated'),
         'Deactivated user cannot log in (HTTP 401 deactivated message)');

  // Admin self-deactivation guard
  const adminSelfDeact = await makeRequest(`/api/users/${adminLoginRes.data.user.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { active: false }
  });
  assert(adminSelfDeact.status === 400 && adminSelfDeact.data.error.includes('cannot deactivate their own'),
         'Admin cannot deactivate their own active account (guard check)');

  // Re-activate user
  const reactRes = await makeRequest(`/api/users/${createdUserId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { active: true }
  });
  assert(reactRes.status === 200 && reactRes.data.user.active === 1, 'Admin can re-activate user (active = 1)');

  // Test 10: Admin Rule Management
  console.log('\n[Phase 10] Testing Admin Rule Management Endpoints...');
  const ruleToggleRes = await makeRequest('/api/rules/rule_mrp/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { active: false }
  });
  assert(ruleToggleRes.status === 200 && ruleToggleRes.data.rule.active === 0, 'Admin can disable rule_mrp');

  // Restore rule_mrp active state
  const ruleRestoreRes = await makeRequest('/api/rules/rule_mrp/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { active: true }
  });
  assert(ruleRestoreRes.status === 200 && ruleRestoreRes.data.rule.active === 1, 'Admin can re-enable rule_mrp');

  // Test 11: Inspection User Association
  console.log('\n[Phase 11] Testing Inspection Association with Authenticated Officer...');
  const testInspId = `INS-TEST-AUTH-${Date.now()}`;
  const createInspRes = await makeRequest('/api/inspections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${inspectorToken}` },
    body: {
      inspection_id: testInspId,
      product_name: 'Certified Sunflower Oil 1L',
      brand_name: 'Kisan Shuddha',
      overall_score: 95,
      overall_status: 'COMPLIANT',
      image_count: 1,
      fields: {
        manufacturer: 'Kisan Agro Industries Ltd.',
        mrp: 'Rs. 165.00',
        net_quantity: '1 L'
      },
      compliance_results: []
    }
  });
  assert((createInspRes.status === 200 || createInspRes.status === 201) && createInspRes.data.success === true, 'Authenticated inspection creation succeeds');

  const getInspRes = await makeRequest(`/api/inspections/${testInspId}`, {
    headers: { Authorization: `Bearer ${inspectorToken}` }
  });
  assert(getInspRes.status === 200 && getInspRes.data.inspection !== null, 'GET /api/inspections/:id succeeds');
  assert(getInspRes.data.inspection.inspector_name === 'Legal Metrology Inspector',
         'Inspection record correctly linked to authenticated officer name');
  assert(getInspRes.data.inspection.inspector_email === 'inspector@nirikshan.gov.in',
         'Inspection record correctly linked to authenticated officer email');

  // Test 12: Legacy Inspections Compatibility
  console.log('\n[Phase 12] Testing Legacy Inspection Compatibility (user_id = NULL)...');
  const legacyInspId = `INS-LEGACY-${Date.now()}`;
  await db.run(
    `INSERT INTO inspections (inspection_id, user_id, inspected_at, overall_score, overall_status, created_at)
     VALUES (?, NULL, ?, 80, 'COMPLIANT', ?)`,
    [legacyInspId, new Date().toISOString(), new Date().toISOString()]
  );
  const legacyFetch = await makeRequest(`/api/inspections/${legacyInspId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(legacyFetch.status === 200 && legacyFetch.data.inspection !== null, 'Legacy inspection with user_id = NULL fetched cleanly');
  assert(legacyFetch.data.inspection.inspector_name === null, 'Legacy inspection inspector_name is gracefully null');

  // Test 13: Report Generation & Authenticated Download
  console.log('\n[Phase 13] Testing PDF Report Generation & Download Authentication...');
  const reportGenRes = await makeRequest(`/api/inspections/${testInspId}/report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${inspectorToken}` }
  });
  assert(reportGenRes.status === 200 && reportGenRes.data.success === true, 'Authenticated PDF report generation succeeds');

  // Download with Bearer header
  const dlHeaderRes = await makeRequest(`/api/inspections/${testInspId}/report/download`, {
    headers: { Authorization: `Bearer ${inspectorToken}` }
  });
  assert(dlHeaderRes.status === 200, 'Report download with Authorization Bearer header succeeds');

  // Download with query parameter token
  const dlQueryRes = await makeRequest(`/api/inspections/${testInspId}/report/download?token=${encodeURIComponent(inspectorToken)}`);
  assert(dlQueryRes.status === 200, 'Report download with ?token= query parameter succeeds (supports browser direct downloads)');

  // Download unauthenticated fails with HTTP 401
  const dlUnauthRes = await makeRequest(`/api/inspections/${testInspId}/report/download`);
  assert(dlUnauthRes.status === 401, 'Report download without token is rejected with HTTP 401');

  // Summary
  console.log('\n===============================================================');
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions verified successfully.`);
  console.log('===============================================================\n');
}

runAuthRbacTestSuite()
  .then(() => { process.exit(0); })
  .catch((err) => {
    console.error('\nTest suite execution failed:', err);
    process.exit(1);
  });
