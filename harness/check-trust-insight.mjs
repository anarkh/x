import assert from 'node:assert/strict';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { formatTrustInsight } = await import('../utils/format.js');

function insight(overrides = {}, commentCount = 0) {
  return formatTrustInsight({
    status: 'active',
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    lastConfirmedAt: 0,
    ...overrides
  }, commentCount);
}

function assertSignalNotesAreShort(result) {
  for (const signal of result.signals) {
    assert(
      signal.note.length <= 6,
      `${signal.key} note is too long for the four-metric row: ${signal.note}`
    );
  }
}

{
  const result = insight({ confirmations: 4, lastConfirmedAt: Date.now() - 60 * 60 * 1000 });
  assert.equal(result.tone, 'good');
  assert.equal(result.title, '有确认信号');
  assert.match(result.body, /4次确认信号/);
  assert.doesNotMatch(result.title, /有效|可信|可靠/);
  assert.match(`${result.body}${result.hint}`, /现场|评论/);
  assertSignalNotesAreShort(result);
}

{
  const result = insight({ confirmations: 8, staleCount: 1, reportCount: 2 });
  assert.equal(result.tone, 'danger');
  assert.equal(result.title, '存在多次举报');
  assert.match(result.body, /2次举报/);
  assert.doesNotMatch(result.title, /确认/);
  assertSignalNotesAreShort(result);
}

{
  const result = insight({ confirmations: 6, staleCount: 3 });
  assert.equal(result.tone, 'warn');
  assert.equal(result.title, '可能已经过时');
  assert.match(result.body, /3次过时反馈/);
  assert.doesNotMatch(result.title, /确认/);
  assertSignalNotesAreShort(result);
}

{
  const result = insight({ status: 'resolved', confirmations: 2, reportCount: 2 }, 3);
  assert.equal(result.tone, 'done');
  assert.equal(result.title, '任务已关闭');
  assert.match(result.body, /历史线索/);
  assertSignalNotesAreShort(result);
}

{
  const result = insight({ status: 'expired', confirmations: 2, staleCount: 3 }, 2);
  assert.equal(result.tone, 'neutral');
  assert.equal(result.title, '任务已过期');
  assert.match(result.body, /2条历史线索/);
  assertSignalNotesAreShort(result);
}

{
  const result = insight({}, 5);
  assert.equal(result.tone, 'neutral');
  assert.equal(result.title, '先看评论线索');
  assert.match(result.body, /5条评论/);
  assert.match(result.hint, /提问|补充/);
  assertSignalNotesAreShort(result);
}

console.log('Trust insight checks passed.');
