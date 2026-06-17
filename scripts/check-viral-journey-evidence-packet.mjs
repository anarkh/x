import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const preparePath = join(rootDir, 'scripts/prepare-viral-journey-evidence-packet.mjs');
const checkPath = join(rootDir, 'scripts/check-viral-journey-evidence-packet.mjs');
const acPreparePath = join(rootDir, 'scripts/prepare-devtools-ui-confirmation-run.mjs');
const readinessPath = join(rootDir, 'scripts/check-devtools-readiness.mjs');
const packagePath = join(rootDir, 'package.json');
const examplePath = join(rootDir, 'harness/viral-journey-manual-results.example.json');
const productBriefPath = join(rootDir, 'harness/viral-manual-journey-evidence-packet-product-brief.md');
const checklistPath = join(rootDir, 'harness/viral-manual-journey-evidence-packet-checklist.md');

assert.ok(existsSync(preparePath), 'prepare-viral-journey-evidence-packet.mjs must exist.');
assert.ok(existsSync(acPreparePath), 'AC prepare-devtools-ui-confirmation-run.mjs must exist.');
assert.ok(existsSync(readinessPath), 'check-devtools-readiness.mjs must exist.');
assert.ok(existsSync(examplePath), 'viral journey manual example JSON must exist.');

const prepareSource = readFileSync(preparePath, 'utf8');
const checkSource = readFileSync(checkPath, 'utf8');
const checkImportSource = checkSource
  .split('\n')
  .filter((line) => line.startsWith('import '))
  .join('\n');
const readinessSource = readFileSync(readinessPath, 'utf8');
const productBriefSource = readFileSync(productBriefPath, 'utf8');
const checklistSource = readFileSync(checklistPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const manualExample = JSON.parse(readFileSync(examplePath, 'utf8'));

function requireText(source, fragment, label = fragment) {
  assert.ok(source.includes(fragment), `Missing required ${label}.`);
}

function requirePattern(source, pattern, label) {
  assert.ok(pattern.test(source), `Missing required ${label}.`);
}

[
  '--project',
  '--port',
  '--ui-service-port-state',
  '--ui-port-state',
  '--strict',
  'enabled',
  'disabled',
  'not_found',
  'unavailable',
  'not_confirmed',
  'matches_9420',
  'mismatch',
  'unconfirmed'
].forEach((fragment) => requireText(prepareSource, fragment, `argument or state vocabulary ${fragment}`));

[
  'pre_manual_confirmation',
  'blocked_config_disabled',
  'blocked_port_mismatch',
  'blocked_no_listener',
  'blocked_smoke_access',
  'ready_for_manual_journey',
  'ready_to_execute_manual_journey',
  'not_ready_for_manual_journey',
  'packetStatus: ready_to_execute',
  'packetStatus: not_ready'
].forEach((fragment) => requireText(prepareSource, fragment, `status vocabulary ${fragment}`));

requireText(prepareSource, 'scripts/prepare-devtools-ui-confirmation-run.mjs', 'AC prepare subcommand');
requirePattern(
  prepareSource,
  /const isReady = ac\.acStatus === acReadyStatus[\s\S]{0,260}printBlockedPacket[\s\S]{0,260}process\.exit\(options\.strict \? 1 : 0\)[\s\S]{0,220}printReadyPacket/,
  'packet readiness must be gated only by AC ready_for_manual_journey'
);
requireText(prepareSource, "const acReadyStatus = 'ready_for_manual_journey'", 'AC ready constant');
requireText(prepareSource, "const readyStatus = 'ready_to_execute_manual_journey'", 'packet ready constant');
requireText(prepareSource, "const notReadyStatus = 'not_ready_for_manual_journey'", 'packet not-ready constant');
[
  'status: not_ready_for_manual_journey',
  'status: ready_to_execute_manual_journey',
  'packetStatus: not_ready',
  'packetStatus: ready_to_execute'
].forEach((fragment) => {
  requireText(productBriefSource, fragment, `AD product brief status wording ${fragment}`);
  requireText(checklistSource, fragment, `AD checklist status wording ${fragment}`);
});
[
  'packetStatus: not-ready',
  'packetStatus=not-ready',
  'packetStatus: ready_to_execute_manual_journey',
  'packetStatus=ready_to_execute_manual_journey',
  'packet_ready'
].forEach((fragment) => {
  assert.ok(!productBriefSource.includes(fragment) && !checklistSource.includes(fragment), `AD docs must not use stale packetStatus wording: ${fragment}`);
});

assert.equal(manualExample.journeys.length, 7, 'Example manual journey JSON must define exactly seven journeys.');
requireText(prepareSource, 'JSON.parse(readFileSync(examplePath', 'structured JSON journey parsing');
requireText(prepareSource, 'Expected exactly seven viral manual journeys', 'seven journey guard');
[
  'first-hop-share-entry',
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source',
  'ordinary-and-risk-entries',
  'timeline-share-channel',
  'timeline-risk-gating'
].forEach((journeyId) => {
  assert.ok(manualExample.journeys.some((journey) => journey.id === journeyId), `Example JSON must contain journey ${journeyId}.`);
});
[
  'sharePayload.path',
  'sharePayloadInspection',
  'receiverAction=confirm',
  'receiverAction=comment',
  'share_id, parent_share_id, and share_depth=2 or 2_plus',
  'timelinePayload.title',
  'timelinePayload.query|path',
  'shareChannel=timeline',
  'timelineMenuInspection',
  'record observed shareTimeline/timeline menu absence',
  'cautiousCopyObservation'
].forEach((fragment) => requireText(prepareSource, fragment, `evidence or payload check ${fragment}`));

requireText(
  prepareSource,
  'notClaimed: ${exactNotClaimed}',
  'exact notClaimed output interpolation'
);
requireText(
  prepareSource,
  'no DevTools UI journey passed; no real-device journey passed; no viral journey passed',
  'exact notClaimed wording'
);
requireText(
  prepareSource,
  'run node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <local-json>',
  'manual evidence checker reminder'
);
requirePattern(
  prepareSource,
  /function printBlockedPacket[\s\S]*packetStatus: not_ready[\s\S]*acStatus[\s\S]*acNextStep[\s\S]*notClaimed[\s\S]*no packet journey evidence is emitted[\s\S]*raw child stdout\/stderr/,
  'blocked output has packetStatus, AC status, nextStep, notClaimed, and no journey evidence'
);
requirePattern(
  prepareSource,
  /function printReadyPacket[\s\S]*packetStatus: ready_to_execute[\s\S]*journeyCount[\s\S]*manualJourneys:/,
  'ready output emits the seven manual journey packet'
);

const prepareSourceWithoutExactNotClaimed = prepareSource.replaceAll(
  'no DevTools UI journey passed; no real-device journey passed; no viral journey passed',
  ''
);
[
  'ui_passed',
  'journey_passed',
  'journey_passed_by_tool',
  'devtools_recovered',
  'passed_by_AD',
  'manual_journey_passed',
  'real_device_passed',
  'viral_passed',
  'passedEvidence',
  'evidencePassed',
  'all journeys passed'
].forEach((badClaim) => {
  assert.ok(
    !prepareSourceWithoutExactNotClaimed.toLowerCase().includes(badClaim.toLowerCase()),
    `Packet prepare must not expose misleading claim token: ${badClaim}`
  );
});
[
  'DevTools UI passed',
  'real-device passed',
  'real device passed',
  'viral journey passed',
  'journey passed',
  'passed by AD'
].forEach((badPhrase) => {
  assert.ok(
    !prepareSourceWithoutExactNotClaimed.toLowerCase().includes(badPhrase.toLowerCase()),
    `Packet prepare must not expose misleading passed phrase outside exact notClaimed: ${badPhrase}`
  );
});
[
  'prepare:viral-manual-journey-evidence-packet',
  'check:viral-journey-manual-evidence'
].forEach((staleCommand) => {
  assert.ok(!productBriefSource.includes(staleCommand) && !checklistSource.includes(staleCommand), `AD docs must not mention stale npm command: ${staleCommand}`);
});
requireText(productBriefSource, 'prepare:viral-journey-evidence-packet', 'documented packet npm command');
requireText(productBriefSource, 'node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <ignored-local-result.json>', 'documented manual evidence checker command');
requireText(productBriefSource, 'ready 前不得展示七条 journey 的逐项执行 packet', 'product brief ready-before no journey expansion boundary');
assert.ok(!/console\.(?:log|error)\([^)]*(?:stdout|stderr|combinedOutput|command\.output|result\.stdout|result\.stderr)/s.test(prepareSource), 'Packet prepare must not print raw child stdout/stderr.');
requireText(prepareSource, 'redactForSafety', 'redaction helper');
requireText(prepareSource, '<repo-worktree>', 'repo path redaction label');
requireText(prepareSource, '<local-path>', 'local path redaction label');
requirePattern(
  prepareSource,
  /token[\s\S]{0,220}cookie[\s\S]{0,220}session[\s\S]{0,220}openid[\s\S]{0,260}secret|access\[_-\]\?token[\s\S]{0,260}refresh\[_-\]\?token[\s\S]{0,260}openid[\s\S]{0,260}secret/,
  'sensitive output redaction coverage'
);

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
  assert.ok(!pattern.test(prepareSource), `Packet prepare must remain read-only and avoid pattern ${pattern}.`);
});
assert.ok(!checkImportSource.includes("from 'node:child_process'"), 'Packet static guard must not run child commands.');
assert.ok(
  !/import\s+\{[^}]*\b(?:writeFileSync|appendFileSync|truncateSync|rmSync|unlinkSync|mkdirSync|renameSync|copyFileSync|createWriteStream)\b[^}]*\}\s+from 'node:fs'/.test(checkImportSource),
  'Packet static guard must not import mutating filesystem APIs.'
);

[
  'scripts/prepare-viral-journey-evidence-packet.mjs',
  'scripts/check-viral-journey-evidence-packet.mjs',
  'harness/viral-manual-journey-evidence-packet-product-brief.md',
  'harness/viral-manual-journey-evidence-packet-checklist.md'
].forEach((fragment) => requireText(readinessSource, fragment, `readiness required file ${fragment}`));
assert.ok(existsSync(productBriefPath), 'AD product brief must exist for readiness.');
assert.ok(existsSync(checklistPath), 'AD checklist must exist for readiness.');
requirePattern(
  readinessSource,
  /evidence packet static guard[\s\S]{0,260}(?:does not run|not run)[\s\S]{0,220}(?:prepare-viral-journey-evidence-packet|UI-state|UI state)/i,
  'readiness must explain it runs only the static guard, not the UI-state-dependent packet prepare'
);
requirePattern(
  readinessSource,
  /runCheck\('scripts\/check-viral-journey-evidence-packet\.mjs'[\s\S]{0,120}'viral manual journey evidence packet static guard'/,
  'readiness must run the packet static guard'
);
assert.ok(
  !/runCheck\('scripts\/prepare-viral-journey-evidence-packet\.mjs'/.test(readinessSource),
  'readiness must not run the UI-state-dependent packet prepare script'
);

assert.equal(
  packageJson.scripts['prepare:viral-journey-evidence-packet'],
  'node scripts/prepare-viral-journey-evidence-packet.mjs',
  'package.json must expose prepare:viral-journey-evidence-packet.'
);
assert.equal(
  packageJson.scripts['check:viral-journey-evidence-packet'],
  'node scripts/check-viral-journey-evidence-packet.mjs',
  'package.json must expose check:viral-journey-evidence-packet.'
);

console.log('Viral manual journey evidence packet static guard checks passed.');
