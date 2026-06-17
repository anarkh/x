import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPort = 9420;
const examplePath = join(rootDir, 'harness/viral-journey-manual-results.example.json');
const acReadyStatus = 'ready_for_manual_journey';
const readyStatus = 'ready_to_execute_manual_journey';
const notReadyStatus = 'not_ready_for_manual_journey';
const exactNotClaimed = 'no DevTools UI journey passed; no real-device journey passed; no viral journey passed';
const uiServicePortStates = new Set(['enabled', 'disabled', 'not_found', 'unavailable', 'not_confirmed']);
const uiPortStates = new Set(['matches_9420', 'mismatch', 'unconfirmed']);
const allowedAcStatuses = new Set([
  'pre_manual_confirmation',
  'blocked_config_disabled',
  'blocked_port_mismatch',
  'blocked_no_listener',
  'blocked_smoke_access',
  'ready_for_manual_journey',
  'unknown'
]);
const sideEffectDenylist = [
  'quit',
  'open',
  'preview',
  'upload',
  'kill',
  'cache',
  'settings mutation',
  'UI automation'
];
const baseEvidenceFields = [
  'status',
  'actual',
  'evidence[].type',
  'evidence[].description',
  'evidence[].path|url|value|details',
  'risks',
  'followUp'
];
const sharePayloadJourneyIds = new Set([
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source'
]);

function usage() {
  return [
    'Usage: node scripts/prepare-viral-journey-evidence-packet.mjs --project <path> --port <number> --ui-service-port-state <state> --ui-port-state <state> [--strict]',
    '',
    `ui service port state: ${[...uiServicePortStates].join('|')}`,
    `ui port state: ${[...uiPortStates].join('|')}`,
    '',
    'Builds a read-only viral manual journey evidence packet from AC readiness status.',
    'No files are written and no DevTools UI, process, cache, preview, upload, or settings mutation is performed.'
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

function combinedOutput(result) {
  return [result.stdout || '', result.stderr || ''].filter(Boolean).join('\n');
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

function runAcConfirmation(options) {
  const args = [
    'scripts/prepare-devtools-ui-confirmation-run.mjs',
    '--project',
    options.projectPath,
    '--port',
    String(options.port),
    '--ui-service-port-state',
    options.uiServicePortState,
    '--ui-port-state',
    options.uiPortState
  ];

  if (options.strict) {
    args.push('--strict');
  }

  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: 90000,
    maxBuffer: 8 * 1024 * 1024
  });

  return {
    exitCode: safeExitCode(result),
    output: combinedOutput(result)
  };
}

function matchLine(output, pattern, fallback = 'unknown') {
  const match = pattern.exec(output);

  return match ? redactForSafety(match[1].trim()) : fallback;
}

function parseAcSummary(command) {
  const output = command.output;
  const acStatus = matchLine(output, /^status:\s*([a-z0-9_]+)\s*$/m);
  const nextStep = matchLine(
    output,
    /^nextStep:\s*([^\n\r]*)$/m,
    '完成 AC DevTools Service Port UI confirmation 只读复核后再生成 manual journey evidence packet。'
  );
  const acNotClaimed = matchLine(output, /^notClaimed:\s*([^\n\r]*)$/m, '');

  if (!allowedAcStatuses.has(acStatus)) {
    return {
      acStatus: 'unknown',
      acExitCode: command.exitCode,
      acNextStep: 'AC status 无法解析；复跑 AC UI confirmation 只读复核并保持 raw output 不进证据包。',
      acNotClaimed
    };
  }

  return {
    acStatus,
    acExitCode: command.exitCode,
    acNextStep: nextStep,
    acNotClaimed
  };
}

function readManualJourneys() {
  const example = JSON.parse(readFileSync(examplePath, 'utf8'));

  if (!Array.isArray(example.journeys)) {
    throw new Error('Manual journey example JSON must contain journeys array.');
  }

  if (example.journeys.length !== 7) {
    throw new Error(`Expected exactly seven viral manual journeys, found ${example.journeys.length}.`);
  }

  return example.journeys.map((journey) => ({
    id: journey.id,
    title: journey.title,
    route: journey.route,
    keyEvidenceFields: evidenceFieldsForJourney(journey.id),
    payloadChecks: payloadChecksForJourney(journey.id)
  }));
}

function evidenceFieldsForJourney(journeyId) {
  if (journeyId === 'timeline-share-channel') {
    return [
      ...baseEvidenceFields,
      'timelineMenuInspection',
      'timelinePayload.title',
      'timelinePayload.query|path',
      'timelinePayload.imageUrl|imageInspectionNote',
      'singlePageFirstScreenObservation'
    ];
  }

  if (journeyId === 'timeline-risk-gating') {
    return [
      ...baseEvidenceFields,
      'timelineMenuInspection',
      'riskFixtureStatus',
      'staleCount|reportCount',
      'cautiousCopyObservation'
    ];
  }

  if (sharePayloadJourneyIds.has(journeyId)) {
    return [
      ...baseEvidenceFields,
      'sharePayload.path',
      'sharePayloadInspection'
    ];
  }

  return baseEvidenceFields;
}

function payloadChecksForJourney(journeyId) {
  if (journeyId === 'receiver-confirm-conversion') {
    return [
      'sharePayload.path includes from=share&source=receiver&receiverAction=confirm when inspectable',
      'relay attribution includes share_id, parent_share_id, and share_depth=2 or 2_plus when inspectable',
      'otherwise record a concrete sharePayloadInspection inability reason'
    ];
  }

  if (journeyId === 'receiver-comment-conversion') {
    return [
      'sharePayload.path includes from=share&source=receiver&receiverAction=comment when inspectable',
      'relay attribution includes share_id, parent_share_id, and share_depth=2 or 2_plus when inspectable',
      'otherwise record a concrete sharePayloadInspection inability reason'
    ];
  }

  if (journeyId === 'second-hop-receiver-source') {
    return [
      'sharePayload.path includes from=share&source=receiver when inspectable',
      'receiverAction is confirm or comment when present',
      'otherwise record a concrete sharePayloadInspection inability reason'
    ];
  }

  if (journeyId === 'timeline-share-channel') {
    return [
      'real system menu shows both friend share and share-to-timeline',
      'timelinePayload query includes id, from=share, source=timeline, and shareChannel=timeline when inspectable',
      'record title and imageUrl/image inspection, or a concrete timelinePayloadInspection inability reason',
      'timeline landing first screen keeps task/source context readable'
    ];
  }

  if (journeyId === 'timeline-risk-gating') {
    return [
      'record observed shareTimeline/timeline menu absence for every risk or closed fixture',
      'if menu/payload cannot be inspected, keep the journey blocked and record the concrete blocker',
      'any inspectable timeline title/copy stays cautious and avoids encouraging broad spread'
    ];
  }

  return [
    'no share/timeline payload required; record concrete UI observations in actual and evidence[]'
  ];
}

function printBlockedPacket({ options, ac }) {
  console.log('Viral manual journey evidence packet');
  console.log('project: <repo-worktree>');
  console.log(`targetPort: ${options.port}`);
  console.log(`strict: ${options.strict ? 'yes' : 'no'}`);
  console.log(`status: ${notReadyStatus}`);
  console.log('packetStatus: not_ready');
  console.log(`acStatus: ${ac.acStatus}`);
  console.log(`acExitCode: ${ac.acExitCode}`);
  console.log(`acNextStep: ${ac.acNextStep}`);
  console.log('nextStep: resolve the AC UI confirmation blocker first; do not execute or record the viral manual journey packet yet.');
  console.log(`notClaimed: ${exactNotClaimed}`);
  console.log('reminder: no packet journey evidence is emitted while AC status is not ready_for_manual_journey.');
  console.log(`safety: no ${sideEffectDenylist.join(', ')}; raw child stdout/stderr, local paths, raw config/logs, token/cookie/session/openid are suppressed`);
}

function printReadyPacket({ options, ac, journeys }) {
  console.log('Viral manual journey evidence packet');
  console.log('project: <repo-worktree>');
  console.log(`targetPort: ${options.port}`);
  console.log(`strict: ${options.strict ? 'yes' : 'no'}`);
  console.log(`status: ${readyStatus}`);
  console.log('packetStatus: ready_to_execute');
  console.log(`acStatus: ${ac.acStatus}`);
  console.log(`acExitCode: ${ac.acExitCode}`);
  console.log(`acNextStep: ${ac.acNextStep}`);
  console.log(`journeyCount: ${journeys.length}`);
  console.log(`notClaimed: ${exactNotClaimed}`);
  console.log('reminder: after real DevTools or real-device observations, fill an ignored local evidence JSON and run node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <local-json>.');
  console.log(`safety: no ${sideEffectDenylist.join(', ')}; raw child stdout/stderr, local paths, raw config/logs, token/cookie/session/openid are suppressed`);
  console.log('');
  console.log('manualJourneys:');

  journeys.forEach((journey, index) => {
    console.log(`${index + 1}. id: ${journey.id}`);
    console.log(`   title: ${journey.title}`);
    console.log(`   route: ${journey.route}`);
    console.log(`   key evidence fields: ${journey.keyEvidenceFields.join(', ')}`);
    console.log(`   payload checks: ${journey.payloadChecks.join('; ')}`);
  });
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const acCommand = runAcConfirmation(options);
  const ac = parseAcSummary(acCommand);
  const isReady = ac.acStatus === acReadyStatus;

  if (!isReady) {
    printBlockedPacket({ options, ac });
    process.exit(options.strict ? 1 : 0);
  }

  printReadyPacket({ options, ac, journeys: readManualJourneys() });
  process.exit(0);
} catch (error) {
  console.error(redactForSafety(error.message));
  console.error('');
  console.error(usage());
  process.exit(1);
}
