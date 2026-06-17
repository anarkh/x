import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const requiredFiles = [
  'scripts/check-publish-flow.mjs',
  'scripts/check-publish-spread.mjs',
  'scripts/check-comment-relay.mjs',
  'scripts/check-action-relay.mjs',
  'scripts/check-receiver-conversion.mjs',
  'scripts/check-viral-journey-evidence.mjs',
  'scripts/check-viral-journey-manual-evidence.mjs',
  'scripts/prepare-viral-journey-manual-evidence.mjs',
  'scripts/prepare-viral-journey-devtools-run.mjs',
  'scripts/inspect-devtools-port-state.mjs',
  'scripts/check-devtools-smoke-access.mjs',
  'scripts/recover-devtools-service-port.mjs',
  'scripts/capture-viral-journey-blocked-evidence.mjs',
  'scripts/check-share-receiver.mjs',
  'scripts/check-share-receiver-action.mjs',
  'harness/check-trust-insight.mjs',
  'scripts/check-candidate-flow.mjs',
  'scripts/check-admin-auth-errors.mjs',
  'scripts/check-map-list-resilience.mjs',
  'scripts/check-map-list-blocked-summary-preflight.mjs',
  'harness/devtools-readiness-product-brief.md',
  'harness/devtools-readiness-checklist.md',
  'harness/map-list-resilience-product-brief.md',
  'harness/map-list-resilience-checklist.md',
  'harness/viral-journey-manual-evidence-product-brief.md',
  'harness/viral-journey-manual-evidence-checklist.md',
  'harness/viral-devtools-journey-run-product-brief.md',
  'harness/viral-devtools-journey-run-checklist.md',
  'harness/viral-blocked-evidence-capture-product-brief.md',
  'harness/viral-blocked-evidence-capture-checklist.md',
  'harness/viral-targeted-relay-product-brief.md',
  'harness/viral-targeted-relay-design-checklist.md',
  'harness/viral-receiver-action-source-product-brief.md',
  'harness/viral-receiver-action-source-design-checklist.md',
  'harness/viral-share-reason-product-brief.md',
  'harness/viral-share-reason-design-checklist.md',
  'harness/viral-relay-channel-picker-product-brief.md',
  'harness/viral-relay-channel-picker-design-checklist.md'
];

const readinessDocs = [
  'harness/devtools-readiness-product-brief.md',
  'harness/devtools-readiness-checklist.md',
  'harness/map-list-resilience-product-brief.md',
  'harness/map-list-resilience-checklist.md',
  'harness/viral-journey-manual-evidence-product-brief.md',
  'harness/viral-journey-manual-evidence-checklist.md',
  'harness/viral-devtools-journey-run-product-brief.md',
  'harness/viral-devtools-journey-run-checklist.md',
  'harness/viral-blocked-evidence-capture-product-brief.md',
  'harness/viral-blocked-evidence-capture-checklist.md',
  'harness/viral-targeted-relay-product-brief.md',
  'harness/viral-targeted-relay-design-checklist.md',
  'harness/viral-receiver-action-source-product-brief.md',
  'harness/viral-receiver-action-source-design-checklist.md',
  'harness/viral-share-reason-product-brief.md',
  'harness/viral-share-reason-design-checklist.md',
  'harness/viral-relay-channel-picker-product-brief.md',
  'harness/viral-relay-channel-picker-design-checklist.md'
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
runCheck('scripts/check-comment-relay.mjs', 'comment relay prompt check');
runCheck('scripts/check-action-relay.mjs', 'action relay prompt check');
runCheck('scripts/check-receiver-conversion.mjs', 'receiver conversion relay check');
runCheck('scripts/check-viral-journey-evidence.mjs', 'viral journey evidence model check');
console.log('Running viral journey manual evidence gate. This scans ignored local result files only when they exist.');
runCheck('scripts/check-viral-journey-manual-evidence.mjs', 'viral journey manual evidence gate');
console.log('Viral journey manual evidence gate passed structurally; this does not prove DevTools or real-device UI passed.');
console.log('Running viral journey DevTools manual-run preparation. This is no-side-effect environment diagnostics and does not prove UI passed.');
runCheck('scripts/prepare-viral-journey-devtools-run.mjs', 'viral journey DevTools manual-run preparation');
console.log('Viral journey DevTools manual-run preparation completed; port/smoke blockers remain manual execution blockers, not UI passed evidence.');
console.log('Viral blocked evidence capture command exists, but readiness does not run it because capture writes ignored local evidence files.');
runCheck('scripts/check-share-receiver.mjs', 'share receiver guidance check');
runCheck('scripts/check-share-receiver-action.mjs', 'share receiver action strip check');
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
