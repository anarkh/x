import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPort = 9420;
const uiServicePortStates = new Set(['enabled', 'disabled', 'not_found', 'unavailable', 'not_confirmed']);
const uiPortStates = new Set(['matches_9420', 'mismatch', 'unconfirmed']);
const allowedAcStatuses = new Set([
  'pre_manual_confirmation',
  'blocked_config_disabled',
  'blocked_port_mismatch',
  'blocked_no_listener',
  'blocked_smoke_access',
  'ready_for_manual_journey'
]);
const noSideEffectVerbDenylist = [
  'quit',
  'open',
  'preview',
  'upload',
  'kill',
  'cache clear',
  'settings mutation',
  'ui automation'
];

function usage() {
  return [
    'Usage: npm run prepare:devtools-ui-confirmation -- --project <path> --port <number> --ui-service-port-state <state> --ui-port-state <state> [--strict]',
    '',
    `ui service port state: ${[...uiServicePortStates].join('|')}`,
    `ui port state: ${[...uiPortStates].join('|')}`,
    '',
    'Read-only AC recheck after a user manually confirms the WeChat DevTools Service Port UI.',
    'No files are written and no DevTools UI, process, cache, or settings mutation is performed.'
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

function parseEnum(value, allowedValues, label) {
  if (!allowedValues.has(value)) {
    throw new Error(`${label} must be one of: ${[...allowedValues].join(', ')}.`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    projectPath: rootDir,
    port: defaultPort,
    uiServicePortState: 'not_confirmed',
    uiPortState: 'unconfirmed',
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

    if (arg === '--project' || arg === '--port' || arg === '--ui-service-port-state' || arg === '--ui-port-state') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value.`);
      }

      if (arg === '--project') {
        options.projectPath = isAbsolute(value) ? resolve(value) : resolve(rootDir, value);
      } else if (arg === '--port') {
        options.port = parsePositiveInteger(value, '--port', 65535);
      } else if (arg === '--ui-service-port-state') {
        options.uiServicePortState = parseEnum(value, uiServicePortStates, '--ui-service-port-state');
      } else {
        options.uiPortState = parseEnum(value, uiPortStates, '--ui-port-state');
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function redactForSafety(value) {
  return String(value || '')
    .replace(/\/private\/tmp\/[^\s"'`),\]}<>]+/g, '<repo-worktree>')
    .replace(/\/tmp\/[^\s"'`),\]}<>]+/g, '<repo-worktree>')
    .replace(/\/Users\/[^\s"'`),\]}<>]+/g, '<local-path>')
    .replace(/\b(?:Bearer\s+)?[A-Za-z0-9._~+/=-]*(?:token|cookie|session|openid|unionid|password|passwd|pwd|secret|authorization)[A-Za-z0-9._~+/=-]*\b/gi, '<redacted-sensitive>')
    .replace(/\b(access[_-]?token|refresh[_-]?token|cookie|session|openid|unionid|password|passwd|pwd|secret|authorization|bearer)=([^\s"'`),\]}<>]+)/gi, '$1=<redacted>');
}

function safeExitCode(result) {
  if (typeof result.status === 'number') {
    return String(result.status);
  }

  if (result.signal) {
    return `signal:${result.signal}`;
  }

  if (result.error?.code) {
    return `error:${result.error.code}`;
  }

  return 'unknown';
}

function combinedOutput(result) {
  return [result.stdout || '', result.stderr || ''].filter(Boolean).join('\n');
}

function runReadonlyCommand({ label, script, options, extraArgs = [] }) {
  const args = [
    script,
    '--project',
    options.projectPath,
    '--port',
    String(options.port),
    ...extraArgs
  ];

  if (options.strict) {
    args.push('--strict');
  }

  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 8 * 1024 * 1024
  });

  return {
    label,
    exitCode: safeExitCode(result),
    ok: result.status === 0,
    output: combinedOutput(result)
  };
}

function matchLine(output, pattern, fallback = 'unknown') {
  const match = pattern.exec(output);

  return match ? redactForSafety(match[1].trim()) : fallback;
}

function parseStatus(output) {
  return matchLine(output, /^status:\s*(ready|blocked|unknown)\s*$/m);
}

function parseDiagnosis(output) {
  const diagnosis = matchLine(output, /^diagnosis:\s*([^\n\r]*)$/m, '');

  if (!diagnosis) {
    return [];
  }

  return diagnosis
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseInspectSummary(command) {
  const output = command.output;
  const status = parseStatus(output);
  const configState = matchLine(output, /^\s*config state:\s*([^\n\r]*)$/m);
  const portState = matchLine(output, /^\s*config port state:\s*([^\n\r]*)$/m);
  const conflictCountText = matchLine(output, /^\s*config conflict count:\s*(\d+)\s*$/m, '0');
  const lsofState = matchLine(output, /^- lsof listener:\s*(yes|no)\s*\(([^\n\r]*)\)$/m);
  const lsofDetail = matchLine(output, /^- lsof listener:\s*(?:yes|no)\s*\(([^\n\r]*)\)$/m);
  const socketState = matchLine(output, /^- socket connect:\s*(yes|no)\s*\(([^\n\r]*)\)$/m);
  const socketDetail = matchLine(output, /^- socket connect:\s*(?:yes|no)\s*\(([^\n\r]*)\)$/m);
  const diagnosis = parseDiagnosis(output);
  const conflictCount = Number.parseInt(conflictCountText, 10);

  let listenerState = 'unknown';

  if (socketState === 'yes' || lsofState === 'yes') {
    listenerState = 'listening';
  } else if (/no listener/i.test(lsofDetail)) {
    listenerState = 'no_listener';
  } else if (/ECONNREFUSED|refused/i.test(socketDetail)) {
    listenerState = 'refused';
  } else if (/timeout|timed out/i.test(socketDetail)) {
    listenerState = 'timeout';
  }

  return {
    status,
    diagnosis,
    configState,
    portState,
    conflictCount: Number.isFinite(conflictCount) ? conflictCount : 0,
    listenerState,
    listenerSummary: listenerState === 'listening'
      ? 'listener or connect signal detected'
      : `${listenerState}; connect=${socketDetail}; lsof=${lsofDetail}`
  };
}

function parseSmokeSummary(command) {
  const output = command.output;
  const status = parseStatus(output);
  const servicePort = matchLine(output, /^- service port \d+:\s*(yes|no)\s*\(([^\n\r]*)\)$/m);
  const servicePortDetail = matchLine(output, /^- service port \d+:\s*(?:yes|no)\s*\(([^\n\r]*)\)$/m);

  return {
    status,
    smokeState: status === 'ready' ? 'ready' : status === 'blocked' ? 'blocked' : 'unknown',
    summary: `servicePort=${servicePort}; ${servicePortDetail}`
  };
}

function parseViralPreparationSummary(command) {
  const output = command.output;
  const portStatus = matchLine(output, /^Parsed port status:\s*(ready|blocked|unknown)\s*$/m);
  const smokeStatus = matchLine(output, /^Parsed smoke access status:\s*(ready|blocked|unknown)\s*$/m);
  const status = command.ok && portStatus === 'ready' && smokeStatus === 'ready'
    ? 'ready'
    : portStatus === 'blocked' || smokeStatus === 'blocked' || !command.ok
      ? 'blocked'
      : 'unknown';

  return {
    status,
    summary: `port=${portStatus}; smoke=${smokeStatus}; raw stdout/stderr suppressed`
  };
}

function commandSummaryLine(commands, summaries) {
  return commands
    .map((command) => {
      const status = summaries.get(command.label)?.status || summaries.get(command.label)?.smokeState || 'unknown';

      return `${command.label} exit=${command.exitCode} status=${status}`;
    })
    .join('; ');
}

function hasStrictSubcommandFailure(options, commands) {
  return options.strict && commands.some((command) => command.exitCode !== '0');
}

function determineAcStatus({ options, inspect, smoke, viralPreparation, strictSubcommandFailed }) {
  if (options.uiServicePortState === 'disabled') {
    return 'blocked_config_disabled';
  }

  if (
    options.uiServicePortState === 'not_confirmed'
    || options.uiServicePortState === 'not_found'
    || options.uiServicePortState === 'unavailable'
    || options.uiPortState === 'unconfirmed'
  ) {
    return 'pre_manual_confirmation';
  }

  if (options.uiPortState === 'mismatch' || inspect.portState === 'mismatch' || inspect.portState === 'conflict') {
    return 'blocked_port_mismatch';
  }

  const readySignals = options.uiServicePortState === 'enabled'
    && options.uiPortState === 'matches_9420'
    && inspect.listenerState === 'listening'
    && smoke.smokeState === 'ready'
    && viralPreparation.status === 'ready'
    && !strictSubcommandFailed;

  if (readySignals) {
    return 'ready_for_manual_journey';
  }

  if (inspect.listenerState === 'listening') {
    return 'blocked_smoke_access';
  }

  return 'blocked_no_listener';
}

function buildNextStep(status, options) {
  if (status === 'pre_manual_confirmation') {
    return '用户在 WeChat DevTools UI 中人工确认 Service Port 开关与端口后，再运行只读复核。';
  }

  if (status === 'blocked_config_disabled') {
    return '用户决定是否手动开启 Settings > Security Settings > Service Port；agent 不修改设置。';
  }

  if (status === 'blocked_port_mismatch') {
    return '用户人工确认 UI 显示端口；若不是目标端口，改用用户确认的端口复测或继续保持 blocked。';
  }

  if (status === 'blocked_no_listener') {
    return `用户复核 DevTools 实例、Service Port 开关和端口 ${options.port} 后再次只读复测；不要把人工开启当作 listener ready。`;
  }

  if (status === 'blocked_smoke_access') {
    return '端口有连接信号但 smoke access 仍未 ready；用户复核 DevTools 项目、登录/安全提示和 IDE 状态后再复测。';
  }

  return '进入真实 DevTools 或真机手测，记录脱敏 UI 观察和 payload evidence；ready 仍不是 passed。';
}

function buildDiagnosis(status, inspect, smoke, viralPreparation, strictSubcommandFailed) {
  const diagnosis = [...inspect.diagnosis];

  if (status === 'pre_manual_confirmation') {
    diagnosis.unshift('manual_ui_confirmation_required');
  }

  if (status === 'blocked_config_disabled') {
    diagnosis.unshift('manual_ui_service_port_disabled');
  }

  if (status === 'blocked_port_mismatch') {
    diagnosis.unshift('manual_or_config_port_mismatch');
  }

  if (status === 'blocked_no_listener') {
    diagnosis.unshift('service_port_not_listening_after_manual_confirmation');
  }

  if (status === 'blocked_smoke_access') {
    diagnosis.unshift('devtools_smoke_access_blocked_after_listener_signal');
  }

  if (smoke.smokeState === 'blocked') {
    diagnosis.push('smoke_access_blocked');
  }

  if (viralPreparation.status === 'blocked') {
    diagnosis.push('viral_journey_preparation_blocked');
  }

  if (strictSubcommandFailed) {
    diagnosis.push('strict_subcommand_nonzero');
  }

  return [...new Set(diagnosis)].slice(0, 10);
}

function printSummary({ options, commands, inspect, smoke, viralPreparation, status, diagnosis, strictSubcommandFailed }) {
  const summaries = new Map([
    ['inspect devtools port', inspect],
    ['devtools smoke access', smoke],
    ['viral journey preparation', viralPreparation]
  ]);
  const nextStep = buildNextStep(status, options);

  console.log('AC DevTools Service Port UI confirmation recheck');
  console.log('project: <repo-worktree>');
  console.log(`targetPort: ${options.port}`);
  console.log(`strict: ${options.strict ? 'yes' : 'no'}`);
  console.log(`status: ${status}`);
  console.log(`diagnosis: ${diagnosis.length > 0 ? diagnosis.join(', ') : 'none'}`);
  console.log('actor: user_manual_ui_confirmation + agent_read_only_recheck');
  console.log(`uiServicePortState: ${options.uiServicePortState}`);
  console.log(`uiPortState: ${options.uiPortState}`);
  console.log(`configState: ${inspect.configState}`);
  console.log(`portState: ${inspect.portState}`);
  console.log(`conflictCount: ${inspect.conflictCount}`);
  console.log(`listenerState: ${inspect.listenerState}`);
  console.log(`listenerSummary: ${redactForSafety(inspect.listenerSummary)}`);
  console.log(`smokeState: ${smoke.smokeState}`);
  console.log(`smokeSummary: ${redactForSafety(smoke.summary)}`);
  console.log(`viralJourneyPreparation: ${viralPreparation.status}`);
  console.log(`viralJourneyPreparationSummary: ${redactForSafety(viralPreparation.summary)}`);
  console.log('manualJourneyStatus: unverified');
  console.log(`strictSubcommandNonzero: ${strictSubcommandFailed ? 'yes' : 'no'}`);
  console.log(`commandsRun: ${commandSummaryLine(commands, summaries)}`);
  console.log(`nextStep: ${nextStep}`);
  console.log('notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed');
  console.log('reminder: port/smoke ready is not viral journey passed');
  console.log(`safety: no ${noSideEffectVerbDenylist.join(', ')}; raw config/log/stdout/stderr and local paths suppressed`);

  if (!allowedAcStatuses.has(status)) {
    throw new Error(`Unexpected AC status: ${status}`);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const inspectCommand = runReadonlyCommand({
    label: 'inspect devtools port',
    script: 'scripts/inspect-devtools-port-state.mjs',
    options
  });
  const smokeCommand = runReadonlyCommand({
    label: 'devtools smoke access',
    script: 'scripts/check-devtools-smoke-access.mjs',
    options,
    extraArgs: ['--timeout-ms', '5000']
  });
  const viralCommand = runReadonlyCommand({
    label: 'viral journey preparation',
    script: 'scripts/prepare-viral-journey-devtools-run.mjs',
    options
  });
  const commands = [inspectCommand, smokeCommand, viralCommand];
  const inspect = parseInspectSummary(inspectCommand);
  const smoke = parseSmokeSummary(smokeCommand);
  const viralPreparation = parseViralPreparationSummary(viralCommand);
  const strictSubcommandFailed = hasStrictSubcommandFailure(options, commands);
  const status = determineAcStatus({ options, inspect, smoke, viralPreparation, strictSubcommandFailed });
  const diagnosis = buildDiagnosis(status, inspect, smoke, viralPreparation, strictSubcommandFailed);

  printSummary({ options, commands, inspect, smoke, viralPreparation, status, diagnosis, strictSubcommandFailed });
  process.exit(options.strict && status !== 'ready_for_manual_journey' ? 1 : 0);
} catch (error) {
  console.error(redactForSafety(error.message));
  console.error('');
  console.error(usage());
  process.exit(1);
}
