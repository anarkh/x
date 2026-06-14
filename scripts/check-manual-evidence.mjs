import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultResultsPath = join(rootDir, 'harness/manual-test-results.example.json');
const resultsPath = process.argv[2]
  ? isAbsolute(process.argv[2])
    ? process.argv[2]
    : resolve(rootDir, process.argv[2])
  : defaultResultsPath;

const allowedStatuses = new Set(['passed', 'failed', 'blocked', 'not_covered']);
const requiredTopLevelFields = [
  'schemaVersion',
  'branch',
  'commit',
  'testedAt',
  'tester',
  'environment',
  'summary',
  'journeys'
];
const requiredJourneyFields = [
  'id',
  'title',
  'status',
  'steps',
  'expected',
  'actual',
  'evidence',
  'risks',
  'followUp'
];

// Keep these aliases explicit so the example schema can use readable field names
// while this gate still gives clear failures for each required evidence category.
const environmentGroups = [
  {
    label: 'DevTools version or state',
    fields: [
      'devTools',
      'devtools',
      'devToolsVersion',
      'devtoolsVersion',
      'wechatDevTools',
      'wechatDevToolsVersion'
    ]
  },
  {
    label: 'WeChat base library version',
    fields: ['baseLibrary', 'baseLibraryVersion', 'sdkVersion', 'wechatBaseLibrary']
  },
  {
    label: 'device or simulator information',
    fields: ['device', 'deviceModel', 'deviceInfo', 'platform', 'os']
  },
  {
    label: 'network condition',
    fields: ['network', 'networkStatus', 'networkType']
  },
  {
    label: 'location permission or mode',
    fields: ['location', 'locationStatus', 'locationMode', 'locationPermission']
  },
  {
    label: 'cloud/backend status',
    fields: ['cloud', 'cloudStatus', 'cloudEnvironment', 'backendStatus', 'cloudBase']
  }
];

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

function isConcrete(value) {
  if (!isNonEmpty(value)) {
    return false;
  }

  if (typeof value === 'string') {
    return !value.trim().startsWith('<replace-with-');
  }

  return true;
}

function hasEnvironmentGroup(environment, group) {
  return group.fields.some((field) => hasOwn(environment, field) && isNonEmpty(environment[field]));
}

function hasConcreteEnvironmentGroup(environment, group) {
  return group.fields.some((field) => hasOwn(environment, field) && isConcrete(environment[field]));
}

function readResults(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse manual evidence JSON at ${filePath}: ${error.message}`);
  }
}

function validateTopLevel(results, errors) {
  for (const field of requiredTopLevelFields) {
    if (!hasOwn(results, field) || !isNonEmpty(results[field])) {
      errors.push(`Missing required top-level field: ${field}`);
    }
  }

  if (hasOwn(results, 'environment') && !isPlainObject(results.environment)) {
    errors.push('Top-level environment must be an object.');
  }

  if (hasOwn(results, 'journeys') && !Array.isArray(results.journeys)) {
    errors.push('Top-level journeys must be an array.');
  }
}

function validateEnvironment(environment, errors) {
  if (!isPlainObject(environment)) {
    return;
  }

  for (const group of environmentGroups) {
    if (!hasEnvironmentGroup(environment, group)) {
      errors.push(
        `environment must include ${group.label}. Expected one of: ${group.fields.join(', ')}`
      );
    }
  }
}

function validateJourney(journey, index, environment, errors) {
  const label = isPlainObject(journey) && isNonEmpty(journey.id)
    ? `journey ${journey.id}`
    : `journey at index ${index}`;

  if (!isPlainObject(journey)) {
    errors.push(`${label} must be an object.`);
    return;
  }

  for (const field of requiredJourneyFields) {
    if (!hasOwn(journey, field)) {
      errors.push(`${label} is missing required field: ${field}`);
    }
  }

  if (!allowedStatuses.has(journey.status)) {
    errors.push(
      `${label} has invalid status "${journey.status}". Allowed: ${[...allowedStatuses].join(', ')}`
    );
    return;
  }

  if (journey.status === 'passed') {
    if (!isNonEmpty(journey.evidence)) {
      errors.push(`${label} is passed but evidence is empty.`);
    }

    if (!isNonEmpty(journey.actual)) {
      errors.push(`${label} is passed but actual is empty.`);
    }

    if (!isNonEmpty(journey.steps)) {
      errors.push(`${label} is passed but steps is empty.`);
    }

    const hasSpecificRunInfo =
      isPlainObject(environment) &&
      (hasConcreteEnvironmentGroup(environment, environmentGroups[0]) ||
        hasConcreteEnvironmentGroup(environment, environmentGroups[2]));

    if (!hasSpecificRunInfo) {
      errors.push(`${label} is passed but environment lacks concrete DevTools or device information.`);
    }
  }

  if (journey.status === 'failed') {
    if (!isNonEmpty(journey.actual)) {
      errors.push(`${label} is failed but actual is empty.`);
    }

    if (!isNonEmpty(journey.followUp)) {
      errors.push(`${label} is failed but followUp is empty.`);
    }
  }

  if (journey.status === 'blocked' && !isNonEmpty(journey.risks) && !isNonEmpty(journey.followUp)) {
    errors.push(`${label} is blocked but both risks and followUp are empty.`);
  }
}

const results = readResults(resultsPath);
const errors = [];

if (!isPlainObject(results)) {
  errors.push('Manual evidence JSON must contain a top-level object.');
} else {
  validateTopLevel(results, errors);
  validateEnvironment(results.environment, errors);

  if (Array.isArray(results.journeys)) {
    results.journeys.forEach((journey, index) => {
      validateJourney(journey, index, results.environment, errors);
    });
  }
}

if (errors.length > 0) {
  console.error(`Manual evidence checks failed for ${resultsPath}:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Manual evidence checks passed.');
