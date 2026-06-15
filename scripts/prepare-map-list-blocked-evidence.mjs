import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultOutPath = join(rootDir, 'harness/manual-test-results.local-map-list-blocked.json');
const examplePath = join(rootDir, 'harness/manual-test-results.example.json');
const targetJourneyId = 'map-list-visual-smoke';

function usage() {
  return [
    'Usage: node scripts/prepare-map-list-blocked-evidence.mjs --reason <blocked-reason> [--out <path>] [--force]',
    '',
    'Creates an ignored local blocked draft for the map-list visual smoke journey.',
    'This records an environment/tooling blocker only; it is not UI passed or failed evidence.'
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    outPath: defaultOutPath,
    reason: '',
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--force') {
      options.force = true;
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

    if (arg === '--reason') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error('--reason requires a non-empty blocker description.');
      }

      options.reason = value.trim();
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.reason) {
    throw new Error('--reason is required so the blocked evidence has a concrete blocker.');
  }

  return options;
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

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function assertIgnoredLocalResultPath(outPath) {
  const relativeOut = projectRelativePath(outPath);
  const allowedPattern = /^harness\/manual-test-results\.local.*\.json$/;

  if (relativeOut.startsWith('..') || isAbsolute(relativeOut) || !allowedPattern.test(relativeOut)) {
    throw new Error(
      `Output must be an ignored local result file matching harness/manual-test-results.local*.json: ${relativeOut}`
    );
  }
}

function runGate(scriptPath, extraArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Gate failed: node ${[scriptPath, ...extraArgs].join(' ')}`);
  }
}

function readExampleResults() {
  try {
    return JSON.parse(readFileSync(examplePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${examplePath}: ${error.message}`);
  }
}

function findTargetJourney(results) {
  if (!Array.isArray(results.journeys)) {
    throw new Error('Example manual evidence JSON does not contain a journeys array.');
  }

  const targetJourneys = results.journeys.filter((journey) => journey?.id === targetJourneyId);

  if (targetJourneys.length !== 1) {
    throw new Error(`Expected exactly one ${targetJourneyId} journey; found ${targetJourneys.length}.`);
  }

  return targetJourneys[0];
}

function prepareResults(reason) {
  const results = readExampleResults();
  const targetJourney = findTargetJourney(results);

  results.branch = runTextCommand(['git', 'branch', '--show-current'], 'git branch --show-current');
  results.commit = runTextCommand(['git', 'rev-parse', '--short', 'HEAD'], 'git rev-parse --short HEAD');
  results.testedAt = new Date().toISOString();
  results.tester = '<replace-with-tester-name-or-handle>';

  if (results.summary && typeof results.summary === 'object') {
    results.summary.overallStatus = 'blocked';
    results.summary.recommendation =
      'Blocked local draft only. Do not treat this as UI passed or failed evidence; rerun the map-list visual smoke after DevTools or device access is available.';
    results.summary.notes = [
      'map-list-visual-smoke was marked blocked because the environment prevented execution.',
      'No DevTools UI or real-device visual smoke was executed for this blocked draft.',
      'Replace this local JSON with real observations only after opening DevTools or a real device and running the journey.'
    ];
  }

  targetJourney.status = 'blocked';
  targetJourney.actual = [
    `Blocked local draft reason: ${reason}.`,
    'UI visual smoke was not executed.',
    'This blocked evidence records only the environment/tooling blocker and is not a UI passed or failed result.'
  ].join(' ');
  targetJourney.evidence = [];
  targetJourney.risks = [
    'DevTools or device access is blocked, so native map layering, safe area, image rendering, scrolling, and detail navigation were not observed.',
    'Static gates may pass while real map-list visual behavior still has overlap, clipping, or interaction issues.'
  ];
  targetJourney.followUp =
    'Open WeChat DevTools or a real device after the service port/environment blocker is resolved, rerun map-list-visual-smoke, and replace this blocked draft with real observations. Do not commit this local JSON.';

  return results;
}

function writeResults(outPath, reason, force) {
  if (existsSync(outPath) && !force) {
    throw new Error(`Refusing to overwrite existing output file: ${outPath}\nUse --force to replace it.`);
  }

  mkdirSync(dirname(outPath), { recursive: true });

  const results = prepareResults(reason);
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
}

function printNextSteps(outPath) {
  const relativeOut = projectRelativePath(outPath);

  console.log('');
  console.log('Next steps:');
  console.log('1. Open WeChat DevTools or a real device after the service port/environment blocker is resolved.');
  console.log(`2. Update ${relativeOut} with real map-list visual smoke observations from that run.`);
  console.log(`3. Re-run: node scripts/check-manual-evidence.mjs ${relativeOut}`);
  console.log('4. Re-run: node scripts/check-evidence-hygiene.mjs');
  console.log('5. Do not commit this local JSON; it is intentionally ignored.');
}

try {
  const { outPath, reason, force } = parseArgs(process.argv.slice(2));

  assertIgnoredLocalResultPath(outPath);
  writeResults(outPath, reason, force);

  runGate('scripts/check-manual-evidence.mjs', [outPath]);
  runGate('scripts/check-evidence-hygiene.mjs');

  console.log('');
  console.log('Map-list blocked evidence draft created.');
  console.log('Blocked evidence is not UI passed or failed evidence; it only records the blocker.');
  printNextSteps(outPath);
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
