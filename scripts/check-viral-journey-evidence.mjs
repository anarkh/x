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
for (const journey of manualExample.journeys) {
  assert.equal(journey.status, 'not_run', `manual journey ${journey.id} should start as not_run`);
  assert.deepEqual(journey.evidence, [], `manual journey ${journey.id} should not include fake evidence`);
  assert.match(journey.actual, /Not run in this example/, `manual journey ${journey.id} should not claim actual results`);
}

console.log('Viral journey evidence checks passed.');
