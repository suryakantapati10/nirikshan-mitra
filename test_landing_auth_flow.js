/**
 * test_landing_auth_flow.js
 * Comprehensive automated verification for the new Landing & Role-Based Authentication Flow
 * in Nirikshan Mitra.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

function makeRequest(options, postData) {
  const opts = { ...options, headers: { ...options.headers, 'x-test-suite': 'nirikshan-test' } };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('NIRIKSHAN MITRA - LANDING & ROLE AUTHENTICATION FLOW VERIFICATION');
  console.log('================================================================\n');

  const roleSelectionTsx = fs.readFileSync(path.join(__dirname, 'src/components/auth/RoleSelection.tsx'), 'utf8');
  const inspectorLoginTsx = fs.readFileSync(path.join(__dirname, 'src/components/auth/InspectorLogin.tsx'), 'utf8');
  const adminLoginTsx = fs.readFileSync(path.join(__dirname, 'src/components/auth/AdminLogin.tsx'), 'utf8');
  const appTsx = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
  const headerTsx = fs.readFileSync(path.join(__dirname, 'src/components/layout/Header.tsx'), 'utf8');
  const authContextTsx = fs.readFileSync(path.join(__dirname, 'src/context/AuthContext.tsx'), 'utf8');
  const cssContent = fs.readFileSync(path.join(__dirname, 'src/index.css'), 'utf8');

  // -------------------------------------------------------------------------
  // 1. STATIC DOM STRUCTURE - INITIAL LANDING & ROLE SELECTION
  // -------------------------------------------------------------------------
  console.log('1. Verifying Initial Home / Landing Role Selection DOM Structure:');
  assert(roleSelectionTsx.includes('id="landing-role-selection"'), 'Landing section #landing-role-selection exists');
  assert(roleSelectionTsx.includes('Nirikshan Mitra'), 'Landing page contains portal title "Nirikshan Mitra"');
  assert(roleSelectionTsx.includes('Packaged Commodity Compliance Portal'), 'Landing page contains subtitle "Packaged Commodity Compliance Portal"');
  assert(roleSelectionTsx.includes('Select your role to continue'), 'Landing page prompt "Select your role to continue" is present');
  assert(roleSelectionTsx.includes('id="btn-goto-inspector-login"'), 'Dedicated button #btn-goto-inspector-login exists');
  assert(roleSelectionTsx.includes('id="btn-goto-admin-login"'), 'Dedicated button #btn-goto-admin-login exists');
  assert(roleSelectionTsx.includes('Legal Metrology Inspector'), 'Inspector role card title is present');
  assert(roleSelectionTsx.includes('System Administrator') || roleSelectionTsx.includes('Admin'), 'Admin role card title is present');

  // -------------------------------------------------------------------------
  // 2. STATIC DOM STRUCTURE - DEDICATED LOGIN SCREENS
  // -------------------------------------------------------------------------
  console.log('\n2. Verifying Dedicated Role Login Screens:');
  assert(inspectorLoginTsx.includes('id="inspector-login-view"'), 'Dedicated inspector login screen #inspector-login-view exists');
  assert(inspectorLoginTsx.includes('id="btn-back-role-from-inspector"'), 'Back button #btn-back-role-from-inspector exists on inspector screen');
  assert(inspectorLoginTsx.includes('id="form-inspector-login"'), 'Form #form-inspector-login exists');
  assert(inspectorLoginTsx.includes('id="inspector-email"'), 'Email input #inspector-email exists');
  assert(inspectorLoginTsx.includes('id="inspector-password"'), 'Password input #inspector-password exists');
  assert(inspectorLoginTsx.includes('id="btn-inspector-login-submit"'), 'Submit button #btn-inspector-login-submit exists');
  assert(inspectorLoginTsx.includes('id="inspector-login-error"'), 'Error container #inspector-login-error exists');
  assert(inspectorLoginTsx.includes('id="btn-quick-fill-inspector"'), 'Quick fill test credentials button #btn-quick-fill-inspector exists');

  assert(adminLoginTsx.includes('id="admin-login-view"'), 'Dedicated admin login screen #admin-login-view exists');
  assert(adminLoginTsx.includes('id="btn-back-role-from-admin"'), 'Back button #btn-back-role-from-admin exists on admin screen');
  assert(adminLoginTsx.includes('id="form-admin-login"'), 'Form #form-admin-login exists');
  assert(adminLoginTsx.includes('id="admin-email"'), 'Email input #admin-email exists');
  assert(adminLoginTsx.includes('id="admin-password"'), 'Password input #admin-password exists');
  assert(adminLoginTsx.includes('id="btn-admin-login-submit"'), 'Submit button #btn-admin-login-submit exists');
  assert(adminLoginTsx.includes('id="admin-login-error"'), 'Error container #admin-login-error exists');
  assert(adminLoginTsx.includes('id="btn-quick-fill-admin"'), 'Quick fill test credentials button #btn-quick-fill-admin exists');

  // -------------------------------------------------------------------------
  // 3. AUTHENTICATED APP ISOLATION & NAVIGATION INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n3. Verifying Authenticated App Container & Nav Isolation:');
  assert(appTsx.includes('isAuthenticated'), 'Authenticated workspace condition exists');
  assert(appTsx.includes('<Navigation') && appTsx.includes('isAuthenticated &&'), 'Main navigation bar is conditionally rendered for authenticated users');
  assert(appTsx.includes('<Breadcrumb') && appTsx.includes('isAuthenticated &&'), 'Breadcrumb bar is conditionally rendered for authenticated users');
  assert(headerTsx.includes('id="btn-logout"'), 'Sign Out button #btn-logout exists in header profile container');

  // -------------------------------------------------------------------------
  // 4. CSS STYLING & GOVERNMENT AESTHETICS
  // -------------------------------------------------------------------------
  console.log('\n4. Verifying Government Design CSS Rules:');
  assert(cssContent.includes('--color-gov-navy'), 'CSS includes Government Navy token');
  assert(cssContent.includes('--color-gov-blue'), 'CSS includes Government Blue token');
  assert(roleSelectionTsx.includes('role-selection-card'), 'Role selection card class present');
  assert(roleSelectionTsx.includes('role-cards-grid'), 'Role cards grid class present');
  assert(roleSelectionTsx.includes('role-option-card'), 'Role option card class present');
  assert(inspectorLoginTsx.includes('auth-page-view'), 'Auth page view styling present');
  assert(inspectorLoginTsx.includes('btn-back-role'), 'Back button style present');
  assert(inspectorLoginTsx.includes('auth-quick-fill-box'), 'Prototype credential box present');

  // -------------------------------------------------------------------------
  // 5. CLIENT-SIDE ROUTER & AUTH GUARD IN REACT
  // -------------------------------------------------------------------------
  console.log('\n5. Verifying Client-Side Routing & Guards in React:');
  assert(authContextTsx.includes('isAuthenticated'), 'AuthContext maintains isAuthenticated');
  assert(authContextTsx.includes('role'), 'AuthContext tracks user role');
  assert(appTsx.includes("authView === 'role-select'"), 'Unauthenticated route defaults to role selection');
  assert(appTsx.includes("role === 'admin'"), 'Admin view guard enforces admin role check');
  assert(inspectorLoginTsx.includes('handleSubmit'), 'form-inspector-login submit listener is wired');
  assert(adminLoginTsx.includes('handleSubmit'), 'form-admin-login submit listener is wired');

  // -------------------------------------------------------------------------
  // 6. LIVE BACKEND AUTHENTICATION API VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n6. Verifying Live Auth Endpoints & Session Management:');

  // 6a. Inspector login with valid inspector credentials
  let inspectorToken = null;
  const inspLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'inspector@nirikshan.gov.in', password: 'Inspector@12345' });

  assert(inspLoginRes.status === 200, 'Inspector login returns HTTP 200');
  assert(inspLoginRes.data && inspLoginRes.data.success === true, 'Inspector login response success is true');
  assert(inspLoginRes.data && inspLoginRes.data.user && inspLoginRes.data.user.role === 'inspector', 'Inspector user role is "inspector"');
  assert(inspLoginRes.data && inspLoginRes.data.token, 'Inspector login returns JWT auth token');
  inspectorToken = inspLoginRes.data ? inspLoginRes.data.token : null;

  // 6b. Verify inspector cannot access admin-only API
  const inspAdminReqRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${inspectorToken}` }
  });
  assert(inspAdminReqRes.status === 403, 'Inspector accessing admin endpoint /api/users returns HTTP 403 Forbidden');

  // 6c. Admin login with valid admin credentials
  let adminToken = null;
  const adminLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@nirikshan.gov.in', password: 'Admin@12345' });

  assert(adminLoginRes.status === 200, 'Admin login returns HTTP 200');
  assert(adminLoginRes.data && adminLoginRes.data.success === true, 'Admin login response success is true');
  assert(adminLoginRes.data && adminLoginRes.data.user && adminLoginRes.data.user.role === 'admin', 'Admin user role is "admin"');
  assert(adminLoginRes.data && adminLoginRes.data.token, 'Admin login returns JWT auth token');
  adminToken = adminLoginRes.data ? adminLoginRes.data.token : null;

  // 6d. Verify admin can access admin API
  const adminReqRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminReqRes.status === 200, 'Admin accessing /api/users returns HTTP 200 OK');
  assert(Array.isArray(adminReqRes.data.users), 'Admin endpoint returns array of users');

  // 6e. Invalid credentials generic rejection (no email enumeration)
  const badLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'nonexistent@nirikshan.gov.in', password: 'WrongPassword999' });

  assert(badLoginRes.status === 401, 'Invalid login returns HTTP 401 Unauthorized');
  assert(badLoginRes.data && badLoginRes.data.error === 'Invalid email or password.', 'Generic error message returned to prevent email enumeration');

  // 6f. Unauthenticated access to /api/auth/me returns 401
  const unauthMeRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET'
  });
  assert(unauthMeRes.status === 401, 'Unauthenticated /api/auth/me returns HTTP 401');

  // 6g. Authenticated /api/auth/me with inspector token
  const inspMeRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${inspectorToken}` }
  });
  assert(inspMeRes.status === 200, 'Authenticated /api/auth/me returns HTTP 200');
  assert(inspMeRes.data && inspMeRes.data.user.email === 'inspector@nirikshan.gov.in', 'Returned user email matches inspector');

  // 6h. Logout invalidation
  const logoutRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${inspectorToken}` }
  });
  assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200');

  // -------------------------------------------------------------------------
  // 7. SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('================================================================');

  if (totalTests === passedTests) {
    console.log('RESULT: ALL LANDING & ROLE AUTHENTICATION TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error('RESULT: SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});
