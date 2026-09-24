const fs = require('fs');
const path = require('path');

function walk(dir) {
  let str = '';
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) str += walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) str += fs.readFileSync(p, 'utf8') + '\n';
  }
  return str;
}

const reactSrc = walk('src');
const css = fs.readFileSync('src/index.css', 'utf8');

const checks = [
  ['Nav: Dashboard link',              reactSrc.includes('data-target="dashboard"')],
  ['Breadcrumb bar',                   reactSrc.includes('breadcrumb-bar')],
  ['Rule notice strip',                reactSrc.includes('rule-notice-strip')],
  ['Flat meta table',                  reactSrc.includes('dash-meta-table')],
  ['ID: dash-product-name',            reactSrc.includes('id="dash-product-name"')],
  ['ID: dash-score-val',               reactSrc.includes('id="dash-score-val"')],
  ['ID: dash-checklist-tbody',         reactSrc.includes('id="dash-checklist-tbody"')],
  ['ID: dash-extracted-grid',          reactSrc.includes('id="dash-extracted-grid"')],
  ['ID: dash-issues-container',        reactSrc.includes('id="dash-issues-container"')],
  ['ID: slot-front',                   reactSrc.includes("suffix: 'front'")],
  ['ID: slot-back',                    reactSrc.includes("suffix: 'back'")],
  ['ID: slot-top-bottom',              reactSrc.includes("suffix: 'top-bottom'")],
  ['ID: btn-continue',                 reactSrc.includes('id="btn-continue"')],
  ['ID: btn-scan-another-top',         reactSrc.includes('id="btn-scan-another-top"')],
  ['ID: step-4',                       reactSrc.includes('step-4')],
  ['CSS: .compliance-dashboard-panel', reactSrc.includes('compliance-dashboard-panel')],
  ['CSS: .dash-exec-header',           reactSrc.includes('dash-exec-header')],
  ['CSS: .dash-main-grid',             reactSrc.includes('dash-main-grid')],
  ['CSS: .dash-image-card',            reactSrc.includes('dash-image-card')],
  ['CSS: .dash-score-card',            reactSrc.includes('dash-score-card')],
  ['CSS: .dash-issues-card',           reactSrc.includes('dash-issues-card')],
  ['CSS: .dash-checklist-card',        reactSrc.includes('dash-checklist-card')],
  ['CSS: .dash-extracted-card',        reactSrc.includes('dash-extracted-card')],
  ['CSS: .btn-scan-another',           reactSrc.includes('btn-scan-another')],
  ['CSS: .btn-analyze',                reactSrc.includes('btn-analyze')],
  ['CSS: .package-classification-card',reactSrc.includes('package-classification-card')],
  ['CSS: .pkg-header-banner',          reactSrc.includes('pkg-header-banner')],
  ['CSS: .pkg-detected-title',         reactSrc.includes('pkg-detected-title')],
  ['CSS: .pkg-confidence-badge',       reactSrc.includes('pkg-confidence-badge')],
  ['CSS: .pkg-low-conf-alert',         reactSrc.includes('pkg-low-conf-alert')],
  ['CSS: .pkg-guidance-box',           reactSrc.includes('pkg-guidance-box')],
  ['CSS: .pkg-guided-prompt',          reactSrc.includes('pkg-guided-prompt')],
  ['CSS: .panels-slots-grid',          reactSrc.includes('panels-slots-grid')],
  ['CSS: .panel-slot-item',            reactSrc.includes('panel-slot-item')],
  ['CSS: .scan-dashboard-header',      reactSrc.includes('scan-dashboard-header')],
  ['Design: no large border-radius',   !css.match(/border-radius:\s*([5-9]\d+|[1-9]\d{2,})px/)],
  ['Design: no linear-gradient',       !css.includes('linear-gradient')],
  ['Design: no backdrop-filter',       !css.includes('backdrop-filter')],
  ['Design: Inter font imported',      css.includes('Inter')],
  ['Design: readable base font 15px',  css.includes('15')],
];

let pass = 0, fail = 0;
checks.forEach(function(c) {
  var label = c[0], result = c[1];
  if (result) { console.log('  V', label); pass++; }
  else         { console.log('  X FAIL:', label); fail++; }
});
console.log('');
console.log('Results: ' + pass + '/' + (pass+fail) + ' checks passed' + (fail === 0 ? ' -- ALL GOOD!' : ''));
process.exit(fail === 0 ? 0 : 1);
