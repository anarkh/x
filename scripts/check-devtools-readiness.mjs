import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const requiredFiles = [
  'scripts/check-publish-flow.mjs',
  'scripts/check-publish-spread.mjs',
  'scripts/check-share-receiver.mjs',
  'harness/check-trust-insight.mjs',
  'scripts/check-candidate-flow.mjs',
  'scripts/check-admin-auth-errors.mjs',
  'scripts/check-map-list-resilience.mjs',
  'scripts/check-map-list-blocked-summary-preflight.mjs',
  'harness/devtools-readiness-product-brief.md',
  'harness/devtools-readiness-checklist.md',
  'harness/map-list-resilience-product-brief.md',
  'harness/map-list-resilience-checklist.md'
];

const readinessDocs = [
  'harness/devtools-readiness-product-brief.md',
  'harness/devtools-readiness-checklist.md',
  'harness/map-list-resilience-product-brief.md',
  'harness/map-list-resilience-checklist.md'
];

function readProjectFile(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

for (const relativePath of requiredFiles) {
  assert.ok(existsSync(join(rootDir, relativePath)), `Missing required readiness file: ${relativePath}`);
}

const readinessText = readinessDocs
  .map((relativePath) => `\n\n# ${relativePath}\n${readProjectFile(relativePath)}`)
  .join('');

const requiredSemanticGroups = [
  {
    label: 'manual checks cannot be replaced by automation',
    keywords: ['不能用自动脚本替代', '不能替代', '不可替代', '不得替代', '手测', '人工验证']
  },
  {
    label: 'DevTools verification is named',
    keywords: ['DevTools', '微信开发者工具']
  },
  {
    label: 'real-device verification is named',
    keywords: ['真机', '真实设备']
  },
  {
    label: 'evidence recording is required',
    keywords: ['证据', '记录']
  },
  {
    label: 'failure handling is explicit',
    keywords: ['失败', '未通过', '阻塞']
  }
];

// These documents are only readiness gates; they must not imply DevTools or real-device checks passed.
for (const group of requiredSemanticGroups) {
  assert.ok(
    group.keywords.some((keyword) => readinessText.includes(keyword)),
    `Readiness docs must mention ${group.label}. Expected one of: ${group.keywords.join(', ')}`
  );
}

function runCheck(scriptPath, label) {
  const result = spawnSync(process.execPath, ['--no-warnings', scriptPath], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'inherit'
  });

  assert.equal(
    result.status,
    0,
    `Readiness gate failed: ${label} (${scriptPath}). This is a preflight blocker; DevTools or real-device visual acceptance must stay unverified until manually tested.`
  );
}

runCheck('scripts/check-publish-flow.mjs', 'publish flow model check');
runCheck('scripts/check-publish-spread.mjs', 'post-publish spread plan check');
runCheck('scripts/check-share-receiver.mjs', 'share receiver guidance check');
runCheck('harness/check-trust-insight.mjs', 'trust insight model check');
runCheck('scripts/check-candidate-flow.mjs', 'candidate flow model check');
runCheck('scripts/check-admin-auth-errors.mjs', 'admin auth error formatting check');
console.log('Running map list static layout regression guard. This static WXML/WXSS check does not prove DevTools or real-device visual acceptance.');
runCheck('scripts/check-map-list-resilience.mjs', 'map list static layout regression guard');
console.log('Map list static layout regression guard passed; DevTools and real-device visual acceptance are still required.');
console.log('Running blocked summary preflight. This preflight does not prove DevTools or real-device UI passed.');
runCheck('scripts/check-map-list-blocked-summary-preflight.mjs', 'blocked summary preflight');
console.log('Blocked summary preflight passed; DevTools and real-device UI acceptance are still required.');

console.log('DevTools readiness checks passed. Static gates passed; DevTools and real-device visual acceptance are still required.');
