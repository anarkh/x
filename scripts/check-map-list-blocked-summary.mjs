import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const targetJourneyId = 'map-list-visual-smoke';
const readableFragmentLength = 80;

function usage() {
  return [
    'Usage: node scripts/check-map-list-blocked-summary.mjs --results <local-json> --summary <local-md>',
    '',
    'Results must match harness/manual-test-results.local*.json.',
    'Summary must match harness/manual-test-summary.local*.md.'
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

function assertIgnoredLocalPath(filePath, pattern, label, expectedGlob) {
  const relativePath = projectRelativePath(filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !pattern.test(relativePath)) {
    throw new Error(`${label} must be an ignored local file matching ${expectedGlob}: ${relativePath}`);
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

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse blocked results JSON: ${error.message}`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function validateResults(results) {
  if (!isPlainObject(results)) {
    throw new Error('Blocked results JSON must contain a top-level object.');
  }

  if (!isPlainObject(results.summary) || results.summary.overallStatus !== 'blocked') {
    throw new Error('Blocked results JSON must have summary.overallStatus set to "blocked".');
  }

  if (!Array.isArray(results.journeys)) {
    throw new Error('Blocked results JSON must contain a journeys array.');
  }

  const targetJourneys = results.journeys.filter((journey) => journey?.id === targetJourneyId);

  if (targetJourneys.length !== 1) {
    throw new Error(`Expected exactly one ${targetJourneyId} journey; found ${targetJourneys.length}.`);
  }

  const passedCount = results.journeys.filter((journey) => journey?.status === 'passed').length;

  if (passedCount !== 0) {
    throw new Error(`Blocked results JSON must not contain passed journeys; found ${passedCount}.`);
  }

  const targetJourney = targetJourneys[0];

  if (targetJourney.status !== 'blocked') {
    throw new Error(`${targetJourneyId} must have status "blocked"; found "${targetJourney.status}".`);
  }

  const targetEvidenceCount = evidenceCount(targetJourney.evidence);

  if (targetEvidenceCount !== 0) {
    throw new Error(`${targetJourneyId} must have evidence count 0; found ${targetEvidenceCount}.`);
  }

  return targetJourney;
}

function readMarkdown(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read blocked summary Markdown: ${error.message}`);
  }
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();

  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return null;
  }

  const cells = [];
  let current = '';
  let escaped = false;

  // Split on unescaped pipes only; generated summaries escape literal pipes in cell text.
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

function normalizeReadableText(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeReadableText).filter(Boolean).join(' ');
  }

  if (value === undefined || value === null) {
    return '';
  }

  // Summary cells use <br> for arrays/newlines and escape literal pipes.
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replaceAll('\\|', '|')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparisonText(value) {
  return normalizeReadableText(value).toLowerCase();
}

function readableFragment(value, label) {
  const normalized = normalizeReadableText(value);

  if (!normalized) {
    throw new Error(`${label} must not be empty.`);
  }

  return normalized.slice(0, readableFragmentLength);
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

function validateRunSection(markdown, results) {
  for (const fieldName of ['branch', 'commit']) {
    const { value, lineNumber } = sectionFieldValue(markdown, 'Run', fieldName);
    const summaryValue = normalizeReadableText(value);
    const jsonValue = normalizeReadableText(results[fieldName]);

    if (summaryValue !== jsonValue) {
      throw new Error(
        `Summary Markdown Run ${fieldName} must match blocked results JSON ${fieldName}; ` +
          `found "${summaryValue}" on line ${lineNumber}, expected "${jsonValue}".`
      );
    }
  }
}

function validateSummarySection(markdown) {
  const overallRows = rowsInSection(markdown, 'Summary').filter(
    ({ cells }) => cells[0] === 'overallStatus'
  );

  if (overallRows.length !== 1) {
    throw new Error(`Summary Markdown must contain exactly one overallStatus row; found ${overallRows.length}.`);
  }

  const [, overallStatus] = overallRows[0].cells;

  if (overallStatus !== 'blocked') {
    throw new Error(
      `Summary Markdown overallStatus must be "blocked"; found "${overallStatus}" on line ${overallRows[0].lineNumber}.`
    );
  }
}

function journeyColumnIndexes(headerCells) {
  const idIndex = headerCells.indexOf('id');
  const statusIndex = headerCells.indexOf('status');
  const actualIndex = headerCells.indexOf('actual');
  const evidenceCountIndex = headerCells.indexOf('evidenceCount');
  const blockerIndex = headerCells.indexOf('blocker');
  const followUpIndex = headerCells.indexOf('followUp');

  if (idIndex === -1 || statusIndex === -1 || evidenceCountIndex === -1) {
    throw new Error('Summary Markdown journeys table must include id, status, and evidenceCount columns.');
  }

  if (actualIndex === -1 || blockerIndex === -1 || followUpIndex === -1) {
    throw new Error('Summary Markdown journeys table must include actual, blocker, and followUp columns.');
  }

  return { idIndex, statusIndex, actualIndex, evidenceCountIndex, blockerIndex, followUpIndex };
}

function assertCellContainsJsonFragment(cellValue, jsonValue, label, lineNumber) {
  const expectedFragment = readableFragment(jsonValue, `Blocked results JSON ${targetJourneyId} ${label}`);

  if (!comparisonText(cellValue).includes(expectedFragment.toLowerCase())) {
    throw new Error(
      `${targetJourneyId} summary row ${label} must include the matching JSON ${label} fragment ` +
        `on line ${lineNumber}.`
    );
  }
}

function riskFragments(risks) {
  const riskValues = Array.isArray(risks) ? risks : [risks];
  const fragments = [];

  for (const risk of riskValues) {
    const normalized = normalizeReadableText(risk);

    if (!normalized) {
      continue;
    }

    fragments.push(normalized.slice(0, readableFragmentLength));

    for (const phrase of normalized.split(/[.,;，。；]/)) {
      const trimmed = phrase.trim();

      if (trimmed.length >= 24) {
        fragments.push(trimmed.slice(0, readableFragmentLength));
      }
    }
  }

  return fragments;
}

function validateBlockerCell(blockerCell, risks, lineNumber) {
  const blockerText = normalizeReadableText(blockerCell);

  if (!blockerText) {
    throw new Error(`${targetJourneyId} summary row blocker must not be empty on line ${lineNumber}.`);
  }

  const fragments = riskFragments(risks);

  if (fragments.length === 0) {
    throw new Error(`Blocked results JSON ${targetJourneyId} risks must include at least one readable risk phrase.`);
  }

  const normalizedBlocker = blockerText.toLowerCase();

  if (!fragments.some((fragment) => normalizedBlocker.includes(fragment.toLowerCase()))) {
    throw new Error(
      `${targetJourneyId} summary row blocker must include at least one JSON risk phrase on line ${lineNumber}.`
    );
  }
}

function validateJourneySection(markdown, targetJourney) {
  const journeyRows = rowsInSection(markdown, 'Journeys');

  if (journeyRows.length === 0) {
    throw new Error('Summary Markdown must contain a Journeys table.');
  }

  const header = journeyRows[0].cells;
  const { idIndex, statusIndex, actualIndex, evidenceCountIndex, blockerIndex, followUpIndex } =
    journeyColumnIndexes(header);
  const targetRows = journeyRows.slice(1).filter(({ cells }) => cells[idIndex] === targetJourneyId);

  if (targetRows.length !== 1) {
    throw new Error(`Summary Markdown must contain exactly one ${targetJourneyId} row; found ${targetRows.length}.`);
  }

  const targetRow = targetRows[0];
  const status = targetRow.cells[statusIndex];
  const actual = targetRow.cells[actualIndex] ?? '';
  const summaryEvidenceCount = targetRow.cells[evidenceCountIndex];
  const blocker = targetRow.cells[blockerIndex] ?? '';
  const followUp = targetRow.cells[followUpIndex] ?? '';

  if (status === 'passed') {
    throw new Error(`${targetJourneyId} summary row must not be passed; found passed on line ${targetRow.lineNumber}.`);
  }

  if (status !== 'blocked') {
    throw new Error(
      `${targetJourneyId} summary row status must be "blocked"; found "${status}" on line ${targetRow.lineNumber}.`
    );
  }

  if (summaryEvidenceCount !== '0') {
    throw new Error(
      `${targetJourneyId} summary row evidenceCount must be 0; found "${summaryEvidenceCount}" on line ${targetRow.lineNumber}.`
    );
  }

  assertCellContainsJsonFragment(actual, targetJourney.actual, 'actual', targetRow.lineNumber);
  assertCellContainsJsonFragment(followUp, targetJourney.followUp, 'followUp', targetRow.lineNumber);
  validateBlockerCell(blocker, targetJourney.risks, targetRow.lineNumber);
}

function validateMarkdown(markdown, results, targetJourney) {
  validateSummarySection(markdown);
  validateRunSection(markdown, results);
  validateJourneySection(markdown, targetJourney);
}

try {
  const { results, summary } = parseArgs(process.argv.slice(2));

  assertIgnoredLocalPath(
    results,
    /^harness\/manual-test-results\.local.*\.json$/,
    'Results',
    'harness/manual-test-results.local*.json'
  );
  assertIgnoredLocalPath(
    summary,
    /^harness\/manual-test-summary\.local.*\.md$/,
    'Summary',
    'harness/manual-test-summary.local*.md'
  );

  runGate('scripts/check-manual-evidence.mjs', [results]);
  runGate('scripts/check-evidence-hygiene.mjs');

  const resultsData = readJson(results);
  const targetJourney = validateResults(resultsData);
  validateMarkdown(readMarkdown(summary), resultsData, targetJourney);

  console.log('Map-list blocked summary checks passed.');
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(1);
}
