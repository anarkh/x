import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const inspectPath = join(rootDir, 'scripts/inspect-devtools-port-state.mjs');
const readinessPath = join(rootDir, 'scripts/check-devtools-readiness.mjs');

const inspectSource = readFileSync(inspectPath, 'utf8');
const readinessSource = readFileSync(readinessPath, 'utf8');

function requireInspectPattern(pattern, label) {
  assert.match(inspectSource, pattern, `inspect-devtools-port-state.mjs must include ${label}`);
}

function requireInspectText(text, label = text) {
  assert.ok(inspectSource.includes(text), `inspect-devtools-port-state.mjs must include ${label}`);
}

function requireReadinessPattern(pattern, label) {
  assert.match(readinessSource, pattern, `check-devtools-readiness.mjs must include ${label}`);
}

function requireReadinessText(text, label = text) {
  assert.ok(readinessSource.includes(text), `check-devtools-readiness.mjs must include ${label}`);
}

function requireInspectAllTerms(terms, label) {
  for (const term of terms) {
    requireInspectText(term, `${label}: ${term}`);
  }
}

requireInspectPattern(
  /\b(?:function|const|let)\s+(?:inspectRecentDevToolsLogs|inspect[A-Za-z0-9]*(?:DevTools|WeChat|Wechat)[A-Za-z0-9]*(?:Log|Logs|UserData|Forensics)[A-Za-z0-9]*)\b/,
  'a DevTools log/user-data read-only forensics entry such as inspectRecentDevToolsLogs'
);
requireInspectPattern(
  /(?:read-only|read only)[\s\S]{0,240}(?:forensics|log|logs|user-data|user data)|(?:forensics|log|logs|user-data|user data)[\s\S]{0,240}(?:read-only|read only)/i,
  'read-only DevTools log or user-data forensics wording'
);

requireInspectText('--enable-service-port', 'recent-log service-port flag relationship checks: --enable-service-port');
requireInspectPattern(
  /--ide-http-port|--\?ide-http-port|\(\?:--\)\?ide-http-port/,
  'recent-log service-port flag relationship checks: --ide-http-port'
);
requireInspectPattern(
  /recentLaunchTargetWithEnableCount[\s\S]{0,600}recentLaunchTargetWithoutEnableCount|recentLaunchTargetWithoutEnableCount[\s\S]{0,600}recentLaunchTargetWithEnableCount/,
  'recent-log relationship counters for launches with and without --enable-service-port'
);

requireInspectText('cli server started', 'historical or recent CLI server startup signal');
requireInspectPattern(
  /127[\s\S]{0,20}0[\s\S]{0,20}0[\s\S]{0,20}1[\s\S]{0,80}(?:targetPattern|\$\{|<port>|port)/i,
  'historical or recent 127.0.0.1:<port> startup signal'
);

requireInspectAllTerms(
  ['global.enableCLI', '--enable-service-port'],
  'bundled CLI source gate check for global.enableCLI and --enable-service-port'
);
requireInspectPattern(
  /(?:bundled|bundle|Contents)[\s\S]{0,320}(?:cli|CLI)[\s\S]{0,320}(?:source|global\.enableCLI)|(?:global\.enableCLI)[\s\S]{0,320}(?:bundled|bundle|Contents)[\s\S]{0,320}(?:cli|CLI)/,
  'bundled CLI source inspection without requiring source text output'
);

requireInspectText('service_port_flag_missing', 'service_port_flag_missing diagnosis code');
requireInspectText('service_port_flag_mixed_recent_evidence', 'mixed recent evidence diagnosis code');
requireInspectText('service_port_flag_gate_detected', 'conservative bundled source gate detection diagnosis code');
assert.ok(
  !inspectSource.includes('service_port_flag_gated_by_global_enable_cli'),
  'inspect-devtools-port-state.mjs must not claim the current blocker is gated by global.enableCLI from loose source-token presence alone'
);
requireInspectText('historical_service_port_success', 'historical_service_port_success diagnosis code');

const forbiddenSideEffectPatterns = [
  [/\bwriteFile(?:Sync)?\b|\bappendFile(?:Sync)?\b|\btruncate(?:Sync)?\b|\butimes(?:Sync)?\b/, 'file writes or timestamp updates'],
  [/\brm(?:Sync)?\b|\bunlink(?:Sync)?\b|\brmdir(?:Sync)?\b/, 'file deletion'],
  [/\brename(?:Sync)?\b|\bcopyFile(?:Sync)?\b|\bchmod(?:Sync)?\b|\bchown(?:Sync)?\b|\bcreateWriteStream\b|\bfs\.promises\b/, 'file mutation APIs'],
  [/\bprocess\.kill\b|\bkillSync\b|spawnSync\([^,\n]+,\s*\[[^\]]*['"](?:kill|killall|pkill)['"]/s, 'process killing'],
  [/spawnSync\(\s*['"](?:[^'"]*\/)?(?:kill|killall|pkill)['"]/s, 'process killing command'],
  [/osascript/, 'app quit/open automation'],
  [/spawnSync\(\s*['"](?:[^'"]*\/)?(?:open|defaults|launchctl)['"]/s, 'system command with side effects'],
  [/spawnSync\(\s*['"](?:[^'"]*\/)?plutil['"]\s*,\s*\[[^\]]*['"]-(?:replace|remove|insert|create|convert)['"]/s, 'plist mutation command'],
  [/spawnSync\([^,\n]+,\s*\[[^\]]*['"]open['"]/s, 'DevTools open command'],
  [/spawnSync\([^,\n]+,\s*\[[^\]]*['"]quit['"]/s, 'DevTools quit command'],
  [/spawnSync\([^,\n]+,\s*\[[^\]]*['"]preview['"]/s, 'DevTools preview command'],
  [/spawnSync\([^,\n]+,\s*\[[^\]]*['"]upload['"]/s, 'DevTools upload command']
];

for (const [pattern, label] of forbiddenSideEffectPatterns) {
  assert.ok(!pattern.test(inspectSource), `inspect-devtools-port-state.mjs must stay read-only and avoid ${label}`);
}

requireInspectPattern(
  /\b(?:redact|redacted|redaction|sanitize|sanitized|sanitization)\b/i,
  'redaction or sanitization for private DevTools log/user-data evidence'
);
requireInspectPattern(
  /\b(?:count|counts|summary|summarize|summarized)\b/i,
  'count or summary based reporting instead of raw log output'
);
requireInspectPattern(
  /(?:raw\s+log\s+lines?|log\s+lines?)[\s\S]{0,180}(?:not\s+printed|were\s+not\s+printed|not\s+output|not\s+returned|never\s+printed|suppressed)|(?:not\s+printed|not\s+output|not\s+returned|never\s+printed|suppressed)[\s\S]{0,180}(?:raw\s+log\s+lines?|log\s+lines?)/i,
  'explicit privacy wording that raw DevTools log lines are not output'
);
requireInspectPattern(
  /\b(?:function|const|let)\s+(?:inspectServicePortConfig|getServicePortConfigCandidates|classifyServicePortConfig)\b/,
  'a read-only DevTools service-port config forensics entry'
);
requireInspectText('WeappLocalData', 'DevTools local-data config candidate category');
requireInspectText('WeappVendor/cfg.json', 'DevTools vendor config candidate category');
requireInspectText('service_port_config_enabled_port_match', 'enabled and target-port match config diagnosis code');
requireInspectText('service_port_config_enabled_port_mismatch', 'enabled but target-port mismatch config diagnosis code');
requireInspectText('service_port_config_disabled', 'disabled config diagnosis code');
requireInspectText('service_port_config_unconfirmed', 'unconfirmed config diagnosis code');
requireInspectText('service_port_config_conflict', 'conflicting config diagnosis code');
assert.ok(
  !inspectSource.includes('service_port_config_enabled_port_unconfirmed'),
  'inspect-devtools-port-state.mjs should use the documented unconfirmed config diagnosis vocabulary'
);
requireInspectPattern(
  /enabledStates[\s\S]{0,400}portValues|portValues[\s\S]{0,400}enabledStates/,
  'config summaries for enabled state and port values'
);
requireInspectPattern(
  /if\s*\(\s*hasTargetPort\s*&&\s*hasOtherPort\s*\)[\s\S]{0,320}service_port_config_conflict[\s\S]{0,900}service_port_config_enabled_port_match/,
  'port conflict diagnosis before enabled target-port match'
);
requireInspectText('isSensitiveConfigKey', 'sensitive config key denylist');
requireInspectText('isServicePortPortConfigKey', 'service-port value key allowlist');
requireInspectPattern(
  /token[\s\S]{0,160}cookie[\s\S]{0,160}session[\s\S]{0,220}(?:openid|open\\s\+id)[\s\S]{0,260}(?:secret|password|credential)/i,
  'sensitive key denylist for token, cookie, session, identity, and secret-like fields'
);
requireInspectText('conflictCount', 'config conflict count summary');
requireInspectPattern(
  /notClaimed[\s\S]{0,260}DevTools\s+smoke\s+passed[\s\S]{0,260}DevTools\s+UI\s+journey\s+passed[\s\S]{0,260}real-device\s+journey\s+passed/,
  'explicit config not-claimed summary for smoke, UI, and real-device evidence'
);
requireInspectPattern(
  /raw\s+DevTools\s+config\s+content[\s\S]{0,180}(?:not\s+printed|suppressed)|(?:raw\s+config\s+content|config\s+file\s+names)[\s\S]{0,180}(?:not\s+printed|suppressed)/i,
  'explicit privacy wording that raw DevTools config content and file names are not output'
);

requireReadinessText(
  'scripts/check-devtools-port-forensics.mjs',
  'the DevTools port forensics static guard in readiness'
);
requireReadinessPattern(
  /(?:no-side-effect|no side effect|static|read-only|read only)[\s\S]{0,260}(?:quit|open)[\s\S]{0,120}DevTools|DevTools[\s\S]{0,260}(?:no-side-effect|no side effect|static|read-only|read only)[\s\S]{0,260}(?:quit|open)/i,
  'readiness output explaining this is a no-side-effect static/read-only guard that will not quit/open DevTools'
);

console.log('DevTools port forensics static guard checks passed.');
