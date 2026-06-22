import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultOutPath = join(rootDir, 'harness/devtools-recovery-report.local.md');
const reportPattern = /^harness\/devtools-recovery-report\.local.*\.md$/;
const expectedGlob = 'harness/devtools-recovery-report.local*.md';

function usage() {
  return [
    'Usage: node scripts/prepare-devtools-recovery-report.mjs [--out <path>] [--force]',
    '',
    `Creates an ignored local dry-run report matching ${expectedGlob}.`,
    'The report is not UI passed evidence.'
  ].join('\n');
}

function toAbsolutePath(filePath) {
  return isAbsolute(filePath) ? resolve(filePath) : resolve(rootDir, filePath);
}

function parseArgs(argv) {
  const options = {
    outPath: defaultOutPath,
    force: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--out') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error('--out requires a path value.');
      }

      options.outPath = toAbsolutePath(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function assertIgnoredLocalReportPath(filePath) {
  const relativePath = projectRelativePath(filePath);

  // Keep recovery drafts local-only so they cannot be confused with reviewable UI evidence.
  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !reportPattern.test(relativePath)) {
    throw new Error(`Output path must be an ignored local report matching ${expectedGlob}: ${relativePath}`);
  }

  return relativePath;
}

function runGit(args, fallback) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return fallback;
  }

  return result.stdout.trim() || fallback;
}

function runRecoveryDryRun() {
  return spawnSync(process.execPath, ['scripts/recover-devtools-service-port.mjs', '--dry-run'], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
}

function fenced(value) {
  return String(value || '').replaceAll('```', "'''");
}

function buildMarkdown({ branch, commit, generatedAt, command, result }) {
  const output = [
    result.stdout || '',
    result.stderr ? `\n[stderr]\n${result.stderr}` : ''
  ].join('');
  const exitCode = typeof result.status === 'number' ? result.status : 1;

  return [
    '# DevTools Recovery Dry-run Report',
    '',
    '- branch: ' + branch,
    '- commit: ' + commit,
    '- generatedAt: ' + generatedAt,
    '- command: ' + command,
    '- exitCode: ' + exitCode,
    '- note: ignored local draft; not UI passed evidence',
    '',
    '```text',
    fenced(output),
    '```',
    ''
  ].join('\n');
}

function runReportGuard(outPath) {
  const result = spawnSync(process.execPath, [
    'scripts/check-devtools-recovery-report.mjs',
    '--report',
    outPath
  ], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Generated report failed the DevTools recovery report guard.');
  }
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const relativeOutPath = assertIgnoredLocalReportPath(options.outPath);

  if (existsSync(options.outPath) && !options.force) {
    throw new Error(`Report already exists; pass --force to overwrite: ${relativeOutPath}`);
  }

  const result = runRecoveryDryRun();
  const markdown = buildMarkdown({
    branch: runGit(['rev-parse', '--abbrev-ref', 'HEAD'], '(unknown)'),
    commit: runGit(['rev-parse', '--short', 'HEAD'], '(unknown)'),
    generatedAt: new Date().toISOString(),
    command: 'node scripts/recover-devtools-service-port.mjs --dry-run',
    result
  });

  mkdirSync(dirname(options.outPath), { recursive: true });
  writeFileSync(options.outPath, markdown);
  runReportGuard(options.outPath);

  console.log(`Report: ${relativeOutPath}`);
  console.log('DevTools recovery report guard passed.');
  console.log('This report is not UI passed evidence.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
