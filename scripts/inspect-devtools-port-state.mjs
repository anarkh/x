import { spawnSync } from 'node:child_process';
import {
  accessSync,
  closeSync,
  constants,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  readdirSync,
  statSync
} from 'node:fs';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPort = 9420;
const connectTimeoutMs = 800;
const maxLogFilesToScan = 80;
const recentLogWindowSize = 12;
const maxLogTailBytes = 512 * 1024;
const maxConfigFilesToScan = 120;
const maxConfigTextBytes = 2 * 1024 * 1024;

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

function getDevToolsUserDataRootCandidates() {
  return [
    join(homedir(), 'Library/Application Support/微信开发者工具'),
    join(homedir(), 'Library/Application Support/WeChat Developer Tools'),
    join(homedir(), 'Library/Application Support/wechatwebdevtools'),
    join(homedir(), 'Library/Application Support/wechatdevtools')
  ];
}

function safeStat(filePath) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

function inspectUserDataRoots() {
  const roots = getDevToolsUserDataRootCandidates();
  let presentRootCount = 0;
  let readableRootCount = 0;
  let profileDirCount = 0;
  let logDirCount = 0;

  for (const rootPath of roots) {
    const rootStat = safeStat(rootPath);

    if (!rootStat?.isDirectory()) {
      continue;
    }

    presentRootCount += 1;

    try {
      const entries = readdirSync(rootPath, { withFileTypes: true });
      readableRootCount += 1;
      profileDirCount += entries.filter((entry) => entry.isDirectory()).length;

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        if (existsSync(join(rootPath, entry.name, 'WeappLog'))) {
          logDirCount += 1;
        }
      }
    } catch {
      // User-data roots can contain private state. Only report readable/unreadable counts.
    }
  }

  return {
    ok: presentRootCount > 0,
    checkedRootCount: roots.length,
    presentRootCount,
    readableRootCount,
    profileDirCount,
    logDirCount,
    detail: presentRootCount > 0
      ? `${presentRootCount} root candidate(s), ${logDirCount} log dir candidate(s)`
      : 'no user-data root candidates found'
  };
}

function collectLogFilesFromDir(dirPath, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) {
    return [];
  }

  let entries = [];

  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectLogFilesFromDir(entryPath, depth + 1, maxDepth));
      continue;
    }

    if (!entry.isFile() || !/\.log$/i.test(entry.name)) {
      continue;
    }

    const fileStat = safeStat(entryPath);

    if (!fileStat) {
      continue;
    }

    files.push({
      path: entryPath,
      name: entry.name,
      mtimeMs: fileStat.mtimeMs,
      size: fileStat.size
    });
  }

  return files;
}

function getDevToolsLogCandidates() {
  const logDirs = [];

  for (const rootPath of getDevToolsUserDataRootCandidates()) {
    const rootStat = safeStat(rootPath);

    if (!rootStat?.isDirectory()) {
      continue;
    }

    let profileEntries = [];

    try {
      profileEntries = readdirSync(rootPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of profileEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const logDir = join(rootPath, entry.name, 'WeappLog');

      if (safeStat(logDir)?.isDirectory()) {
        logDirs.push(logDir);
      }
    }
  }

  return logDirs
    .flatMap((logDir) => collectLogFilesFromDir(logDir))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function readTailText(filePath, maxBytes = maxLogTailBytes) {
  const fileStat = safeStat(filePath);

  if (!fileStat?.isFile()) {
    return '';
  }

  if (fileStat.size <= maxBytes) {
    return readFileSync(filePath, 'utf8');
  }

  const fd = openSync(filePath, 'r');

  try {
    const buffer = Buffer.alloc(maxBytes);
    const start = Math.max(0, fileStat.size - maxBytes);
    const bytesRead = readSync(fd, buffer, 0, maxBytes, start);

    return buffer.subarray(0, bytesRead).toString('utf8');
  } finally {
    closeSync(fd);
  }
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function hasTargetPortMention(text, port) {
  const portPattern = new RegExp(`(?:^|\\D)${escapeRegExp(String(port))}(?:\\D|$)`);

  return portPattern.test(text);
}

function summarizeLogText(text, port) {
  const targetPattern = escapeRegExp(String(port));
  const ideHttpPattern = new RegExp(`(?:--)?ide-http-port(?:=|\\s+)${targetPattern}\\b`, 'gi');
  const startCliPattern = new RegExp(`start cli server[^\\n\\r]{0,120}local port\\s+${targetPattern}\\b`, 'gi');
  const cliStartedPattern = new RegExp(`cli server started at\\s+127\\.0\\.0\\.1:${targetPattern}\\b`, 'gi');
  const hasIdeHttpTarget = ideHttpPattern.test(text) || (
    /(?:--)?ide-http-port/i.test(text) && hasTargetPortMention(text, port)
  );

  let launchTargetWithEnableCount = 0;
  let launchTargetWithoutEnableCount = 0;

  for (const line of text.split(/\r?\n/)) {
    if (!/--ide-http-port/i.test(line) || !hasTargetPortMention(line, port)) {
      continue;
    }

    if (/--enable-service-port/i.test(line)) {
      launchTargetWithEnableCount += 1;
    } else {
      launchTargetWithoutEnableCount += 1;
    }
  }

  return {
    hasIdeHttpTarget,
    ideHttpTargetCount: countMatches(text, ideHttpPattern),
    launchTargetWithEnableCount,
    launchTargetWithoutEnableCount,
    enableServicePortCount: countMatches(text, /--enable-service-port/gi),
    startCliServerTargetCount: countMatches(text, startCliPattern),
    cliServerStartedTargetCount: countMatches(text, cliStartedPattern),
    eaddrinuseCount: countMatches(text, /EADDRINUSE/gi),
    eaccesCount: countMatches(text, /EACCES|permission denied/gi),
    connectRefusedCount: countMatches(text, /ECONNREFUSED|connection refused/gi),
    timeoutCount: countMatches(text, /\btimeout\b|timed out/gi),
    crashOrExitCount: countMatches(text, /\bcrash(?:ed)?\b|\bexit(?:ed)?\b/gi),
    disabledHintCount: countMatches(text, /IDE_SERVICE_PORT_DISABLED|service port disabled|服务端口.*(?:关闭|禁用)/gi)
  };
}

function mergeLogCounters(target, summary) {
  for (const [key, value] of Object.entries(summary)) {
    if (typeof value === 'boolean') {
      target[key] = (target[key] || 0) + (value ? 1 : 0);
      continue;
    }

    target[key] = (target[key] || 0) + value;
  }
}

function buildLogFileLabel(file, index) {
  const date = Number.isFinite(file.mtimeMs)
    ? new Date(file.mtimeMs).toISOString().slice(0, 10)
    : 'unknown-date';
  const genericName = /^(?:launch|report)\.log$/i.test(file.name)
    ? file.name.toLowerCase()
    : `devtools-log-${index + 1}`;

  return `${genericName}@${date}`;
}

function inspectRecentDevToolsLogs(port) {
  const files = getDevToolsLogCandidates();
  const selectedFiles = files.slice(0, maxLogFilesToScan);
  const recentFiles = selectedFiles.slice(0, recentLogWindowSize);
  const allCounters = {};
  const recentCounters = {};
  let scannedFileCount = 0;
  let unreadableFileCount = 0;

  for (const file of selectedFiles) {
    let text = '';

    try {
      text = readTailText(file.path);
    } catch {
      unreadableFileCount += 1;
      continue;
    }

    scannedFileCount += 1;

    const summary = summarizeLogText(text, port);
    mergeLogCounters(allCounters, summary);

    if (recentFiles.includes(file)) {
      mergeLogCounters(recentCounters, summary);
    }
  }

  return {
    ok: scannedFileCount > 0,
    candidateFileCount: files.length,
    scannedFileCount,
    unreadableFileCount,
    recentWindowFileCount: recentFiles.length,
    latestLogFileLabels: recentFiles.slice(0, 3).map(buildLogFileLabel),
    recentIdeHttpTargetFileCount: recentCounters.hasIdeHttpTarget || 0,
    recentLaunchTargetWithEnableCount: recentCounters.launchTargetWithEnableCount || 0,
    recentLaunchTargetWithoutEnableCount: recentCounters.launchTargetWithoutEnableCount || 0,
    recentEnableServicePortCount: recentCounters.enableServicePortCount || 0,
    recentStartCliServerTargetCount: recentCounters.startCliServerTargetCount || 0,
    recentCliServerStartedTargetCount: recentCounters.cliServerStartedTargetCount || 0,
    historicalEnableServicePortCount: allCounters.enableServicePortCount || 0,
    historicalLaunchTargetWithEnableCount: allCounters.launchTargetWithEnableCount || 0,
    historicalLaunchTargetWithoutEnableCount: allCounters.launchTargetWithoutEnableCount || 0,
    historicalStartCliServerTargetCount: allCounters.startCliServerTargetCount || 0,
    historicalCliServerStartedTargetCount: allCounters.cliServerStartedTargetCount || 0,
    eaddrinuseCount: allCounters.eaddrinuseCount || 0,
    eaccesCount: allCounters.eaccesCount || 0,
    connectRefusedCount: allCounters.connectRefusedCount || 0,
    timeoutCount: allCounters.timeoutCount || 0,
    crashOrExitCount: allCounters.crashOrExitCount || 0,
    disabledHintCount: allCounters.disabledHintCount || 0,
    detail: scannedFileCount > 0
      ? `${scannedFileCount} sanitized log tail(s) scanned; raw log lines suppressed`
      : 'no readable DevTools log tails found'
  };
}

function getServicePortConfigCandidates() {
  const files = [];

  for (const rootPath of getDevToolsUserDataRootCandidates()) {
    const rootStat = safeStat(rootPath);

    if (!rootStat?.isDirectory()) {
      continue;
    }

    let profileEntries = [];

    try {
      profileEntries = readdirSync(rootPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of profileEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const profilePath = join(rootPath, entry.name);
      const vendorConfig = join(profilePath, 'WeappVendor/cfg.json');
      const vendorConfigStat = safeStat(vendorConfig);

      if (vendorConfigStat?.isFile()) {
        files.push({
          path: vendorConfig,
          category: 'devtools-vendor-config',
          mtimeMs: vendorConfigStat.mtimeMs,
          size: vendorConfigStat.size
        });
      }

      const localDataPath = join(profilePath, 'WeappLocalData');
      const localDataStat = safeStat(localDataPath);

      if (!localDataStat?.isDirectory()) {
        continue;
      }

      let localDataEntries = [];

      try {
        localDataEntries = readdirSync(localDataPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const localEntry of localDataEntries) {
        if (!localEntry.isFile() || !/^(?:localstorage_|ls_|storage_meta).*\.json$/i.test(localEntry.name)) {
          continue;
        }

        const filePath = join(localDataPath, localEntry.name);
        const fileStat = safeStat(filePath);

        if (!fileStat?.isFile()) {
          continue;
        }

        files.push({
          path: filePath,
          category: 'devtools-local-data',
          mtimeMs: fileStat.mtimeMs,
          size: fileStat.size
        });
      }
    }
  }

  return files
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, maxConfigFilesToScan);
}

function isServicePortConfigKey(keyPath) {
  return !isSensitiveConfigKey(keyPath) && (
    isServicePortEnableConfigKey(keyPath) ||
    isServicePortPortConfigKey(keyPath)
  );
}

function getConfigKeySearchText(keyPath) {
  return String(keyPath || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function isSensitiveConfigKey(keyPath) {
  const searchText = getConfigKeySearchText(keyPath);

  return /\b(?:token|cookie|session|openid|open\s+id|unionid|union\s+id|auth|authorization|bearer|secret|password|passwd|pwd|appsecret|app\s+secret|credential|ticket|signature|project|history|recent|path|url|phone|email|account|nickname|avatar|device|uin|uuid)\b/i.test(searchText);
}

function isServicePortEnableConfigKey(keyPath) {
  const searchText = getConfigKeySearchText(keyPath);

  return /\b(?:enable\s+service\s+port|service\s+port\s+enable|serviceport|enable\s+cli|cli\s+enable|enablecli)\b/i.test(searchText);
}

function isServicePortPortConfigKey(keyPath) {
  const searchText = getConfigKeySearchText(keyPath);

  return /\b(?:service\s+port|ide\s+http\s+port|ide\s+port|http\s+port|cli\s+port|security\s+port)\b/i.test(searchText);
}

function sanitizeConfigKey(keyPath) {
  const safeSegments = String(keyPath || '')
    .split('.')
    .filter((segment) => /(enable|service|port|cli|ide|http|security)/i.test(segment))
    .map((segment) => {
      const tokens = [];

      if (/security/i.test(segment)) {
        tokens.push('security');
      }

      if (/enable/i.test(segment)) {
        tokens.push('enable');
      }

      if (/service/i.test(segment)) {
        tokens.push('service');
      }

      if (/cli/i.test(segment)) {
        tokens.push('cli');
      }

      if (/ide/i.test(segment)) {
        tokens.push('ide');
      }

      if (/http/i.test(segment)) {
        tokens.push('http');
      }

      if (/port/i.test(segment)) {
        tokens.push('port');
      }

      return tokens.join('-');
    })
    .filter(Boolean);

  return safeSegments.length > 0 ? safeSegments.slice(-4).join('.') : '<service-port-key>';
}

function classifyValueType(value) {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function maybePortValue(value) {
  if (Number.isInteger(value) && value > 0 && value <= 65535) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);

    if (parsed > 0 && parsed <= 65535) {
      return parsed;
    }
  }

  return null;
}

function recordConfigMatch(summary, category, keyPath, value) {
  if (isSensitiveConfigKey(keyPath)) {
    return;
  }

  const isEnableKey = isServicePortEnableConfigKey(keyPath);
  const isPortKey = isServicePortPortConfigKey(keyPath);
  const key = sanitizeConfigKey(keyPath);
  const rowKey = `${category}:${key}`;
  const existing = summary.matches.get(rowKey) || {
    category,
    key,
    count: 0,
    valueTypes: new Set(),
    boolValues: new Set(),
    portValues: new Set()
  };
  const portValue = maybePortValue(value);

  existing.count += 1;
  existing.valueTypes.add(classifyValueType(value));

  if (typeof value === 'boolean') {
    existing.boolValues.add(value ? 'true' : 'false');
  }

  if (isPortKey && portValue !== null) {
    existing.portValues.add(String(portValue));
  }

  summary.matches.set(rowKey, existing);

  if (isEnableKey && typeof value === 'boolean') {
    summary.enabledStates.add(value ? 'true' : 'false');
  }

  if (isPortKey && portValue !== null) {
    summary.portValues.add(String(portValue));
  }
}

function scanConfigValue(summary, category, value, prefix = '', depth = 0) {
  if (depth > 8) {
    return;
  }

  if (Array.isArray(value)) {
    value.slice(0, 60).forEach((item) => scanConfigValue(summary, category, item, `${prefix}[]`, depth + 1));
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;

    if (isServicePortConfigKey(keyPath)) {
      recordConfigMatch(summary, category, keyPath, child);
    }

    scanConfigValue(summary, category, child, keyPath, depth + 1);
  }
}

function bucketAgeFromMtime(mtimeMs) {
  if (!Number.isFinite(mtimeMs)) {
    return 'unknown';
  }

  const ageMs = Date.now() - mtimeMs;
  const dayMs = 24 * 60 * 60 * 1000;

  if (ageMs < dayMs) {
    return '<1d';
  }

  if (ageMs < 7 * dayMs) {
    return '<7d';
  }

  if (ageMs < 30 * dayMs) {
    return '<30d';
  }

  return '>=30d';
}

function classifyServicePortConfig(summary, port) {
  const hasTrue = summary.enabledStates.has('true');
  const hasFalse = summary.enabledStates.has('false');
  const targetPort = String(port);
  const hasTargetPort = summary.portValues.has(targetPort);
  const hasOtherPort = [...summary.portValues].some((value) => value !== targetPort);
  const conflictCount = Number(hasTrue && hasFalse) + Number(hasTargetPort && hasOtherPort);
  const configState = hasTrue && hasFalse
    ? 'conflict'
    : hasTrue
      ? 'enabled'
      : hasFalse
        ? 'disabled'
        : 'unconfirmed';
  const portState = hasTargetPort && hasOtherPort
    ? 'conflict'
    : hasTargetPort
      ? `matches_${targetPort}`
      : hasOtherPort
        ? 'mismatch'
        : 'unconfirmed';
  const commonFields = {
    conflictCount,
    configState,
    portState,
    notClaimed: [
      'DevTools smoke passed',
      'DevTools UI journey passed',
      'real-device journey passed'
    ]
  };

  if (hasTrue && hasFalse) {
    return {
      ...commonFields,
      code: 'service_port_config_conflict',
      confidence: 'medium',
      nextHumanConfirmation: 'Confirm the Service Port toggle and port in DevTools UI because config sources disagree.'
    };
  }

  if (hasTargetPort && hasOtherPort) {
    return {
      ...commonFields,
      code: 'service_port_config_conflict',
      confidence: 'medium',
      nextHumanConfirmation: 'Confirm the Service Port value in DevTools UI because config sources disagree about the port.'
    };
  }

  if (hasFalse && !hasTrue) {
    return {
      ...commonFields,
      code: 'service_port_config_disabled',
      confidence: 'medium',
      nextHumanConfirmation: 'Confirm Settings > Security Settings > Service Port is enabled before retrying smoke checks.'
    };
  }

  if (hasTrue && hasTargetPort) {
    return {
      ...commonFields,
      code: 'service_port_config_enabled_port_match',
      confidence: 'medium',
      nextHumanConfirmation: 'Config suggests Service Port is enabled for the target port; if no listener exists, inspect profile/session or restart state.'
    };
  }

  if (hasTrue && hasOtherPort) {
    return {
      ...commonFields,
      code: 'service_port_config_enabled_port_mismatch',
      confidence: 'medium',
      nextHumanConfirmation: 'Use the configured port for smoke checks or update the DevTools UI port manually.'
    };
  }

  if (hasTrue) {
    return {
      ...commonFields,
      code: 'service_port_config_unconfirmed',
      confidence: 'low',
      nextHumanConfirmation: 'Config suggests Service Port may be enabled, but the exact port still needs DevTools UI confirmation.'
    };
  }

  return {
    ...commonFields,
    code: 'service_port_config_unconfirmed',
    confidence: 'low',
    nextHumanConfirmation: 'Confirm Settings > Security Settings > Service Port manually; no reliable config key was found.'
  };
}

function inspectServicePortConfig(port) {
  const files = getServicePortConfigCandidates();
  const summary = {
    matches: new Map(),
    enabledStates: new Set(),
    portValues: new Set()
  };
  const categoryCounts = new Map();
  const ageBuckets = new Map();
  let scannedFileCount = 0;
  let parsedFileCount = 0;
  let skippedLargeFileCount = 0;
  let unreadableFileCount = 0;

  for (const file of files) {
    scannedFileCount += 1;
    categoryCounts.set(file.category, (categoryCounts.get(file.category) || 0) + 1);
    ageBuckets.set(bucketAgeFromMtime(file.mtimeMs), (ageBuckets.get(bucketAgeFromMtime(file.mtimeMs)) || 0) + 1);

    if (file.size > maxConfigTextBytes) {
      skippedLargeFileCount += 1;
      continue;
    }

    let text = '';

    try {
      text = readFileSync(file.path, 'utf8');
    } catch {
      unreadableFileCount += 1;
      continue;
    }

    let json = null;

    try {
      json = JSON.parse(text);
    } catch {
      continue;
    }

    parsedFileCount += 1;
    scanConfigValue(summary, file.category, json);
  }

  const diagnosis = classifyServicePortConfig(summary, port);
  const matches = [...summary.matches.values()]
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, 12)
    .map((match) => ({
      category: match.category,
      key: match.key,
      count: match.count,
      valueTypes: [...match.valueTypes].sort(),
      boolValues: [...match.boolValues].sort(),
      portValues: [...match.portValues].sort()
    }));

  return {
    ok: parsedFileCount > 0,
    candidateFileCount: files.length,
    scannedFileCount,
    parsedFileCount,
    skippedLargeFileCount,
    unreadableFileCount,
    categoryCounts: [...categoryCounts.entries()].map(([category, count]) => `${category}:${count}`),
    ageBuckets: [...ageBuckets.entries()].map(([bucket, count]) => `${bucket}:${count}`),
    matchCount: summary.matches.size,
    enabledStates: [...summary.enabledStates].sort(),
    portValues: [...summary.portValues].sort(),
    matches,
    diagnosis,
    detail: parsedFileCount > 0
      ? `${parsedFileCount} config JSON file(s) parsed; raw config content and file names suppressed`
      : 'no readable DevTools config JSON parsed'
  };
}

function inspectBundledCliServicePortGate(bundle) {
  const sourcePath = bundle.path
    ? join(bundle.path, 'Contents/Resources/package.nw/js/common/cli/index.js')
    : '';

  if (!sourcePath || !existsSync(sourcePath)) {
    return {
      ok: false,
      sourceFound: false,
      hasGlobalEnableCliGate: false,
      hasEnableServicePortFlag: false,
      hasDisabledSymbol: false,
      detail: 'bundled CLI source unavailable'
    };
  }

  let source = '';

  try {
    source = readFileSync(sourcePath, 'utf8');
  } catch {
    return {
      ok: false,
      sourceFound: true,
      hasGlobalEnableCliGate: false,
      hasEnableServicePortFlag: false,
      hasDisabledSymbol: false,
      detail: 'bundled CLI source unreadable'
    };
  }

  const hasGlobalEnableCliGate = source.includes('global.enableCLI');
  const hasEnableServicePortFlag = source.includes('--enable-service-port');
  const hasDisabledSymbol = source.includes('IDE_SERVICE_PORT_DISABLED');

  return {
    ok: hasGlobalEnableCliGate && hasEnableServicePortFlag,
    sourceFound: true,
    hasGlobalEnableCliGate,
    hasEnableServicePortFlag,
    hasDisabledSymbol,
    detail: `global.enableCLI gate: ${yesNo(hasGlobalEnableCliGate)}, enable-service-port flag: ${yesNo(hasEnableServicePortFlag)}, disabled symbol: ${yesNo(hasDisabledSymbol)}`
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

function buildDiagnosis({ project, cli, bundle, userData, logs, config, cliGate, lsof, processes, connect }) {
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

  if (!userData.ok) {
    diagnosis.push('devtools_user_data_unknown');
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

  if (
    !connect.ok
    && logs.ok
    && logs.recentLaunchTargetWithoutEnableCount > 0
    && logs.recentLaunchTargetWithEnableCount === 0
    && logs.recentCliServerStartedTargetCount === 0
  ) {
    diagnosis.push('service_port_flag_missing');
  }

  if (
    !connect.ok
    && logs.ok
    && logs.recentLaunchTargetWithoutEnableCount > 0
    && logs.recentLaunchTargetWithEnableCount > 0
    && logs.recentCliServerStartedTargetCount === 0
  ) {
    diagnosis.push('service_port_flag_mixed_recent_evidence');
  }

  if (logs.historicalCliServerStartedTargetCount > 0 || logs.historicalStartCliServerTargetCount > 0) {
    diagnosis.push('historical_service_port_success');
  }

  if (config.diagnosis?.code) {
    diagnosis.push(config.diagnosis.code);
  }

  if (cliGate.ok && !connect.ok) {
    diagnosis.push('service_port_flag_gate_detected');
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
    userData,
    logs,
    config,
    cliGate,
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
    `- DevTools user data: ${yesNo(userData.ok)} (${userData.detail}; readable roots: ${userData.readableRootCount}; profile dirs: ${userData.profileDirCount})`,
    `- DevTools log forensics: ${yesNo(logs.ok)} (${logs.detail}; candidates: ${logs.candidateFileCount}; unreadable: ${logs.unreadableFileCount}; recent window: ${logs.recentWindowFileCount})`,
    `  recent ide-http-port target log files: ${logs.recentIdeHttpTargetFileCount}`,
    `  recent launch target lines with --enable-service-port: ${logs.recentLaunchTargetWithEnableCount}`,
    `  recent launch target lines without --enable-service-port: ${logs.recentLaunchTargetWithoutEnableCount}`,
    `  recent --enable-service-port mentions: ${logs.recentEnableServicePortCount}`,
    `  recent cli server target starts: ${logs.recentStartCliServerTargetCount}`,
    `  recent cli server target ready lines: ${logs.recentCliServerStartedTargetCount}`,
    `  historical --enable-service-port mentions: ${logs.historicalEnableServicePortCount}`,
    `  historical launch target lines with --enable-service-port: ${logs.historicalLaunchTargetWithEnableCount}`,
    `  historical launch target lines without --enable-service-port: ${logs.historicalLaunchTargetWithoutEnableCount}`,
    `  historical cli server target starts: ${logs.historicalStartCliServerTargetCount}`,
    `  historical cli server target ready lines: ${logs.historicalCliServerStartedTargetCount}`,
    `  sanitized log error counters: EADDRINUSE=${logs.eaddrinuseCount}, EACCES=${logs.eaccesCount}, ECONNREFUSED=${logs.connectRefusedCount}, timeout=${logs.timeoutCount}, crash_or_exit=${logs.crashOrExitCount}, disabled_hint=${logs.disabledHintCount}`,
    `  latest log file labels: ${logs.latestLogFileLabels.length > 0 ? logs.latestLogFileLabels.join(', ') : 'none'}`,
    `- DevTools service-port config: ${yesNo(config.ok)} (${config.detail}; candidates: ${config.candidateFileCount}; parsed: ${config.parsedFileCount}; unreadable: ${config.unreadableFileCount}; skipped large: ${config.skippedLargeFileCount})`,
    `  config categories: ${config.categoryCounts.length > 0 ? config.categoryCounts.join(', ') : 'none'}`,
    `  config mtime buckets: ${config.ageBuckets.length > 0 ? config.ageBuckets.join(', ') : 'none'}`,
    `  config service-port diagnosis: ${config.diagnosis.code} (confidence: ${config.diagnosis.confidence})`,
    `  config state: ${config.diagnosis.configState}`,
    `  config port state: ${config.diagnosis.portState}`,
    `  config conflict count: ${config.diagnosis.conflictCount}`,
    `  config enabled states: ${config.enabledStates.length > 0 ? config.enabledStates.join(', ') : 'unconfirmed'}`,
    `  config port values: ${config.portValues.length > 0 ? config.portValues.join(', ') : 'unconfirmed'}`,
    `  config key summaries: ${config.matches.length > 0 ? config.matches.map((match) => `${match.category}/${match.key}[count=${match.count};types=${match.valueTypes.join('|') || 'none'};bools=${match.boolValues.join('|') || '-'};ports=${match.portValues.join('|') || '-'}]`).join('; ') : 'none'}`,
    `  config not claimed: ${config.diagnosis.notClaimed.join('; ')}`,
    `  config next human confirmation: ${config.diagnosis.nextHumanConfirmation}`,
    `- bundled CLI service-port gate: ${yesNo(cliGate.ok)} (${cliGate.detail})`,
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
    '- process command lines were not printed',
    '- raw DevTools log lines were not printed',
    '- raw DevTools config content and config file names were not printed'
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
  const userData = inspectUserDataRoots();
  const logs = inspectRecentDevToolsLogs(options.port);
  const config = inspectServicePortConfig(options.port);
  const cliGate = inspectBundledCliServicePortGate(bundle);
  const lsof = inspectLsof(options.port);
  const processes = inspectProcesses(options.port);
  const connect = await inspectConnect(options.port);
  const diagnosis = buildDiagnosis({ project, cli, bundle, userData, logs, config, cliGate, lsof, processes, connect });
  const status = classifyStatus({ lsof, processes, connect });
  const extraLabels = [
    { path: options.projectPath, label: '<repo>' },
    { path: safeRealPath(options.projectPath), label: '<repo>' },
    { path: cli.selected?.path, label: '<devtools-cli>' },
    { path: bundle.path, label: '<devtools-app>' },
    ...getDevToolsUserDataRootCandidates().map((path) => ({ path, label: '<devtools-user-data>' }))
  ];
  const report = buildReport({
    options,
    project,
    cli,
    bundle,
    userData,
    logs,
    config,
    cliGate,
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
