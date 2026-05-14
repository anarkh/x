import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'AGENTS.md',
  'harness/README.md',
  'harness/init.sh',
  'harness/feature_list.json',
  'harness/claude-progress.md',
  'harness/session-handoff.md',
  'harness/clean-state-checklist.md',
  'harness/evaluator-rubric.md',
  'harness/quality-document.md'
];

const forbiddenRootHarnessFiles = [
  'init.sh',
  'feature_list.json',
  'claude-progress.md',
  'session-handoff.md',
  'clean-state-checklist.md',
  'evaluator-rubric.md',
  'quality-document.md'
];

const allowedStatuses = new Set(['not_started', 'in_progress', 'blocked', 'passing']);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of requiredFiles) {
  assert(existsSync(file), `Missing required harness file: ${file}`);
}

for (const file of forbiddenRootHarnessFiles) {
  assert(!existsSync(file), `Harness file should live under harness/, not repo root: ${file}`);
}

const agents = readFileSync('AGENTS.md', 'utf8');
assert(agents.includes('bash harness/init.sh'), 'AGENTS.md must point agents at bash harness/init.sh');
assert(agents.includes('harness/feature_list.json'), 'AGENTS.md must mention harness/feature_list.json');
assert(agents.includes('harness/claude-progress.md'), 'AGENTS.md must mention harness/claude-progress.md');

const progress = readFileSync('harness/claude-progress.md', 'utf8');
assert(progress.includes('## 当前已验证状态'), 'claude-progress.md must include current verified state');
assert(progress.includes('## 会话记录'), 'claude-progress.md must include session records');

const featureList = JSON.parse(readFileSync('harness/feature_list.json', 'utf8'));
assert(featureList.project, 'feature_list.json must include project');
assert(featureList.last_updated, 'feature_list.json must include last_updated');
assert(Array.isArray(featureList.features), 'feature_list.json must include features array');

let activeCount = 0;
for (const feature of featureList.features) {
  assert(feature.id, 'Every feature must include id');
  assert(Number.isInteger(feature.priority), `${feature.id} priority must be an integer`);
  assert(feature.area, `${feature.id} must include area`);
  assert(feature.title, `${feature.id} must include title`);
  assert(feature.user_visible_behavior, `${feature.id} must include user_visible_behavior`);
  assert(allowedStatuses.has(feature.status), `${feature.id} has invalid status: ${feature.status}`);
  assert(Array.isArray(feature.verification) && feature.verification.length > 0, `${feature.id} needs verification steps`);
  assert(Array.isArray(feature.evidence), `${feature.id} evidence must be an array`);
  if (feature.status === 'in_progress') {
    activeCount += 1;
  }
  if (feature.status === 'passing') {
    assert(feature.evidence.length > 0, `${feature.id} is passing but has no evidence`);
  }
}

assert(activeCount <= 1, 'Only one feature can be in_progress');

console.log(`Harness OK: ${featureList.features.length} features checked.`);
