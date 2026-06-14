import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultResultsOutPath = join(rootDir, 'harness/manual-test-results.local-map-list-blocked.json');
const defaultSummaryOutPath = join(rootDir, 'harness/manual-test-summary.local-map-list-blocked.md');

function usage() {
  return [
    'Usage: node scripts/prepare-map-list-blocked-summary.mjs --reason <blocked-reason> [--results-out <path>] [--summary-out <path>] [--force]',
    '',
    'Creates an ignored local blocked result JSON and a sanitized local Markdown summary.',
    'The summary is not UI passed evidence; it only summarizes the blocked result draft.'
  ].join('\n');
}

function toAbsolutePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(rootDir, filePath);
}

function parseArgs(argv) {
  const options = {
    reason: '',
    resultsOutPath: defaultResultsOutPath,
    summaryOutPath: defaultSummaryOutPath,
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--reason' || arg === '--results-out' || arg === '--summary-out') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a non-empty value.`);
      }

      if (arg === '--reason') {
        options.reason = value.trim();
      } else if (arg === '--results-out') {
        options.resultsOutPath = toAbsolutePath(value);
      } else {
        options.summaryOutPath = toAbsolutePath(value);
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.reason) {
    throw new Error('--reason is required so the blocked summary has a concrete blocker.');
  }

  return options;
}

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function assertIgnoredLocalPath(filePath, pattern, label, expectedGlob) {
  const relativePath = projectRelativePath(filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !pattern.test(relativePath)) {
    throw new Error(`${label} must be an ignored local file matching ${expectedGlob}: ${relativePath}`);
  }
}

function runScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: node ${[scriptPath, ...args].join(' ')}`);
  }
}

try {
  const { reason, resultsOutPath, summaryOutPath, force } = parseArgs(process.argv.slice(2));

  assertIgnoredLocalPath(
    resultsOutPath,
    /^harness\/manual-test-results\.local.*\.json$/,
    'Results output',
    'harness/manual-test-results.local*.json'
  );
  assertIgnoredLocalPath(
    summaryOutPath,
    /^harness\/manual-test-summary\.local.*\.md$/,
    'Summary output',
    'harness/manual-test-summary.local*.md'
  );

  const resultsArgs = ['--reason', reason, '--out', resultsOutPath];
  if (force) {
    resultsArgs.push('--force');
  }

  runScript('scripts/prepare-map-list-blocked-evidence.mjs', resultsArgs);
  runScript('scripts/create-manual-summary.mjs', ['--input', resultsOutPath, '--out', summaryOutPath]);
  runScript('scripts/check-map-list-blocked-summary.mjs', [
    '--results',
    resultsOutPath,
    '--summary',
    summaryOutPath
  ]);

  const resultsRelativePath = projectRelativePath(resultsOutPath);
  const summaryRelativePath = projectRelativePath(summaryOutPath);
  const rerunGuardCommand = `node scripts/check-map-list-blocked-summary.mjs --results ${resultsRelativePath} --summary ${summaryRelativePath}`;

  console.log('');
  console.log('Created blocked result and sanitized summary.');
  console.log('Blocked summary guard passed.');
  console.log(`Result: ${resultsRelativePath}`);
  console.log(`Summary: ${summaryRelativePath}`);
  console.log('Post-edit rerun guard: if either local file is edited after this point, rerun:');
  console.log(rerunGuardCommand);
  console.log('Summary is not UI passed evidence; rerun the real map-list visual smoke when DevTools or device access is available.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
