import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultOutPath = join(rootDir, 'harness/manual-test-results.local.json');
const examplePath = join(rootDir, 'harness/manual-test-results.example.json');
const artifactsDir = join(rootDir, 'harness/manual-evidence-artifacts');

function usage() {
  return [
    'Usage: node scripts/prepare-manual-test-run.mjs [--out <path>] [--force]',
    '',
    'Creates a local manual test result JSON and the ignored evidence artifact directory.'
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    outPath: defaultOutPath,
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

    throw new Error(`Unknown argument: ${arg}`);
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

function runGate(scriptPath, extraArgs = [], failureContext = '') {
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    const command = `node ${[scriptPath, ...extraArgs].join(' ')}`;
    const context = failureContext ? `${failureContext}\n` : '';
    throw new Error(`${context}Gate failed: ${command}`);
  }
}

function printPreflightIntro() {
  console.log('Running readiness preflight before manual UI testing.');
  console.log('This includes scripts/check-devtools-readiness.mjs and the map list static guard.');
  console.log('Passing preflight does not prove DevTools or real-device visual acceptance.');
  console.log('');
}

function readExampleResults() {
  try {
    return JSON.parse(readFileSync(examplePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${examplePath}: ${error.message}`);
  }
}

function prepareResults() {
  const results = readExampleResults();

  results.branch = runTextCommand(['git', 'branch', '--show-current'], 'git branch --show-current');
  results.commit = runTextCommand(['git', 'rev-parse', '--short', 'HEAD'], 'git rev-parse --short HEAD');
  results.testedAt = new Date().toISOString();
  results.tester = '<replace-with-tester-name-or-handle>';

  if (results.summary && typeof results.summary === 'object') {
    results.summary.overallStatus = 'not_covered';
  }

  return results;
}

function writeResults(outPath, force) {
  if (existsSync(outPath) && !force) {
    throw new Error(`Refusing to overwrite existing output file: ${outPath}\nUse --force to replace it.`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });

  const results = prepareResults();
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
}

function printNextSteps(outPath) {
  const relativeOut = projectRelativePath(outPath);

  console.log('');
  console.log('Next steps:');
  console.log('1. Read the readiness preflight output above first, including the map list static guard result.');
  console.log(`2. Open this worktree in the WeChat DevTools UI: ${rootDir}`);
  console.log(`3. Run the manual journeys, then fill in ${relativeOut} with real observations.`);
  console.log(`4. Re-run: node scripts/check-manual-evidence.mjs ${relativeOut}`);
  console.log('5. Re-run: node scripts/check-evidence-hygiene.mjs');
  console.log('6. Do not commit local JSON files or files under harness/manual-evidence-artifacts/.');
}

try {
  const { outPath, force } = parseArgs(process.argv.slice(2));

  assertIgnoredLocalResultPath(outPath);
  writeResults(outPath, force);

  printPreflightIntro();
  runGate(
    'scripts/check-devtools-readiness.mjs',
    [],
    'Readiness preflight failed. It includes the map list static guard; DevTools and real-device visual acceptance remain unverified until UI manual testing passes.'
  );
  runGate('scripts/check-manual-evidence.mjs', [outPath]);
  runGate('scripts/check-evidence-hygiene.mjs');

  printNextSteps(outPath);
  console.log('');
  console.log('Manual test run prepared.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
