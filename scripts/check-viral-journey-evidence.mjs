import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildActionRelayPrompt } = await import('../utils/action-relay.js');
const { buildCommentRelayPrompt } = await import('../utils/comment-relay.js');
const { buildReceiverConversionPrompt } = await import('../utils/receiver-conversion.js');
const { buildDetailShareMessage } = await import('../utils/share-message.js');
const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');
const { buildShareReceiverActionStrip } = await import('../utils/share-receiver-actions.js');

const manualExample = JSON.parse(readFileSync('harness/viral-journey-manual-results.example.json', 'utf8'));
const requiredManualJourneyIds = [
  'first-hop-share-entry',
  'receiver-confirm-conversion',
  'receiver-comment-conversion',
  'second-hop-receiver-source',
  'ordinary-and-risk-entries',
  'timeline-share-channel',
  'timeline-risk-gating'
];
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
const forbiddenRelayChannelTerms = [
  '真实联系人',
  '推荐联系人',
  '联系人',
  '通讯录',
  '微信群成员',
  '微信群读取',
  '读取微信群',
  '系统识别',
  '智能匹配',
  '已找到群聊',
  '认识的人',
  '你认识',
  '你的朋友',
  '你所在的群',
  '一键转群',
  '好友列表',
  '通讯录好友'
];
const forbiddenRelayChannelPattern = new RegExp(forbiddenRelayChannelTerms.join('|'));
const forbiddenRelayPathQueryPattern = /[?&](?:contact|contacts|contactId|group|groupId|groupName|chatId|openId|unionId|userId|friend|friends|wxGroup|wechatGroup|relayChannel|channelLabel|target|audience)=/i;

for (const requiredManualEvidenceFile of [
  'scripts/check-viral-journey-manual-evidence.mjs',
  'scripts/prepare-viral-journey-manual-evidence.mjs',
  'harness/viral-journey-manual-evidence-product-brief.md',
  'harness/viral-journey-manual-evidence-checklist.md'
]) {
  assert.ok(
    existsSync(requiredManualEvidenceFile),
    `viral journey manual evidence gate file should exist: ${requiredManualEvidenceFile}`
  );
}

function post(overrides = {}) {
  return {
    id: 'post_viral_journey',
    title: '东门蓝色门禁卡',
    body: '在东门地铁口附近丢失，有一条黑色挂绳。',
    category: 'lost_found',
    intent: 'lost',
    status: 'active',
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    placeName: '东门地铁口',
    ...overrides
  };
}

function assertShareReason(prompt, action, message) {
  assert.ok(prompt.shareReason, `${message}: should include a short share reason`);
  assert.equal(prompt.shareReason.label, '转给下一位时可以说', `${message}: share reason label should stay compact`);
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
  } else {
    assert.match(prompt.shareReason.text, /确认|核对/, `${message}: confirm reason should mention confirmation/checking`);
  }
}

function relayChannelSummary(prompt) {
  return (prompt.relayChannels || []).map((channel) => `${channel.label}:${channel.hint || ''}`);
}

function assertRelayChannels(prompt, action, message) {
  assert.ok(Array.isArray(prompt.relayChannels), `${message}: should include relay channel suggestions`);
  assert.ok(prompt.relayChannels.length >= 2, `${message}: should include at least two relay channel suggestions`);
  assert.ok(prompt.relayChannels.length <= 3, `${message}: should include at most three relay channel suggestions`);

  for (const [index, channel] of prompt.relayChannels.entries()) {
    assert.equal(typeof channel.label, 'string', `${message}: relay channel ${index} should include label`);
    assert.ok(channel.label.length >= 2 && channel.label.length <= 8, `${message}: relay channel ${index} label should stay short`);
    assert.equal(typeof channel.hint, 'string', `${message}: relay channel ${index} should include hint`);
    assert.ok(channel.hint.length >= 4 && channel.hint.length <= 24, `${message}: relay channel ${index} hint should stay short`);
    assert.doesNotMatch(
      `${channel.label} ${channel.hint} ${channel.priorityReason || ''}`,
      forbiddenRelayChannelPattern,
      `${message}: relay channel ${index} should not imply real contact/group access`
    );
  }

  assert.match(
    relayChannelSummary(prompt).join('|'),
    action === 'comment' ? /线索|评论|最新评论/ : /确认|核对|现场/,
    `${message}: relay channels should reflect the receiver action`
  );
}

function assertNoRelayChannels(prompt, message) {
  assert.ok(!prompt.relayChannels || prompt.relayChannels.length === 0, `${message}: should not include relay channel suggestions`);
}

function assertRelaySharePath(path, action, message) {
  assert.doesNotMatch(
    path,
    forbiddenRelayPathQueryPattern,
    `${message}: share path should not include contact/group/channel query`
  );

  const params = new URLSearchParams(path.split('?')[1] || '');
  assert.equal(params.get('from'), 'share', `${message}: share path should keep from=share`);
  assert.equal(params.get('source'), 'receiver', `${message}: share path should keep source=receiver`);
  assert.equal(params.get('receiverAction'), action, `${message}: share path should keep receiverAction=${action}`);
  for (const key of params.keys()) {
    assert.ok(['id', 'from', 'source', 'receiverAction'].includes(key), `${message}: unexpected share query key ${key}`);
  }
}

function assertNoEncouragingReceiverSurface(overrides, message) {
  const currentPost = post(overrides);
  assert.equal(
    buildShareReceiverActionStrip(currentPost, { entryFrom: 'share' }),
    null,
    `${message}: receiver action strip should be hidden`
  );

  const conversion = buildReceiverConversionPrompt(currentPost, 'confirm', {
    entryFrom: 'share'
  });
  assert.ok(conversion, `${message}: receiver conversion still gives cautious feedback`);
  assert.equal(conversion.shouldRelay, false, `${message}: receiver conversion should not expose public relay CTA`);
  assert.equal(conversion.shareReason, null, `${message}: receiver conversion should not expose encouraging share reason`);
  assertNoRelayChannels(conversion, `${message}: receiver conversion`);
  assert.doesNotMatch(conversion.sharePath, /receiverAction=/, `${message}: risky conversion path should not carry receiverAction`);
}

{
  const shareMessage = buildDetailShareMessage(post(), 0);
  assert.equal(
    shareMessage.path,
    '/pages/detail/detail?id=post_viral_journey&from=share',
    'ordinary detail share path should create a from=share receiver entry'
  );

  const receiverGuide = buildShareReceiverGuide(post(), 0, {
    entryFrom: 'share'
  });
  assert.ok(receiverGuide, 'from=share active low-risk entry should show receiver guide');
  assert.equal(receiverGuide.tone, 'good');
  assert.match(receiverGuide.summary, /转给你|现场|线索/);

  const actionStrip = buildShareReceiverActionStrip(post(), {
    entryFrom: 'share'
  });
  assert.ok(actionStrip, 'from=share active low-risk entry should show receiver action strip');
  assert.equal(actionStrip.tone, 'good');
  assert.match(actionStrip.confirmText, /确认/);
  assert.match(actionStrip.commentText, /线索|评论/);
}

{
  const confirmConversion = buildReceiverConversionPrompt(post(), 'confirm', {
    entryFrom: 'share'
  });
  assert.ok(confirmConversion, 'receiver confirm should create conversion prompt');
  assert.equal(confirmConversion.shouldRelay, true);
  assert.equal(
    confirmConversion.sharePath,
    '/pages/detail/detail?id=post_viral_journey&from=share&source=receiver&receiverAction=confirm',
    'receiver confirm second-hop share path should carry from=share&source=receiver&receiverAction=confirm'
  );
  assert.match(confirmConversion.title, /确认|接力/);
  assert.ok(Array.isArray(confirmConversion.targetRows), 'receiver conversion prompt should include targeted relay rows');
  assert.deepEqual(
    confirmConversion.targetRows.map((row) => row.label),
    ['推荐转给', '为什么可信', '下一位先看'],
    'targeted relay rows should explain who, why now, and what to inspect first'
  );
  assert.match(confirmConversion.targetRows[0].value, /丢失|门卫|前台|核对/);
  assert.match(confirmConversion.targetRows[1].value, /确认|评论|线索/);
  assert.match(confirmConversion.targetRows[2].value, /物品|评论|地点/);
  assertRelayChannels(confirmConversion, 'confirm', 'receiver confirm conversion');
  assertRelaySharePath(confirmConversion.sharePath, 'confirm', 'receiver confirm conversion');
  assertShareReason(confirmConversion, 'confirm', 'receiver confirm conversion');

  const commentConversion = buildReceiverConversionPrompt(post(), 'comment', {
    entryFrom: 'share'
  });
  assert.ok(commentConversion, 'receiver comment should create conversion prompt');
  assert.equal(commentConversion.shouldRelay, true);
  assert.equal(
    commentConversion.sharePath,
    '/pages/detail/detail?id=post_viral_journey&from=share&source=receiver&receiverAction=comment',
    'comment second-hop share path should carry from=share&source=receiver&receiverAction=comment'
  );
  assert.match(commentConversion.shareTitle, /已补充线索/);
  assert.ok(Array.isArray(commentConversion.targetRows), 'comment receiver conversion should include targeted relay rows');
  assert.equal(commentConversion.targetRows.length, 3, 'comment receiver conversion should keep 3 target rows');
  assertRelayChannels(commentConversion, 'comment', 'receiver comment conversion');
  assertRelaySharePath(commentConversion.sharePath, 'comment', 'receiver comment conversion');
  assertShareReason(commentConversion, 'comment', 'receiver comment conversion');
  assert.notEqual(
    confirmConversion.shareReason.text,
    commentConversion.shareReason.text,
    'confirm and comment share reasons should be distinct'
  );
  assert.notDeepEqual(
    relayChannelSummary(confirmConversion),
    relayChannelSummary(commentConversion),
    'confirm and comment relay channel suggestions should be distinct'
  );

  const actionRelay = buildActionRelayPrompt({ ...post(), confirmations: 1 }, 'confirm');
  const commentRelay = buildCommentRelayPrompt(post(), { body: '刚路过，保安说有人见过。' }, 1);
  assert.ok(actionRelay && actionRelay.shouldEncourageRelay, 'base action relay helper remains available');
  assert.ok(commentRelay && commentRelay.shouldEncourageRelay, 'base comment relay helper remains available');
}

{
  const nextReceiverConfirmGuide = buildShareReceiverGuide(post({ confirmations: 1 }), 2, {
    entryFrom: 'share',
    source: 'receiver',
    receiverAction: 'confirm'
  });
  assert.ok(nextReceiverConfirmGuide, 'source=receiver with receiverAction=confirm should show receiver guide');
  assert.equal(nextReceiverConfirmGuide.title, '上一位刚确认过');
  assert.match(nextReceiverConfirmGuide.summary, /上一位刚确认|确认和现场信号/);
  assert.match(nextReceiverConfirmGuide.rows[0].value, /确认接力|现场信号/);
  assert.match(nextReceiverConfirmGuide.rows[1].value, /确认|现场信号|评论/);
  assert.match(nextReceiverConfirmGuide.note, /确认|现场信号/);

  const nextReceiverCommentGuide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver',
    receiverAction: 'comment'
  });
  assert.ok(nextReceiverCommentGuide, 'source=receiver with receiverAction=comment should show receiver guide');
  assert.equal(nextReceiverCommentGuide.title, '上一位刚补了线索');
  assert.match(nextReceiverCommentGuide.summary, /上一位刚补|最新评论/);
  assert.match(nextReceiverCommentGuide.rows[0].value, /评论接力|最新评论/);
  assert.match(nextReceiverCommentGuide.rows[1].value, /最新评论|确认/);
  assert.match(nextReceiverCommentGuide.note, /最新评论/);

  const nextReceiverGuide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver'
  });
  assert.ok(nextReceiverGuide, 'source=receiver should show receiver guide');
  assert.equal(nextReceiverGuide.title, '有人接力转给你');
  assert.match(nextReceiverGuide.summary, /接力|确认和评论/);
  assert.match(nextReceiverGuide.rows[0].value, /接力链路|确认和评论/);
  assert.match(nextReceiverGuide.rows[1].value, /继续接力|确认和评论/);
  assert.match(nextReceiverGuide.note, /确认和评论/);

  const unknownActionGuide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver',
    receiverAction: 'unknown'
  });
  assert.deepEqual(
    unknownActionGuide,
    nextReceiverGuide,
    'unknown receiverAction should keep source=receiver fallback copy'
  );

  const sourceConfirmWithReceiverAction = buildShareReceiverGuide(post({ confirmations: 1 }), 2, {
    entryFrom: 'share',
    source: 'confirm',
    receiverAction: 'comment'
  });
  assert.ok(sourceConfirmWithReceiverAction, 'source=confirm should ignore receiverAction and keep its own guide');
  assert.equal(sourceConfirmWithReceiverAction.title, '有人刚确认过');
  assert.doesNotMatch(sourceConfirmWithReceiverAction.summary, /上一位/);

  const plainShareWithReceiverAction = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    receiverAction: 'confirm'
  });
  assert.ok(plainShareWithReceiverAction, 'plain from=share should ignore receiverAction without source=receiver');
  assert.doesNotMatch(plainShareWithReceiverAction.summary, /上一位/);
}

{
  assert.equal(
    buildShareReceiverGuide(post(), 0, { entryFrom: 'detail' }),
    null,
    'ordinary entry should not show receiver guide'
  );
  assert.equal(
    buildShareReceiverActionStrip(post(), { entryFrom: 'detail' }),
    null,
    'ordinary entry should not show receiver action strip'
  );
  assert.equal(
    buildReceiverConversionPrompt(post(), 'confirm', { entryFrom: 'detail' }),
    null,
    'ordinary entry should not create receiver conversion prompt'
  );
}

for (const [label, overrides] of [
  ['any stale signal', { staleCount: 1 }],
  ['any report signal', { reportCount: 1 }],
  ['stale status', { status: 'stale', staleCount: 3 }],
  ['resolved status', { status: 'resolved' }],
  ['expired status', { status: 'expired' }],
  ['hidden status', { status: 'hidden', reportCount: 3 }]
]) {
  assertNoEncouragingReceiverSurface(overrides, label);

  // Existing standalone relay helpers keep their historical high-risk threshold.
  // The from=share journey is still safe because receiverConversionPrompt is built first and suppresses them.
  if (overrides.status || overrides.staleCount >= 3 || overrides.reportCount >= 2) {
    const riskyActionRelay = buildActionRelayPrompt(post(overrides), 'confirm');
    assert.ok(riskyActionRelay, `${label}: action relay should still return cautious state`);
    assert.equal(riskyActionRelay.shouldEncourageRelay, false, `${label}: action relay should not encourage public relay`);

    const riskyCommentRelay = buildCommentRelayPrompt(post(overrides), { body: '现场情况需要核对。' }, 1);
    assert.ok(riskyCommentRelay, `${label}: comment relay should still return cautious state`);
    assert.equal(riskyCommentRelay.shouldEncourageRelay, false, `${label}: comment relay should not encourage public relay`);
  }
}

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');
const submitCommentStart = detailJs.indexOf('async submitComment()');
const submitCommentEnd = detailJs.indexOf('  async react', submitCommentStart);
const submitCommentBody = detailJs.slice(submitCommentStart, submitCommentEnd);
const reactStart = detailJs.indexOf('async react(event)');
const reactEnd = detailJs.indexOf('  resolve()', reactStart);
const reactBody = detailJs.slice(reactStart, reactEnd);
const receiverBlockStart = detailWxml.indexOf('wx:if="{{shareReceiverGuide}}"');
const receiverBlockEnd = detailWxml.indexOf('<view wx:if="{{receiverConversionPrompt}}"', receiverBlockStart);
const receiverBlock = detailWxml.slice(receiverBlockStart, receiverBlockEnd);
const receiverConversionIndex = detailWxml.indexOf('wx:if="{{receiverConversionPrompt}}"');
const shareReasonIndex = detailWxml.indexOf('class="receiver-conversion-share-reason"');
const actionRelayIndex = detailWxml.indexOf('wx:if="{{actionRelayPrompt}}"');
const commentRelayIndex = detailWxml.indexOf('wx:if="{{commentRelayPrompt}}"');

assert.match(
  detailJs,
  /buildShareReceiverGuide\(post,\s*commentCount,\s*\{\s*entryFrom: this\.data\.entryQuery\.from,\s*source: this\.data\.entryQuery\.source,\s*receiverAction: this\.data\.entryQuery\.receiverAction\s*\}\s*\)/s,
  'detail page should pass from/source/receiverAction query into receiver guide'
);
assert.match(
  detailJs,
  /buildShareReceiverActionStrip\(post,\s*\{\s*entryFrom: this\.data\.entryQuery\.from\s*\}\s*\)/s,
  'detail page should build receiver action strip only from the entry query'
);
assert.match(
  submitCommentBody,
  /const receiverConversionPrompt = buildReceiverConversionPrompt\(this\.data\.post, 'comment',\s*\{\s*entryFrom: this\.data\.entryQuery\.from\s*\}\s*\)/s,
  'comment submit should build receiver conversion prompt first'
);
assert.match(
  submitCommentBody,
  /commentRelayPrompt: receiverConversionPrompt\s*\?\s*null\s*:\s*buildCommentRelayPrompt\(/,
  'receiver conversion should suppress comment relay after comment submit'
);
assert.match(
  reactBody,
  /const receiverConversionPrompt = buildReceiverConversionPrompt\(post, action,\s*\{\s*entryFrom: this\.data\.entryQuery\.from\s*\}\s*\)/s,
  'trust action should build receiver conversion prompt first'
);
assert.match(
  reactBody,
  /actionRelayPrompt: receiverConversionPrompt \? null : buildActionRelayPrompt\(post, action\)/,
  'receiver conversion should suppress action relay after trust action'
);
assert.match(
  detailJs,
  /shareContext === 'receiverConversion'[\s\S]*?path: this\.data\.receiverConversionPrompt\.sharePath/,
  'receiver conversion share button should use the receiver conversion share path'
);
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !receiverConversionPrompt && !actionRelayPrompt && !commentRelayPrompt && shareMessage/,
  'ordinary share panel should be mutually exclusive with receiver guide and relay prompts'
);
assert.match(
  receiverBlock,
  /shareReceiverActionStrip && !receiverConversionPrompt/,
  'receiver action strip should disappear after receiver conversion prompt exists'
);
assert.doesNotMatch(
  receiverBlock,
  /open-type="share"/,
  'receiver first-action strip should not contain a public share CTA'
);
assert.ok(
  receiverConversionIndex >= 0 && receiverConversionIndex < actionRelayIndex && receiverConversionIndex < commentRelayIndex,
  'receiver conversion panel should render before action/comment relay panels'
);
assert.ok(shareReasonIndex > receiverConversionIndex, 'share reason should render inside receiver conversion panel');
assert.ok(
  detailWxml.indexOf('class="receiver-conversion-targets"') < detailWxml.indexOf('class="receiver-conversion-relay-channels"') &&
    detailWxml.indexOf('class="receiver-conversion-relay-channels"') < shareReasonIndex &&
    shareReasonIndex < detailWxml.indexOf('class="receiver-conversion-actions"'),
  'receiver conversion order should be targetRows, relay channels, share reason, actions'
);
assert.doesNotMatch(
  detailWxml.slice(
    detailWxml.indexOf('class="receiver-conversion-relay-channels"'),
    detailWxml.indexOf('class="receiver-conversion-share-reason"')
  ),
  /open-type="share"|bindtap=/,
  'relay channel suggestions should not expose share/contact/group button behavior'
);

assert.equal(
  manualExample.exampleNotice,
  'This is a fill-in example only. It is not real WeChat DevTools or device evidence.',
  'manual evidence template should not present itself as real evidence'
);
assert.deepEqual(
  manualExample.statusAllowedValues,
  ['not_run', 'blocked', 'failed'],
  'manual evidence template should not allow a passed status before real execution'
);
assert.equal(manualExample.summary.overallStatus, 'not_run', 'manual evidence example should stay not_run');
assert.match(
  manualExample.summary.recommendation,
  /Do not treat this example as release evidence/,
  'manual evidence example should warn against release evidence use'
);
assert.deepEqual(
  manualExample.journeys.map((journey) => journey.id),
  requiredManualJourneyIds,
  'manual evidence template should include exactly the five receiver journeys plus two timeline journeys in order'
);

const confirmManualJourney = manualExample.journeys.find((journey) => journey.id === 'receiver-confirm-conversion');
const commentManualJourney = manualExample.journeys.find((journey) => journey.id === 'receiver-comment-conversion');
const timelineShareJourney = manualExample.journeys.find((journey) => journey.id === 'timeline-share-channel');
const timelineRiskJourney = manualExample.journeys.find((journey) => journey.id === 'timeline-risk-gating');
assert.ok(confirmManualJourney, 'manual evidence template should include receiver confirm conversion journey');
assert.ok(commentManualJourney, 'manual evidence template should include receiver comment conversion journey');
assert.ok(timelineShareJourney, 'manual evidence template should include timeline share channel journey');
assert.ok(timelineRiskJourney, 'manual evidence template should include timeline risk gating journey');
assert.ok(
  confirmManualJourney.expected.some((item) => /share reason|确认|re-check/.test(item)),
  'manual confirm journey should ask testers to observe the confirm share reason'
);
assert.ok(
  confirmManualJourney.expected.some((item) => /relay channel|场景建议|适合转/.test(item)),
  'manual confirm journey should ask testers to observe relay channel suggestions'
);
assert.ok(
  commentManualJourney.expected.some((item) => /share reason|线索|latest comments/.test(item)),
  'manual comment journey should ask testers to observe the comment share reason'
);
assert.ok(
  commentManualJourney.expected.some((item) => /relay channel|场景建议|适合转/.test(item)),
  'manual comment journey should ask testers to observe relay channel suggestions'
);
assert.ok(
  timelineShareJourney.expected.some((item) => /friend share|send-to-friend|发送给朋友|timeline share|share-to-timeline|朋友圈/.test(item)),
  'manual timeline share journey should ask testers to observe both friend and timeline menu entries'
);
assert.ok(
  timelineShareJourney.expected.some((item) => /id|from=share|source=timeline|shareChannel=timeline/.test(item)),
  'manual timeline share journey should ask testers to inspect timeline query values'
);
assert.ok(
  timelineShareJourney.expected.some((item) => /single-page|单页|first screen|首屏/.test(item)),
  'manual timeline share journey should ask testers to observe single-page first-screen readability'
);
assert.ok(
  timelineRiskJourney.expected.some((item) => /shareTimeline|timeline|朋友圈/.test(item)),
  'manual timeline risk journey should ask testers to observe shareTimeline absence'
);
assert.ok(
  timelineRiskJourney.expected.some((item) => /cautious|谨慎|待核对|closed|expired|hidden|关闭|过期|隐藏/.test(item)),
  'manual timeline risk journey should require cautious risk-state semantics'
);
for (const journey of manualExample.journeys) {
  assert.equal(journey.status, 'not_run', `manual journey ${journey.id} should start as not_run`);
  assert.deepEqual(journey.evidence, [], `manual journey ${journey.id} should not include fake evidence`);
  assert.match(journey.actual, /Not run in this example/, `manual journey ${journey.id} should not claim actual results`);
}

console.log('Viral journey evidence checks passed.');
