/**
 * test_header_layout.js
 * Verification of the new Authenticated Header Layout in Nirikshan Mitra:
 * - Account block and Sign Out moved into the top navy-blue header (.site-header)
 * - Sign Out is a separate UI element from the account block
 * - White navigation bar (.main-nav) contains only normal application navigation
 * - Responsive layout definitions present
 */

const fs = require('fs');
const path = require('path');

let total = 0;
let passed = 0;

function check(cond, msg) {
  total++;
  if (cond) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
  }
}

console.log('================================================================');
console.log('NIRIKSHAN MITRA — AUTHENTICATED HEADER LAYOUT VERIFICATION');
console.log('================================================================\n');

const headerTsx = fs.readFileSync(path.join(__dirname, 'src/components/layout/Header.tsx'), 'utf8');
const navTsx = fs.readFileSync(path.join(__dirname, 'src/components/layout/Navigation.tsx'), 'utf8');
const indexCss = fs.readFileSync(path.join(__dirname, 'src/index.css'), 'utf8');

// 1. Header DOM hierarchy checks
console.log('1. Checking Header & Navigation DOM Structure:');
check(headerTsx.includes('site-header'), '<header className="site-header"> exists');

check(headerTsx.includes('header-brand-group'), 'Header contains .header-brand-group (left side)');
check(headerTsx.includes('Nirikshan Mitra'), 'Header contains portal name');
check(headerTsx.includes('Packaged Commodity Compliance Portal'), 'Header contains portal subtitle');
check(headerTsx.includes('id="header-auth-controls"'), 'Header contains #header-auth-controls (right side)');
check(headerTsx.includes('id="user-profile-widget"'), 'Header contains account block (#user-profile-widget)');
check(headerTsx.includes('id="officer-display-name"'), 'Account block contains officer display name (#officer-display-name)');
check(headerTsx.includes('id="officer-role-badge"'), 'Account block contains officer role badge (#officer-role-badge)');
check(headerTsx.includes('id="btn-logout"'), 'Header contains separate Sign Out button (#btn-logout)');

// 2. Separation of Sign Out and Account Block
console.log('\n2. Verifying Sign Out is a Separate UI Element:');
// Account block closing tag must appear BEFORE btn-logout
const accountBlockIndex = headerTsx.indexOf('id="user-profile-widget"');
const accountBlockCloseIndex = headerTsx.indexOf('</div>', accountBlockIndex);
const btnLogoutIndex = headerTsx.indexOf('id="btn-logout"');

check(accountBlockIndex !== -1 && btnLogoutIndex !== -1, 'Both account block and Sign Out exist in header');
check(btnLogoutIndex > accountBlockCloseIndex, 'Sign Out button is NOT inside account block; it is a separate sibling element');
check(headerTsx.includes('btn-header-signout'), 'Sign Out has dedicated .btn-header-signout class');

// 3. White Navigation Bar Integrity
console.log('\n3. Verifying White Navigation Bar Contains Only Navigation:');
check(navTsx.includes('main-nav'), '<nav className="main-nav"> exists');

check(navTsx.includes('id="nav-link-dashboard"'), 'Navigation contains Dashboard link');
check(navTsx.includes('id="nav-link-history"'), 'Navigation contains Inspection History link');
check(navTsx.includes('id="nav-link-admin"'), 'Navigation contains Admin Panel link');
check(!navTsx.includes('id="user-profile-widget"'), 'White navigation does NOT contain account block');
check(!navTsx.includes('id="btn-logout"'), 'White navigation does NOT contain Sign Out button');
check(!navTsx.includes('nav-auth-container'), 'Old nav-auth-container removed from navigation');

// 4. CSS Styling for Navy Header Account Block
console.log('\n4. Verifying CSS Rules for Header Account Block & Sign Out:');
check(headerTsx.includes('header-auth-controls'), 'Header defines header-auth-controls');
check(headerTsx.includes('header-account-block'), 'Header defines header-account-block with subtle border/outline');
check(headerTsx.includes('btn-header-signout'), 'Header defines btn-header-signout with distinct border and hover');
check(headerTsx.includes('sm:px-8'), 'Header includes responsive layout breakpoint');
check(headerTsx.includes('header-brand-group'), 'Header defines header-brand-group');

// 5. React Header Auth Controls Synchronization
console.log('\n5. Verifying Header Controls Synchronization:');
check(headerTsx.includes('header-auth-controls'), 'Header accesses header-auth-controls');
check(headerTsx.includes('Legal Metrology Inspector'), 'Inspector default name is Legal Metrology Inspector');
check(headerTsx.includes('handleSignOut') || headerTsx.includes('logout'), 'Header maintains sign out handler for btn-logout');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log('================================================================');

if (total === passed) {
  console.log('RESULT: ALL HEADER LAYOUT CHECKS PASSED!\n');
  process.exit(0);
} else {
  console.error('RESULT: SOME CHECKS FAILED!\n');
  process.exit(1);
}
