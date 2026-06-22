import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const resultsPattern = /^harness\/manual-test-results\.local-viral-journey.*\.json$/;
const manifestPattern = /^harness\/manual-artifact-manifest\.local-viral-journey.*\.json$/;
const schemaVersion = 'viral-manual-artifact-manifest.v1';
const allowedStatuses = new Set(['passed', 'failed', 'blocked']);
const allowedArtifactStatuses = new Set(['present', 'blocked', 'not_applicable']);
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
const slotRequirementsByJourney = new Map([
  ['first-hop-share-entry', {
    required: ['screenshot', 'device-observation', 'risk-state-note'],
    conditional: ['payload-sample'],
    optional: ['recording', 'cloud-readback']
  }],
  ['receiver-confirm-conversion', {
    required: ['recording', 'screenshot', 'payload-sample', 'device-observation', 'risk-state-note'],
    conditional: ['cloud-readback'],
    optional: []
  }],
  ['receiver-comment-conversion', {
    required: ['recording', 'screenshot', 'payload-sample', 'device-observation', 'risk-state-note'],
    conditional: ['cloud-readback'],
    optional: []
  }],
  ['second-hop-receiver-source', {
    required: ['screenshot', 'payload-sample', 'device-observation', 'risk-state-note'],
    conditional: [],
    optional: ['recording', 'cloud-readback']
  }],
  ['ordinary-and-risk-entries', {
    required: ['screenshot', 'risk-state-note', 'device-observation'],
    conditional: ['cloud-readback'],
    optional: ['recording', 'payload-sample']
  }],
  ['timeline-share-channel', {
    required: ['recording', 'screenshot', 'payload-sample', 'device-observation', 'risk-state-note'],
    conditional: [],
    optional: ['cloud-readback']
  }],
  ['timeline-risk-gating', {
    required: ['screenshot', 'risk-state-note', 'device-observation'],
    conditional: ['payload-sample', 'cloud-readback'],
    optional: ['recording']
  }]
]);
const payloadFieldRequirements = new Map([
  ['first-hop-share-entry', ['id', 'from']],
  ['receiver-confirm-conversion', ['from', 'source', 'receiverAction', 'share_id', 'parent_share_id', 'share_depth']],
  ['receiver-comment-conversion', ['from', 'source', 'receiverAction', 'share_id', 'parent_share_id', 'share_depth']],
  ['second-hop-receiver-source', ['from', 'source', 'receiverAction']],
  ['timeline-share-channel', ['id', 'from', 'source', 'shareChannel', 'title', 'imageUrl']],
  ['timeline-risk-gating', ['title', 'source', 'shareChannel']]
]);
const cloudReadbackFieldRequirements = new Map([
  ['receiver-confirm-conversion', ['event.action', 'event.source', 'event.depth', 'post.confirmations']],
  ['receiver-comment-conversion', ['event.action', 'event.source', 'event.depth', 'comment.count']],
  ['ordinary-and-risk-entries', ['post.status']],
  ['timeline-risk-gating', ['post.status']]
]);
const concreteMinLength = 2;

const sensitivePatterns = [
  { label: 'cloud evidence URI', pattern: /cloud:\/\//i },
  { label: 'raw mini program payload path', pattern: /\/pages\/[A-Za-z0-9/_-]+\?[^|\s"`]+/i },
  { label: 'raw viral payload query value', pattern: /\b(?:(?:share_id|shareId|parent_share_id|parentShareId|share_depth|shareDepth|receiverAction|shareChannel)=[^\s|"`]*|from=share|source=(?:receiver|timeline))\b/i },
  { label: 'local macOS user path', pattern: /\/Users\// },
  { label: 'private tmp path', pattern: /\/private\/tmp\// },
  { label: 'temporary tmp path', pattern: /\/tmp\/street-tasks-iter-worktrees\// },
  { label: 'raw URL', pattern: /\b(?:https?|file|wxfile):\/\//i },
  { label: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: 'private WeChat AppID', pattern: /\bwx[0-9a-f]{16}\b/i },
  { label: 'precise coordinate pair', pattern: /(?<!\d)-?(?:[1-8]?\d(?:\.\d{4,})|90(?:\.0{4,})?)\s*,\s*-?(?:(?:1[0-7]\d|[1-9]?\d)(?:\.\d{4,})|180(?:\.0{4,})?)(?!\d)/ },
  { label: 'precise latitude JSON value', pattern: /"(?:lat|latitude|纬度)"\s*:\s*-?\d{1,2}\.\d{4,}/i },
  { label: 'precise longitude JSON value', pattern: /"(?:lng|lon|longitude|经度)"\s*:\s*-?\d{2,3}\.\d{4,}/i },
  { label: 'CloudBase environment id field', pattern: /"(?:environmentId|environment_id|envId|env_id|cloudBaseEnv|cloudbaseEnv|cloud_base_env)"\s*:\s*"(?!none(?:\s+for\s+blocked\s+draft)?|not recorded|not selected|local(?:\s+draft)?|blocked|redacted)[^"]{4,}"/i },
  { label: 'identity field value', pattern: /"(?:nickName|nick_name|nickname|publisher|publisherName|publisher_name|avatarUrl|avatar_url|publisherAvatarUrl|publisher_avatar_url|realName|real_name|真实昵称|头像|wxid|wechatId|wechat_id)"\s*:\s*"(?!anonymous|匿名|not recorded|redacted)[^"]{2,}"/i },
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
  { label: 'readiness passed so UI passed', pattern: /\breadiness\s+passed\s+so\s+UI\s+passed\b/i },
  { label: 'manifest proves UI passed', pattern: /\bmanifest\s+proves\s+UI\s+passed\b/i },
  { label: 'DevTools UI passed by manifest', pattern: /\bDevTools\s+UI\s+passed\s+by\s+manifest\b/i },
  { label: 'plain DevTools UI passed claim', pattern: /(?:^|[^A-Za-z-])DevTools\s+UI\s+passed\b/i },
  { label: 'plain real-device passed claim', pattern: /(?:^|[^A-Za-z-])real[- ]?device\s+passed\b/i },
  { label: 'Chinese UI passed claim', pattern: /(?:真机|真实设备|UI|界面|DevTools|微信开发者工具|裂变旅程|朋友圈|CloudBase|云开发).{0,8}(?:已通过|通过)/i }
];

const bannedArtifactKeyPatterns = [
  /^(?:path|url|value|rawValue|rawPayload|payload|query|file)$/i,
  /(?:file|local|cloud|screenshot|recording).*path/i,
  /^cloud(?:Uri|Url|FileId|Path)$/i,
  /^event(?:Id|Value)$/i,
  /^(?:openId|openid|unionId|unionid|wxid|wechatId)$/i,
  /^(?:lat|latitude|lng|lon|longitude|address|location|coord|coordinate|coordinates)$/i,
  /^(?:environmentId|envId|cloudBaseEnv|cloudbaseEnv|appId|appid)$/i,
  /^(?:nickName|nickname|publisher|publisherName|avatarUrl|publisherAvatarUrl|realName|phone|email)$/i,
  /(?:token|cookie|session|password|secret|authorization|bearer)/i
];
const sensitiveObservedFieldPatterns = [
  /(^|\.)?(?:lat|latitude|lng|lon|longitude|coord|coordinate|coordinates|address|location)$/i,
  /(^|\.)?(?:environmentId|envId|cloudBaseEnv|cloudbaseEnv|appId|appid)$/i,
  /(^|\.)?(?:openId|openid|unionId|unionid|wxid|wechatId)$/i,
  /(^|\.)?(?:nickName|nickname|publisher|publisherName|avatarUrl|publisherAvatarUrl|realName|phone|email)$/i,
  /(?:access[_-]?token|refresh[_-]?token|token|cookie|session|password|secret|authorization|bearer|private[_-]?key)/i,
  /(?:rawValue|rawPayload|rawPath|rawQuery|cloudUri|cloudUrl|cloudFileId|fileId)$/i
];
const sensitiveCanonicalFieldNames = new Set([
  'lat',
  'latitude',
  'lng',
  'lon',
  'longitude',
  'coord',
  'coordinate',
  'coordinates',
  'address',
  'location',
  'environmentid',
  'envid',
  'cloudbaseenv',
  'appid',
  'openid',
  'unionid',
  'wxid',
  'wechatid',
  'nickname',
  'publisher',
  'publishername',
  'avatarurl',
  'publisheravatarurl',
  'realname',
  'phone',
  'phonenumber',
  'email',
  'rawvalue',
  'rawpayload',
  'rawpath',
  'rawquery',
  'clouduri',
  'cloudurl',
  'cloudfileid',
  'cloudpath',
  'fileid',
  'eventid',
  'eventvalue'
]);
const unableToInspectPattern = /(无法|不能|不可|未能|无法触发|无法检查|无法查看|unable|cannot|could not|not exposed|unavailable)/i;
const notApplicablePattern = /(not[_ -]?applicable|not applicable|not required|local fallback|local-only|本地|不适用|无需|无法检查|not exposed|unavailable)/i;

function usage() {
  return [
    'Usage: node scripts/check-viral-manual-artifact-manifest.mjs --results <local-json> --manifest <local-json>',
    '',
    'Results must match harness/manual-test-results.local-viral-journey*.json.',
    'Manifest must match harness/manual-artifact-manifest.local-viral-journey*.json.',
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

    if (arg === '--results' || arg === '--manifest') {
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

  if (!options.manifest) {
    throw new Error('--manifest is required.');
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
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>');
}

function runViralManualEvidenceGate(resultsPath) {
  const result = spawnSync(
    process.execPath,
    ['--no-warnings', 'scripts/check-viral-journey-manual-evidence.mjs', projectRelativePath(resultsPath)],
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

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse ${label}: ${error.message}`);
  }
}

function readText(filePath, label) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${error.message}`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isConcrete(value) {
  return typeof value === 'string'
    ? value.trim().length >= concreteMinLength && !/(?:TODO|待填写|占位|placeholder|replace-with)/i.test(value)
    : value !== null && value !== undefined;
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

function journeysById(journeys, label) {
  if (!Array.isArray(journeys)) {
    throw new Error(`${label}.journeys must be an array.`);
  }

  if (journeys.length !== requiredJourneyIds.length) {
    throw new Error(`${label}.journeys must contain exactly ${requiredJourneyIds.length} viral journeys; found ${journeys.length}.`);
  }

  const map = new Map();

  for (const journey of journeys) {
    if (!isPlainObject(journey) || !requiredJourneyIdSet.has(journey.id)) {
      throw new Error(`${label}.journeys contains unexpected journey id: ${journey?.id || '<missing>'}.`);
    }

    if (map.has(journey.id)) {
      throw new Error(`${label}.journeys contains duplicate journey id: ${journey.id}.`);
    }

    map.set(journey.id, journey);
  }

  for (const journeyId of requiredJourneyIds) {
    if (!map.has(journeyId)) {
      throw new Error(`${label}.journeys is missing required journey id: ${journeyId}.`);
    }
  }

  return map;
}

function assertNoPatterns(text) {
  for (const { label, pattern } of [...sensitivePatterns, ...misleadingPatterns]) {
    if (pattern.test(text)) {
      throw new Error(`Artifact manifest contains ${label}; store only redacted artifact refs and field names.`);
    }
  }
}

function parseStringToken(text, startIndex) {
  let index = startIndex + 1;
  let escaped = false;

  for (; index < text.length; index += 1) {
    const character = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '"') {
      const literal = text.slice(startIndex, index + 1);
      return {
        value: JSON.parse(literal),
        nextIndex: index + 1
      };
    }
  }

  throw new Error('Artifact manifest contains an unterminated JSON string.');
}

function skipPrimitive(text, startIndex) {
  let index = startIndex;

  while (index < text.length && !/[\s,\]}]/.test(text[index])) {
    index += 1;
  }

  return index;
}

function markJsonValueComplete(stack) {
  const parent = stack.at(-1);

  if (!parent) {
    return;
  }

  if (parent.type === 'array') {
    parent.expecting = 'commaOrEnd';
    return;
  }

  if (parent.type === 'object' && parent.expecting === 'value') {
    parent.expecting = 'commaOrEnd';
  }
}

function assertNoDuplicateJsonKeys(text) {
  const stack = [];

  for (let index = 0; index < text.length;) {
    const character = text[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    const current = stack.at(-1);

    if (character === '{') {
      stack.push({ type: 'object', keys: new Set(), expecting: 'keyOrEnd' });
      index += 1;
      continue;
    }

    if (character === '[') {
      stack.push({ type: 'array', expecting: 'valueOrEnd' });
      index += 1;
      continue;
    }

    if (character === '}') {
      if (current?.type === 'object') {
        stack.pop();
        index += 1;
        markJsonValueComplete(stack);
        continue;
      }
    }

    if (character === ']') {
      if (current?.type === 'array') {
        stack.pop();
        index += 1;
        markJsonValueComplete(stack);
        continue;
      }
    }

    if (character === ',') {
      if (current?.expecting === 'commaOrEnd') {
        current.expecting = current.type === 'object' ? 'keyOrEnd' : 'value';
      }
      index += 1;
      continue;
    }

    if (character === ':') {
      if (current?.type === 'object' && current.expecting === 'colon') {
        current.expecting = 'value';
      }
      index += 1;
      continue;
    }

    if (character === '"') {
      const token = parseStringToken(text, index);

      if (current?.type === 'object' && current.expecting === 'keyOrEnd') {
        if (current.keys.has(token.value)) {
          throw new Error(`Artifact manifest contains duplicate JSON key "${token.value}".`);
        }

        current.keys.add(token.value);
        current.expecting = 'colon';
      } else {
        markJsonValueComplete(stack);
      }

      index = token.nextIndex;
      continue;
    }

    index = skipPrimitive(text, index);
    markJsonValueComplete(stack);
  }
}

function assertNoBannedKeys(value, path = 'manifest') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoBannedKeys(item, `${path}[${index}]`));
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, entryValue] of Object.entries(value)) {
    if (bannedArtifactKeyPatterns.some((pattern) => pattern.test(key)) || isSensitiveFieldName(key)) {
      throw new Error(`${path}.${key} is not allowed in artifact manifests; use redacted artifactRef and fieldsObserved only.`);
    }

    assertNoBannedKeys(entryValue, `${path}.${key}`);
  }
}

function normalizeFieldName(field) {
  return String(field || '').trim();
}

function canonicalFieldName(field) {
  return normalizeFieldName(field).replace(/[._-]/g, '').toLowerCase();
}

function isSensitiveFieldName(field) {
  const normalized = normalizeFieldName(field);
  const canonical = canonicalFieldName(field);

  return sensitiveCanonicalFieldNames.has(canonical) ||
    sensitiveObservedFieldPatterns.some((pattern) => pattern.test(normalized));
}

function assertSafeFieldNames(fields, label) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error(`${label}.fieldsObserved must be a non-empty array of field names.`);
  }

  for (const field of fields) {
    const text = normalizeFieldName(field);

    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,64}$/.test(text)) {
      throw new Error(`${label}.fieldsObserved contains an unsafe field name: ${text || '<empty>'}.`);
    }

    if (isSensitiveFieldName(text)) {
      throw new Error(`${label}.fieldsObserved contains sensitive field name: ${text}.`);
    }
  }
}

function assertRequiredFieldsObserved(artifact, journeyId, label) {
  const requiredFields = payloadFieldRequirements.get(journeyId);

  if (artifact.slot === 'payload-sample' && requiredFields) {
    const observed = new Set((artifact.fieldsObserved || []).map(normalizeFieldName));
    for (const field of requiredFields) {
      if (!observed.has(field)) {
        throw new Error(`${label}.fieldsObserved must include ${field}.`);
      }
    }
  }

  if (artifact.slot === 'cloud-readback') {
    const requiredCloudFields = cloudReadbackFieldRequirements.get(journeyId);
    const observed = new Set((artifact.fieldsObserved || []).map(normalizeFieldName));

    if (requiredCloudFields) {
      for (const field of requiredCloudFields) {
        if (!observed.has(field)) {
          throw new Error(`${label}.fieldsObserved must include ${field}.`);
        }
      }
      return;
    }

    if (![...observed].some((field) => field.startsWith('event.') || field.startsWith('post.') || field.startsWith('comment.'))) {
      throw new Error(`${label}.fieldsObserved must include CloudBase readback field names.`);
    }
  }
}

function validatePresentArtifact(artifact, journeyId, slot, label) {
  for (const field of ['description', 'artifactRef', 'redaction', 'reviewerNote']) {
    if (!isConcrete(artifact[field])) {
      throw new Error(`${label} is present but missing concrete ${field}.`);
    }
  }

  const expectedRef = `artifact:${journeyId}:${slot}`;
  if (artifact.artifactRef !== expectedRef) {
    throw new Error(`${label}.artifactRef must be "${expectedRef}".`);
  }

  if (!/(?:redacted|已脱敏|脱敏)/i.test(artifact.redaction)) {
    throw new Error(`${label}.redaction must state that the attachment is redacted.`);
  }

  if (slot === 'payload-sample' || slot === 'cloud-readback') {
    assertSafeFieldNames(artifact.fieldsObserved, label);
    assertRequiredFieldsObserved(artifact, journeyId, label);
  }
}

function validateNonPresentArtifact(artifact, label) {
  for (const field of ['blocker', 'followUp']) {
    if (!isConcrete(artifact[field])) {
      throw new Error(`${label} is ${artifact.status} but missing concrete ${field}.`);
    }
  }

  if (artifact.status === 'not_applicable') {
    const reason = normalizeText([artifact.blocker, artifact.followUp]);

    if (!notApplicablePattern.test(reason)) {
      throw new Error(`${label} is not_applicable but does not explain why the slot is not applicable.`);
    }
  }
}

function slotRequirements(journeyId) {
  const requirements = slotRequirementsByJourney.get(journeyId);

  if (!requirements) {
    throw new Error(`No artifact slot requirements registered for ${journeyId}.`);
  }

  return requirements;
}

function allAllowedSlots(requirements) {
  return [...requirements.required, ...requirements.conditional, ...requirements.optional];
}

function normalizeText(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean).join(' ');
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map(normalizeText).filter(Boolean).join(' ');
  }

  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function sourceBlockerText(sourceJourney) {
  if (sourceJourney.status === 'blocked') {
    return normalizeText(sourceJourney.blocker || sourceJourney.risks);
  }

  if (sourceJourney.status === 'failed') {
    return normalizeText(sourceJourney.actual);
  }

  return '';
}

function assertSourceReasonAlignment(manifestJourney, sourceJourney, label) {
  if (sourceJourney.status === 'passed') {
    return;
  }

  const expectedBlocker = sourceBlockerText(sourceJourney);
  const expectedFollowUp = normalizeText(sourceJourney.followUp);
  const actualBlocker = normalizeText(manifestJourney.sourceBlocker || manifestJourney.blocker);
  const actualFollowUp = normalizeText(manifestJourney.sourceFollowUp || manifestJourney.followUp);

  if (!expectedBlocker || !actualBlocker || actualBlocker !== expectedBlocker) {
    throw new Error(`${label} must include sourceBlocker or blocker matching the source results.`);
  }

  if (!expectedFollowUp || !actualFollowUp || actualFollowUp !== expectedFollowUp) {
    throw new Error(`${label} must include sourceFollowUp or followUp matching the source results.`);
  }
}

function conditionalSlotTriggered(slot, journeyId, sourceJourney, results) {
  if (slot === 'cloud-readback') {
    return Boolean(results.environment?.cloudBase?.enabled || results.environment?.cloudBase?.postsFunctionDeployed);
  }

  if (slot !== 'payload-sample') {
    return false;
  }

  const payloadFields = [
    sourceJourney.sharePayload,
    sourceJourney.timelinePayload
  ];

  if (payloadFields.some((value) => isPlainObject(value) && Object.keys(value).length > 0)) {
    return true;
  }

  const payloadText = normalizeText([
    sourceJourney.sharePayloadInspection,
    sourceJourney.timelinePayloadInspection,
    sourceJourney.timelineMenuInspection,
    sourceJourney.actual,
    sourceJourney.evidence
  ]);

  return /(payload|query|path|onShareTimeline|shareChannel|receiverAction|share_id|parent_share_id|share_depth)/i.test(payloadText) &&
    !unableToInspectPattern.test(payloadText);
}

function validateArtifactByRequirement(artifact, journeyId, slot, requirement, sourceJourney, results, label) {
  if (!allowedArtifactStatuses.has(artifact.status)) {
    throw new Error(`${label}.status has invalid value: ${artifact.status}.`);
  }

  const sourceStatus = sourceJourney.status;

  if (sourceStatus === 'passed' && requirement === 'required' && artifact.status !== 'present') {
    throw new Error(`${label} must be present because the source journey is passed and the slot is required.`);
  }

  if (
    sourceStatus === 'passed' &&
    requirement === 'conditional' &&
    conditionalSlotTriggered(slot, journeyId, sourceJourney, results) &&
    artifact.status !== 'present'
  ) {
    throw new Error(`${label} must be present because the source journey is passed and the conditional slot is triggered.`);
  }

  if (sourceStatus === 'passed' && requirement === 'conditional' && artifact.status === 'blocked') {
    throw new Error(`${label} must be present or not_applicable because the source journey is passed and the slot is conditional.`);
  }

  if (artifact.status === 'present') {
    validatePresentArtifact(artifact, journeyId, slot, label);
    return;
  }

  validateNonPresentArtifact(artifact, label);
}

function validateJourneyArtifacts(manifestJourney, sourceJourney, results) {
  const journeyId = sourceJourney.id;
  const label = `manifest journey ${journeyId}`;

  if (!allowedStatuses.has(manifestJourney.status)) {
    throw new Error(`${label}.status has invalid value: ${manifestJourney.status}.`);
  }

  if (manifestJourney.status !== sourceJourney.status) {
    throw new Error(`${label}.status must match source results status "${sourceJourney.status}".`);
  }

  if (manifestJourney.sourceEvidenceCount !== evidenceCount(sourceJourney.evidence)) {
    throw new Error(`${label}.sourceEvidenceCount must match source results evidence count.`);
  }

  assertSourceReasonAlignment(manifestJourney, sourceJourney, label);

  if (!Array.isArray(manifestJourney.artifacts)) {
    throw new Error(`${label}.artifacts must be an array.`);
  }

  const requirements = slotRequirements(journeyId);
  const allowedSlots = allAllowedSlots(requirements);
  const requiredPresenceSlots = [...requirements.required, ...requirements.conditional];
  const artifactsBySlot = new Map();

  for (const artifact of manifestJourney.artifacts) {
    if (!isPlainObject(artifact)) {
      throw new Error(`${label}.artifacts must contain objects only.`);
    }

    if (!allowedSlots.includes(artifact.slot)) {
      throw new Error(`${label} contains unexpected artifact slot: ${artifact.slot || '<missing>'}.`);
    }

    if (artifactsBySlot.has(artifact.slot)) {
      throw new Error(`${label} contains duplicate artifact slot: ${artifact.slot}.`);
    }

    artifactsBySlot.set(artifact.slot, artifact);
  }

  for (const slot of requiredPresenceSlots) {
    if (!artifactsBySlot.has(slot)) {
      throw new Error(`${label} is missing required artifact slot: ${slot}.`);
    }
  }

  for (const [slot, artifact] of artifactsBySlot.entries()) {
    const requirement = requirements.required.includes(slot)
      ? 'required'
      : (requirements.conditional.includes(slot) ? 'conditional' : 'optional');
    const artifactLabel = `${label}.${slot}`;
    validateArtifactByRequirement(artifact, journeyId, slot, requirement, sourceJourney, results, artifactLabel);
  }
}

function validateTopLevel(manifest, results, resultsPath) {
  if (!isPlainObject(manifest)) {
    throw new Error('Artifact manifest must contain a top-level object.');
  }

  if (manifest.schemaVersion !== schemaVersion) {
    throw new Error(`schemaVersion must be "${schemaVersion}", got "${manifest.schemaVersion}".`);
  }

  if (manifest.resultsFile !== projectRelativePath(resultsPath)) {
    throw new Error(`manifest.resultsFile must equal ${projectRelativePath(resultsPath)}.`);
  }

  for (const field of ['branch', 'commit', 'createdAt', 'notClaimed']) {
    if (typeof manifest[field] !== 'string' || !isConcrete(manifest[field])) {
      throw new Error(`manifest.${field} must be a concrete string.`);
    }
  }

  if (Number.isNaN(Date.parse(manifest.createdAt))) {
    throw new Error('manifest.createdAt must be an ISO-8601-compatible timestamp.');
  }

  if (manifest.branch !== results.branch) {
    throw new Error(`manifest.branch must match source results branch "${results.branch}".`);
  }

  if (manifest.commit !== results.commit) {
    throw new Error(`manifest.commit must match source results commit "${results.commit}".`);
  }

  if (manifest.overallStatus !== results.summary?.overallStatus) {
    throw new Error('manifest.overallStatus must match source results summary.overallStatus.');
  }

  for (const phrase of [
    'no DevTools UI journey passed',
    'no real-device journey passed',
    'no viral journey passed',
    'not UI passed evidence',
    'does not prove',
    'manual evidence'
  ]) {
    if (!manifest.notClaimed.includes(phrase)) {
      throw new Error(`manifest.notClaimed must include "${phrase}".`);
    }
  }
}

function validateManifest(resultsPath, manifestPath) {
  assertIgnoredLocalPath(resultsPath, resultsPattern, 'Results JSON', 'harness/manual-test-results.local-viral-journey*.json');
  assertIgnoredLocalPath(manifestPath, manifestPattern, 'Artifact manifest JSON', 'harness/manual-artifact-manifest.local-viral-journey*.json');
  runViralManualEvidenceGate(resultsPath);

  const results = readJson(resultsPath, 'results JSON');
  const rawManifestText = readText(manifestPath, 'artifact manifest JSON');
  assertNoPatterns(rawManifestText);
  assertNoDuplicateJsonKeys(rawManifestText);
  const manifest = JSON.parse(rawManifestText);
  const manifestText = JSON.stringify(manifest, null, 2);

  assertNoPatterns(manifestText);
  assertNoBannedKeys(manifest);
  validateTopLevel(manifest, results, resultsPath);

  const sourceJourneys = journeysById(results.journeys, 'results');
  const manifestJourneys = journeysById(manifest.journeys, 'manifest');

  for (const journeyId of requiredJourneyIds) {
    validateJourneyArtifacts(manifestJourneys.get(journeyId), sourceJourneys.get(journeyId), results);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  validateManifest(options.results, options.manifest);
  console.log('Viral manual artifact manifest checks passed.');
  console.log('This validates an ignored local artifact manifest only; it is not UI passed evidence and does not prove real-device acceptance.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
