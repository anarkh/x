import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const harnessDir = join(rootDir, 'harness');
const summaryFilePattern = /^manual-test-summary\.local-viral-journey(.*)\.md$/;

function runGuard(resultsPath, summaryPath) {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/check-viral-manual-summary-integrity.mjs',
      '--results',
      resultsPath,
      '--summary',
      summaryPath
    ],
    {
      cwd: rootDir,
      stdio: 'inherit'
    }
  );

  if (result.error) {
    return `Unable to run viral manual summary integrity guard for ${summaryPath}: ${result.error.message}`;
  }

  if (result.status !== 0) {
    return `Viral manual summary integrity guard failed for ${summaryPath} with exit code ${result.status}.`;
  }

  return '';
}

try {
  const summaries = readdirSync(harnessDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && summaryFilePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (summaries.length === 0) {
    console.log('No local viral journey summary files found; nothing checked.');
    console.log('Preflight is not UI passed evidence; it only checks ignored local viral journey JSON/summary pairs when they exist.');
    process.exit(0);
  }

  const failures = [];
  let checkedCount = 0;

  summaries.forEach((summaryFileName) => {
    const [, suffix] = summaryFilePattern.exec(summaryFileName);
    const resultsFileName = `manual-test-results.local-viral-journey${suffix}.json`;
    const summaryPath = `harness/${summaryFileName}`;
    const resultsPath = `harness/${resultsFileName}`;

    if (!existsSync(join(harnessDir, resultsFileName))) {
      failures.push(`Missing viral journey results JSON for ${summaryPath}; expected ${resultsPath}.`);
      return;
    }

    console.log(`Checking ${summaryPath} with ${resultsPath}.`);
    const failure = runGuard(resultsPath, summaryPath);

    if (failure) {
      failures.push(failure);
      return;
    }

    checkedCount += 1;
  });

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(failure));
    throw new Error(`Viral manual summary integrity preflight failed for ${failures.length} item(s).`);
  }

  console.log(`Viral manual summary integrity preflight passed. Checked ${checkedCount} pair(s).`);
  console.log(
    'Preflight is not UI passed evidence; DevTools UI, real-device, and viral journey passed status still require real manual evidence.'
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
