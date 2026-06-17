import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const preparePath = join(rootDir, 'scripts/prepare-devtools-ui-confirmation-run.mjs');
const readinessPath = join(rootDir, 'scripts/check-devtools-readiness.mjs');
const packagePath = join(rootDir, 'package.json');
const productBriefPath = join(rootDir, 'harness/devtools-service-port-ui-confirmation-product-brief.md');
const checklistPath = join(rootDir, 'harness/devtools-service-port-ui-confirmation-checklist.md');

assert.ok(existsSync(preparePath), 'prepare-devtools-ui-confirmation-run.mjs must exist.');
assert.ok(existsSync(productBriefPath), 'AC product brief must exist.');
assert.ok(existsSync(checklistPath), 'AC QA checklist must exist.');

const prepareSource = readFileSync(preparePath, 'utf8');
const readinessSource = readFileSync(readinessPath, 'utf8');
const productBriefSource = readFileSync(productBriefPath, 'utf8');
const checklistSource = readFileSync(checklistPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

function requireText(source, fragment, label = fragment) {
  assert.ok(source.includes(fragment), `Missing required ${label}.`);
}

function requirePattern(source, pattern, label) {
  assert.ok(pattern.test(source), `Missing required ${label}.`);
}

[
  '--ui-service-port-state',
  '--ui-port-state',
  'enabled',
  'disabled',
  'not_found',
  'unavailable',
  'not_confirmed',
  'matches_9420',
  'mismatch',
  'unconfirmed'
].forEach((fragment) => requireText(prepareSource, fragment, `UI state argument/value ${fragment}`));

[
  'pre_manual_confirmation',
  'blocked_config_disabled',
  'blocked_port_mismatch',
  'blocked_no_listener',
  'blocked_smoke_access',
  'ready_for_manual_journey'
].forEach((status) => requireText(prepareSource, status, `AC status ${status}`));

[
  'ui_passed',
  'journey_passed_by_tool',
  'devtools_recovered',
  'ready_for_manual_smoke',
  'manual_journey_passed'
].forEach((badStatus) => {
  assert.ok(!new RegExp(`['"\`]${badStatus}['"\`]`).test(prepareSource), `AC script must not expose misleading status ${badStatus}.`);
});
assert.ok(
  !productBriefSource.includes('ready_for_manual_smoke') && !checklistSource.includes('ready_for_manual_smoke'),
  'AC docs must use ready_for_manual_journey, not the older ready_for_manual_smoke wording.'
);
assert.ok(
  !checklistSource.includes('notClaimed: DevTools UI passed') && !checklistSource.includes('notClaimed=viral journey passed'),
  'AC checklist must use explicitly negated notClaimed wording.'
);
requireText(
  checklistSource,
  'notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed',
  'safe notClaimed checklist wording'
);

requireText(prepareSource, 'allowedAcStatuses', 'documented AC status vocabulary guard');
requirePattern(
  prepareSource,
  /uiServicePortState === 'enabled'[\s\S]{0,260}uiPortState === 'matches_9420'[\s\S]{0,260}listenerState === 'listening'[\s\S]{0,260}smokeState === 'ready'[\s\S]{0,260}viralPreparation\.status === 'ready'/,
  'ready requires manual enabled, matching UI port, listener, smoke, and viral preparation readiness'
);
requirePattern(
  prepareSource,
  /uiServicePortState === 'disabled'[\s\S]{0,180}blocked_config_disabled/,
  'disabled UI state maps to blocked_config_disabled'
);
requirePattern(
  prepareSource,
  /not_confirmed[\s\S]{0,240}pre_manual_confirmation/,
  'unconfirmed UI state maps to pre_manual_confirmation'
);
requireText(prepareSource, 'nextStep:', 'blocked output nextStep field');
requireText(prepareSource, 'buildNextStep', 'central nextStep builder');
requirePattern(
  prepareSource,
  /function buildNextStep[\s\S]*blocked_config_disabled[\s\S]*blocked_port_mismatch[\s\S]*blocked_no_listener[\s\S]*blocked_smoke_access/,
  'all blocked statuses are handled by the nextStep builder'
);

requireText(prepareSource, 'notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed', 'not-claimed output');
requireText(prepareSource, 'port/smoke ready is not viral journey passed', 'ready is not passed reminder');
requirePattern(
  prepareSource,
  /manualJourneyStatus[\s\S]{0,80}unverified[\s\S]{0,240}strictSubcommandNonzero/,
  'manual journey remains unverified and externalized'
);

requireText(prepareSource, 'raw config/log/stdout/stderr and local paths suppressed', 'raw output suppression wording');
requireText(prepareSource, 'redactForSafety', 'redaction helper');
requirePattern(
  prepareSource,
  /token[\s\S]{0,160}cookie[\s\S]{0,160}session[\s\S]{0,220}openid[\s\S]{0,260}secret|access\[_-\]\?token[\s\S]{0,260}refresh\[_-\]\?token[\s\S]{0,260}openid[\s\S]{0,260}secret/,
  'sensitive value redaction coverage for token, cookie, session, openid, and secret-like fields'
);
requireText(prepareSource, '<repo-worktree>', 'repo worktree path redaction label');
requireText(prepareSource, '<local-path>', 'local user path redaction label');
assert.ok(!/console\.(?:log|error)\([^)]*(?:stdout|stderr|combinedOutput|command\.output|result\.stdout|result\.stderr)/s.test(prepareSource), 'AC prepare script must not print full child stdout/stderr.');

[
  /\bwriteFile(?:Sync)?\b|\bappendFile(?:Sync)?\b|\btruncate(?:Sync)?\b|\butimes(?:Sync)?\b/,
  /\bmkdir(?:Sync)?\b|\bmkdtemp(?:Sync)?\b|\brm(?:Sync)?\b|\bunlink(?:Sync)?\b|\brmdir(?:Sync)?\b/,
  /\brename(?:Sync)?\b|\bcopyFile(?:Sync)?\b|\bchmod(?:Sync)?\b|\bchown(?:Sync)?\b|\bcreateWriteStream\b|\bfs\.promises\b/,
  /\bprocess\.kill\b|\bkillSync\b/,
  /spawnSync\(\s*['"](?:[^'"]*\/)?(?:kill|killall|pkill)['"]/s,
  /spawnSync\(\s*['"](?:[^'"]*\/)?(?:open|defaults|launchctl)['"]/s,
  /spawnSync\(\s*['"](?:[^'"]*\/)?plutil['"]\s*,\s*\[[^\]]*['"]-(?:replace|remove|insert|create|convert)['"]/s,
  /spawnSync\([^,\n]+,\s*\[[^\]]*['"](?:quit|open|preview|upload|kill|killall|pkill|defaults|launchctl|osascript)['"]/s,
  /--attempt-open/,
  /\b(?:playwright|puppeteer|selenium|robotjs|osascript)\b/i
].forEach((pattern) => {
  assert.ok(!pattern.test(prepareSource), `AC prepare script must remain read-only and avoid pattern ${pattern}.`);
});

[
  'scripts/inspect-devtools-port-state.mjs',
  'scripts/check-devtools-smoke-access.mjs',
  'scripts/prepare-viral-journey-devtools-run.mjs'
].forEach((fragment) => requireText(prepareSource, fragment, `read-only child command ${fragment}`));

requireText(prepareSource, 'parseInspectSummary', 'inspect summary parser');
requireText(prepareSource, 'parseSmokeSummary', 'smoke summary parser');
requireText(prepareSource, 'parseViralPreparationSummary', 'viral preparation summary parser');
requireText(prepareSource, 'strictSubcommandNonzero', 'strict child nonzero summary');
requirePattern(
  prepareSource,
  /process\.exit\(options\.strict && status !== 'ready_for_manual_journey' \? 1 : 0\)/,
  'strict exits nonzero only when AC status is not ready'
);

requireText(readinessSource, 'scripts/check-devtools-ui-confirmation.mjs', 'AC UI confirmation static guard in readiness');
requireText(readinessSource, 'harness/devtools-service-port-ui-confirmation-product-brief.md', 'AC product brief in readiness required files');
requireText(readinessSource, 'harness/devtools-service-port-ui-confirmation-checklist.md', 'AC checklist in readiness required files');
requirePattern(
  readinessSource,
  /UI confirmation static guard[\s\S]{0,260}(?:does not run|not run)[\s\S]{0,160}(?:prepare|UI-state|UI state)/i,
  'readiness explains it only runs the static guard, not UI-state-dependent prepare'
);
requireText(readinessSource, 'redactReadinessOutput', 'readiness output redaction helper');
requirePattern(
  readinessSource,
  /prepare-viral-journey-devtools-run\.mjs[\s\S]{0,180}redactOutput:\s*true/,
  'readiness redacts environment-diagnostic child output'
);

assert.equal(
  packageJson.scripts['prepare:devtools-ui-confirmation'],
  'node scripts/prepare-devtools-ui-confirmation-run.mjs',
  'package.json must expose prepare:devtools-ui-confirmation.'
);
assert.equal(
  packageJson.scripts['check:devtools-ui-confirmation'],
  'node scripts/check-devtools-ui-confirmation.mjs',
  'package.json must expose check:devtools-ui-confirmation.'
);

console.log('DevTools UI confirmation static guard checks passed.');
