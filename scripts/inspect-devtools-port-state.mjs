import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPort = 9420;
const connectTimeoutMs = 800;

function usage() {
  return [
    'Usage: node scripts/inspect-devtools-port-state.mjs [--project <path>] [--port <number>] [--strict]',
    '',
    'Read-only WeChat DevTools service-port forensics.',
    'Does not quit/open DevTools, kill processes, clear caches, update config, or write files.'
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
    strict: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--strict') {
      options.strict = true;
      continue;
    }

    if (arg === '--project' || arg === '--port') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value.`);
      }

      if (arg === '--project') {
        options.projectPath = isAbsolute(value) ? resolve(value) : resolve(rootDir, value);
      } else {
        options.port = parsePositiveInteger(value, '--port', 65535);
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

function safeRealPath(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return resolve(filePath);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function redactText(text, extraLabels = []) {
  let redacted = String(text || '');
  const pathLabels = unique([
    rootDir,
    safeRealPath(rootDir),
    '/tmp/street-tasks-iter-worktrees/devtools-forensics',
    '/private/tmp/street-tasks-iter-worktrees/devtools-forensics',
    ...extraLabels.map((entry) => entry.path)
  ]).map((path) => {
    const configured = extraLabels.find((entry) => entry.path === path);

    return [path, configured?.label || '<repo>'];
  });

  for (const [filePath, label] of pathLabels) {
    redacted = redacted.replace(new RegExp(escapeRegExp(filePath), 'g'), label);
  }

  return redacted
    .replace(/\/private\/tmp\/[^\s"'`),\]}<>]+/g, '<local-path>')
    .replace(/\/tmp\/[^\s"'`),\]}<>]+/g, '<local-path>')
    .replace(/\/Users\/[^\s"'`),\]}<>]+/g, '<local-path>')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer <redacted-token>')
    .replace(/\b(cookie|authorization|access[_-]?token|refresh[_-]?token|password|passwd|pwd|token)=([^\s"'`),\]}<>]+)/gi, '$1=<redacted>');
}

function checkProject(projectPath) {
  const configPath = join(projectPath, 'project.config.json');

  try {
    const projectStat = statSync(projectPath);

    if (!projectStat.isDirectory()) {
      return {
        ok: false,
        configExists: false,
        detail: 'project path exists but is not a directory'
      };
    }
  } catch (error) {
    return {
      ok: false,
      configExists: false,
      detail: `project path is not readable (${error.code || 'stat failed'})`
    };
  }

  const configExists = existsSync(configPath);

  return {
    ok: configExists,
    configExists,
    detail: configExists ? 'project.config.json found' : 'project.config.json missing'
  };
}

function getDevToolsBundleCandidates() {
  return [
    '/Applications/wechatwebdevtools.app',
    '/Applications/WeChatWebDevTools.app',
    '/Applications/微信开发者工具.app',
    '/Applications/wechatdevtools.app',
    join(homedir(), 'Applications/wechatwebdevtools.app'),
    join(homedir(), 'Applications/WeChatWebDevTools.app'),
    join(homedir(), 'Applications/微信开发者工具.app'),
    join(homedir(), 'Applications/wechatdevtools.app')
  ];
}

function cliPathFromBundle(bundlePath) {
  return join(bundlePath, 'Contents/MacOS/cli');
}

function deriveBundleFromCli(cliPath) {
  const marker = '.app/Contents/MacOS/cli';
  const markerIndex = cliPath.indexOf(marker);

  if (markerIndex === -1) {
    return '';
  }

  return cliPath.slice(0, markerIndex + '.app'.length);
}

function getCliCandidates() {
  const envCandidates = [
    ['WECHAT_DEVTOOLS_CLI', process.env.WECHAT_DEVTOOLS_CLI],
    ['WECHATWEBDEVTOOLS_CLI', process.env.WECHATWEBDEVTOOLS_CLI]
  ];
  const bundleCandidates = getDevToolsBundleCandidates().map((bundlePath) => [null, cliPathFromBundle(bundlePath)]);

  return unique([...envCandidates, ...bundleCandidates]
    .filter(([, cliPath]) => Boolean(cliPath))
    .map(([source, cliPath]) => JSON.stringify([source, cliPath])))
    .map((row) => JSON.parse(row));
}

function executableState(filePath) {
  if (!existsSync(filePath)) {
    return 'missing';
  }

  try {
    accessSync(filePath, constants.X_OK);
    return 'executable';
  } catch {
    return 'not_executable';
  }
}

function inspectCliCandidates() {
  const candidates = getCliCandidates();
  let selected = null;
  let existingCount = 0;
  let executableCount = 0;
  let notExecutableCount = 0;
  const sources = new Set();
  const cliPaths = [];

  for (const [source, cliPath] of candidates) {
    const state = executableState(cliPath);

    if (source) {
      sources.add(source);
    }

    if (state !== 'missing') {
      existingCount += 1;
      cliPaths.push(cliPath);
    }

    if (state === 'executable') {
      executableCount += 1;

      if (!selected) {
        selected = {
          path: cliPath,
          source: source || 'standard bundle candidate',
          state
        };
      }
    } else if (state === 'not_executable') {
      notExecutableCount += 1;
    }
  }

  return {
    ok: Boolean(selected),
    checkedCount: candidates.length,
    existingCount,
    executableCount,
    notExecutableCount,
    selected,
    configuredEnvCount: sources.size,
    cliPaths
  };
}

function runPlutilExtract(infoPlistPath, key) {
  const result = spawnSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', infoPlistPath], {
    encoding: 'utf8',
    timeout: 2000,
    maxBuffer: 64 * 1024
  });

  if (result.status === 0) {
    return result.stdout.trim();
  }

  return '';
}

function readPlistTextValue(infoPlistPath, key) {
  try {
    const text = readFileSync(infoPlistPath, 'utf8');
    const pattern = new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<string>([^<]*)</string>`);
    const match = text.match(pattern);

    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

function readPlistValue(infoPlistPath, key) {
  return runPlutilExtract(infoPlistPath, key) || readPlistTextValue(infoPlistPath, key);
}

function inspectAppBundle(cliInspection) {
  const derivedBundles = cliInspection.cliPaths.map(deriveBundleFromCli);
  const candidates = unique([
    ...derivedBundles,
    ...getDevToolsBundleCandidates()
  ]);
  const existingBundles = candidates.filter((bundlePath) => existsSync(bundlePath));
  const bundlePath = existingBundles[0] || '';

  if (!bundlePath) {
    return {
      ok: false,
      existingCount: 0,
      detail: 'no DevTools app bundle found',
      path: '',
      version: 'unknown',
      build: 'unknown',
      name: 'unknown'
    };
  }

  const infoPlistPath = join(bundlePath, 'Contents/Info.plist');

  if (!existsSync(infoPlistPath)) {
    return {
      ok: false,
      existingCount: existingBundles.length,
      detail: 'Info.plist missing',
      path: bundlePath,
      version: 'unknown',
      build: 'unknown',
      name: 'unknown'
    };
  }

  const version = readPlistValue(infoPlistPath, 'CFBundleShortVersionString') || 'unknown';
  const build = readPlistValue(infoPlistPath, 'CFBundleVersion') || 'unknown';
  const name = readPlistValue(infoPlistPath, 'CFBundleDisplayName')
    || readPlistValue(infoPlistPath, 'CFBundleName')
    || 'unknown';

  return {
    ok: true,
    existingCount: existingBundles.length,
    detail: 'Info.plist found',
    path: bundlePath,
    version,
    build,
    name
  };
}

function readProcessList() {
  const attempts = [
    ['ps', ['-axo', 'pid=,command=']],
    ['ps', ['-eo', 'pid=,args=']]
  ];

  for (const [command, args] of attempts) {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout: 2500,
      maxBuffer: 2 * 1024 * 1024
    });

    if (result.status === 0) {
      return {
        ok: true,
        text: result.stdout,
        detail: `${command} process list read`
      };
    }
  }

  return {
    ok: false,
    text: '',
    detail: 'unable to read process list with ps'
  };
}

function lineDeclaresPort(line, port) {
  const portText = escapeRegExp(String(port));
  const dashedPattern = new RegExp(`(?:^|\\s)--?ide-http-port(?:=|\\s+)${portText}(?=$|\\s)`);
  const plainPattern = new RegExp(`(?:^|\\s)ide-http-port(?:=|\\s+)${portText}(?=$|\\s)`);

  return dashedPattern.test(line) || plainPattern.test(line);
}

function lineDeclaresAnyIdePort(line) {
  return /(?:^|\s)--?ide-http-port(?:=|\s+)\d+(?=$|\s)|(?:^|\s)ide-http-port(?:=|\s+)\d+(?=$|\s)/.test(line);
}

function isDevToolsLikeProcess(line) {
  return /(wechatwebdevtools|wechatdevtools|WeChatWebDevTools|微信开发者工具|nwjs|wechat)/i.test(line);
}

function isRelatedProcess(line) {
  return /(wechatwebdevtools|wechatdevtools|WeChatWebDevTools|微信开发者工具|nwjs|wechat|ide-http-port)/i.test(line);
}

function inspectProcesses(port) {
  const processList = readProcessList();

  if (!processList.ok) {
    return {
      ok: false,
      relatedCount: 0,
      devtoolsLikeCount: 0,
      declaredTargetCount: 0,
      declaredTargetDevtoolsLikeCount: 0,
      declaredOtherPortCount: 0,
      detail: processList.detail
    };
  }

  const lines = processList.text.split(/\r?\n/).filter(Boolean);
  const relatedLines = lines.filter(isRelatedProcess);
  const devtoolsLikeLines = relatedLines.filter(isDevToolsLikeProcess);
  const declaredTargetLines = lines.filter((line) => lineDeclaresPort(line, port));
  const declaredTargetDevtoolsLikeLines = declaredTargetLines.filter(isDevToolsLikeProcess);
  const declaredOtherPortLines = lines.filter((line) => lineDeclaresAnyIdePort(line) && !lineDeclaresPort(line, port));

  // Process command lines can contain private paths or tokens; report only counts and booleans.
  return {
    ok: true,
    relatedCount: relatedLines.length,
    devtoolsLikeCount: devtoolsLikeLines.length,
    declaredTargetCount: declaredTargetLines.length,
    declaredTargetDevtoolsLikeCount: declaredTargetDevtoolsLikeLines.length,
    declaredOtherPortCount: declaredOtherPortLines.length,
    detail: `${relatedLines.length} related process(es), ${declaredTargetLines.length} declaring requested port`
  };
}

function inspectLsof(port) {
  const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
    timeout: 2500,
    maxBuffer: 256 * 1024
  });

  if (result.error && result.error.code === 'ENOENT') {
    return {
      ok: false,
      available: false,
      listenerCount: 0,
      devtoolsLikeListenerCount: 0,
      detail: 'lsof unavailable'
    };
  }

  const lines = (result.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines.slice(1);
  const devtoolsLikeRows = rows.filter(isDevToolsLikeProcess);

  return {
    ok: result.status === 0 && rows.length > 0,
    available: true,
    listenerCount: rows.length,
    devtoolsLikeListenerCount: devtoolsLikeRows.length,
    detail: rows.length > 0
      ? `${rows.length} listener row(s), ${devtoolsLikeRows.length} DevTools-like`
      : 'no listener rows'
  };
}

function connectToHost(host, port) {
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

    socket.setTimeout(connectTimeoutMs);
    socket.once('connect', () => finish({ ok: true, host, reason: 'connected' }));
    socket.once('timeout', () => finish({ ok: false, host, reason: 'timeout' }));
    socket.once('error', (error) => finish({ ok: false, host, reason: error.code || 'connection failed' }));
  });
}

async function inspectConnect(port) {
  const results = await Promise.all([
    connectToHost('127.0.0.1', port),
    connectToHost('::1', port)
  ]);
  const okResult = results.find((result) => result.ok);

  return {
    ok: Boolean(okResult),
    hosts: results,
    detail: okResult
      ? `connected on ${okResult.host}`
      : results.map((result) => `${result.host}: ${result.reason}`).join('; ')
  };
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function buildDiagnosis({ project, cli, bundle, lsof, processes, connect }) {
  const diagnosis = [];

  if (!project.ok) {
    diagnosis.push('project_config_missing');
  }

  if (!cli.ok) {
    diagnosis.push('devtools_cli_unavailable');
  }

  if (!bundle.ok) {
    diagnosis.push('devtools_bundle_unknown');
  }

  if (connect.ok) {
    diagnosis.push('port_ready');
  } else if (processes.declaredTargetCount > 0 && lsof.listenerCount === 0) {
    diagnosis.push('declared_without_listener');
  } else if (processes.declaredTargetCount > 0) {
    diagnosis.push('declared_without_connect');
  }

  if (processes.ok && processes.devtoolsLikeCount === 0) {
    diagnosis.push('no_devtools_process');
  }

  if (lsof.listenerCount > 0 && processes.declaredTargetCount === 0) {
    diagnosis.push('listener_without_declared_process');
  }

  if (processes.declaredTargetCount > 1) {
    diagnosis.push('multiple_declared_processes');
  }

  if (processes.declaredOtherPortCount > 0) {
    diagnosis.push('other_declared_ports_present');
  }

  if (lsof.available === false) {
    diagnosis.push('lsof_unavailable');
  }

  if (!connect.ok && connect.hosts.some((result) => result.reason === 'ECONNREFUSED')) {
    diagnosis.push('connect_refused');
  } else if (!connect.ok && connect.hosts.some((result) => result.reason === 'timeout')) {
    diagnosis.push('connect_timeout');
  }

  if (diagnosis.length === 0) {
    diagnosis.push('insufficient_evidence');
  }

  return diagnosis;
}

function classifyStatus({ lsof, processes, connect }) {
  if (connect.ok && (lsof.listenerCount > 0 || lsof.available === false)) {
    return 'ready';
  }

  if (processes.declaredTargetCount > 0 && (!connect.ok || lsof.listenerCount === 0)) {
    return 'blocked';
  }

  if (lsof.listenerCount > 0 && !connect.ok) {
    return 'blocked';
  }

  return 'unknown';
}

function buildReport(context) {
  const {
    options,
    project,
    cli,
    bundle,
    lsof,
    processes,
    connect,
    diagnosis,
    status
  } = context;
  const lines = [
    'WeChat DevTools port forensics report',
    '',
    `status: ${status}`,
    `diagnosis: ${diagnosis.join(', ')}`,
    '',
    'Configuration:',
    '- project: <repo>',
    `- port: ${options.port}`,
    '- mode: read-only',
    '',
    'Checks:',
    `- project config: ${yesNo(project.ok)} (${project.detail})`,
    `- DevTools CLI: ${yesNo(cli.ok)} (${cli.executableCount} executable / ${cli.existingCount} existing / ${cli.checkedCount} checked; env candidates: ${cli.configuredEnvCount}; not executable: ${cli.notExecutableCount})`,
    `- DevTools app bundle: ${yesNo(bundle.ok)} (${bundle.detail}; bundles found: ${bundle.existingCount}; name: ${bundle.name}; version: ${bundle.version}; build: ${bundle.build})`,
    `- lsof listener: ${yesNo(lsof.ok)} (${lsof.detail})`,
    `- socket connect: ${yesNo(connect.ok)} (${connect.detail})`,
    `- process scan: ${processes.ok ? 'yes' : 'no'} (${processes.detail})`,
    `  related processes: ${processes.relatedCount}`,
    `  DevTools-like processes: ${processes.devtoolsLikeCount}`,
    `  declarations for requested port: ${processes.declaredTargetCount}`,
    `  DevTools-like requested-port declarations: ${processes.declaredTargetDevtoolsLikeCount}`,
    `  declarations for other ide-http-port values: ${processes.declaredOtherPortCount}`,
    '',
    'Safety:',
    '- no DevTools quit/open commands were run',
    '- no processes were killed',
    '- no caches, project config, user config, or local files were modified',
    '- process command lines were not printed'
  ];

  return lines.join('\n');
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const project = checkProject(options.projectPath);
  const cli = inspectCliCandidates();
  const bundle = inspectAppBundle(cli);
  const lsof = inspectLsof(options.port);
  const processes = inspectProcesses(options.port);
  const connect = await inspectConnect(options.port);
  const diagnosis = buildDiagnosis({ project, cli, bundle, lsof, processes, connect });
  const status = classifyStatus({ lsof, processes, connect });
  const extraLabels = [
    { path: options.projectPath, label: '<repo>' },
    { path: safeRealPath(options.projectPath), label: '<repo>' },
    { path: cli.selected?.path, label: '<devtools-cli>' },
    { path: bundle.path, label: '<devtools-app>' }
  ];
  const report = buildReport({
    options,
    project,
    cli,
    bundle,
    lsof,
    processes,
    connect,
    diagnosis,
    status
  });

  console.log(redactText(report, extraLabels));
  process.exit(options.strict && status !== 'ready' ? 1 : 0);
} catch (error) {
  console.error(redactText(error.message));
  console.error('');
  console.error(usage());
  process.exit(1);
}
