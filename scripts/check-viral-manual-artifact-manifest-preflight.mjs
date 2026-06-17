import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const harnessDir = join(rootDir, 'harness');
const manifestFilePattern = /^manual-artifact-manifest\.local-viral-journey(.*)\.json$/;

function runGuard(resultsPath, manifestPath) {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/check-viral-manual-artifact-manifest.mjs',
      '--results',
      resultsPath,
      '--manifest',
      manifestPath
    ],
    {
      cwd: rootDir,
      stdio: 'inherit'
    }
  );

  if (result.error) {
    return `Unable to run viral manual artifact manifest guard for ${manifestPath}: ${result.error.message}`;
  }

  if (result.status !== 0) {
    return `Viral manual artifact manifest guard failed for ${manifestPath} with exit code ${result.status}.`;
  }

  return '';
}

try {
  const manifests = readdirSync(harnessDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && manifestFilePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (manifests.length === 0) {
    console.log('No local viral journey artifact manifest files found; nothing checked.');
    console.log('Preflight is not UI passed evidence; it only checks ignored local viral artifact manifests when they exist.');
    process.exit(0);
  }

  const failures = [];
  let checkedCount = 0;

  manifests.forEach((manifestFileName) => {
    const [, suffix] = manifestFilePattern.exec(manifestFileName);
    const resultsFileName = `manual-test-results.local-viral-journey${suffix}.json`;
    const manifestPath = `harness/${manifestFileName}`;
    const resultsPath = `harness/${resultsFileName}`;

    if (!existsSync(join(harnessDir, resultsFileName))) {
      failures.push(`Missing viral journey results JSON for ${manifestPath}; expected ${resultsPath}.`);
      return;
    }

    console.log(`Checking ${manifestPath} with ${resultsPath}.`);
    const failure = runGuard(resultsPath, manifestPath);

    if (failure) {
      failures.push(failure);
      return;
    }

    checkedCount += 1;
  });

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(failure));
    throw new Error(`Viral manual artifact manifest preflight failed for ${failures.length} item(s).`);
  }

  console.log(`Viral manual artifact manifest preflight passed. Checked ${checkedCount} pair(s).`);
  console.log(
    'Preflight is not UI passed evidence; DevTools UI, real-device, and viral journey passed status still require real manual evidence.'
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
