import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const viralJourneyInputPattern = /^harness\/manual-test-results\.local-viral-journey.*\.json$/;
const rawEvidenceFragmentMinLength = 6;
const requiredViralJourneyIds = [
  'first-hop-share-entry',
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source',
  'ordinary-and-risk-entries',
  'timeline-share-channel',
  'timeline-risk-gating'
];
const requiredViralJourneyIdSet = new Set(requiredViralJourneyIds);

const sensitivePatterns = [
  { label: 'cloud path', pattern: /cloud:\/\//i },
  { label: 'raw mini program payload path', pattern: /\/pages\/[A-Za-z0-9/_-]+\?[^|\s`]+/i },
  { label: 'raw viral payload query value', pattern: /\b(?:(?:share_id|shareId|parent_share_id|parentShareId|share_depth|shareDepth|receiverAction|shareChannel)=[^\s|`]*|from=share|source=(?:receiver|timeline))\b/i },
  { label: 'macOS user path', pattern: /\/Users\// },
  { label: 'private tmp path', pattern: /\/private\/tmp\// },
  { label: 'temporary tmp path', pattern: /\/tmp\/street-tasks-iter-worktrees\// },
  { label: 'raw URL', pattern: /\b(?:https?|file|wxfile):\/\//i },
  { label: 'Authorization header', pattern: /\bAuthorization\s*:/i },
  { label: 'Bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i },
  { label: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: 'private WeChat AppID', pattern: /\bwx[0-9a-f]{16}\b/i },
  { label: 'private CloudBase environment id', pattern: /\|\s*(?:cloudBase\.)?environmentId\s*\|(?!\s*(?:-\s*\||none(?:\s+for\s+blocked\s+draft)?[^|\n]*\||not recorded[^|\n]*\||not selected[^|\n]*\||local(?:\s+draft)?[^|\n]*\||blocked[^|\n]*\||redacted[^|\n]*\|))\s*[^|\n]{4,}\|/i },
  { label: 'precise coordinate pair', pattern: /(?<!\d)-?(?:[1-8]?\d(?:\.\d{4,})|90(?:\.0{4,})?)\s*,\s*-?(?:(?:1[0-7]\d|[1-9]?\d)(?:\.\d{4,})|180(?:\.0{4,})?)(?!\d)/ },
  { label: 'precise latitude value', pattern: /\|\s*(?:lat|latitude|纬度)\s*\|\s*-?\d{1,2}\.\d{4,}\s*\|/i },
  { label: 'precise longitude value', pattern: /\|\s*(?:lng|lon|longitude|经度)\s*\|\s*-?\d{2,3}\.\d{4,}\s*\|/i },
  { label: 'identity profile field', pattern: /\|\s*(?:[A-Za-z0-9_-]+\.)*(?:nickName|nickname|publisher|publisherName|avatarUrl|publisherAvatarUrl|真实昵称|头像)\s*\|(?!\s*(?:-\s*\||anonymous\s*\||匿名\s*\||not recorded\s*\|))\s*[^|\n]{2,}\|/i },
  { label: 'access token parameter', pattern: /\baccess_token\s*=/i },
  { label: 'refresh token parameter', pattern: /\brefresh_token\s*=/i },
  { label: 'password parameter', pattern: /\bpassword\s*=/i },
  { label: 'cookie parameter', pattern: /\bcookie\s*=/i },
  { label: 'private key parameter', pattern: /\bprivate[_ -]?key\b\s*[:=]/i },
  { label: 'token-like credential', pattern: /\b(?:token|cookie|session|password)\b\s*[:=]/i },
  { label: 'OpenAI-style token', pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'phone number', pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/ },
  { label: 'US-style phone number', pattern: /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { label: 'WeChat openid or unionid', pattern: /\b(?:open[_-]?id|union[_-]?id|openid|unionid)\b/i },
  { label: 'manual evidence artifact path', pattern: /(?:^|[\\/])manual-evidence-artifacts[\\/]/i }
];

const misleadingPatterns = [
  { label: 'passed by AE', pattern: /\bpassed\s+by\s+AE\b/i },
  { label: 'AE passed', pattern: /\bAE\s+passed\b/i },
  { label: 'summary passed', pattern: /\bsummary\s+passed\b/i },
  { label: 'readiness passed so UI passed', pattern: /\breadiness\s+passed\s+so\s+UI\s+passed\b/i },
  { label: 'manual journey passed by checklist', pattern: /\bmanual\s+journey\s+passed\s+by\s+checklist\b/i },
  { label: 'DevTools UI passed by summary', pattern: /\bDevTools\s+UI\s+passed\s+by\s+summary\b/i },
  { label: 'plain DevTools UI passed claim', pattern: /(?:^|[^A-Za-z-])DevTools\s+UI\s+passed\b/i },
  { label: 'plain real-device passed claim', pattern: /(?:^|[^A-Za-z-])real[- ]?device\s+passed\b/i },
  { label: 'plain viral journey passed claim', pattern: /(?:^|[^A-Za-z-])viral\s+journey\s+passed\b/i },
  { label: 'Chinese UI passed claim', pattern: /(?:真机|真实设备|UI|界面|DevTools|微信开发者工具|裂变旅程|朋友圈|CloudBase|云开发).{0,8}(?:已通过|通过)/i }
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

function manualEvidenceGateFor(inputPath) {
  const relativeInputPath = projectRelativePath(inputPath);

  // Viral journey results have their own stricter seven-journey evidence gate.
  if (viralJourneyInputPattern.test(relativeInputPath)) {
    return 'scripts/check-viral-journey-manual-evidence.mjs';
  }

  return 'scripts/check-manual-evidence.mjs';
}

function isViralJourneyInput(inputPath) {
  return viralJourneyInputPattern.test(projectRelativePath(inputPath));
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

function rawEvidenceValueFragments(value, options = {}) {
  const { force = false, parentSensitive = false } = options;

  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (typeof value === 'string') {
    return force || parentSensitive || isSensitiveEvidenceFragment(value) ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => rawEvidenceValueFragments(item, options));
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entryValue]) => [
      ...(isSensitiveEvidenceKey(key) ? [key] : []),
      ...rawEvidenceValueFragments(entryValue, {
        force,
        parentSensitive: parentSensitive || isSensitiveEvidenceKey(key)
      })
    ]);
  }

  const text = String(value);
  return force || parentSensitive || isSensitiveEvidenceFragment(text) ? [text] : [];
}

function isSensitiveEvidenceKey(key) {
  return /(?:event[_-]?id|private|secret|token|cookie|session|open[_-]?id|union[_-]?id|share[_-]?id|share[_-]?depth|payload|path|url|value|details)/i
    .test(String(key || ''));
}

function isSensitiveEvidenceFragment(value) {
  return /(?:cloud:\/\/|\/Users\/|\/private\/tmp\/|\/tmp\/street-tasks-iter-worktrees\/|\b(?:https?|file|wxfile):\/\/|\/pages\/[A-Za-z0-9/_-]+\?|share_id|shareId|parent_share_id|parentShareId|share_depth|shareDepth|receiverAction|shareChannel|from=share|source=(?:receiver|timeline)|event[_-]?id|\bevt_[A-Za-z0-9_-]+|private|secret|token|cookie|session|authorization|bearer|password|open[_-]?id|union[_-]?id|sk-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|wx[0-9a-f]{16}|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i
    .test(String(value || ''));
}

function rawEvidenceValues(results) {
  const values = [];

  if (!Array.isArray(results.journeys)) {
    return values;
  }

  for (const journey of results.journeys) {
    const evidence = Array.isArray(journey?.evidence) ? journey.evidence : [];

    evidence.forEach((item, evidenceIndex) => {
      if (!isPlainObject(item)) {
        return;
      }

      for (const fieldName of ['path', 'url', 'value', 'details']) {
        const force = fieldName === 'path' || fieldName === 'url';

        for (const fragment of rawEvidenceValueFragments(item[fieldName], { force })) {
          const text = normalizeSummaryText(fragment);

          if (text.length >= rawEvidenceFragmentMinLength) {
            values.push({
              journeyId: journey.id || 'unknown-journey',
              evidenceIndex,
              fieldName,
              text
            });
          }
        }
      }
    });
  }

  return values;
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

function normalizeSummaryText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replaceAll('\\|', '|')
    .replace(/\s+/g, ' ')
    .trim();
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

function assertNoPatternMatches(markdown, patterns, messagePrefix) {
  for (const { label, pattern } of patterns) {
    const match = pattern.exec(markdown);

    if (match) {
      throw new Error(`${messagePrefix} ${label} on line ${lineNumberForIndex(markdown, match.index)}.`);
    }
  }
}

function assertNoRawEvidenceValues(markdown, results) {
  const normalizedMarkdown = normalizeSummaryText(markdown);

  for (const entry of rawEvidenceValues(results)) {
    if (normalizedMarkdown.includes(entry.text)) {
      throw new Error(
        `Generated summary contains prohibited raw evidence ${entry.fieldName} content from ` +
          `${entry.journeyId} evidence item ${entry.evidenceIndex + 1}.`
      );
    }
  }
}

function validateViralJourneySet(results) {
  if (!Array.isArray(results.journeys)) {
    throw new Error('Viral manual summary input must contain a journeys array.');
  }

  if (results.journeys.length !== requiredViralJourneyIds.length) {
    throw new Error(
      `Viral manual summary input must contain exactly ${requiredViralJourneyIds.length} journeys; found ${results.journeys.length}.`
    );
  }

  const counts = new Map();

  for (const journey of results.journeys) {
    if (!isPlainObject(journey) || !requiredViralJourneyIdSet.has(journey.id)) {
      throw new Error(`Viral manual summary input contains unexpected journey id: ${journey?.id || '<missing>'}.`);
    }

    counts.set(journey.id, (counts.get(journey.id) || 0) + 1);
  }

  for (const journeyId of requiredViralJourneyIds) {
    const count = counts.get(journeyId) || 0;

    if (count !== 1) {
      throw new Error(`Viral manual summary input must contain exactly one ${journeyId}; found ${count}.`);
    }
  }
}

try {
  const { inputPath, outPath } = parseArgs(process.argv.slice(2));

  assertProjectRelativePath(inputPath, /^harness\/manual-test-results\.local.*\.json$/, 'Input');
  assertProjectRelativePath(outPath, /^harness\/manual-test-summary\.local.*\.md$/, 'Output');

  runGate(manualEvidenceGateFor(inputPath), [inputPath]);
  runGate('scripts/check-evidence-hygiene.mjs');

  const results = readResults(inputPath);

  if (isViralJourneyInput(inputPath)) {
    validateViralJourneySet(results);
  }

  const markdown = buildMarkdown(results);
  assertNoSensitiveContent(markdown);
  assertNoPatternMatches(markdown, misleadingPatterns, 'Generated summary contains misleading claim');
  assertNoRawEvidenceValues(markdown, results);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown);

  console.log('Manual summary draft created.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
