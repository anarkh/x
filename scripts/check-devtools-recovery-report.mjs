import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPattern = /^harness\/devtools-recovery-report\.local.*\.md$/;
const expectedGlob = 'harness/devtools-recovery-report.local*.md';

function usage() {
  return [
    'Usage: node scripts/check-devtools-recovery-report.mjs --report <path>',
    '',
    `Report must be a repo-local ignored Markdown file matching ${expectedGlob}.`
  ].join('\n');
}

function toAbsolutePath(filePath) {
  return isAbsolute(filePath) ? resolve(filePath) : resolve(rootDir, filePath);
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--report') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error('--report requires a path value.');
      }

      options.report = toAbsolutePath(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && !options.report) {
    throw new Error('--report is required.');
  }

  return options;
}

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function assertReportPath(filePath) {
  const relativePath = projectRelativePath(filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !reportPattern.test(relativePath)) {
    throw new Error(`Report must be inside the repo and match ${expectedGlob}: ${relativePath}`);
  }
}

function requireFragment(markdown, fragment) {
  if (!markdown.includes(fragment)) {
    throw new Error(`Report is missing required text: ${fragment}`);
  }
}

function forbidFragment(markdown, fragment) {
  if (markdown.toLowerCase().includes(fragment.toLowerCase())) {
    throw new Error(`Report must not claim unverified success: ${fragment}`);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  assertReportPath(options.report);

  let markdown = '';

  try {
    markdown = readFileSync(options.report, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read report: ${error.message}`);
  }

  [
    '# DevTools Recovery Dry-run Report',
    'WeChat DevTools service port recovery report',
    'mode: dry-run diagnostics',
    'Before status:',
    'Actions attempted/skipped:',
    'After status:',
    'Next steps:',
    'DevTools quit: skipped',
    'reopen wait: skipped',
    'DevTools open: skipped',
    '--dry-run'
  ].forEach((fragment) => requireFragment(markdown, fragment));

  [
    'UI smoke passed',
    'DevTools passed',
    'DevTools recovered',
    '9420 restored',
    'real device passed',
    '真机 passed',
    '真机通过',
    '恢复成功',
    '恢复已完成',
    '已恢复',
    '小程序验收通过'
  ].forEach((fragment) => forbidFragment(markdown, fragment));

  console.log('DevTools recovery report checks passed.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
