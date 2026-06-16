import assert from 'node:assert/strict';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');

function guide(overrides = {}, commentCount = 0, entryFrom = 'share') {
  return buildShareReceiverGuide(
    {
      id: 'post_001',
      title: '东门蓝色门禁卡',
      category: 'lost_found',
      intent: 'lost',
      status: 'active',
      confirmations: 0,
      staleCount: 0,
      reportCount: 0,
      ...overrides
    },
    commentCount,
    { entryFrom }
  );
}

{
  const result = guide({}, 2, 'share');
  assert.ok(result);
  assert.equal(result.kicker, '来自转发');
  assert.equal(result.title, '先看评论再决定');
  assert.equal(result.tone, 'good');
  assert.match(result.summary, /转给你|评论/);
  assert.match(result.rows[0].value, /附近|线索|评论/);
  assert.match(result.rows[1].value, /确认|评论/);
  assert.match(result.rows[2].value, /补评论|路过的人/);
}

{
  const result = guide({ reportCount: 2 }, 1);
  assert.ok(result);
  assert.equal(result.title, '先谨慎核对');
  assert.equal(result.tone, 'danger');
  assert.match(result.summary, /举报/);
  assert.match(result.rows[1].value, /评论|确认/);
  assert.match(result.note, /别把旧判断继续传开/);
}

{
  const result = guide({ staleCount: 3 }, 0);
  assert.ok(result);
  assert.equal(result.title, '先看最新情况');
  assert.equal(result.tone, 'warn');
  assert.match(result.summary, /过时/);
  assert.match(result.rows[1].value, /现场是否还一致|旧信息/);
  assert.match(result.rows[2].value, /别盲转|更熟悉现场的人/);
}

{
  const resolved = guide({ status: 'resolved', confirmations: 3, reportCount: 4 }, 4);
  assert.ok(resolved);
  assert.equal(resolved.title, '已关闭任务');
  assert.equal(resolved.tone, 'done');
  assert.match(resolved.summary, /关闭|历史线索/);
  assert.match(resolved.rows[0].value, /历史结果/);
  assert.match(resolved.note, /历史线索/);

  const expired = guide({ status: 'expired', confirmations: 1 }, 0);
  assert.ok(expired);
  assert.equal(expired.title, '已过期任务');
  assert.equal(expired.tone, 'done');
  assert.match(expired.summary, /过期/);
  assert.match(expired.rows[2].value, /历史参考|公开扩散/);
}

{
  const hidden = guide({ status: 'hidden', reportCount: 4 }, 0);
  assert.ok(hidden);
  assert.equal(hidden.title, '已隐藏任务');
  assert.equal(hidden.tone, 'danger');
  assert.match(hidden.summary, /隐藏/);
  assert.match(hidden.note, /管理员/);
}

{
  const notShared = guide({}, 0, 'detail');
  assert.equal(notShared, null);
  assert.equal(buildShareReceiverGuide(null, 0, { entryFrom: 'share' }), null);
}

console.log('Share receiver checks passed.');
