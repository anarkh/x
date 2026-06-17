import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPort = 9420;
const smokeTimeoutMs = 5000;
const defaultOutPath = join(rootDir, 'harness/manual-test-results.local-viral-journey.json');
const examplePath = join(rootDir, 'harness/viral-journey-manual-results.example.json');
const sharePayloadJourneyIds = new Set([
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source'
]);
const timelinePayloadJourneyIds = new Set([
  'timeline-share-channel'
]);
const timelineRiskJourneyIds = new Set([
  'timeline-risk-gating'
]);

function usage() {
  return [
    'Usage: node scripts/prepare-viral-journey-devtools-run.mjs [--project <path>] [--port <number>] [--out <path>] [--strict]',
    '',
    'Prepares a no-side-effect run package for viral journey DevTools manual testing.',
    'Does not write files, quit/open DevTools, preview, clear caches, or kill processes.'
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

function printBlock(title, content) {
  console.log('');
  console.log(`== ${title} ==`);
  console.log(content || '(no output)');
}

function runCommand(args, label) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: rootDir,
    encoding: 'utf8'
  });
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  return {
    label,
    args,
    status: result.status,
    ok: result.status === 0,
    stdout,
    stderr,
    combinedOutput: [stdout, stderr].filter(Boolean).join('\n')
  };
}

function assertCommandOk(result) {
  if (result.ok) {
    return;
  }

  const output = result.combinedOutput ? `\n${result.combinedOutput}` : '';
  throw new Error(`${result.label} failed with exit code ${result.status}.${output}`);
}

function parsePortStatus(output) {
  const match = /^status:\s*(ready|blocked|unknown)\s*$/m.exec(output);
  return match ? match[1] : 'unknown';
}

function readExampleJourneys() {
  const example = JSON.parse(readFileSync(examplePath, 'utf8'));

  if (!Array.isArray(example.journeys)) {
    throw new Error('Example viral journey manual results must contain a journeys array.');
  }

  if (example.journeys.length !== 7) {
    throw new Error(`Expected exactly seven viral journeys in the example JSON, found ${example.journeys.length}.`);
  }

  return example.journeys;
}

function printJourneyPackage(journeys) {
  console.log('');
  console.log('== Viral Journey Manual Run Package ==');
  console.log(`Source: ${projectRelativePath(examplePath)}`);
  console.log('This package is a preparation checklist only; it is not UI passed evidence and does not prove DevTools or real-device passed.');

  journeys.forEach((journey, index) => {
    console.log('');
    console.log(`${index + 1}. ${journey.id}`);
    console.log(`   title: ${journey.title}`);
    console.log(`   route: ${journey.route}`);
    console.log('   key expected:');

    for (const expected of journey.expected) {
      console.log(`   - ${expected}`);
    }

    if (sharePayloadJourneyIds.has(journey.id)) {
      // The manual checker accepts either a concrete sharePayload.path or an explicit inability note.
      console.log('   share payload check: confirm/comment evidence must include from=share&source=receiver and receiverAction=confirm/comment; source evidence must include from=share&source=receiver, or record a concrete reason why the payload could not be inspected.');
    }

    if (timelinePayloadJourneyIds.has(journey.id)) {
      console.log('   timeline payload check: record the real system menu with both friend share and timeline share, plus onShareTimeline title/query/imageUrl or a concrete inability reason; inspectable query must include id, from=share, source=timeline, and shareChannel=timeline. Also observe that the source=timeline landing page receiver context explains the Moments/nearby-task/status-comments/confirm-or-clue flow. This is distinct from the receiverAction second-hop share path.');
    }

    if (timelineRiskJourneyIds.has(journey.id)) {
      console.log('   timeline risk check: passed evidence must record observed no-shareTimeline/no-timeline menu entry for weak stale/report, stale/resolved/expired/hidden, or unknown tasks; if the menu/payload cannot be triggered, record the concrete blocker and keep the journey blocked. Any title/actual copy must stay cautious.');
    }
  });
}

function printRecoveryDryRunHint(options) {
  console.log('');
  console.log('== Recovery Dry-Run Hint ==');
  console.log('No recovery command was run by this preparation script.');
  console.log('If the environment remains blocked, inspect the dry-run recovery plan with:');
  console.log(`node scripts/recover-devtools-service-port.mjs --dry-run --project ${options.projectPath} --port ${options.port} --timeout-ms ${smokeTimeoutMs}`);
  console.log('The dry-run report must not be written as DevTools recovered or UI passed evidence.');
}

function printNextSteps({ options, portStatus, smokeStatus }) {
  const relativeOut = projectRelativePath(options.outPath);
  const serviceReady = portStatus === 'ready' && smokeStatus === 'ready';

  console.log('');
  console.log('== Next Steps ==');

  if (serviceReady) {
    console.log(`1. Open this worktree in the WeChat DevTools UI: ${options.projectPath}`);
    console.log('2. Run the seven viral journeys above in DevTools or on a real device and record actual UI observations plus payload/log/screenshot/recording evidence.');
  } else if (portStatus === 'blocked' || smokeStatus === 'blocked') {
    console.log('1. First recover the WeChat DevTools service port using the diagnosis from the port forensics and smoke access reports above.');
    console.log(`2. Re-run this preparation command after port ${options.port} becomes ready, then open the worktree in the WeChat DevTools UI.`);
  } else {
    console.log(`1. Resolve the unknown DevTools service-port state for port ${options.port}; use the diagnosis above before attempting UI smoke.`);
    console.log(`2. Re-run this preparation command once the port status is ready, then open the worktree in the WeChat DevTools UI.`);
  }

  console.log(`3. After real observations are recorded in ${relativeOut}, re-run: node --no-warnings scripts/check-viral-journey-manual-evidence.mjs ${relativeOut}`);
  console.log('4. Do not treat this preparation output, dry-run draft check, readiness check, or port forensics as UI passed evidence.');
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const relativeOut = projectRelativePath(options.outPath);

  console.log('Viral journey DevTools manual-run preparation');
  console.log(`project: ${options.projectPath}`);
  console.log(`port: ${options.port}`);
  console.log(`out: ${relativeOut}`);
  console.log(`strict: ${options.strict ? 'yes' : 'no'}`);
  console.log('Safety: no files are written; DevTools is not quit/opened; preview, cache clearing, and process killing are not performed.');

  const portResult = runCommand([
    process.execPath,
    'scripts/inspect-devtools-port-state.mjs',
    '--project',
    options.projectPath,
    '--port',
    String(options.port)
  ], 'DevTools port forensics');
  assertCommandOk(portResult);

  const portStatus = parsePortStatus(portResult.combinedOutput);
  printBlock('Read-Only DevTools Port Forensics', portResult.combinedOutput);
  console.log('');
  console.log(`Parsed port status: ${portStatus}`);

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
  assertCommandOk(smokeResult);

  const smokeStatus = parsePortStatus(smokeResult.combinedOutput);
  printBlock('No-Side-Effect DevTools Smoke Access Probe', smokeResult.combinedOutput);
  console.log('');
  console.log(`Parsed smoke access status: ${smokeStatus}`);

  printRecoveryDryRunHint(options);

  const dryRunResult = runCommand([
    process.execPath,
    'scripts/prepare-viral-journey-manual-evidence.mjs',
    '--dry-run',
    '--out',
    options.outPath
  ], 'Viral journey manual evidence dry-run');
  assertCommandOk(dryRunResult);
  printBlock('Ignored Local Draft Dry Run', dryRunResult.combinedOutput);

  const checkResult = runCommand([
    process.execPath,
    'scripts/check-viral-journey-manual-evidence.mjs'
  ], 'Existing viral journey manual evidence scan');
  assertCommandOk(checkResult);
  printBlock('Existing Ignored Local Evidence Scan', checkResult.combinedOutput);

  printJourneyPackage(readExampleJourneys());
  printNextSteps({ options, portStatus, smokeStatus });

  console.log('');
  console.log('Reminder: this is not UI passed evidence and does not prove WeChat DevTools or real-device passed.');

  if (options.strict && (portStatus !== 'ready' || smokeStatus !== 'ready')) {
    console.error(`Strict mode: port status is ${portStatus} and smoke access status is ${smokeStatus}; expected both ready.`);
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
