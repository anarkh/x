import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const harnessDir = join(rootDir, 'harness');
const exampleRelativePath = 'harness/viral-journey-manual-results.example.json';
const schemaVersion = 'viral-journey-manual-results.v1';
const allowedStatuses = new Set(['passed', 'failed', 'blocked']);
const evidenceTypes = new Set(['screenshot', 'recording', 'payload', 'log']);
const requiredJourneyIds = [
  'first-hop-share-entry',
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source',
  'ordinary-and-risk-entries'
];
const sharePayloadRequiredJourneyIds = new Set([
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source'
]);
const localResultFilePatterns = [
  /^manual-test-results\.local-viral-journey.*\.json$/,
  /^local-viral-journey-results.*\.json$/
];
const placeholderPatterns = [
  /<replace-with-/i,
  /\bnot_run\b/i,
  /\bnot run\b/i,
  /\bplaceholder\b/i,
  /\bTODO\b/i,
  /待填写/,
  /占位/,
  /未执行/,
  /未运行/
];

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmpty(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }

  return value !== null && value !== undefined;
}

function hasPlaceholderText(value) {
  if (typeof value === 'string') {
    return placeholderPatterns.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasPlaceholderText(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((item) => hasPlaceholderText(item));
  }

  return false;
}

function isConcrete(value) {
  return isNonEmpty(value) && !hasPlaceholderText(value);
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse JSON: ${error.message}`);
  }
}

function runGit(args, label) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? ` ${result.stderr.trim()}` : '';
    throw new Error(`${label} failed.${stderr}`);
  }

  return result.stdout.trim();
}

function isGitIgnored(filePath) {
  const relativePath = projectRelativePath(filePath);
  const result = spawnSync('git', ['check-ignore', '-q', '--', relativePath], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  return result.status === 0;
}

function isExampleFile(filePath) {
  return projectRelativePath(filePath) === exampleRelativePath ||
    basename(filePath) === 'viral-journey-manual-results.example.json';
}

function assertInsideHarness(filePath) {
  const relativePath = projectRelativePath(filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !relativePath.startsWith('harness/')) {
    throw new Error(`Manual evidence file must live under harness/: ${relativePath}`);
  }
}

function discoverLocalEvidenceFiles() {
  if (!existsSync(harnessDir)) {
    return { files: [], unignored: [] };
  }

  const matches = readdirSync(harnessDir)
    .filter((name) => localResultFilePatterns.some((pattern) => pattern.test(name)))
    .map((name) => join(harnessDir, name))
    .filter((filePath) => !isExampleFile(filePath));

  const files = [];
  const unignored = [];

  for (const filePath of matches) {
    if (isGitIgnored(filePath)) {
      files.push(filePath);
    } else {
      unignored.push(filePath);
    }
  }

  return { files, unignored };
}

function resolveExplicitFiles(argv) {
  return argv.map((arg) => (isAbsolute(arg) ? arg : resolve(rootDir, arg)));
}

function validateConcreteField(object, field, label, errors) {
  if (!hasOwn(object, field) || !isConcrete(object[field])) {
    errors.push(`${label} must include concrete ${field}.`);
  }
}

function validateBranchAndCommit(results, errors) {
  const currentBranch = runGit(['branch', '--show-current'], 'git branch --show-current');
  const fullCommit = runGit(['rev-parse', 'HEAD'], 'git rev-parse HEAD');
  const shortCommit = runGit(['rev-parse', '--short', 'HEAD'], 'git rev-parse --short HEAD');

  if (results.branch !== currentBranch) {
    errors.push(`branch must match current branch "${currentBranch}", got "${results.branch}".`);
  }

  if (results.commit !== fullCommit && results.commit !== shortCommit) {
    errors.push(`commit must match current HEAD "${fullCommit}" or "${shortCommit}", got "${results.commit}".`);
  }
}

function validateEnvironment(environment, errors) {
  if (!isPlainObject(environment)) {
    errors.push('environment must be an object.');
    return;
  }

  for (const field of ['wechatDevToolsVersion', 'baseLibraryVersion', 'device', 'network']) {
    validateConcreteField(environment, field, 'environment', errors);
  }

  if (typeof environment.isRealDevice !== 'boolean') {
    errors.push('environment.isRealDevice must be a boolean.');
  }

  if (!isPlainObject(environment.cloudBase)) {
    errors.push('environment.cloudBase must be an object.');
  } else {
    if (typeof environment.cloudBase.enabled !== 'boolean') {
      errors.push('environment.cloudBase.enabled must be a boolean.');
    }

    if (typeof environment.cloudBase.postsFunctionDeployed !== 'boolean') {
      errors.push('environment.cloudBase.postsFunctionDeployed must be a boolean.');
    }

    validateConcreteField(environment.cloudBase, 'environmentId', 'environment.cloudBase', errors);
    validateConcreteField(environment.cloudBase, 'notes', 'environment.cloudBase', errors);
  }

  if (!isPlainObject(environment.dataSetup)) {
    errors.push('environment.dataSetup must be an object.');
  } else {
    for (const field of ['activeLowRiskPostId', 'staleSignalPostId', 'reportSignalPostId', 'notes']) {
      validateConcreteField(environment.dataSetup, field, 'environment.dataSetup', errors);
    }

    if (!isPlainObject(environment.dataSetup.closedPostIds)) {
      errors.push('environment.dataSetup.closedPostIds must be an object.');
    } else {
      for (const field of ['stale', 'resolved', 'expired', 'hidden']) {
        validateConcreteField(environment.dataSetup.closedPostIds, field, 'environment.dataSetup.closedPostIds', errors);
      }
    }
  }
}

function validateRequiredJourneys(journeys, errors) {
  const counts = new Map();

  for (const journey of journeys) {
    if (isPlainObject(journey) && isNonEmpty(journey.id)) {
      counts.set(journey.id, (counts.get(journey.id) || 0) + 1);
    }
  }

  for (const [journeyId, count] of counts) {
    if (count > 1) {
      errors.push(`Duplicate journey id: ${journeyId}.`);
    }
  }

  for (const requiredJourneyId of requiredJourneyIds) {
    const count = counts.get(requiredJourneyId) || 0;

    if (count === 0) {
      errors.push(`Missing required journey id: ${requiredJourneyId}.`);
    }

    if (count > 1) {
      errors.push(`Expected exactly one required journey id: ${requiredJourneyId}; found ${count}.`);
    }
  }
}

function validateEvidenceItem(item, label, errors) {
  if (!isPlainObject(item)) {
    errors.push(`${label} evidence item must be an object.`);
    return;
  }

  if (!evidenceTypes.has(item.type)) {
    errors.push(`${label} evidence item has invalid type "${item.type}". Allowed: ${[...evidenceTypes].join(', ')}.`);
  }

  validateConcreteField(item, 'description', `${label} evidence item`, errors);

  const hasConcreteValue = ['path', 'url', 'value', 'details'].some((field) => hasOwn(item, field) && isConcrete(item[field]));
  if (!hasConcreteValue) {
    errors.push(`${label} evidence item must include concrete path, url, value, or details.`);
  }
}

function hasQueryValue(path, key, value) {
  const query = String(path || '').split('?')[1] || '';
  return new URLSearchParams(query).get(key) === value;
}

function getQueryValue(path, key) {
  const query = String(path || '').split('?')[1] || '';
  return new URLSearchParams(query).get(key) || '';
}

function validateSharePayload(journey, label, errors) {
  if (isPlainObject(journey.sharePayload)) {
    validateConcreteField(journey.sharePayload, 'path', `${label}.sharePayload`, errors);
    const payloadPath = journey.sharePayload.path;

    if (
      sharePayloadRequiredJourneyIds.has(journey.id) &&
      typeof payloadPath === 'string' &&
      (!hasQueryValue(payloadPath, 'from', 'share') || !hasQueryValue(payloadPath, 'source', 'receiver'))
    ) {
      errors.push(`${label}.sharePayload.path must include from=share and source=receiver query values.`);
    }

    const requiredReceiverAction = journey.id === 'receiver-confirm-conversion'
      ? 'confirm'
      : (journey.id === 'receiver-comment-conversion' ? 'comment' : '');
    if (
      requiredReceiverAction &&
      typeof payloadPath === 'string' &&
      !hasQueryValue(payloadPath, 'receiverAction', requiredReceiverAction)
    ) {
      errors.push(`${label}.sharePayload.path must include receiverAction=${requiredReceiverAction}.`);
    }

    const receiverAction = typeof payloadPath === 'string' ? getQueryValue(payloadPath, 'receiverAction') : '';
    if (journey.id === 'second-hop-receiver-source' && receiverAction && !['confirm', 'comment'].includes(receiverAction)) {
      errors.push(`${label}.sharePayload.path must not use an unsupported receiverAction.`);
    }

    return;
  }

  const inspection = journey.sharePayloadInspection;
  const explicitlyUnableToInspect =
    typeof inspection === 'string' &&
    isConcrete(inspection) &&
    /(无法|不能|不可|未能|unable|cannot|could not|not exposed|unavailable)/i.test(inspection);

  if (!explicitlyUnableToInspect) {
    errors.push(`${label} is passed but lacks sharePayload or an explicit sharePayloadInspection inability note.`);
  }
}

function validateJourney(journey, index, errors) {
  const label = isPlainObject(journey) && isNonEmpty(journey.id)
    ? `journey ${journey.id}`
    : `journey at index ${index}`;

  if (!isPlainObject(journey)) {
    errors.push(`${label} must be an object.`);
    return;
  }

  for (const field of ['id', 'title', 'status', 'route', 'steps', 'expected', 'actual', 'evidence', 'risks', 'followUp']) {
    if (!hasOwn(journey, field)) {
      errors.push(`${label} is missing required field: ${field}.`);
    }
  }

  for (const field of ['id', 'title', 'route']) {
    validateConcreteField(journey, field, label, errors);
  }

  if (!Array.isArray(journey.steps) || journey.steps.length === 0 || hasPlaceholderText(journey.steps)) {
    errors.push(`${label}.steps must be a non-empty array without placeholder text.`);
  }

  if (!Array.isArray(journey.expected) || journey.expected.length === 0 || hasPlaceholderText(journey.expected)) {
    errors.push(`${label}.expected must be a non-empty array without placeholder text.`);
  }

  if (!Array.isArray(journey.evidence)) {
    errors.push(`${label}.evidence must be an array.`);
  }

  if (!allowedStatuses.has(journey.status)) {
    errors.push(`${label} has invalid status "${journey.status}". Allowed: ${[...allowedStatuses].join(', ')}.`);
    return;
  }

  if (journey.status === 'passed') {
    if (!isConcrete(journey.actual)) {
      errors.push(`${label} is passed but actual is empty or placeholder text.`);
    }

    if (!Array.isArray(journey.evidence) || journey.evidence.length === 0) {
      errors.push(`${label} is passed but evidence is empty.`);
    } else {
      journey.evidence.forEach((item, itemIndex) => {
        validateEvidenceItem(item, `${label} evidence[${itemIndex}]`, errors);
      });
    }

    if (sharePayloadRequiredJourneyIds.has(journey.id)) {
      validateSharePayload(journey, label, errors);
    }
  }

  if (journey.status === 'failed') {
    if (!isConcrete(journey.actual)) {
      errors.push(`${label} is failed but actual is empty or placeholder text.`);
    }

    if (!isConcrete(journey.followUp)) {
      errors.push(`${label} is failed but followUp is empty or placeholder text.`);
    }
  }

  if (journey.status === 'blocked') {
    if (!isConcrete(journey.blocker)) {
      errors.push(`${label} is blocked but blocker is empty or placeholder text.`);
    }

    if (!isConcrete(journey.followUp)) {
      errors.push(`${label} is blocked but followUp is empty or placeholder text.`);
    }
  }
}

function aggregateStatus(journeys) {
  if (journeys.some((journey) => journey.status === 'failed')) {
    return 'failed';
  }

  if (journeys.some((journey) => journey.status === 'blocked')) {
    return 'blocked';
  }

  if (requiredJourneyIds.every((journeyId) => journeys.some((journey) => journey.id === journeyId && journey.status === 'passed'))) {
    return 'passed';
  }

  return 'blocked';
}

function validateSummary(summary, journeys, errors) {
  if (!isPlainObject(summary)) {
    errors.push('summary must be an object.');
    return;
  }

  if (!allowedStatuses.has(summary.overallStatus)) {
    errors.push(`summary.overallStatus has invalid status "${summary.overallStatus}". Allowed: ${[...allowedStatuses].join(', ')}.`);
    return;
  }

  const expectedOverallStatus = aggregateStatus(journeys);
  if (summary.overallStatus !== expectedOverallStatus) {
    errors.push(`summary.overallStatus must be "${expectedOverallStatus}" based on journey statuses, got "${summary.overallStatus}".`);
  }
}

function validateResults(filePath) {
  const errors = [];
  const relativePath = projectRelativePath(filePath);

  if (isExampleFile(filePath)) {
    errors.push(`${exampleRelativePath} is an example template and cannot be used as real manual evidence.`);
    return { relativePath, errors, overallStatus: 'invalid' };
  }

  try {
    assertInsideHarness(filePath);
  } catch (error) {
    errors.push(error.message);
  }

  if (!isGitIgnored(filePath)) {
    errors.push(`${relativePath} must be ignored/local before it can be used as viral journey manual evidence.`);
  }

  if (!existsSync(filePath)) {
    errors.push(`Manual evidence file does not exist: ${relativePath}`);
    return { relativePath, errors, overallStatus: 'invalid' };
  }

  let results;
  try {
    results = readJson(filePath);
  } catch (error) {
    errors.push(error.message);
    return { relativePath, errors, overallStatus: 'invalid' };
  }

  if (!isPlainObject(results)) {
    errors.push('Manual evidence JSON must contain a top-level object.');
    return { relativePath, errors, overallStatus: 'invalid' };
  }

  for (const field of ['schemaVersion', 'branch', 'commit', 'testedAt', 'tester', 'environment', 'summary', 'journeys']) {
    if (!hasOwn(results, field)) {
      errors.push(`Missing required top-level field: ${field}.`);
    }
  }

  if (results.schemaVersion !== schemaVersion) {
    errors.push(`schemaVersion must be "${schemaVersion}", got "${results.schemaVersion}".`);
  }

  for (const field of ['branch', 'commit', 'testedAt', 'tester']) {
    validateConcreteField(results, field, 'top-level results', errors);
  }

  if (hasOwn(results, 'testedAt') && Number.isNaN(Date.parse(results.testedAt))) {
    errors.push('testedAt must be an ISO-8601-compatible timestamp.');
  }

  if (hasOwn(results, 'branch') && hasOwn(results, 'commit')) {
    validateBranchAndCommit(results, errors);
  }

  validateEnvironment(results.environment, errors);

  if (!Array.isArray(results.journeys)) {
    errors.push('journeys must be an array.');
  } else {
    validateRequiredJourneys(results.journeys, errors);
    results.journeys.forEach((journey, index) => validateJourney(journey, index, errors));
    validateSummary(results.summary, results.journeys, errors);
  }

  return {
    relativePath,
    errors,
    overallStatus: isPlainObject(results.summary) ? results.summary.overallStatus : 'invalid'
  };
}

function printUsage() {
  console.log('Usage: node scripts/check-viral-journey-manual-evidence.mjs [harness/manual-test-results.local-viral-journey*.json ...]');
  console.log('Without explicit files, scans ignored local viral journey result files only.');
}

try {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const explicitFiles = resolveExplicitFiles(argv);
  const discovered = explicitFiles.length > 0
    ? { files: explicitFiles, unignored: [] }
    : discoverLocalEvidenceFiles();

  if (discovered.unignored.length > 0) {
    console.error('Viral journey manual evidence files must be ignored/local before readiness will scan them:');
    for (const filePath of discovered.unignored) {
      console.error(`- ${projectRelativePath(filePath)}`);
    }
    console.error('Use an ignored path such as harness/manual-test-results.local-viral-journey.json, or add a local git exclude before using harness/local-viral-journey-results*.json.');
    process.exit(1);
  }

  if (discovered.files.length === 0) {
    console.log('No viral journey manual evidence files found; nothing checked.');
    console.log('This is not UI passed evidence and does not mean DevTools or real-device UI passed.');
    process.exit(0);
  }

  const results = discovered.files.map((filePath) => validateResults(filePath));
  const failures = results.filter((result) => result.errors.length > 0);

  if (failures.length > 0) {
    console.error('Viral journey manual evidence checks failed:');
    for (const failure of failures) {
      console.error(`\n${failure.relativePath}`);
      for (const error of failure.errors) {
        console.error(`- ${error}`);
      }
    }
    process.exit(1);
  }

  for (const result of results) {
    console.log(`Checked viral journey manual evidence: ${result.relativePath} (overallStatus=${result.overallStatus}).`);
  }
  console.log('Viral journey manual evidence checks passed. This validates ignored local result files only; review attached UI evidence before treating any journey as UI passed.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
