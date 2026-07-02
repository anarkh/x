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
  'scripts/check-detail-action-guards.mjs',
  'scripts/check-store-permission-guards.mjs',
  'scripts/check-cloud-comment-order.mjs',
  'scripts/check-admin-review.mjs',
  'scripts/check-performance-guards.mjs',
  'scripts/check-viral-journey-evidence.mjs',
  'scripts/check-viral-journey-manual-evidence.mjs',
  'scripts/check-viral-manual-summary-integrity.mjs',
  'scripts/check-viral-manual-summary-integrity-preflight.mjs',
  'scripts/check-viral-manual-artifact-manifest.mjs',
  'scripts/check-viral-manual-artifact-manifest-preflight.mjs',
  'scripts/prepare-viral-journey-manual-evidence.mjs',
  'scripts/prepare-viral-journey-devtools-run.mjs',
  'scripts/inspect-devtools-port-state.mjs',
  'scripts/check-devtools-smoke-access.mjs',
  'scripts/recover-devtools-service-port.mjs',
  'scripts/check-devtools-recovery.mjs',
  'scripts/check-devtools-port-forensics.mjs',
  'scripts/check-devtools-ui-confirmation.mjs',
  'scripts/prepare-devtools-ui-confirmation-run.mjs',
  'scripts/check-viral-journey-evidence-packet.mjs',
  'scripts/prepare-viral-journey-evidence-packet.mjs',
  'scripts/capture-viral-journey-blocked-evidence.mjs',
  'scripts/check-share-receiver.mjs',
  'scripts/check-share-receiver-action.mjs',
  'scripts/check-timeline-share.mjs',
  'scripts/check-viral-attribution.mjs',
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
  'harness/viral-timeline-evidence-product-brief.md',
  'harness/viral-timeline-evidence-checklist.md',
  'harness/viral-timeline-landing-product-brief.md',
  'harness/viral-timeline-landing-checklist.md',
  'harness/viral-targeted-relay-product-brief.md',
  'harness/viral-targeted-relay-design-checklist.md',
  'harness/viral-receiver-action-source-product-brief.md',
  'harness/viral-receiver-action-source-design-checklist.md',
  'harness/viral-share-reason-product-brief.md',
  'harness/viral-share-reason-design-checklist.md',
  'harness/viral-relay-channel-picker-product-brief.md',
  'harness/viral-relay-channel-picker-design-checklist.md',
  'harness/viral-timeline-share-product-brief.md',
  'harness/viral-timeline-share-design-checklist.md',
  'harness/viral-attribution-events-product-brief.md',
  'harness/viral-attribution-events-checklist.md',
  'harness/viral-real-evidence-recovery-product-brief.md',
  'harness/viral-real-evidence-recovery-checklist.md',
  'harness/devtools-port-deep-forensics-product-brief.md',
  'harness/devtools-port-deep-forensics-checklist.md',
  'harness/devtools-service-port-config-forensics-product-brief.md',
  'harness/devtools-service-port-config-forensics-checklist.md',
  'harness/devtools-service-port-ui-confirmation-product-brief.md',
  'harness/devtools-service-port-ui-confirmation-checklist.md',
  'harness/viral-manual-journey-evidence-packet-product-brief.md',
  'harness/viral-manual-journey-evidence-packet-checklist.md',
  'harness/viral-manual-summary-integrity-product-brief.md',
  'harness/viral-manual-summary-integrity-checklist.md',
  'harness/viral-manual-artifact-manifest-product-brief.md',
  'harness/viral-manual-artifact-manifest-checklist.md'
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
  'harness/viral-timeline-evidence-product-brief.md',
  'harness/viral-timeline-evidence-checklist.md',
  'harness/viral-timeline-landing-product-brief.md',
  'harness/viral-timeline-landing-checklist.md',
  'harness/viral-targeted-relay-product-brief.md',
  'harness/viral-targeted-relay-design-checklist.md',
  'harness/viral-receiver-action-source-product-brief.md',
  'harness/viral-receiver-action-source-design-checklist.md',
  'harness/viral-share-reason-product-brief.md',
  'harness/viral-share-reason-design-checklist.md',
  'harness/viral-relay-channel-picker-product-brief.md',
  'harness/viral-relay-channel-picker-design-checklist.md',
  'harness/viral-timeline-share-product-brief.md',
  'harness/viral-timeline-share-design-checklist.md',
  'harness/viral-attribution-events-product-brief.md',
  'harness/viral-attribution-events-checklist.md',
  'harness/viral-real-evidence-recovery-product-brief.md',
  'harness/viral-real-evidence-recovery-checklist.md',
  'harness/devtools-port-deep-forensics-product-brief.md',
  'harness/devtools-port-deep-forensics-checklist.md',
  'harness/devtools-service-port-config-forensics-product-brief.md',
  'harness/devtools-service-port-config-forensics-checklist.md',
  'harness/devtools-service-port-ui-confirmation-product-brief.md',
  'harness/devtools-service-port-ui-confirmation-checklist.md',
  'harness/viral-manual-journey-evidence-packet-product-brief.md',
  'harness/viral-manual-journey-evidence-packet-checklist.md',
  'harness/viral-manual-summary-integrity-product-brief.md',
  'harness/viral-manual-summary-integrity-checklist.md',
  'harness/viral-manual-artifact-manifest-product-brief.md',
  'harness/viral-manual-artifact-manifest-checklist.md'
];

const serviceSimplificationDocs = [
  ...readinessDocs,
  'harness/devtools-smoke-product-brief.md',
  'harness/devtools-smoke-checklist.md',
  'harness/devtools-service-recovery-checklist.md',
  'harness/devtools-recovery-report-design-note.md',
  'harness/manual-runbook-checklist.md',
  'harness/manual-preflight-alignment-checklist.md',
  'harness/hardening-product-brief.md',
  'harness/hardening-design-checklist.md',
  'harness/manual-test-results.example.json',
  'harness/sanitized-summary-checklist.md',
  'DESIGN_SYSTEM.md'
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

function redactReadinessOutput(output) {
  return String(output || '')
    .replaceAll(rootDir, '<repo-worktree>')
    .replace(/\/private\/tmp\/street-tasks-iter-worktrees\/[^\s"'`),\]}<>]+/g, '<repo-worktree>')
    .replace(/\/tmp\/street-tasks-iter-worktrees\/[^\s"'`),\]}<>]+/g, '<repo-worktree>')
    .replace(/\/Users\/[^\s"'`),\]}<>]+/g, '<local-path>');
}

function runCheck(scriptPath, label, options = {}) {
  const result = spawnSync(process.execPath, ['--no-warnings', scriptPath], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: options.redactOutput ? 'pipe' : 'inherit'
  });

  if (options.redactOutput) {
    process.stdout.write(redactReadinessOutput(result.stdout));
    process.stderr.write(redactReadinessOutput(result.stderr));
  }

  assert.equal(
    result.status,
    0,
    `Readiness gate failed: ${label} (${scriptPath}). This is a preflight blocker; DevTools or real-device visual acceptance must stay unverified until manually tested.`
  );
}

function runServiceSimplificationCheck() {
  const publishWxml = readProjectFile('pages/publish/publish.wxml');
  const publishWxss = readProjectFile('pages/publish/publish.wxss');
  const mapJs = readProjectFile('pages/map/map.js');
  const mapWxml = readProjectFile('pages/map/map.wxml');
  const mapWxss = readProjectFile('pages/map/map.wxss');
  const adminJs = readProjectFile('pages/admin/admin.js');
  const detailWxml = readProjectFile('pages/detail/detail.wxml');
  const detailWxss = readProjectFile('pages/detail/detail.wxss');
  const adminWxml = readProjectFile('pages/admin/admin.wxml');
  const adminWxss = readProjectFile('pages/admin/admin.wxss');
  const feedbackWxml = readProjectFile('pages/feedback/feedback.wxml');
  const meWxml = readProjectFile('pages/me/me.wxml');
  const myPostsWxml = readProjectFile('pages/my-posts/my-posts.wxml');
  const activitiesWxml = readProjectFile('pages/activities/activities.wxml');
  const serviceSimplificationDocText = serviceSimplificationDocs
    .map((relativePath) => readProjectFile(relativePath))
    .join('\n');
  const combined = [
    publishWxml,
    publishWxss,
    mapJs,
    mapWxml,
    mapWxss,
    adminJs,
    detailWxml,
    detailWxss,
    adminWxml,
    adminWxss,
    feedbackWxml,
    meWxml,
    myPostsWxml,
    activitiesWxml,
    serviceSimplificationDocText
  ].join('\n');

  const removedDisplayPatterns = [
    ['publish readiness card', /\bpublish-ready\b|\bready-grid\b/],
    ['publish section notes', /\bform-section-note\b/],
    ['map drawer duplicate counter', /\bdrawer-counter\b|按发布时间排序/],
    ['publish spread step list', /\bspread-steps\b|\bspread-step\b|\bspread-notes\b/],
    ['ordinary share guide rows', /\bshare-guide\b|\bshare-note\b/],
    ['receiver guide rows', /\bshare-receiver-rows\b|\bshare-receiver-note\b/],
    ['relay prompt detail rows', /\bcomment-relay-rows\b|\bcomment-relay-row\b/],
    ['trust secondary notes', /\btrust-signal-note\b|\btrust-hint\b/],
    ['admin duplicate count header', /仅管理员可见|feedback-count\b|来自“我的”页反馈入口|按举报和过时风险排序/],
    ['feedback/list explanatory headings', /问题、建议、想要的功能|当前账号发布过的附近任务|你确认、标记过时或举报过的附近任务/],
    ['empty-state explanatory copy', /可以从身边的失物|在详情页确认有效|用户提交后会显示在这里|换个关键词/],
    ['profile secondary action copy', /\{\{nextAction\.note\}\}|你刚参与过的附近任务/],
    ['map removed count state', /activeCategoryText|viewportPostCount/],
    ['admin removed feedback count state', /stats:\s*\{[^}]*\bfeedback\b|feedback:\s*feedbacks\.length|feedback:\s*this\.data\.feedbacks\.length/],
    ['stale publish readiness docs', /PublishReadiness|发布准备度|准备度清单|准备度文案|发布准备”模块|准备度计数|准备项两列网格|publish-readiness|readiness checklist card|readiness action checklist/]
  ];

  for (const [label, pattern] of removedDisplayPatterns) {
    assert.doesNotMatch(combined, pattern, `Simplified UI should not reintroduce ${label}.`);
  }

  const requiredFunctionalPatterns = [
    ['publish bottom action', publishWxml, /class="bottom-action publish-action"[\s\S]*bindtap="submit"/],
    ['publish location confirmation', publishWxml, /bindtap="confirmLocation"/],
    ['map list filters', mapWxml, /wx:for="\{\{categoryFilters\}\}"[\s\S]*bindtap="changeCategory"/],
    ['map detail entry', mapWxml, /catchtap="openDetail"/],
    ['share receiver focused home CTA', detailWxml, /bindtap="goHomeWithPost"[\s\S]*回首页查这条/],
    ['receiver conversion share CTA', detailWxml, /data-share-context="receiverConversion"/],
    ['post-publish share CTA', detailWxml, /publishSpreadPlan\.shouldEncourageSpread[\s\S]*open-type="share"/],
    ['ordinary share CTA', detailWxml, /shareMessage[\s\S]*open-type="share"/],
    ['trust actions', detailWxml, /data-action="confirm"[\s\S]*data-action="stale"[\s\S]*data-action="report"/],
    ['comment entry', detailWxml, /bindtap="openCommentDialog"/],
    ['admin refresh', adminWxml, /bindtap="refresh"/],
    ['admin search and filters', adminWxml, /bindinput="onSearchInput"[\s\S]*bindtap="changeFilter"/],
    ['admin moderation actions', adminWxml, /bindtap="openDetail"[\s\S]*bindtap="resolve"[\s\S]*bindtap="hide"/],
    ['feedback submit', feedbackWxml, /bindtap="submitFeedback"/],
    ['profile next action', meWxml, /bindtap="handleNextAction"/],
    ['profile feedback entry', meWxml, /bindtap="goFeedback"/],
    ['my posts empty action and detail open', myPostsWxml, /bindtap="goPublish"[\s\S]*bindtap="openDetail"/],
    ['activities empty action and detail open', activitiesWxml, /bindtap="goHome"[\s\S]*bindtap="openDetail"/]
  ];

  for (const [label, text, pattern] of requiredFunctionalPatterns) {
    assert.match(text, pattern, `Simplification should keep ${label}.`);
  }

  console.log('Service simplification checks passed.');
}

runCheck('scripts/check-publish-flow.mjs', 'publish flow model check');
runServiceSimplificationCheck();
runCheck('scripts/check-publish-spread.mjs', 'post-publish spread plan check');
runCheck('scripts/check-comment-relay.mjs', 'comment relay prompt check');
runCheck('scripts/check-action-relay.mjs', 'action relay prompt check');
runCheck('scripts/check-receiver-conversion.mjs', 'receiver conversion relay check');
runCheck('scripts/check-detail-action-guards.mjs', 'detail action busy guard check');
runCheck('scripts/check-store-permission-guards.mjs', 'store permission guard check');
runCheck('scripts/check-cloud-comment-order.mjs', 'cloud comment newest-first query check');
runCheck('scripts/check-admin-review.mjs', 'admin review performance/state helper check');
runCheck('scripts/check-performance-guards.mjs', 'performance regression guard');
runCheck('scripts/check-viral-journey-evidence.mjs', 'viral journey evidence model check');
console.log('Running viral journey manual evidence gate. This scans ignored local result files only when they exist.');
runCheck('scripts/check-viral-journey-manual-evidence.mjs', 'viral journey manual evidence gate');
console.log('Viral journey manual evidence gate passed structurally; this does not prove DevTools or real-device UI passed.');
console.log('Running viral journey DevTools manual-run preparation. This is no-side-effect environment diagnostics and does not prove UI passed.');
runCheck('scripts/prepare-viral-journey-devtools-run.mjs', 'viral journey DevTools manual-run preparation', { redactOutput: true });
console.log('Viral journey DevTools manual-run preparation completed; port/smoke blockers remain manual execution blockers, not UI passed evidence.');
console.log('Viral blocked evidence capture command exists, but readiness does not run it because capture writes ignored local evidence files.');
runCheck('scripts/check-share-receiver.mjs', 'share receiver guidance check');
runCheck('scripts/check-share-receiver-action.mjs', 'share receiver action strip check');
runCheck('scripts/check-timeline-share.mjs', 'timeline share payload check');
runCheck('scripts/check-viral-attribution.mjs', 'viral attribution event check');
console.log('Running DevTools recovery static guard. This does not quit or reopen DevTools.');
runCheck('scripts/check-devtools-recovery.mjs', 'DevTools recovery static guard');
console.log('Running DevTools port forensics static guard. This is read-only/static and does not quit or open DevTools.');
runCheck('scripts/check-devtools-port-forensics.mjs', 'DevTools port forensics static guard');
console.log('Running DevTools UI confirmation static guard. This does not run the UI-state-dependent prepare script and does not automate DevTools UI.');
runCheck('scripts/check-devtools-ui-confirmation.mjs', 'DevTools UI confirmation static guard');
console.log('Running viral manual journey evidence packet static guard. This does not run scripts/prepare-viral-journey-evidence-packet.mjs because that prepare script needs UI-state parameters.');
runCheck('scripts/check-viral-journey-evidence-packet.mjs', 'viral manual journey evidence packet static guard');
console.log('Running viral manual summary integrity preflight. This only checks ignored local viral journey JSON/summary pairs when they exist and does not prove UI passed.');
runCheck('scripts/check-viral-manual-summary-integrity-preflight.mjs', 'viral manual summary integrity preflight');
console.log('Viral manual summary integrity preflight completed; DevTools UI, real-device, and viral journey passed status still require real manual evidence.');
console.log('Running viral manual artifact manifest preflight. This only checks ignored local viral journey artifact manifests when they exist and does not prove UI passed.');
runCheck('scripts/check-viral-manual-artifact-manifest-preflight.mjs', 'viral manual artifact manifest preflight');
console.log('Viral manual artifact manifest preflight completed; DevTools UI, real-device, and viral journey passed status still require real manual evidence.');
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
