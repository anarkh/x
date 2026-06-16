import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildReceiverConversionPrompt } = await import('../utils/receiver-conversion.js');
const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');

const forbiddenShareReasonTerms = [
  '属实',
  '已验证',
  '可靠',
  '放心转发',
  '官方确认',
  '官方验证',
  '平台验证',
  '证明',
  '必须',
  '马上',
  '扩散起来'
];
const forbiddenShareReasonPattern = new RegExp(forbiddenShareReasonTerms.join('|'));

function post(overrides = {}) {
  return {
    id: 'post_receiver_1',
    title: '东门蓝色门禁卡',
    category: 'lost_found',
    intent: 'lost',
    status: 'active',
    confirmations: 1,
    staleCount: 0,
    reportCount: 0,
    placeName: '东门地铁口',
    ...overrides
  };
}

function assertShareReason(prompt, action, message) {
  assert.ok(prompt.shareReason, `${message}: should include a short share reason`);
  assert.equal(prompt.shareReason.label, '转给下一位时可以说', `${message}: share reason should keep a compact label`);
  assert.equal(typeof prompt.shareReason.text, 'string', `${message}: share reason text should be a string`);
  assert.ok(prompt.shareReason.text.length >= 10, `${message}: share reason should be readable`);
  assert.ok(prompt.shareReason.text.length <= 28, `${message}: share reason should stay short`);
  assert.doesNotMatch(
    prompt.shareReason.text,
    forbiddenShareReasonPattern,
    `${message}: share reason should avoid guarantee or pressure wording`
  );

  if (action === 'comment') {
    assert.match(prompt.shareReason.text, /线索|评论/, `${message}: comment reason should mention clue/comment context`);
    assert.doesNotMatch(prompt.shareReason.text, /确认过/, `${message}: comment reason should differ from confirm copy`);
  } else {
    assert.match(prompt.shareReason.text, /确认|核对/, `${message}: confirm reason should mention confirmation/checking`);
    assert.doesNotMatch(prompt.shareReason.text, /最新评论/, `${message}: confirm reason should differ from comment copy`);
  }
}

function assertTargetRows(prompt, message) {
  assert.ok(Array.isArray(prompt.targetRows), `${message}: targetRows should be an array`);
  assert.equal(prompt.targetRows.length, 3, `${message}: should render 3 target rows`);
  assert.deepEqual(
    prompt.targetRows.map((row) => row.label),
    ['推荐转给', '为什么可信', '下一位先看'],
    `${message}: target row labels should stay structured`
  );
  assert.ok(
    prompt.targetRows.every((row) => row.value && row.value.length <= 34),
    `${message}: target row copy should stay compact`
  );
}

{
  const confirmed = buildReceiverConversionPrompt(post(), 'confirm', { entryFrom: 'share' });
  assert.ok(confirmed, 'share-entry confirm should create a receiver conversion prompt');
  assert.equal(confirmed.shouldRelay, true);
  assert.equal(confirmed.tone, 'good');
  assert.match(confirmed.title, /确认|接力/);
  assert.match(confirmed.body, /确认|路过的人|现场/);
  assert.match(confirmed.buttonText, /接力/);
  assert.equal(
    confirmed.sharePath,
    '/pages/detail/detail?id=post_receiver_1&from=share&source=receiver&receiverAction=confirm'
  );
  assertTargetRows(confirmed, 'low-risk confirm');
  assert.match(confirmed.targetRows[0].value, /丢失|路过|门卫|前台/);
  assert.match(confirmed.targetRows[1].value, /刚确认|确认/);
  assert.match(confirmed.targetRows[2].value, /物品|地点|评论/);
  assertShareReason(confirmed, 'confirm', 'low-risk confirm');

  const commented = buildReceiverConversionPrompt(post(), 'comment', { entryFrom: 'share' });
  assert.ok(commented);
  assert.equal(commented.shouldRelay, true);
  assert.match(commented.title, /评论|接力/);
  assert.match(commented.body, /评论|确认/);
  assert.match(commented.shareTitle, /已补充线索/);
  assert.equal(
    commented.sharePath,
    '/pages/detail/detail?id=post_receiver_1&from=share&source=receiver&receiverAction=comment'
  );
  assertTargetRows(commented, 'low-risk comment');
  assert.match(commented.targetRows[1].value, /刚补|线索|评论/);
  assertShareReason(commented, 'comment', 'low-risk comment');
  assert.notEqual(
    confirmed.shareReason.text,
    commented.shareReason.text,
    'confirm and comment should expose different share reasons'
  );
}

{
  assert.equal(buildReceiverConversionPrompt(post(), 'confirm', { entryFrom: 'detail' }), null);
  assert.equal(buildReceiverConversionPrompt(post(), 'comment', {}), null);
  assert.equal(buildReceiverConversionPrompt(null, 'confirm', { entryFrom: 'share' }), null);
  assert.equal(buildReceiverConversionPrompt({ status: 'active' }, 'confirm', { entryFrom: 'share' }), null);
  assert.equal(buildReceiverConversionPrompt(post(), 'unknown', { entryFrom: 'share' }), null);
}

{
  const stale = buildReceiverConversionPrompt(post({ status: 'stale', staleCount: 3 }), 'confirm', { entryFrom: 'share' });
  assert.ok(stale);
  assert.equal(stale.shouldRelay, false);
  assert.equal(stale.tone, 'warn');
  assert.match(stale.title, /过时|最新情况/);
  assert.match(stale.body, /过时|旧信息/);

  const report = buildReceiverConversionPrompt(post({ reportCount: 2 }), 'comment', { entryFrom: 'share' });
  assert.ok(report);
  assert.equal(report.shouldRelay, false);
  assert.equal(report.tone, 'danger');
  assert.match(report.body, /举报|核对/);

  const resolved = buildReceiverConversionPrompt(post({ status: 'resolved' }), 'confirm', { entryFrom: 'share' });
  assert.ok(resolved);
  assert.equal(resolved.shouldRelay, false);
  assert.equal(resolved.tone, 'done');
  assert.match(resolved.body, /处理完|历史结果/);

  const weakStale = buildReceiverConversionPrompt(post({ staleCount: 1 }), 'confirm', { entryFrom: 'share' });
  const weakReport = buildReceiverConversionPrompt(post({ reportCount: 1 }), 'comment', { entryFrom: 'share' });
  assert.ok(weakStale);
  assert.ok(weakReport);
  assert.equal(weakStale.shouldRelay, false);
  assert.equal(weakReport.shouldRelay, false);

  for (const risky of [weakStale, weakReport, stale, report, resolved]) {
    assert.ok(!risky.targetRows || risky.targetRows.length === 0, 'risk/closed prompts should not include encouraging target rows');
    assert.equal(risky.shareReason, null, 'risk/closed prompts should not include encouraging share reason');
    assert.doesNotMatch(risky.buttonText, /接力|转发/, 'risk/closed prompt should not expose public relay copy');
    assert.doesNotMatch(risky.sharePath, /receiverAction=/, 'risk/closed prompt should not carry receiver action source');
  }
}

{
  const lost = buildReceiverConversionPrompt(post({ intent: 'lost' }), 'confirm', { entryFrom: 'share' });
  const found = buildReceiverConversionPrompt(post({ intent: 'found' }), 'confirm', { entryFrom: 'share' });
  assertTargetRows(lost, 'lost_found lost');
  assertTargetRows(found, 'lost_found found');
  assert.notEqual(lost.targetRows[0].value, found.targetRows[0].value, 'lost and found should recommend different targets');
  assert.match(lost.targetRows[0].value, /丢失|门卫|前台/);
  assert.match(found.targetRows[0].value, /丢东西|楼栋群|前台/);

  for (const [category, expected] of [
    ['help_needed', /搭把手|邻居|店员|熟悉情况/],
    ['street_update', /经过|同楼栋|同路线/],
    ['check_in', /会到这里|附近朋友|同社区/]
  ]) {
    const prompt = buildReceiverConversionPrompt(post({ category, intent: '' }), 'comment', { entryFrom: 'share' });
    assertTargetRows(prompt, `${category} prompt`);
    assert.match(prompt.targetRows[0].value, expected, `${category} should have category-specific relay target`);
  }

  const streetUpdate = buildReceiverConversionPrompt(post({ category: 'street_update', intent: '' }), 'confirm', { entryFrom: 'share' });
  const helpNeeded = buildReceiverConversionPrompt(post({ category: 'help_needed', intent: '' }), 'confirm', { entryFrom: 'share' });
  const checkIn = buildReceiverConversionPrompt(post({ category: 'check_in', intent: '' }), 'confirm', { entryFrom: 'share' });
  assert.match(streetUpdate.targetRows[2].value, /更新时间|过时信号/);
  assert.match(helpNeeded.targetRows[2].value, /求助内容|最新评论/);
  assert.match(checkIn.targetRows[2].value, /地点状态|适合到场/);

  const fallback = buildReceiverConversionPrompt(post({ category: 'other', intent: '' }), 'confirm', { entryFrom: 'share' });
  assertTargetRows(fallback, 'fallback prompt');
  assert.match(fallback.targetRows[0].value, /熟悉这个地点|核对/);
}

{
  const confirmGuide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver',
    receiverAction: 'confirm'
  });
  assert.ok(confirmGuide);
  assert.equal(confirmGuide.title, '上一位刚确认过');
  assert.match(confirmGuide.summary, /上一位刚确认|确认和现场信号/);
  assert.match(confirmGuide.rows[0].value, /确认接力|现场信号/);
  assert.match(confirmGuide.rows[1].value, /确认|现场信号|评论/);
  assert.match(confirmGuide.note, /确认|现场信号/);

  const commentGuide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver',
    receiverAction: 'comment'
  });
  assert.ok(commentGuide);
  assert.equal(commentGuide.title, '上一位刚补了线索');
  assert.match(commentGuide.summary, /上一位刚补|最新评论/);
  assert.match(commentGuide.rows[0].value, /评论接力|最新评论/);
  assert.match(commentGuide.rows[1].value, /最新评论|确认/);
  assert.match(commentGuide.note, /最新评论/);

  const fallbackGuide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver'
  });
  assert.ok(fallbackGuide);
  assert.equal(fallbackGuide.title, '有人接力转给你');
  assert.match(fallbackGuide.summary, /接力|确认和评论/);
  assert.match(fallbackGuide.rows[1].value, /继续接力|确认和评论/);
  assert.match(fallbackGuide.note, /确认和评论/);

  const unknownActionGuide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver',
    receiverAction: 'stale'
  });
  assert.deepEqual(
    unknownActionGuide,
    fallbackGuide,
    'unknown receiverAction should preserve the original source=receiver fallback semantics'
  );

  const plainShareWithAction = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    receiverAction: 'confirm'
  });
  assert.ok(plainShareWithAction);
  assert.equal(plainShareWithAction.title, '已有确认信号');
  assert.doesNotMatch(plainShareWithAction.summary, /上一位/, 'receiverAction should be ignored when source is not receiver');

  const sourceConfirmWithAction = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'confirm',
    receiverAction: 'comment'
  });
  assert.ok(sourceConfirmWithAction);
  assert.equal(sourceConfirmWithAction.title, '有人刚确认过');
  assert.doesNotMatch(sourceConfirmWithAction.summary, /上一位/, 'source=confirm should keep its existing semantics');

  const riskyGuide = buildShareReceiverGuide(post({ reportCount: 2 }), 2, {
    entryFrom: 'share',
    source: 'receiver'
  });
  assert.ok(riskyGuide);
  assert.equal(riskyGuide.title, '先谨慎核对');
  assert.match(riskyGuide.summary, /举报/);
}

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');
const detailWxss = readFileSync('pages/detail/detail.wxss', 'utf8');
const loadPostStart = detailJs.indexOf('async loadPost()');
const loadPostEnd = detailJs.indexOf('  renderPost', loadPostStart);
const loadPostBody = detailJs.slice(loadPostStart, loadPostEnd);

assert.match(detailJs, /buildReceiverConversionPrompt/, 'detail page should import receiver conversion helper');
assert.match(detailJs, /receiverConversionPrompt: null/, 'receiver conversion prompt should default to hidden');
assert.match(loadPostBody, /receiverConversionPrompt: null/, 'loading post should reset receiver conversion prompt');
assert.match(detailJs, /const receiverConversionPrompt = buildReceiverConversionPrompt\(this\.data\.post, 'comment'/, 'comment success should build receiver conversion prompt');
assert.match(detailJs, /const receiverConversionPrompt = buildReceiverConversionPrompt\(post, action/, 'react success should build receiver conversion prompt');
assert.match(detailJs, /commentRelayPrompt: receiverConversionPrompt\s*\?\s*null/, 'receiver conversion should suppress comment relay prompt');
assert.match(detailJs, /actionRelayPrompt: receiverConversionPrompt \? null : buildActionRelayPrompt/, 'receiver conversion should suppress action relay prompt');
assert.match(detailJs, /shareContext === 'receiverConversion'/, 'receiver conversion share button should have its own share payload');
assert.match(detailWxml, /receiverConversionPrompt/, 'detail page should render receiver conversion panel');
assert.match(detailWxml, /receiverConversionPrompt\.targetRows && receiverConversionPrompt\.targetRows\.length/, 'receiver conversion panel should safely render target rows');
assert.match(detailWxml, /receiverConversionPrompt\.shareReason/, 'detail page should render the receiver conversion share reason');
assert.match(
  detailWxml,
  /wx:if="\{\{receiverConversionPrompt\.shouldRelay\}\}"[\s\S]*?open-type="share"/,
  'receiver conversion public share CTA should only render when shouldRelay is true'
);
assert.match(detailWxml, /data-share-context="receiverConversion"/, 'receiver conversion share button should identify share context');
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !receiverConversionPrompt && !actionRelayPrompt && !commentRelayPrompt && shareMessage/,
  'ordinary share panel should hide while receiver conversion or relay prompts are active'
);
{
  const targetsIndex = detailWxml.indexOf('class="receiver-conversion-targets"');
  const shareReasonIndex = detailWxml.indexOf('class="receiver-conversion-share-reason"');
  const actionsIndex = detailWxml.indexOf('class="receiver-conversion-actions"');
  assert.ok(targetsIndex >= 0, 'receiver conversion target rows should render before share reason');
  assert.ok(shareReasonIndex > targetsIndex, 'share reason should render after targetRows');
  assert.ok(actionsIndex > shareReasonIndex, 'share reason should render before receiver conversion actions');
  assert.doesNotMatch(
    detailWxml.slice(shareReasonIndex, actionsIndex),
    /receiver-conversion-target-row/,
    'share reason should not be rendered as a fourth target row'
  );
}
assert.match(detailWxss, /\.receiver-conversion\b/, 'detail styles should include receiver conversion panel');
assert.match(detailWxss, /\.receiver-conversion-share-reason\b/, 'detail styles should include low-density share reason styling');

console.log('Receiver conversion checks passed.');
