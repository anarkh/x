import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const examplePath = join(rootDir, 'harness/viral-journey-manual-results.example.json');
const defaultOutPath = join(rootDir, 'harness/manual-test-results.local-viral-journey.json');
const schemaVersion = 'viral-journey-manual-results.v1';
const outputPattern = /^harness\/manual-test-results\.local-viral-journey.*\.json$/;

function usage() {
  return [
    'Usage: node scripts/prepare-viral-journey-manual-evidence.mjs [--out <path>] [--force] [--dry-run]',
    '',
    'Creates an ignored local blocked draft for viral journey manual evidence.',
    'The draft is not UI passed evidence and does not contain passed journeys.'
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    outPath: defaultOutPath,
    force: false,
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--out') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error('--out requires a path value.');
      }

      options.outPath = isAbsolute(value) ? value : resolve(rootDir, value);
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function runTextCommand(args, label) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : '';
    const stdout = result.stdout ? `\n${result.stdout.trim()}` : '';
    throw new Error(`${label} failed.${stderr}${stdout}`);
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

function assertIgnoredOutputPath(outPath) {
  const relativeOut = projectRelativePath(outPath);

  if (relativeOut.startsWith('..') || isAbsolute(relativeOut) || !outputPattern.test(relativeOut)) {
    throw new Error(`Output must match the ignored viral journey local result pattern: harness/manual-test-results.local-viral-journey*.json. Got: ${relativeOut}`);
  }

  if (!isGitIgnored(outPath)) {
    throw new Error(`Output is not ignored by git: ${relativeOut}. Use the default ignored path or add a local git exclude before writing.`);
  }
}

function readExampleResults() {
  try {
    return JSON.parse(readFileSync(examplePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${examplePath}: ${error.message}`);
  }
}

function prepareEnvironment() {
  return {
    wechatDevToolsVersion: 'not recorded for blocked draft',
    baseLibraryVersion: 'not recorded for blocked draft',
    device: 'not selected for blocked draft',
    isRealDevice: false,
    network: 'not recorded for blocked draft',
    cloudBase: {
      enabled: false,
      environmentId: 'none for blocked draft',
      postsFunctionDeployed: false,
      notes: 'Local draft only; replace with the actual CloudBase state after a real run.'
    },
    dataSetup: {
      activeLowRiskPostId: 'not selected for blocked draft',
      staleSignalPostId: 'none selected for blocked draft',
      reportSignalPostId: 'none selected for blocked draft',
      closedPostIds: {
        stale: 'none selected for blocked draft',
        resolved: 'none selected for blocked draft',
        expired: 'none selected for blocked draft',
        hidden: 'none selected for blocked draft'
      },
      notes: 'Local draft only; replace with real post ids and fixture notes after manual setup.'
    }
  };
}

function blockedJourneyFromExample(journey) {
  return {
    ...journey,
    status: 'blocked',
    route: journey.route === 'multiple'
      ? 'multiple; fixtures not selected for blocked draft'
      : String(journey.route).replaceAll('<activeLowRiskPostId>', 'blocked-draft-active-post'),
    actual: 'Blocked draft only; the manual viral journey has not been completed.',
    evidence: [],
    blocker: 'Manual viral journey run has not been completed for this local draft.',
    risks: [
      ...(Array.isArray(journey.risks) ? journey.risks : []),
      'This blocked draft is not DevTools or real-device UI passed evidence.'
    ],
    followUp: 'Open WeChat DevTools or a real device, run this journey with real post ids, replace actual/evidence/blocker fields, and rerun the viral manual evidence checker.'
  };
}

function prepareResults() {
  const example = readExampleResults();

  return {
    schemaVersion,
    branch: runTextCommand(['git', 'branch', '--show-current'], 'git branch --show-current'),
    commit: runTextCommand(['git', 'rev-parse', '--short', 'HEAD'], 'git rev-parse --short HEAD'),
    testedAt: new Date().toISOString(),
    tester: 'local-draft',
    environment: prepareEnvironment(),
    summary: {
      overallStatus: 'blocked',
      recommendation: 'Blocked local draft only. Do not treat this as UI passed evidence; replace with real DevTools or real-device observations after manual execution.',
      notes: [
        'All journeys start as blocked draft entries so no journey claims passed.',
        'Real passed status requires screenshot, recording, payload, or log evidence plus concrete actual observations.',
        'Do not commit this ignored local JSON.'
      ]
    },
    journeys: example.journeys.map((journey) => blockedJourneyFromExample(journey))
  };
}

function writeResults(outPath, results, force) {
  if (existsSync(outPath) && !force) {
    throw new Error(`Refusing to overwrite existing output file: ${outPath}\nUse --force to replace it.`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
}

function runGate(scriptPath, extraArgs = []) {
  const result = spawnSync(process.execPath, ['--no-warnings', scriptPath, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Gate failed: node --no-warnings ${[scriptPath, ...extraArgs].join(' ')}`);
  }
}

function printNextSteps(outPath) {
  const relativeOut = projectRelativePath(outPath);

  console.log('');
  console.log('Next steps:');
  console.log(`1. Open this worktree in WeChat DevTools: ${rootDir}`);
  console.log(`2. Replace blocked draft fields in ${relativeOut} with real route, environment, actual, evidence, and share payload observations.`);
  console.log(`3. Re-run: node --no-warnings scripts/check-viral-journey-manual-evidence.mjs ${relativeOut}`);
  console.log('4. Re-run: node --no-warnings scripts/check-devtools-readiness.mjs');
  console.log('5. Do not commit the ignored local JSON or any raw screenshots/recordings/logs.');
}

try {
  const { outPath, force, dryRun } = parseArgs(process.argv.slice(2));
  assertIgnoredOutputPath(outPath);

  const results = prepareResults();
  const relativeOut = projectRelativePath(outPath);

  if (dryRun) {
    console.log(`Dry run: would create ignored blocked viral journey manual evidence draft at ${relativeOut}.`);
    console.log(`Draft branch/commit would be ${results.branch}@${results.commit}.`);
    console.log('Dry run wrote no files and does not claim DevTools or real-device UI passed.');
    printNextSteps(outPath);
    process.exit(0);
  }

  writeResults(outPath, results, force);
  runGate('scripts/check-viral-journey-manual-evidence.mjs', [relativeOut]);

  console.log('');
  console.log(`Viral journey manual evidence draft created: ${relativeOut}`);
  console.log('This blocked draft is not UI passed evidence and contains no passed journeys.');
  printNextSteps(outPath);
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
