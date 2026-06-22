import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const recoveryPath = join(rootDir, 'scripts/recover-devtools-service-port.mjs');
const source = readFileSync(recoveryPath, 'utf8');

function requireText(fragment, label = fragment) {
  assert.ok(source.includes(fragment), `recover-devtools-service-port.mjs must include ${label}`);
}

function requirePattern(pattern, label) {
  assert.match(source, pattern, `recover-devtools-service-port.mjs must include ${label}`);
}

requireText('--app-quit-reopen', 'the --app-quit-reopen CLI flag');
requireText('appQuitReopen', 'an app quit/reopen option');
requireText('options.quitReopen && options.appQuitReopen', 'mutual exclusion between recovery modes');
requireText('Choose only one recovery mode: --quit-reopen or --app-quit-reopen.', 'a clear mutual-exclusion error');

requireText('Default mode is diagnostic-only', 'default diagnostic-only usage text');
requireText('const sideEffectsAllowed = selectedMode && !options.dryRun;', 'side effects gated by an opt-in mode and not --dry-run');
requireText('skipped because no recovery mode was selected', 'default no-side-effect skipped action');
requireText('skipped because --dry-run was requested', 'dry-run no-side-effect skipped action');

requireText('osascript', 'macOS osascript app quit');
requireText('tell application id', 'bundle-id app quit command');
requireText('CFBundleIdentifier', 'bundle Info.plist lookup');
requireText('com.tencent.webplusdevtools', 'bundle id fallback');
requireText('DevTools bundle Info.plist CFBundleIdentifier', 'Info.plist source reporting');
requireText('fallback com.tencent.webplusdevtools because Info.plist CFBundleIdentifier was unavailable', 'fallback source reporting');

requireText('dry-run diagnostics', 'dry-run diagnostics mode label');
requireText('cli quit-reopen', 'CLI quit/reopen mode label');
requireText('app quit-reopen', 'app quit/reopen mode label');

requirePattern(/selectedMode === 'app'[\s\S]+runAppQuitAction/, 'app mode uses app quit action');
requirePattern(/selectedMode === 'app'[\s\S]+else[\s\S]+runCliAction\('DevTools quit'/, 'CLI quit is separate from app quit');
requireText("'open',", 'CLI open command is retained for reopen');
requireText("'--project',", 'CLI open still passes --project');
requireText("'--port',", 'CLI open still passes --port');
requireText("'--disable-gpu'", 'CLI open still passes --disable-gpu');

requireText('rerun with exactly one opt-in recovery mode: --quit-reopen or --app-quit-reopen', 'dry-run next-step mode choice');
requireText('rerun without --dry-run using', 'selected dry-run next step');
requireText('after the app-level quit/reopen', 'app-mode next-step wording');
requireText('Run actual DevTools/manual journey checks separately after access is ready.', 'manual evidence next step');

requireText('makeRedactor', 'path and secret redaction helper');
requireText('summarize(result.stdout, redact)', 'stdout summarization with redaction');
requireText('summarize(result.stderr, redact)', 'stderr summarization with redaction');

console.log('DevTools recovery static checks passed.');
