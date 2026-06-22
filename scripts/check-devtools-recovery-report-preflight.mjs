import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const harnessDir = join(rootDir, 'harness');
const reportPattern = /^devtools-recovery-report\.local.*\.md$/;
const nonUiEvidenceWarning = 'Preflight is not UI passed evidence; it only checks ignored local recovery reports when they exist.';

function listLocalRecoveryReports() {
  return readdirSync(harnessDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && reportPattern.test(entry.name))
    .map((entry) => `harness/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));
}

const reports = listLocalRecoveryReports();

if (reports.length === 0) {
  console.log('No local DevTools recovery reports found; nothing checked.');
  console.log(nonUiEvidenceWarning);
  process.exit(0);
}

let failedCount = 0;

for (const report of reports) {
  console.log(`Checking ${report}.`);

  const result = spawnSync(process.execPath, [
    'scripts/check-devtools-recovery-report.mjs',
    '--report',
    report
  ], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    failedCount += 1;
  }
}

if (failedCount > 0) {
  console.error(`DevTools recovery report preflight failed for ${failedCount} item(s).`);
  process.exit(1);
}

console.log(`DevTools recovery report preflight passed. Checked ${reports.length} report(s).`);
console.log(nonUiEvidenceWarning);
