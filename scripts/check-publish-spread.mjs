import assert from 'node:assert/strict';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const {
  buildPublishSpreadPlan,
  buildPublishSpreadSharePath
} = await import('../utils/publish-spread.js');

function post(overrides = {}) {
  return {
    id: 'post_spread_1',
    title: '东门蓝色门禁卡',
    body: '在地铁口附近丢失，有挂绳。',
    category: 'lost_found',
    intent: 'lost',
    status: 'active',
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    imageUrls: [],
    placeName: '东门地铁口',
    ...overrides
  };
}

{
  const result = buildPublishSpreadPlan(post(), 0);
  assert.equal(result.shouldEncourageSpread, true);
  assert.equal(result.title, '扩散计划');
  assert.match(result.audience, /门卫|物业|附近群/);
  assert.match(result.signalGoal, /看到|线索|确认/);
  assert.match(result.followUp, /找回|关闭/);
  assert.doesNotMatch(result.body, /保证|一定/);
}

{
  const result = buildPublishSpreadPlan(post({
    category: 'lost_found',
    intent: 'found',
    title: '捡到蓝色门禁卡'
  }), 0);
  assert.match(result.signalGoal, /失主|领取/);
  assert.match(result.followUp, /联系|认领|关闭/);
}

{
  const result = buildPublishSpreadPlan(post({
    category: 'street_update',
    title: '小区门口施工占道',
    body: '说明影响范围和绕行方向。'
  }), 0);
  assert.match(result.audience, /业主群|物业|通勤/);
  assert.match(result.signalGoal, /是否还在|绕行/);
}

{
  const result = buildPublishSpreadPlan(post({
    category: 'help_needed',
    title: '有人看到黑色电脑包吗',
    body: '想确认公交站附近有没有人看到。'
  }), 0);
  assert.match(result.audience, /朋友|邻居|附近群/);
  assert.match(result.signalGoal, /回答|线索|确认/);
}

{
  const result = buildPublishSpreadPlan(post({
    category: 'check_in',
    title: '社区花园今天很适合拍照',
    body: '下午光线很好，人也不多。'
  }), 0);
  assert.match(result.audience, /邻居|同好|附近群/);
  assert.match(result.signalGoal, /还适合|补充|确认/);
}

{
  const result = buildPublishSpreadPlan(post({ imageUrls: ['cloud://one.jpg'] }), 0);
  assert.match(result.imageHint, /有图/);
  assert.match(result.sharePrompt, /图片|特征|位置/);
}

{
  const result = buildPublishSpreadPlan(post(), 3);
  assert.match(result.commentHint, /3条评论/);
  assert.match(result.followUp, /回看评论|回复/);
}

{
  const resolved = buildPublishSpreadPlan(post({ status: 'resolved' }), 0);
  assert.equal(resolved.shouldEncourageSpread, false);
  assert.match(resolved.sharePrompt, /不用继续扩散/);

  const expired = buildPublishSpreadPlan(post({ status: 'expired' }), 1);
  assert.equal(expired.shouldEncourageSpread, false);
  assert.match(expired.followUp, /新任务|历史线索/);
}

{
  const path = buildPublishSpreadSharePath('post a/b', {
    from: 'publish',
    scene: 'group a',
    keep: '1'
  });
  assert.equal(path, '/pages/detail/detail?id=post%20a%2Fb&scene=group%20a&keep=1');
  assert.doesNotMatch(path, /from=publish/);
}

console.log('Publish spread checks passed.');
