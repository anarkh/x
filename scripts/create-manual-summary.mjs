import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const sensitivePatterns = [
  { label: 'cloud path', pattern: /cloud:\/\//i },
  { label: 'macOS user path', pattern: /\/Users\// },
  { label: 'Authorization header', pattern: /\bAuthorization\s*:/i },
  { label: 'Bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i },
  { label: 'access token parameter', pattern: /\baccess_token\s*=/i },
  { label: 'refresh token parameter', pattern: /\brefresh_token\s*=/i },
  { label: 'password parameter', pattern: /\bpassword\s*=/i },
  { label: 'cookie parameter', pattern: /\bcookie\s*=/i },
  { label: 'private key parameter', pattern: /\bprivate_key\s*=/i },
  { label: 'OpenAI-style token', pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'phone number', pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/ }
];

function usage() {
  return [
    'Usage: node scripts/create-manual-summary.mjs --input <json> --out <markdown>',
    '',
    'Input must match harness/manual-test-results.local*.json.',
    'Output must match harness/manual-test-summary.local*.md.'
  ].join('\n');
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--input' || arg === '--out') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a path value.`);
      }

      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.input) {
    throw new Error('--input is required.');
  }

  if (!options.out) {
    throw new Error('--out is required.');
  }

  return {
    inputPath: toAbsolutePath(options.input),
    outPath: toAbsolutePath(options.out)
  };
}

function toAbsolutePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(rootDir, filePath);
}

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function assertProjectRelativePath(filePath, pattern, label) {
  const relativePath = projectRelativePath(filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !pattern.test(relativePath)) {
    throw new Error(`${label} must match ${pattern}: ${relativePath}`);
  }
}

function runGate(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Gate failed: node ${[scriptPath, ...args].join(' ')}`);
  }
}

function readResults(inputPath) {
  try {
    return JSON.parse(readFileSync(inputPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse manual test JSON: ${error.message}`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function flattenEntries(value, prefix = '') {
  if (!isPlainObject(value)) {
    return [];
  }

  const rows = [];

  for (const [key, entryValue] of Object.entries(value)) {
    const field = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(entryValue)) {
      rows.push(...flattenEntries(entryValue, field));
    } else {
      rows.push([field, entryValue]);
    }
  }

  return rows;
}

function valueText(value) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(valueText).join('<br>') : '0';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function markdownCell(value) {
  return valueText(value)
    .replaceAll('|', '\\|')
    .replace(/\r?\n/g, '<br>');
}

function evidenceCount(evidence) {
  if (Array.isArray(evidence)) {
    return evidence.length;
  }

  if (typeof evidence === 'string') {
    return evidence.trim() ? 1 : 0;
  }

  return evidence ? 1 : 0;
}

function blockerText(journey) {
  if (journey.blocker !== undefined && journey.blocker !== null && journey.blocker !== '') {
    return journey.blocker;
  }

  return journey.risks;
}

function buildMarkdown(results) {
  const summary = isPlainObject(results.summary) ? results.summary : {};
  const environmentRows = flattenEntries(results.environment);
  const journeys = Array.isArray(results.journeys) ? results.journeys : [];
  const lines = [
    '# Manual Test Summary Draft',
    '',
    '## Run',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| branch | ${markdownCell(results.branch)} |`,
    `| commit | ${markdownCell(results.commit)} |`,
    `| testedAt | ${markdownCell(results.testedAt)} |`,
    `| tester | ${markdownCell(results.tester)} |`,
    '',
    '## Summary',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| overallStatus | ${markdownCell(summary.overallStatus)} |`,
    `| recommendation | ${markdownCell(summary.recommendation)} |`,
    '',
    '## Environments',
    '',
    '| Field | Value |',
    '| --- | --- |'
  ];

  if (environmentRows.length === 0) {
    lines.push('| - | - |');
  } else {
    for (const [field, value] of environmentRows) {
      lines.push(`| ${markdownCell(field)} | ${markdownCell(value)} |`);
    }
  }

  lines.push(
    '',
    '## Journeys',
    '',
    '| id | title | status | actual | evidenceCount | blocker | followUp |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  );

  // Only summarize evidence volume; raw evidence strings never leave the source JSON.
  for (const journey of journeys) {
    lines.push(
      `| ${markdownCell(journey.id)} | ${markdownCell(journey.title)} | ${markdownCell(journey.status)} | ` +
        `${markdownCell(journey.actual)} | ${evidenceCount(journey.evidence)} | ` +
        `${markdownCell(blockerText(journey))} | ${markdownCell(journey.followUp)} |`
    );
  }

  return `${lines.join('\n')}\n`;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function assertNoSensitiveContent(markdown) {
  // Scan the generated draft before writing it so unsafe content is never emitted.
  for (const { label, pattern } of sensitivePatterns) {
    const match = pattern.exec(markdown);

    if (match) {
      throw new Error(
        `Generated summary contains prohibited ${label} on line ${lineNumberForIndex(markdown, match.index)}.`
      );
    }
  }
}

try {
  const { inputPath, outPath } = parseArgs(process.argv.slice(2));

  assertProjectRelativePath(inputPath, /^harness\/manual-test-results\.local.*\.json$/, 'Input');
  assertProjectRelativePath(outPath, /^harness\/manual-test-summary\.local.*\.md$/, 'Output');

  runGate('scripts/check-manual-evidence.mjs', [inputPath]);
  runGate('scripts/check-evidence-hygiene.mjs');

  const results = readResults(inputPath);
  const markdown = buildMarkdown(results);
  assertNoSensitiveContent(markdown);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown);

  console.log('Manual summary draft created.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
