import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const requiredGitignorePatterns = [
  'harness/manual-test-results.local*.json',
  'harness/manual-evidence-artifacts/'
];

const evidenceFiles = [
  { path: 'harness/manual-test-results.example.json', required: true, json: true },
  { path: 'harness/manual-evidence-product-brief.md', required: false },
  { path: 'harness/evidence-hygiene-product-brief.md', required: false },
  { path: 'harness/evidence-redaction-checklist.md', required: false }
];

const sensitivePatterns = [
  {
    label: 'OpenAI-style sk token',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/
  },
  {
    label: 'AWS access key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/
  },
  {
    label: 'Authorization header',
    pattern: /\bAuthorization\s*:/i
  },
  {
    label: 'Bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i
  },
  {
    label: 'access token value',
    pattern: /\baccess_token\b\s*[:=]\s*["']?[^\s"',\]}]{4,}/i
  },
  {
    label: 'refresh token value',
    pattern: /\brefresh_token\b\s*[:=]\s*["']?[^\s"',\]}]{4,}/i
  },
  {
    label: 'password value',
    pattern: /\bpassword\b\s*[:=]\s*["']?[^\s"',\]}]{4,}/i
  },
  {
    label: 'cookie value',
    pattern: /\b(?:cookie\s*:|cookie\b\s*[:=]\s*["']?[^\s"',\]}]{4,})/i
  },
  {
    // Allow explanatory text that only names the cloud:// scheme, but block
    // concrete-looking CloudBase file IDs or paths after the scheme.
    label: 'concrete cloud file ID',
    pattern: /\bcloud:\/\/[^\s"'`),\]}<>]{8,}/i
  },
  {
    label: 'macOS user path',
    pattern: /\/Users\/[^\s"'`),\]}<>]+/
  },
  {
    label: 'private key value',
    pattern: /\bprivate_key\b\s*[:=]\s*["']?[^\s"',\]}]{4,}/i
  },
  {
    label: 'phone number',
    pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/
  }
];

function readText(relativePath) {
  const absolutePath = join(rootDir, relativePath);
  return readFileSync(absolutePath, 'utf8');
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function validateGitignore(errors) {
  const relativePath = '.gitignore';
  let text;

  try {
    text = readText(relativePath);
  } catch (error) {
    errors.push(`${relativePath}: unable to read file: ${error.message}`);
    return;
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  for (const pattern of requiredGitignorePatterns) {
    if (!lines.includes(pattern)) {
      errors.push(`${relativePath}: missing required ignore pattern "${pattern}".`);
    }
  }
}

function validateSensitiveContent(relativePath, text, errors) {
  for (const { label, pattern } of sensitivePatterns) {
    const match = pattern.exec(text);
    if (match) {
      errors.push(
        `${relativePath}:${lineNumberForIndex(text, match.index)} contains prohibited ${label}.`
      );
    }
  }
}

function validateExampleJourneys(relativePath, text, errors) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    errors.push(`${relativePath}: unable to parse JSON: ${error.message}`);
    return;
  }

  if (!Array.isArray(parsed.journeys)) {
    errors.push(`${relativePath}: journeys must be an array.`);
    return;
  }

  parsed.journeys.forEach((journey, index) => {
    if (journey && journey.status === 'passed') {
      const label = typeof journey.id === 'string' && journey.id.trim()
        ? `journey "${journey.id}"`
        : `journey at index ${index}`;
      errors.push(`${relativePath}: ${label} must not be marked passed in the example file.`);
    }
  });
}

function validateEvidenceFiles(errors) {
  for (const file of evidenceFiles) {
    const absolutePath = join(rootDir, file.path);

    if (!existsSync(absolutePath)) {
      if (file.required) {
        errors.push(`${file.path}: required evidence file is missing.`);
      }
      continue;
    }

    let text;

    try {
      text = readFileSync(absolutePath, 'utf8');
    } catch (error) {
      errors.push(`${file.path}: unable to read file: ${error.message}`);
      continue;
    }

    validateSensitiveContent(file.path, text, errors);

    if (file.json) {
      validateExampleJourneys(file.path, text, errors);
    }
  }
}

const errors = [];

validateGitignore(errors);
validateEvidenceFiles(errors);

if (errors.length > 0) {
  console.error('Evidence hygiene checks failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Evidence hygiene checks passed.');
