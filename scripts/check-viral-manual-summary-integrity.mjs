import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const resultsPattern = /^harness\/manual-test-results\.local-viral-journey.*\.json$/;
const summaryPattern = /^harness\/manual-test-summary\.local-viral-journey.*\.md$/;
const readableJourneyFields = ['actual', 'blocker', 'followUp'];
const expectedJourneyColumns = ['id', 'title', 'status', 'actual', 'evidenceCount', 'blocker', 'followUp'];
const rawEvidenceFragmentMinLength = 6;
const requiredJourneyIds = [
  'first-hop-share-entry',
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source',
  'ordinary-and-risk-entries',
  'timeline-share-channel',
  'timeline-risk-gating'
];
const requiredJourneyIdSet = new Set(requiredJourneyIds);

const sensitivePatterns = [
  { label: 'cloud evidence URI', pattern: /cloud:\/\//i },
  { label: 'raw mini program payload path', pattern: /\/pages\/[A-Za-z0-9/_-]+\?[^|\s`]+/i },
  { label: 'raw viral payload query value', pattern: /\b(?:(?:share_id|shareId|parent_share_id|parentShareId|share_depth|shareDepth|receiverAction|shareChannel)=[^\s|`]*|from=share|source=(?:receiver|timeline))\b/i },
  { label: 'local macOS user path', pattern: /\/Users\// },
  { label: 'private tmp path', pattern: /\/private\/tmp\// },
  { label: 'temporary tmp path', pattern: /\/tmp\/street-tasks-iter-worktrees\// },
  { label: 'raw URL', pattern: /\b(?:https?|file|wxfile):\/\//i },
  { label: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: 'private WeChat AppID', pattern: /\bwx[0-9a-f]{16}\b/i },
  { label: 'private CloudBase environment id', pattern: /\|\s*(?:cloudBase\.)?environmentId\s*\|(?!\s*(?:-\s*\||none(?:\s+for\s+blocked\s+draft)?[^|\n]*\||not recorded[^|\n]*\||not selected[^|\n]*\||local(?:\s+draft)?[^|\n]*\||blocked[^|\n]*\||redacted[^|\n]*\|))\s*[^|\n]{4,}\|/i },
  { label: 'precise coordinate pair', pattern: /(?<!\d)-?(?:[1-8]?\d(?:\.\d{4,})|90(?:\.0{4,})?)\s*,\s*-?(?:(?:1[0-7]\d|[1-9]?\d)(?:\.\d{4,})|180(?:\.0{4,})?)(?!\d)/ },
  { label: 'precise latitude value', pattern: /\|\s*(?:lat|latitude|纬度)\s*\|\s*-?\d{1,2}\.\d{4,}\s*\|/i },
  { label: 'precise longitude value', pattern: /\|\s*(?:lng|lon|longitude|经度)\s*\|\s*-?\d{2,3}\.\d{4,}\s*\|/i },
  { label: 'identity profile field', pattern: /\|\s*(?:[A-Za-z0-9_-]+\.)*(?:nickName|nickname|publisher|publisherName|avatarUrl|publisherAvatarUrl|真实昵称|头像)\s*\|(?!\s*(?:-\s*\||anonymous\s*\||匿名\s*\||not recorded\s*\|))\s*[^|\n]{2,}\|/i },
  { label: 'manual evidence artifact path', pattern: /(?:^|[\\/])manual-evidence-artifacts[\\/]/i },
  { label: 'authorization header', pattern: /\bAuthorization\s*:/i },
  { label: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i },
  { label: 'token-like credential', pattern: /\b(?:token|cookie|session|password)\b\s*[:=]/i },
  { label: 'access token', pattern: /\baccess[_-]?token\b\s*[:=]/i },
  { label: 'refresh token', pattern: /\brefresh[_-]?token\b\s*[:=]/i },
  { label: 'private key', pattern: /\bprivate[_ -]?key\b\s*[:=]/i },
  { label: 'OpenAI-style token', pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'mainland China phone number', pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/ },
  { label: 'US-style phone number', pattern: /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { label: 'WeChat openid or unionid', pattern: /\b(?:open[_-]?id|union[_-]?id|openid|unionid)\b/i }
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
    'Usage: node scripts/check-viral-manual-summary-integrity.mjs --results <local-json> --summary <local-md>',
    '',
    'Results must match harness/manual-test-results.local-viral-journey*.json.',
    'Summary must match harness/manual-test-summary.local-viral-journey*.md.',
    'Both files must live in this repo and be ignored by git.'
  ].join('\n');
}

function toAbsolutePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(rootDir, filePath);
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--results' || arg === '--summary') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a path value.`);
      }

      options[arg.slice(2)] = toAbsolutePath(value);
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.results) {
    throw new Error('--results is required.');
  }

  if (!options.summary) {
    throw new Error('--summary is required.');
  }

  return options;
}

function projectRelativePath(filePath) {
  return relative(rootDir, filePath).split('\\').join('/');
}

function isGitIgnored(filePath) {
  const result = spawnSync('git', ['check-ignore', '-q', '--', projectRelativePath(filePath)], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  return result.status === 0;
}

function assertIgnoredLocalPath(filePath, pattern, label, expectedGlob) {
  const relativePath = projectRelativePath(filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !pattern.test(relativePath)) {
    throw new Error(`${label} must match ${expectedGlob} inside this repo: ${relativePath}`);
  }

  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${relativePath}`);
  }

  if (!isGitIgnored(filePath)) {
    throw new Error(`${label} must be ignored by git before this guard will trust it: ${relativePath}`);
  }
}

function redactOutput(output) {
  return String(output || '')
    .replaceAll(rootDir, '<repo-worktree>')
    .replace(/\/private\/tmp\/street-tasks-iter-worktrees\/[^\s"'`),\]}<>]+/g, '<repo-worktree>')
    .replace(/\/tmp\/street-tasks-iter-worktrees\/[^\s"'`),\]}<>]+/g, '<repo-worktree>')
    .replace(/\/Users\/[^\s"'`),\]}<>]+/g, '<local-path>')
    .replace(/cloud:\/\/[^\s"'`),\]}<>]+/gi, '<cloud-uri>')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/\b(?:access[_-]?token|refresh[_-]?token|password|cookie|session)\b\s*[:=]\s*[^\s"'`),\]}<>]+/gi, '<redacted-credential>');
}

function runViralManualEvidenceGate(resultsPath) {
  const relativeResultsPath = projectRelativePath(resultsPath);
  const result = spawnSync(
    process.execPath,
    ['--no-warnings', 'scripts/check-viral-journey-manual-evidence.mjs', relativeResultsPath],
    {
      cwd: rootDir,
      encoding: 'utf8'
    }
  );

  if (result.status !== 0) {
    const stdout = redactOutput(result.stdout).trim();
    const stderr = redactOutput(result.stderr).trim();

    if (stdout) {
      console.error(stdout);
    }

    if (stderr) {
      console.error(stderr);
    }

    throw new Error('Source viral manual journey results JSON failed its evidence gate.');
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse results JSON: ${error.message}`);
  }
}

function readMarkdown(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read summary Markdown: ${error.message}`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmpty(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }

  return value !== null && value !== undefined;
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

function normalizeReadableText(value) {
  return valueText(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replaceAll('\\|', '|')
    .replace(/\s+/g, ' ')
    .trim();
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

function blockerSource(journey) {
  if (isNonEmpty(journey.blocker)) {
    return journey.blocker;
  }

  return journey.risks;
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();

  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return null;
  }

  const cells = [];
  let current = '';
  let escaped = false;

  // Generated summary rows escape literal pipes inside cells.
  for (const character of trimmed.slice(1, -1)) {
    if (character === '|' && !escaped) {
      cells.push(current.trim().replaceAll('\\|', '|'));
      current = '';
      escaped = false;
      continue;
    }

    current += character;
    escaped = character === '\\' && !escaped;

    if (character !== '\\') {
      escaped = false;
    }
  }

  cells.push(current.trim().replaceAll('\\|', '|'));
  return cells;
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function rowsInSection(markdown, sectionName) {
  const rows = [];
  let currentSection = '';

  markdown.split(/\r?\n/).forEach((line, lineIndex) => {
    const heading = /^##\s+(.+?)\s*$/.exec(line.trim());

    if (heading) {
      currentSection = heading[1];
      return;
    }

    if (currentSection !== sectionName) {
      return;
    }

    const cells = splitMarkdownRow(line);

    if (cells && !isSeparatorRow(cells)) {
      rows.push({ cells, lineNumber: lineIndex + 1 });
    }
  });

  return rows;
}

function sectionFieldValue(markdown, sectionName, fieldName) {
  const rows = rowsInSection(markdown, sectionName).filter(({ cells }) => cells[0] === fieldName);

  if (rows.length !== 1) {
    throw new Error(
      `Summary Markdown ${sectionName} section must contain exactly one ${fieldName} row; found ${rows.length}.`
    );
  }

  return {
    value: rows[0].cells[1] ?? '',
    lineNumber: rows[0].lineNumber
  };
}

function assertSummaryField(markdown, sectionName, fieldName, expectedValue) {
  const { value, lineNumber } = sectionFieldValue(markdown, sectionName, fieldName);
  const normalizedSummaryValue = normalizeReadableText(value);
  const normalizedExpectedValue = normalizeReadableText(expectedValue);

  if (normalizedSummaryValue !== normalizedExpectedValue) {
    throw new Error(
      `Summary Markdown ${sectionName} ${fieldName} does not match the source results JSON on line ${lineNumber}.`
    );
  }
}

function validateRunAndSummarySections(markdown, results) {
  assertSummaryField(markdown, 'Run', 'branch', results.branch);
  assertSummaryField(markdown, 'Run', 'commit', results.commit);
  assertSummaryField(markdown, 'Summary', 'overallStatus', results.summary?.overallStatus);
}

function journeyColumnIndexes(headerCells) {
  if (headerCells.length !== expectedJourneyColumns.length) {
    throw new Error(
      `Summary Markdown journeys table must contain exactly these columns: ${expectedJourneyColumns.join(', ')}.`
    );
  }

  expectedJourneyColumns.forEach((columnName, index) => {
    if (headerCells[index] !== columnName) {
      throw new Error(
        `Summary Markdown journeys table column ${index + 1} must be ${columnName}; found ${headerCells[index] || '<empty>'}.`
      );
    }
  });

  const indexes = {
    id: headerCells.indexOf('id'),
    title: headerCells.indexOf('title'),
    status: headerCells.indexOf('status'),
    actual: headerCells.indexOf('actual'),
    evidenceCount: headerCells.indexOf('evidenceCount'),
    blocker: headerCells.indexOf('blocker'),
    followUp: headerCells.indexOf('followUp')
  };

  for (const [columnName, columnIndex] of Object.entries(indexes)) {
    if (columnIndex === -1) {
      throw new Error(`Summary Markdown journeys table must include a ${columnName} column.`);
    }
  }

  return indexes;
}

function journeysByRequiredId(results) {
  if (!Array.isArray(results.journeys)) {
    throw new Error('Source results JSON must contain a journeys array.');
  }

  if (results.journeys.length !== requiredJourneyIds.length) {
    throw new Error(
      `Source results JSON must contain exactly ${requiredJourneyIds.length} viral journey rows; found ${results.journeys.length}.`
    );
  }

  const map = new Map();

  for (const journey of results.journeys) {
    if (!isPlainObject(journey) || !requiredJourneyIdSet.has(journey.id)) {
      throw new Error(`Source results JSON contains unexpected viral journey id: ${journey?.id || '<missing>'}.`);
    }

    if (map.has(journey.id)) {
      throw new Error(`Source results JSON contains duplicate required journey id: ${journey.id}.`);
    }

    map.set(journey.id, journey);
  }

  for (const journeyId of requiredJourneyIds) {
    if (!map.has(journeyId)) {
      throw new Error(`Source results JSON is missing required journey id: ${journeyId}.`);
    }
  }

  return map;
}

function assertReadableFieldMatches(cellValue, expectedValue, label, journeyId, lineNumber) {
  const normalizedSummaryValue = normalizeReadableText(cellValue);
  const normalizedExpectedValue = normalizeReadableText(expectedValue);

  if (!normalizedExpectedValue || normalizedExpectedValue === '-') {
    if (normalizedSummaryValue !== '-') {
      throw new Error(
        `Summary Markdown ${journeyId} ${label} must be empty because the source results JSON has no ${label} text on line ${lineNumber}.`
      );
    }
    return;
  }

  if (!normalizedSummaryValue || normalizedSummaryValue === '-') {
    throw new Error(`Summary Markdown ${journeyId} ${label} must not be empty on line ${lineNumber}.`);
  }

  if (normalizedSummaryValue !== normalizedExpectedValue) {
    throw new Error(
      `Summary Markdown ${journeyId} ${label} does not match the source results JSON on line ${lineNumber}.`
    );
  }
}

function validateJourneyRows(markdown, results) {
  const sourceJourneys = journeysByRequiredId(results);
  const journeyRows = rowsInSection(markdown, 'Journeys');

  if (journeyRows.length === 0) {
    throw new Error('Summary Markdown must contain a Journeys table.');
  }

  const header = journeyRows[0].cells;
  const indexes = journeyColumnIndexes(header);
  const dataRows = journeyRows.slice(1).filter(({ cells }) => cells.some((cell) => cell.trim()));

  if (dataRows.length !== requiredJourneyIds.length) {
    throw new Error(
      `Summary Markdown Journeys table must contain exactly ${requiredJourneyIds.length} required journey rows; found ${dataRows.length}.`
    );
  }

  const seen = new Map();

  for (const row of dataRows) {
    if (row.cells.length !== expectedJourneyColumns.length) {
      throw new Error(
        `Summary Markdown journey row on line ${row.lineNumber} must contain exactly ${expectedJourneyColumns.length} cells.`
      );
    }

    const journeyId = normalizeReadableText(row.cells[indexes.id] ?? '');

    if (!requiredJourneyIdSet.has(journeyId)) {
      throw new Error(`Summary Markdown contains unexpected journey id on line ${row.lineNumber}.`);
    }

    seen.set(journeyId, (seen.get(journeyId) || 0) + 1);
  }

  for (const journeyId of requiredJourneyIds) {
    const count = seen.get(journeyId) || 0;

    if (count === 0) {
      throw new Error(`Summary Markdown is missing required journey id: ${journeyId}.`);
    }

    if (count > 1) {
      throw new Error(`Summary Markdown contains duplicate required journey id: ${journeyId}.`);
    }
  }

  for (const row of dataRows) {
    if (row.cells.length !== expectedJourneyColumns.length) {
      throw new Error(
        `Summary Markdown journey row on line ${row.lineNumber} must contain exactly ${expectedJourneyColumns.length} cells.`
      );
    }

    const journeyId = normalizeReadableText(row.cells[indexes.id] ?? '');
    const sourceJourney = sourceJourneys.get(journeyId);
    const summaryEvidenceCount = normalizeReadableText(row.cells[indexes.evidenceCount] ?? '');
    const expectedEvidenceCount = String(evidenceCount(sourceJourney.evidence));

    assertReadableFieldMatches(row.cells[indexes.title], sourceJourney.title, 'title', journeyId, row.lineNumber);

    if (normalizeReadableText(row.cells[indexes.status] ?? '') !== normalizeReadableText(sourceJourney.status)) {
      throw new Error(`Summary Markdown ${journeyId} status does not match the source results JSON on line ${row.lineNumber}.`);
    }

    if (summaryEvidenceCount !== expectedEvidenceCount) {
      throw new Error(
        `Summary Markdown ${journeyId} evidenceCount is ${summaryEvidenceCount || '<empty>'}; expected ${expectedEvidenceCount}.`
      );
    }

    for (const fieldName of readableJourneyFields) {
      const sourceValue = fieldName === 'blocker' ? blockerSource(sourceJourney) : sourceJourney[fieldName];
      assertReadableFieldMatches(row.cells[indexes[fieldName]], sourceValue, fieldName, journeyId, row.lineNumber);
    }
  }
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function assertNoPatternMatches(markdown, patterns, messagePrefix) {
  for (const { label, pattern } of patterns) {
    const match = pattern.exec(markdown);

    if (match) {
      throw new Error(`${messagePrefix} ${label} on line ${lineNumberForIndex(markdown, match.index)}.`);
    }
  }
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
          const text = normalizeReadableText(fragment);

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

function assertNoRawEvidenceValues(markdown, results) {
  const normalizedMarkdown = normalizeReadableText(markdown);

  for (const entry of rawEvidenceValues(results)) {
    if (normalizedMarkdown.includes(entry.text)) {
      throw new Error(
        `Summary Markdown contains prohibited raw evidence ${entry.fieldName} content from ` +
          `${entry.journeyId} evidence item ${entry.evidenceIndex + 1}.`
      );
    }
  }
}

function validateMarkdown(markdown, results) {
  assertNoPatternMatches(markdown, sensitivePatterns, 'Summary Markdown contains prohibited');
  assertNoPatternMatches(markdown, misleadingPatterns, 'Summary Markdown contains misleading claim');
  assertNoRawEvidenceValues(markdown, results);
  validateRunAndSummarySections(markdown, results);
  validateJourneyRows(markdown, results);
}

try {
  const { results, summary } = parseArgs(process.argv.slice(2));

  assertIgnoredLocalPath(
    results,
    resultsPattern,
    'Results',
    'harness/manual-test-results.local-viral-journey*.json'
  );
  assertIgnoredLocalPath(
    summary,
    summaryPattern,
    'Summary',
    'harness/manual-test-summary.local-viral-journey*.md'
  );

  runViralManualEvidenceGate(results);

  const resultsData = readJson(results);
  const summaryMarkdown = readMarkdown(summary);
  validateMarkdown(summaryMarkdown, resultsData);

  console.log('Viral manual journey summary integrity checks passed.');
  console.log(
    'This is not-UI-passed evidence, not real-device passed evidence, and not viral-journey passed evidence; ' +
      'it only checks ignored local viral journey JSON/summary source integrity.'
  );
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
