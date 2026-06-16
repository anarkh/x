import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPort = 9420;
const smokeTimeoutMs = 5000;
const examplePath = join(rootDir, 'harness/viral-journey-manual-results.example.json');
const defaultOutPath = join(rootDir, 'harness/manual-test-results.local-viral-journey-blocked.json');
const schemaVersion = 'viral-journey-manual-results.v1';
const outputPatterns = [
  /^harness\/manual-test-results\.local-viral-journey.*\.json$/,
  /^harness\/local-viral-journey-results.*\.json$/
];

function usage() {
  return [
    'Usage: node scripts/capture-viral-journey-blocked-evidence.mjs [--project <path>] [--port <number>] [--out <path>] [--force]',
    '',
    'Captures ignored local blocked viral journey evidence from read-only DevTools diagnostics.',
    'Does not quit/open DevTools, preview, clear caches, kill processes, or write project/runtime config.'
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
    outPath: defaultOutPath,
    force: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--project' || arg === '--port' || arg === '--out') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value.`);
      }

      if (arg === '--project') {
        options.projectPath = isAbsolute(value) ? resolve(value) : resolve(rootDir, value);
      } else if (arg === '--port') {
        options.port = parsePositiveInteger(value, '--port', 65535);
      } else {
        options.outPath = isAbsolute(value) ? value : resolve(rootDir, value);
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function runCommand(args, label, stdio = 'pipe') {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: rootDir,
    encoding: 'utf8',
    stdio
  });
  const stdout = result.stdout ? result.stdout.trim() : '';
  const stderr = result.stderr ? result.stderr.trim() : '';
  const combinedOutput = [stdout, stderr].filter(Boolean).join('\n');

  if (result.status !== 0) {
    const output = combinedOutput ? `\n${combinedOutput}` : '';
    throw new Error(`${label} failed with exit code ${result.status}.${output}`);
  }

  return {
    label,
    stdout,
    stderr,
    combinedOutput
  };
}

function runGit(args, label) {
  return runCommand(['git', ...args], label).stdout;
}

function isGitIgnored(filePath) {
  const relativeOut = projectRelativePath(filePath);
  const result = spawnSync('git', ['check-ignore', '-q', '--', relativeOut], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  return result.status === 0;
}

function assertIgnoredOutputPath(outPath) {
  const relativeOut = projectRelativePath(outPath);

  if (relativeOut.startsWith('..') || isAbsolute(relativeOut) || !relativeOut.startsWith('harness/')) {
    throw new Error(`Output must live under harness/: ${relativeOut}`);
  }

  if (!outputPatterns.some((pattern) => pattern.test(relativeOut))) {
    throw new Error(`Output must use an ignored local viral journey result path. Got: ${relativeOut}`);
  }

  if (!isGitIgnored(outPath)) {
    throw new Error(`Output is not ignored by git: ${relativeOut}`);
  }
}

function parseStatus(output) {
  const match = /^status:\s*(ready|blocked|unknown)\s*$/m.exec(output);

  return match ? match[1] : 'unknown';
}

function parseLine(output, prefix) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escapedPrefix}\\s*(.+)$`, 'm').exec(output);

  return match ? match[1].trim() : '';
}

function parseDevToolsBundle(output) {
  const detail = parseLine(output, '- DevTools app bundle:');
  const version = /version:\s*([^;)]+)/.exec(detail)?.[1]?.trim() || '';
  const build = /build:\s*([^;)]+)/.exec(detail)?.[1]?.trim() || '';
  const name = /name:\s*([^;)]+)/.exec(detail)?.[1]?.trim() || '';

  return {
    detail,
    name,
    version,
    build
  };
}

function parseBlockers(output) {
  const lines = output.split(/\r?\n/);
  const blockers = [];
  let inBlockers = false;

  for (const line of lines) {
    if (line.trim() === 'Blockers:') {
      inBlockers = true;
      continue;
    }

    if (inBlockers && line.trim() === '') {
      break;
    }

    if (inBlockers && line.startsWith('- ')) {
      blockers.push(line.slice(2).trim());
    }
  }

  return blockers;
}

function compactOutput(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 14)
    .join(' | ');
}

function readExampleJourneys() {
  const example = JSON.parse(readFileSync(examplePath, 'utf8'));

  if (!Array.isArray(example.journeys) || example.journeys.length !== 5) {
    throw new Error('Example viral journey manual results must contain exactly five journeys.');
  }

  return example.journeys;
}

function buildEnvironment({ port, portOutput, smokeOutput }) {
  const bundle = parseDevToolsBundle(portOutput);
  const bundleVersion = bundle.version && bundle.version !== 'unknown'
    ? bundle.version
    : 'unavailable via read-only forensics';
  const bundleBuild = bundle.build && bundle.build !== 'unknown'
    ? bundle.build
    : 'unavailable via read-only forensics';

  return {
    wechatDevToolsVersion: `${bundleVersion}; build ${bundleBuild}`,
    baseLibraryVersion: `unavailable: service port ${port} blocked before UI base library inspection`,
    device: `not reached; DevTools service port ${port} blocked before UI manual journey`,
    isRealDevice: false,
    network: `not exercised; DevTools service port ${port} blocked before networked UI path`,
    cloudBase: {
      enabled: false,
      environmentId: `not selected because service port ${port} blocked local UI setup`,
      postsFunctionDeployed: false,
      notes: 'CloudBase state was not probed by this capture; diagnostics stopped at local DevTools access.'
    },
    dataSetup: {
      activeLowRiskPostId: `not selected because service port ${port} blocked fixture setup`,
      staleSignalPostId: `not selected because service port ${port} blocked fixture setup`,
      reportSignalPostId: `not selected because service port ${port} blocked fixture setup`,
      closedPostIds: {
        stale: `not selected because service port ${port} blocked fixture setup`,
        resolved: `not selected because service port ${port} blocked fixture setup`,
        expired: `not selected because service port ${port} blocked fixture setup`,
        hidden: `not selected because service port ${port} blocked fixture setup`
      },
      notes: `Fixture choice and storage seeding were deferred because DevTools service port ${port} was blocked before UI manual setup. Port summary: ${compactOutput(portOutput)} Smoke summary: ${compactOutput(smokeOutput)}`
    }
  };
}

function buildBlockerSummary({ port, portStatus, smokeStatus, portOutput, smokeOutput }) {
  const smokeBlockers = parseBlockers(smokeOutput);
  const diagnosis = parseLine(portOutput, 'diagnosis:') || 'diagnosis unavailable from port forensics';
  const listener = parseLine(portOutput, '- lsof listener:') || 'listener detail unavailable';
  const connect = parseLine(portOutput, '- socket connect:') || parseLine(smokeOutput, `- service port ${port}:`) || 'socket detail unavailable';
  const processScan = parseLine(portOutput, '- process scan:') || parseLine(smokeOutput, '- ide-http-port process:') || 'process detail unavailable';
  const smokeText = smokeBlockers.length > 0
    ? smokeBlockers.join('; ')
    : compactOutput(smokeOutput);

  return [
    `DevTools service port ${port} blocked viral manual journey capture.`,
    `Port forensics status=${portStatus}; diagnosis=${diagnosis}; listener=${listener}; connect=${connect}; process=${processScan}.`,
    `Smoke access status=${smokeStatus}; blocker=${smokeText}.`
  ].join(' ');
}

function replaceRoutePlaceholders(route, port) {
  if (route === 'multiple') {
    return `multiple; fixture selection stopped by DevTools service port ${port} blocker`;
  }

  return String(route).replaceAll('<activeLowRiskPostId>', `service-port-${port}-blocked-fixture`);
}

function buildBlockedJourney(journey, context) {
  return {
    id: journey.id,
    title: journey.title,
    status: 'blocked',
    route: replaceRoutePlaceholders(journey.route, context.port),
    steps: journey.steps,
    expected: journey.expected,
    actual: `UI journey was blocked before the first route interaction because DevTools service port ${context.port} was unavailable; no visual state, tap flow, comment flow, system share card, or payload observation was captured.`,
    evidence: [],
    blocker: context.blockerSummary,
    risks: journey.risks,
    followUp: `${journey.followUp} After restoring WeChat DevTools Service Port ${context.port}, rerun P preparation command: node scripts/prepare-viral-journey-devtools-run.mjs --project ${context.projectPath} --port ${context.port} --out ${context.relativeOut}. Then perform the five viral UI journeys in DevTools or on a real device and replace this blocked-only local JSON with concrete observations and evidence.`
  };
}

function buildResults(options, diagnostics) {
  const branch = runGit(['branch', '--show-current'], 'git branch --show-current');
  const commit = runGit(['rev-parse', '--short', 'HEAD'], 'git rev-parse --short HEAD');
  const relativeOut = projectRelativePath(options.outPath);
  const blockerSummary = buildBlockerSummary({
    port: options.port,
    portStatus: diagnostics.portStatus,
    smokeStatus: diagnostics.smokeStatus,
    portOutput: diagnostics.portOutput,
    smokeOutput: diagnostics.smokeOutput
  });
  const journeyContext = {
    port: options.port,
    projectPath: options.projectPath,
    relativeOut,
    blockerSummary
  };

  return {
    schemaVersion,
    branch,
    commit,
    testedAt: new Date().toISOString(),
    tester: process.env.USER || process.env.LOGNAME || 'local-capture-agent',
    environment: buildEnvironment({
      port: options.port,
      portOutput: diagnostics.portOutput,
      smokeOutput: diagnostics.smokeOutput
    }),
    summary: {
      overallStatus: 'blocked',
      recommendation: `Blocked local evidence only for DevTools service port ${options.port}. This JSON does not prove UI passed; use it only to document the current blocker before recovering Service Port and rerunning the P preparation command plus all five real viral journeys.`,
      notes: [
        blockerSummary,
        'The capture command wrote only this ignored local JSON and ran the existing manual evidence checker.',
        'No DevTools quit/open, preview, cache clearing, process kill, or project config mutation was performed.'
      ]
    },
    journeys: readExampleJourneys().map((journey) => buildBlockedJourney(journey, journeyContext))
  };
}

function runDiagnostics(options) {
  const portResult = runCommand([
    process.execPath,
    'scripts/inspect-devtools-port-state.mjs',
    '--project',
    options.projectPath,
    '--port',
    String(options.port)
  ], 'DevTools port forensics');
  const smokeResult = runCommand([
    process.execPath,
    'scripts/check-devtools-smoke-access.mjs',
    '--project',
    options.projectPath,
    '--port',
    String(options.port),
    '--timeout-ms',
    String(smokeTimeoutMs)
  ], 'DevTools smoke access probe');

  return {
    portOutput: portResult.combinedOutput,
    smokeOutput: smokeResult.combinedOutput,
    portStatus: parseStatus(portResult.combinedOutput),
    smokeStatus: parseStatus(smokeResult.combinedOutput)
  };
}

function writeResults(outPath, results, force) {
  if (existsSync(outPath) && !force) {
    throw new Error(`Refusing to overwrite existing output file: ${projectRelativePath(outPath)}. Use --force to replace it.`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
}

function runManualEvidenceChecker(outPath) {
  const relativeOut = projectRelativePath(outPath);

  runCommand([
    process.execPath,
    '--no-warnings',
    'scripts/check-viral-journey-manual-evidence.mjs',
    relativeOut
  ], 'viral journey manual evidence checker', 'inherit');
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  assertIgnoredOutputPath(options.outPath);

  if (existsSync(options.outPath) && !options.force) {
    throw new Error(`Refusing to overwrite existing output file: ${projectRelativePath(options.outPath)}. Use --force to replace it.`);
  }

  console.log('Capturing blocked viral journey evidence from read-only DevTools diagnostics.');
  console.log(`project: ${options.projectPath}`);
  console.log(`port: ${options.port}`);
  console.log(`out: ${projectRelativePath(options.outPath)}`);
  console.log('Safety: no DevTools quit/open, preview, cache clearing, process killing, or project config writes.');

  const diagnostics = runDiagnostics(options);
  const results = buildResults(options, diagnostics);

  writeResults(options.outPath, results, options.force);
  runManualEvidenceChecker(options.outPath);

  console.log('');
  console.log(`Captured blocked viral journey evidence: ${projectRelativePath(options.outPath)}`);
  console.log(`overallStatus: ${results.summary.overallStatus}`);
  console.log(`Next step: restore WeChat DevTools Service Port ${options.port}, rerun node scripts/prepare-viral-journey-devtools-run.mjs --project ${options.projectPath} --port ${options.port} --out ${projectRelativePath(options.outPath)}, then perform the five real viral UI journeys.`);
  console.log('Reminder: this is blocked local evidence only, not UI passed evidence.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
