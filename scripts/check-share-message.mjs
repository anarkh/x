import assert from 'node:assert/strict';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildDetailShareMessage } = await import('../utils/share-message.js');

function shareMessage(overrides = {}, commentCount = 0, options = {}) {
  return buildDetailShareMessage(
    {
      id: 'post_001',
      title: '蓝色门禁卡',
      category: 'lost_found',
      intent: 'lost',
      status: 'active',
      confirmations: 0,
      staleCount: 0,
      reportCount: 0,
      ...overrides
    },
    commentCount,
    options
  );
}

{
  const result = shareMessage();
  assert.equal(result.title, '失物招领：蓝色门禁卡');
  assert.equal(result.path, '/pages/detail/detail?id=post_001&from=share');
  assert.equal(result.heading, '转发给会帮忙的人');
  assert.match(result.summary, /确认|补线索/);
  assert.equal(result.rows[0].label, '转给谁');
  assert.match(result.rows[0].value, /附近|物业|保安/);
  assert.match(result.rows[1].value, /失主|线索|帮忙/);
  assert.match(result.rows[2].value, /找回|补线索|确认/);
}

{
  const result = shareMessage({ staleCount: 3 }, 2);
  assert.equal(result.title, '可能过时：蓝色门禁卡');
  assert.match(result.summary, /过时|最新情况/);
  assert.match(result.rows[1].value, /过时反馈|确认最新情况/);
  assert.match(result.rows[2].value, /更快知道信息是否已经变化/);
  assert.match(result.note, /评论/);
}

{
  const result = shareMessage({ reportCount: 2 }, 1);
  assert.equal(result.title, '有举报提醒：蓝色门禁卡');
  assert.match(result.summary, /举报/);
  assert.match(result.rows[1].value, /核对/);
  assert.match(result.rows[0].value, /熟悉现场的人/);
}

{
  const result = shareMessage({ status: 'resolved' }, 4, { surface: 'publish' });
  assert.equal(result.title, '已关闭：蓝色门禁卡');
  assert.match(result.summary, /已发布到附近/);
  assert.match(result.rows[0].value, /关心结果/);
  assert.match(result.rows[1].value, /历史线索|关闭/);
  assert.match(result.rows[2].value, /历史记录/);
}

{
  const result = shareMessage({ status: 'expired', category: 'help_needed', title: '找一找充电器' }, 0);
  assert.equal(result.title, '已过期：找一找充电器');
  assert.match(result.summary, /已过期/);
  assert.match(result.rows[0].value, /路过的人/);
  assert.match(result.rows[1].value, /参考|重复确认/);
  assert.match(result.rows[2].value, /重复确认|最新任务/);
}

{
  const result = shareMessage({ status: 'hidden', title: '被隐藏的记录' }, 0);
  assert.equal(result.title, '内容已隐藏：被隐藏的记录');
  assert.match(result.summary, /隐藏/);
  assert.equal(result.rows[0].value, '管理员或发布者本人');
  assert.match(result.note, /发布者或管理员/);
}

{
  const result = buildDetailShareMessage(null);
  assert.equal(result.title, '附近任务');
  assert.equal(result.path, '/pages/map/map?from=share');
}

console.log('Share message checks passed.');
