import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const smokeScriptPath = join(rootDir, 'scripts/check-devtools-smoke-access.mjs');
const defaultPort = 9420;
const defaultTimeoutMs = 30000;
const reopenWaitMs = 1200;
const defaultAppBundleIdentifier = 'com.tencent.webplusdevtools';

function usage() {
  return [
    'Usage: node scripts/recover-devtools-service-port.mjs [--project <path>] [--port <number>] [--timeout-ms <n>] [--dry-run] [--quit-reopen|--app-quit-reopen] [--strict]',
    '',
    'Runs before/after WeChat DevTools service-port diagnostics.',
    'Default mode is diagnostic-only; recovery only runs when exactly one opt-in mode is provided without --dry-run.',
    '--quit-reopen uses the DevTools CLI quit/open path.',
    '--app-quit-reopen uses macOS app quit by bundle id, then the DevTools CLI open path.'
  ].join('\n');
}

function parsePositiveInteger(value, label, max = Number.MAX_SAFE_INTEGER) {
  if (!/^\d+$/.test(value || '')) {
    throw new Error(`${label} must be a positive integer.`);
  }

  const parsed = Number(value);

  if (parsed < 1 || parsed > max) {
    throw new Error(`${label} must be between 1 and ${max}.`);
  }

  return parsed;
}

function parseArgs(argv) {
  const options = {
    projectPath: rootDir,
    port: defaultPort,
    timeoutMs: defaultTimeoutMs,
    dryRun: false,
    quitReopen: false,
    appQuitReopen: false,
    strict: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--quit-reopen') {
      options.quitReopen = true;
      continue;
    }

    if (arg === '--app-quit-reopen') {
      options.appQuitReopen = true;
      continue;
    }

    if (arg === '--strict') {
      options.strict = true;
      continue;
    }

    if (arg === '--project' || arg === '--port' || arg === '--timeout-ms') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value.`);
      }

      if (arg === '--project') {
        options.projectPath = isAbsolute(value) ? resolve(value) : resolve(rootDir, value);
      } else if (arg === '--port') {
        options.port = parsePositiveInteger(value, '--port', 65535);
      } else {
        options.timeoutMs = parsePositiveInteger(value, '--timeout-ms');
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.quitReopen && options.appQuitReopen) {
    throw new Error('Choose only one recovery mode: --quit-reopen or --app-quit-reopen.');
  }

  return options;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeRedactor(options, cliPath = '') {
  const pathLabels = [
    [rootDir, '<repo>'],
    [options.projectPath, '<repo>'],
    [smokeScriptPath, '<smoke-check>'],
    [cliPath, '<devtools-cli>']
  ].filter(([filePath]) => Boolean(filePath));

  return (text) => {
    let redacted = String(text || '');

    for (const [filePath, label] of pathLabels) {
      redacted = redacted.replace(new RegExp(escapeRegExp(filePath), 'g'), label);
    }

    return redacted
      .replace(/<external-project:[^>]+>/g, '<repo>')
      .replace(/\/private\/tmp\/[^\s"'`),\]}<>]+/g, '<redacted-path>')
      .replace(/\/tmp\/[^\s"'`),\]}<>]+/g, '<redacted-path>')
      .replace(/\/Users\/[^\s"'`),\]}<>]+/g, '<redacted-user-path>')
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer <redacted-token>')
      .replace(/\b(access_token|refresh_token|password|cookie)=([^\s"'`),\]}<>]+)/gi, '$1=<redacted>');
  };
}

function summarize(text, redact) {
  const cleanText = redact(text).trim();

  if (!cleanText) {
    return '(empty)';
  }

  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);
  const summary = lines.join('\n');

  return summary.length > 1200 ? `${summary.slice(0, 1200)}...` : summary;
}

function parseSmokeStatus(output, timedOut) {
  if (timedOut) {
    return 'blocked';
  }

  const match = output.match(/^status:\s+([a-z]+)/m);

  return match ? match[1] : 'unknown';
}

function runSmokeCheck(label, options, redact) {
  // Keep detailed access diagnostics in the smoke script; this wrapper only orchestrates recovery.
  const result = spawnSync(process.execPath, [
    smokeScriptPath,
    '--project',
    options.projectPath,
    '--port',
    String(options.port),
    '--timeout-ms',
    String(options.timeoutMs)
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: options.timeoutMs,
    maxBuffer: 256 * 1024
  });
  const timedOut = result.error && result.error.code === 'ETIMEDOUT';
  const combinedOutput = `${result.stdout || ''}${result.stderr ? `\n${result.stderr}` : ''}`;
  let status = parseSmokeStatus(combinedOutput, timedOut);

  if (status === 'unknown' && result.status !== 0) {
    status = 'blocked';
  }

  return {
    label,
    status,
    timedOut,
    exitCode: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    summary: timedOut
      ? `smoke check timed out after ${options.timeoutMs}ms`
      : summarize(combinedOutput, redact),
    error: result.error && !timedOut ? summarize(result.error.message, redact) : ''
  };
}

function executableState(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return false;
  }

  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findDevToolsCli() {
  const candidates = [
    process.env.WECHAT_DEVTOOLS_CLI,
    process.env.WECHATWEBDEVTOOLS_CLI,
    '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    '/Applications/WeChatWebDevTools.app/Contents/MacOS/cli',
    '/Applications/微信开发者工具.app/Contents/MacOS/cli',
    '/Applications/wechatdevtools.app/Contents/MacOS/cli',
    join(homedir(), 'Applications/wechatwebdevtools.app/Contents/MacOS/cli'),
    join(homedir(), 'Applications/微信开发者工具.app/Contents/MacOS/cli')
  ];
  const seen = new Set();

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);

    if (executableState(candidate)) {
      return {
        ok: true,
        path: candidate
      };
    }
  }

  return {
    ok: false,
    path: ''
  };
}

function projectLooksOpenable(projectPath) {
  return existsSync(join(projectPath, 'project.config.json'));
}

function devToolsBundlePathFromCli(cliPath) {
  const marker = '/Contents/MacOS/';

  if (!cliPath.includes(marker)) {
    return '';
  }

  return cliPath.slice(0, cliPath.indexOf(marker));
}

function readDevToolsBundleIdentifier(cliPath, redact) {
  const bundlePath = devToolsBundlePathFromCli(cliPath);
  const plistPath = bundlePath ? join(bundlePath, 'Contents/Info.plist') : '';

  if (plistPath && existsSync(plistPath)) {
    const result = spawnSync('/usr/libexec/PlistBuddy', [
      '-c',
      'Print :CFBundleIdentifier',
      plistPath
    ], {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 5000,
      maxBuffer: 64 * 1024
    });
    const bundleIdentifier = (result.stdout || '').trim();

    if (result.status === 0 && bundleIdentifier) {
      return {
        bundleIdentifier,
        source: 'DevTools bundle Info.plist CFBundleIdentifier'
      };
    }
  }

  return {
    bundleIdentifier: defaultAppBundleIdentifier,
    source: 'fallback com.tencent.webplusdevtools because Info.plist CFBundleIdentifier was unavailable'
  };
}

function runCliAction(name, cliPath, args, options, redact) {
  const result = spawnSync(cliPath, args, {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: options.timeoutMs,
    maxBuffer: 128 * 1024
  });
  const timedOut = result.error && result.error.code === 'ETIMEDOUT';

  return {
    name,
    attempted: true,
    ok: result.status === 0 && !timedOut,
    timedOut,
    exitCode: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    stdout: summarize(result.stdout, redact),
    stderr: summarize(result.stderr, redact),
    error: result.error && !timedOut ? summarize(result.error.message, redact) : ''
  };
}

function runAppQuitAction(bundleInfo, options, redact) {
  const result = spawnSync('osascript', [
    '-e',
    `tell application id "${bundleInfo.bundleIdentifier}" to quit`
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: options.timeoutMs,
    maxBuffer: 128 * 1024
  });
  const timedOut = result.error && result.error.code === 'ETIMEDOUT';

  return {
    name: 'DevTools app quit',
    attempted: true,
    ok: result.status === 0 && !timedOut,
    timedOut,
    exitCode: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    detail: `bundle id ${bundleInfo.bundleIdentifier} (${bundleInfo.source})`,
    stdout: summarize(result.stdout, redact),
    stderr: summarize(result.stderr, redact),
    error: result.error && !timedOut ? summarize(result.error.message, redact) : ''
  };
}

function skippedAction(name, reason) {
  return {
    name,
    attempted: false,
    ok: false,
    reason
  };
}

function selectedRecoveryMode(options) {
  if (options.appQuitReopen) {
    return 'app';
  }

  if (options.quitReopen) {
    return 'cli';
  }

  return '';
}

function reportModeLabel(options) {
  const selectedMode = selectedRecoveryMode(options);

  if (options.dryRun || !selectedMode) {
    return 'dry-run diagnostics';
  }

  if (selectedMode === 'app') {
    return 'app quit-reopen';
  }

  return 'cli quit-reopen';
}

async function runRecoveryActions(options, redact) {
  const actions = [];
  const selectedMode = selectedRecoveryMode(options);
  const sideEffectsAllowed = selectedMode && !options.dryRun;

  if (!sideEffectsAllowed) {
    const reason = options.dryRun
      ? 'skipped because --dry-run was requested'
      : 'skipped because no recovery mode was selected';

    actions.push(skippedAction(selectedMode === 'app' ? 'DevTools app quit' : 'DevTools quit', reason));
    actions.push(skippedAction('reopen wait', reason));
    actions.push(skippedAction('DevTools open', reason));
    return actions;
  }

  const cli = findDevToolsCli();

  if (!cli.ok) {
    const quitActionName = selectedMode === 'app' ? 'DevTools app quit' : 'DevTools quit';
    actions.push(skippedAction(quitActionName, 'skipped because DevTools CLI was not found'));
    actions.push(skippedAction('reopen wait', 'skipped because DevTools CLI was not found'));
    actions.push(skippedAction('DevTools open', 'skipped because DevTools CLI was not found'));
    return actions;
  }

  const cliRedact = makeRedactor(options, cli.path);

  if (selectedMode === 'app') {
    const bundleInfo = readDevToolsBundleIdentifier(cli.path, cliRedact);
    actions.push(runAppQuitAction(bundleInfo, options, cliRedact));
  } else {
    actions.push(runCliAction('DevTools quit', cli.path, ['quit'], options, cliRedact));
  }

  const waitMs = Math.min(reopenWaitMs, options.timeoutMs);

  actions.push({
    name: 'reopen wait',
    attempted: true,
    ok: true,
    detail: `waited ${waitMs}ms before reopening`
  });
  await delay(waitMs);

  if (!projectLooksOpenable(options.projectPath)) {
    actions.push(skippedAction('DevTools open', 'skipped because <repo>/project.config.json was not found'));
    return actions;
  }

  actions.push(runCliAction('DevTools open', cli.path, [
    'open',
    '--project',
    options.projectPath,
    '--port',
    String(options.port),
    '--disable-gpu'
  ], options, cliRedact));

  return actions;
}

function appendSmokeSection(lines, title, result) {
  lines.push(title);
  lines.push(`- status: ${result.status}`);
  lines.push(`- exitCode: ${result.exitCode === null ? 'null' : result.exitCode}`);

  if (result.signal) {
    lines.push(`- signal: ${result.signal}`);
  }

  if (result.timedOut) {
    lines.push('- timeout: yes');
  }

  lines.push('- summary:');
  for (const line of result.summary.split(/\r?\n/)) {
    lines.push(`  ${line}`);
  }

  if (result.error) {
    lines.push(`- error: ${result.error}`);
  }
}

function appendActionSection(lines, actions) {
  lines.push('Actions attempted/skipped:');

  for (const action of actions) {
    if (!action.attempted) {
      lines.push(`- ${action.name}: skipped (${action.reason})`);
      continue;
    }

    lines.push(`- ${action.name}: ${action.ok ? 'completed' : 'attempted'}${action.timedOut ? ' (timed out)' : ''}`);

    if (action.detail) {
      lines.push(`  detail: ${action.detail}`);
    }

    if ('exitCode' in action) {
      lines.push(`  exitCode: ${action.exitCode === null ? 'null' : action.exitCode}`);
      lines.push(`  signal: ${action.signal || 'none'}`);
      lines.push(`  stdout: ${action.stdout}`);
      lines.push(`  stderr: ${action.stderr}`);
    }

    if (action.error) {
      lines.push(`  error: ${action.error}`);
    }
  }
}

function buildNextSteps({ options, after, actions }) {
  if (after.status === 'ready') {
    return [
      'Continue with manual WeChat DevTools smoke checks and record real observations separately.',
      'Treat this as environment recovery only; it does not prove any user journey passed.'
    ];
  }

  const attemptedSideEffect = actions.some((action) => action.attempted && action.name !== 'reopen wait');
  const selectedMode = selectedRecoveryMode(options);
  const steps = [];

  if (!selectedMode) {
    steps.push('If diagnostics match the known service-port timeout, rerun with exactly one opt-in recovery mode: --quit-reopen or --app-quit-reopen.');
  } else if (options.dryRun) {
    steps.push(`If diagnostics match the known service-port timeout, rerun without --dry-run using ${selectedMode === 'app' ? '--app-quit-reopen' : '--quit-reopen'}.`);
  } else if (selectedMode === 'app' && attemptedSideEffect) {
    steps.push('Confirm WeChat DevTools Settings -> Security Settings -> Service Port is enabled and matches --port after the app-level quit/reopen.');
    steps.push('If DevTools is still blocked, reopen the project manually in the UI before rerunning dry-run diagnostics.');
  } else if (attemptedSideEffect) {
    steps.push('Confirm WeChat DevTools Settings -> Security Settings -> Service Port is enabled and matches --port.');
    steps.push('If DevTools is still blocked, reopen the project manually in the UI before rerunning this script.');
  } else {
    steps.push('Install or reopen WeChat DevTools, or set WECHAT_DEVTOOLS_CLI to the DevTools CLI executable.');
  }

  steps.push('Use --strict in automation when a blocked after status should fail the command.');
  steps.push('Run actual DevTools/manual journey checks separately after access is ready.');

  return steps;
}

function buildReport({ options, before, actions, after }) {
  const mode = reportModeLabel(options);
  const lines = [
    'WeChat DevTools service port recovery report',
    '',
    'Configuration:',
    '- project: <repo>',
    `- port: ${options.port}`,
    `- timeout-ms: ${options.timeoutMs}`,
    `- mode: ${mode}`,
    ''
  ];

  appendSmokeSection(lines, 'Before status:', before);
  lines.push('');
  appendActionSection(lines, actions);
  lines.push('');
  appendSmokeSection(lines, 'After status:', after);
  lines.push('', 'Next steps:');

  for (const step of buildNextSteps({ options, after, actions })) {
    lines.push(`- ${step}`);
  }

  return lines.join('\n');
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const redact = makeRedactor(options);
  const before = runSmokeCheck('before', options, redact);
  const actions = await runRecoveryActions(options, redact);
  const after = runSmokeCheck('after', options, redact);
  const report = buildReport({ options, before, actions, after });

  console.log(redact(report));
  process.exit(options.strict && after.status === 'blocked' ? 1 : 0);
} catch (error) {
  const fallbackOptions = {
    projectPath: rootDir
  };
  const redact = makeRedactor(fallbackOptions);

  console.error(redact(error.message));
  console.error('');
  console.error(usage());
  process.exit(1);
}
