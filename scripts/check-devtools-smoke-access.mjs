import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, realpathSync, statSync } from 'node:fs';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPort = 9420;
const defaultTimeoutMs = 20000;

function usage() {
  return [
    'Usage: node scripts/check-devtools-smoke-access.mjs [--project <path>] [--port <number>] [--attempt-open] [--timeout-ms <n>] [--strict]',
    '',
    'Diagnoses WeChat DevTools smoke access without changing project files or running preview.'
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
    attemptOpen: false,
    timeoutMs: defaultTimeoutMs,
    strict: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--attempt-open') {
      options.attemptOpen = true;
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

  return options;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function realPath(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return resolve(filePath);
  }
}

function describeProjectPath(projectPath) {
  const normalizedRoot = realPath(rootDir);
  const normalizedProject = realPath(projectPath);
  const relativePath = relative(normalizedRoot, normalizedProject).split('\\').join('/');

  if (!relativePath) {
    return '<repo>';
  }

  if (!relativePath.startsWith('..') && !isAbsolute(relativePath)) {
    return `<repo>/${relativePath}`;
  }

  return `<external-project:${basename(projectPath) || 'root'}>`;
}

function redactText(text, pathsToRedact = []) {
  let redacted = String(text || '');

  for (const { path, label } of pathsToRedact) {
    if (!path) {
      continue;
    }

    redacted = redacted.replace(new RegExp(escapeRegExp(path), 'g'), label);
  }

  return redacted
    .replace(/\/Users\/[^\s"'`),\]}<>]+/g, '<redacted-user-path>')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer <redacted-token>')
    .replace(/\b(access_token|refresh_token|password|cookie)=([^\s"'`),\]}<>]+)/gi, '$1=<redacted>');
}

function summarizeText(text, pathsToRedact) {
  const cleanText = redactText(text, pathsToRedact).trim();

  if (!cleanText) {
    return '(empty)';
  }

  const summary = cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join('\n');

  return summary.length > 800 ? `${summary.slice(0, 800)}...` : summary;
}

function checkProject(projectPath) {
  const projectConfigPath = join(projectPath, 'project.config.json');

  try {
    const projectStat = statSync(projectPath);

    if (!projectStat.isDirectory()) {
      return {
        ok: false,
        detail: 'path exists but is not a directory'
      };
    }
  } catch (error) {
    return {
      ok: false,
      detail: `directory is not readable (${error.code || 'stat failed'})`
    };
  }

  if (!existsSync(projectConfigPath)) {
    return {
      ok: false,
      detail: 'missing project.config.json'
    };
  }

  return {
    ok: true,
    detail: 'directory and project.config.json found'
  };
}

function executableState(filePath) {
  if (!existsSync(filePath)) {
    return 'missing';
  }

  try {
    accessSync(filePath, constants.X_OK);
    return 'executable';
  } catch {
    return 'not executable';
  }
}

function describeCliSource(filePath, envKey) {
  if (envKey) {
    return `configured by ${envKey}`;
  }

  if (filePath.startsWith('/Applications/')) {
    return 'standard macOS Applications bundle';
  }

  if (filePath.startsWith(join(homedir(), 'Applications'))) {
    return 'user Applications bundle';
  }

  return 'configured path';
}

function findDevToolsCli() {
  const envCandidates = [
    ['WECHAT_DEVTOOLS_CLI', process.env.WECHAT_DEVTOOLS_CLI],
    ['WECHATWEBDEVTOOLS_CLI', process.env.WECHATWEBDEVTOOLS_CLI]
  ];
  const candidateRows = [
    ...envCandidates,
    [null, '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'],
    [null, '/Applications/WeChatWebDevTools.app/Contents/MacOS/cli'],
    [null, '/Applications/微信开发者工具.app/Contents/MacOS/cli'],
    [null, '/Applications/wechatdevtools.app/Contents/MacOS/cli'],
    [null, join(homedir(), 'Applications/wechatwebdevtools.app/Contents/MacOS/cli')],
    [null, join(homedir(), 'Applications/微信开发者工具.app/Contents/MacOS/cli')]
  ];

  let firstExisting = null;
  const seenPaths = new Set();

  for (const [envKey, filePath] of candidateRows) {
    if (!filePath || seenPaths.has(filePath)) {
      continue;
    }

    seenPaths.add(filePath);

    const state = executableState(filePath);
    const source = describeCliSource(filePath, envKey || null);

    if (state === 'executable') {
      return {
        ok: true,
        path: filePath,
        state,
        source
      };
    }

    if (state !== 'missing' && !firstExisting) {
      firstExisting = {
        ok: false,
        path: filePath,
        state,
        source
      };
    }
  }

  return firstExisting || {
    ok: false,
    path: null,
    state: 'missing',
    source: 'standard macOS bundles and WECHAT_DEVTOOLS_CLI were checked'
  };
}

function connectToHost(host, port, timeoutMs) {
  return new Promise((resolveResult) => {
    const socket = createConnection({ host, port });
    let settled = false;

    function finish(result) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolveResult(result);
    }

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ listening: true, host }));
    socket.once('timeout', () => finish({ listening: false, host, reason: 'timeout' }));
    socket.once('error', (error) => finish({
      listening: false,
      host,
      reason: error.code || 'connection failed'
    }));
  });
}

async function checkPortListening(port, timeoutMs) {
  const connectTimeoutMs = Math.min(timeoutMs, 1500);
  const results = await Promise.all([
    connectToHost('127.0.0.1', port, connectTimeoutMs),
    connectToHost('::1', port, connectTimeoutMs)
  ]);
  const listeningResult = results.find((result) => result.listening);

  if (listeningResult) {
    return {
      ok: true,
      detail: `listening on ${listeningResult.host}`
    };
  }

  return {
    ok: false,
    detail: results.map((result) => `${result.host}: ${result.reason}`).join('; ')
  };
}

function readProcessList(pathsToRedact) {
  const attempts = [
    ['ps', ['-axo', 'pid=,command=']],
    ['ps', ['-eo', 'pid=,args=']]
  ];

  for (const [command, args] of attempts) {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    if (result.status === 0) {
      return {
        ok: true,
        text: result.stdout
      };
    }
  }

  return {
    ok: false,
    text: '',
    detail: summarizeText('Unable to read process list with ps.', pathsToRedact)
  };
}

function lineDeclaresPort(line, port) {
  const portText = escapeRegExp(String(port));
  const dashedPattern = new RegExp(`(?:^|\\s)--?ide-http-port(?:=|\\s+)${portText}(?=$|\\s)`);
  const plainPattern = new RegExp(`(?:^|\\s)ide-http-port(?:=|\\s+)${portText}(?=$|\\s)`);

  return dashedPattern.test(line) || plainPattern.test(line);
}

function isDevToolsLikeProcess(line) {
  return /(wechat|微信|devtools|wechatwebdevtools|nwjs)/i.test(line);
}

function checkIdeHttpPortProcess(port, pathsToRedact) {
  const processList = readProcessList(pathsToRedact);

  if (!processList.ok) {
    return {
      ok: false,
      detail: processList.detail,
      matchingCount: 0,
      devtoolsLikeCount: 0,
      otherIdePortCount: 0
    };
  }

  // Process commands can contain private paths or tokens; only report counts.
  const lines = processList.text.split(/\r?\n/);
  const matchingLines = lines.filter((line) => lineDeclaresPort(line, port));
  const devtoolsLikeLines = matchingLines.filter(isDevToolsLikeProcess);
  const otherIdePortLines = lines.filter((line) => line.includes('ide-http-port') && !lineDeclaresPort(line, port));

  return {
    ok: matchingLines.length > 0,
    detail: matchingLines.length > 0
      ? `${matchingLines.length} matching declaration(s), ${devtoolsLikeLines.length} DevTools-like`
      : 'no matching ide-http-port declaration',
    matchingCount: matchingLines.length,
    devtoolsLikeCount: devtoolsLikeLines.length,
    otherIdePortCount: otherIdePortLines.length
  };
}

function runOpenAttempt(project, cli, options, pathsToRedact) {
  if (!project.ok) {
    return {
      attempted: false,
      detail: 'skipped because project path is invalid'
    };
  }

  if (!cli.ok) {
    return {
      attempted: false,
      detail: 'skipped because DevTools CLI is unavailable'
    };
  }

  // Launching DevTools is explicitly opt-in; default diagnostics stay read-only.
  const result = spawnSync(cli.path, [
    'open',
    '--project',
    options.projectPath,
    '--port',
    String(options.port),
    '--disable-gpu'
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: options.timeoutMs,
    maxBuffer: 128 * 1024
  });
  const timedOut = result.error && result.error.code === 'ETIMEDOUT';

  return {
    attempted: true,
    ok: result.status === 0 && !timedOut,
    timedOut,
    exitCode: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    stdout: summarizeText(result.stdout, pathsToRedact),
    stderr: summarizeText(result.stderr, pathsToRedact),
    error: result.error && !timedOut ? summarizeText(result.error.message, pathsToRedact) : ''
  };
}

function buildBlockers({ project, cli, port, idePort }) {
  const blockers = [];

  if (!project.ok) {
    blockers.push('project path is not a readable WeChat mini program project');
  }

  if (!cli.ok) {
    blockers.push('WeChat DevTools CLI is unavailable');
  }

  if (!port.ok) {
    blockers.push('requested DevTools service port is not listening');
  }

  if (!idePort.ok) {
    blockers.push('no process declares the requested ide-http-port');
  }

  return blockers;
}

function buildSuggestions({ status, project, cli, port, idePort, openAttempt }) {
  if (status === 'ready') {
    return [
      'Continue with manual WeChat DevTools smoke checks and record real observations separately.',
      'Treat this as an environment access check only; it does not prove any user journey passed.'
    ];
  }

  const suggestions = [];

  if (!project.ok) {
    suggestions.push('Point --project at the mini program directory that contains project.config.json.');
  }

  if (!cli.ok) {
    suggestions.push('Install or reopen WeChat DevTools, or set WECHAT_DEVTOOLS_CLI to the DevTools CLI executable.');
  }

  if (!port.ok || !idePort.ok) {
    suggestions.push('In WeChat DevTools UI, enable Settings -> Security Settings -> Service Port, then reopen this project.');
    suggestions.push('Confirm the DevTools service port matches --port; the default checked here is 9420.');
  }

  if (openAttempt && openAttempt.attempted && !openAttempt.ok) {
    suggestions.push('The optional open attempt did not complete cleanly; retry after DevTools is fully started, or open the project manually in the UI.');
  }

  suggestions.push('This script did not quit DevTools, clear caches, write files, or start preview.');

  return suggestions;
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function buildReport(context) {
  const {
    options,
    project,
    cli,
    port,
    idePort,
    openAttempt,
    blockers,
    status
  } = context;
  const lines = [
    'WeChat DevTools smoke access report',
    '',
    `status: ${status}`,
    '',
    'Checks:',
    `- project: ${describeProjectPath(options.projectPath)} (${project.ok ? 'ok' : 'blocked'}; ${project.detail})`,
    `- DevTools CLI: ${yesNo(cli.ok)} (${cli.state}; ${cli.source})`,
    `- service port ${options.port}: ${yesNo(port.ok)} (${port.detail})`,
    `- ide-http-port process: ${yesNo(idePort.ok)} (${idePort.detail})`
  ];

  if (openAttempt) {
    lines.push(`- attempt-open: ${openAttempt.attempted ? yesNo(openAttempt.ok) : 'skipped'} (${openAttempt.detail || (openAttempt.timedOut ? 'timed out' : 'completed')})`);

    if (openAttempt.attempted) {
      lines.push(`  exitCode: ${openAttempt.exitCode === null ? 'null' : openAttempt.exitCode}`);
      lines.push(`  signal: ${openAttempt.signal || 'none'}`);
      lines.push(`  stdout: ${openAttempt.stdout}`);
      lines.push(`  stderr: ${openAttempt.stderr}`);

      if (openAttempt.error) {
        lines.push(`  error: ${openAttempt.error}`);
      }
    }
  } else {
    lines.push('- attempt-open: skipped (default mode has no launch side effects)');
  }

  if (blockers.length > 0) {
    lines.push('', 'Blockers:');
    for (const blocker of blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push('', 'Next recovery steps:');
  for (const suggestion of buildSuggestions(context)) {
    lines.push(`- ${suggestion}`);
  }

  return lines.join('\n');
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const pathLabel = describeProjectPath(options.projectPath);
  const pathsToRedact = [
    { path: rootDir, label: '<repo>' },
    { path: options.projectPath, label: pathLabel }
  ];
  const project = checkProject(options.projectPath);
  const cli = findDevToolsCli();

  if (cli.path) {
    pathsToRedact.push({ path: cli.path, label: '<devtools-cli>' });
  }

  const openAttempt = options.attemptOpen
    ? runOpenAttempt(project, cli, options, pathsToRedact)
    : null;
  const port = await checkPortListening(options.port, options.timeoutMs);
  const idePort = checkIdeHttpPortProcess(options.port, pathsToRedact);
  const blockers = buildBlockers({ project, cli, port, idePort });
  const status = blockers.length === 0 ? 'ready' : 'blocked';
  const report = buildReport({
    options,
    project,
    cli,
    port,
    idePort,
    openAttempt,
    blockers,
    status
  });

  console.log(report);
  process.exit(options.strict && status === 'blocked' ? 1 : 0);
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
