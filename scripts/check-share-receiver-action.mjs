import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildShareReceiverActionStrip } = await import('../utils/share-receiver-actions.js');
const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');
const {
  default: mockPosts,
  SHARE_DEMO_POST_ID,
  SHARE_DEMO_TTL_MS
} = await import('../utils/mock-posts.js');

function post(overrides = {}) {
  return {
    id: 'post_receiver_action_1',
    title: '东门蓝色门禁卡',
    category: 'lost_found',
    intent: 'lost',
    status: 'active',
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    ...overrides
  };
}

function actionStrip(overrides = {}, entryFrom = 'share') {
  return buildShareReceiverActionStrip(post(overrides), { entryFrom });
}

function receiverGuide(overrides = {}, entryFrom = 'share') {
  return buildShareReceiverGuide(post(overrides), 0, { entryFrom });
}

{
  assert.equal(actionStrip({}, 'detail'), null, 'ordinary detail entry should not show receiver action strip');
  assert.equal(buildShareReceiverActionStrip(null, { entryFrom: 'share' }), null);
  assert.equal(buildShareReceiverActionStrip({ status: 'active' }, { entryFrom: 'share' }), null);
}

{
  const result = actionStrip();
  assert.ok(result, 'share-entry active low-risk post should show receiver action strip');
  assert.equal(result.tone, 'good');
  assert.equal(result.confirmText, '我在附近，确认一下');
  assert.equal(result.commentText, '补一条线索');
  assert.equal(result.confirmDisabled, false);
  assert.match(result.title, /先做一步|先帮一步|先确认/);
  assert.match(result.body, /确认|线索|评论/);
  assert.match(result.note, /不会自动转发|不自动转发/);
}

{
  const confirmed = actionStrip({ confirmedByMe: true });
  assert.ok(confirmed);
  assert.equal(confirmed.confirmDisabled, true);
  assert.match(confirmed.confirmText, /已确认/);
}

for (const riskyPost of [
  { status: 'hidden', reportCount: 4 },
  { status: 'resolved' },
  { status: 'expired' },
  { status: 'active', staleCount: 1 },
  { status: 'active', reportCount: 1 },
  { status: 'stale', staleCount: 3 },
  { status: 'active', staleCount: 3 },
  { status: 'active', reportCount: 2 }
]) {
  assert.equal(
    actionStrip(riskyPost),
    null,
    `risk or closed state should not encourage receiver action: ${JSON.stringify(riskyPost)}`
  );
}

{
  const expiredGuide = receiverGuide({ status: 'expired' });
  assert.ok(expiredGuide, 'expired share-entry post should still show receiver context');
  assert.equal(expiredGuide.title, '已过期任务');
}

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');
const detailWxss = readFileSync('pages/detail/detail.wxss', 'utf8');
const storeJs = readFileSync('utils/store.js', 'utf8');
const readinessScript = readFileSync('scripts/check-devtools-readiness.mjs', 'utf8');
const viralCandidateScript = readFileSync('scripts/check-viral-candidate.mjs', 'utf8');
const actionBlockStart = detailWxml.indexOf('shareReceiverActionStrip');
const actionBlockEnd = detailWxml.indexOf('<view wx:if="{{receiverConversionPrompt}}"', actionBlockStart);
const actionBlock = detailWxml.slice(actionBlockStart, actionBlockEnd);
const shareGuideStart = detailWxml.indexOf('<view wx:if="{{shareReceiverGuide}}"');
const shareGuideEnd = detailWxml.indexOf('<view wx:if="{{receiverConversionPrompt}}"', shareGuideStart);
const shareGuideBlock = detailWxml.slice(shareGuideStart, shareGuideEnd);
const mapReturnIndex = shareGuideBlock.indexOf('share-receiver-map-return');
const actionStripIndex = shareGuideBlock.indexOf('shareReceiverActionStrip && !receiverConversionPrompt');
const shareDemoPost = mockPosts.find((item) => item.id === SHARE_DEMO_POST_ID);

assert.equal(SHARE_DEMO_POST_ID, 'post_001', 'manual share launch should keep using the stable demo post id');
assert.equal(SHARE_DEMO_TTL_MS, 30 * 24 * 60 * 60 * 1000, 'manual share demo should stay valid for 30 days');
assert.ok(shareDemoPost, 'mock data should include the manual share demo post');
assert.ok(
  shareDemoPost.expiresAt - Date.now() > 29 * 24 * 60 * 60 * 1000,
  'manual share demo post should not expire during a normal test session'
);

assert.match(detailJs, /buildShareReceiverActionStrip/, 'detail page should import share receiver action helper');
assert.match(detailJs, /shareReceiverActionStrip: null/, 'receiver action strip should default to hidden');
assert.match(detailJs, /buildShareReceiverActionStrip\(post,\s*\{\s*entryFrom: this\.data\.entryQuery\.from\s*\}\s*\)/s, 'detail page should build strip only from entry query');
assert.match(detailJs, /receiverConversionPrompt: null/, 'receiver conversion should still default to hidden');
assert.match(detailJs, /actionRelayPrompt: receiverConversionPrompt \? null : buildActionRelayPrompt/, 'receiver conversion should still suppress action relay');
assert.match(detailJs, /commentRelayPrompt: receiverConversionPrompt\s*\?\s*null/, 'receiver conversion should still suppress comment relay');
assert.match(
  detailWxml,
  /shareReceiverActionStrip && !receiverConversionPrompt/,
  'receiver action strip should hide when receiver conversion prompt appears'
);
assert.match(actionBlock, /data-action="confirm"/, 'receiver confirm action should call the existing confirm reaction');
assert.match(actionBlock, /bindtap="react"/, 'receiver confirm action should reuse detail react handler');
assert.match(actionBlock, /bindtap="openCommentDialog"/, 'receiver comment action should reuse detail comment dialog');
assert.doesNotMatch(actionBlock, /bindtap="goHomeWithPost"/, 'focused home action should not depend on active-only receiver actions');
assert.doesNotMatch(actionBlock, /回首页查这条/, 'focused home action should stay visible even when receiver actions are hidden');
assert.match(shareGuideBlock, /wx:if="\{\{!receiverConversionPrompt\}\}"[^>]+class="share-receiver-map-return"/, 'receiver guide should offer a map return block outside the active-only action strip');
assert.match(shareGuideBlock, /bindtap="goHomeWithPost"/, 'receiver guide should offer an explicit return-to-home focused-map action');
assert.match(shareGuideBlock, /回首页查这条/, 'receiver guide return action should be visible and clear');
assert.ok(mapReturnIndex >= 0 && actionStripIndex >= 0 && mapReturnIndex < actionStripIndex, 'map return should appear before active-only receiver actions so expired share pages can still show it');
assert.doesNotMatch(actionBlock, /open-type="share"/, 'receiver action strip buttons must not trigger share');
assert.match(detailJs, /focusedMapUrl\(postId\)/, 'detail page should build a focused map URL from the current post id');
assert.match(detailJs, /wx\.reLaunch\(\{\s*url:\s*this\.focusedMapUrl\(postId\)/s, 'focused home action should reLaunch with query instead of switchTab without query');
assert.match(detailWxss, /\.share-receiver-map-button\b/, 'detail styles should include the receiver focused-home button');
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !receiverConversionPrompt && !actionRelayPrompt && !commentRelayPrompt && shareMessage/,
  'ordinary share panel should stay hidden while receiver guidance or relay prompts are active'
);
assert.match(storeJs, /ensureShareDemoPost/, 'store should refresh an expired locally stored share demo post');
assert.match(storeJs, /SHARE_DEMO_MIN_TTL_MS/, 'store should refresh the share demo before it gets close to expiring');
assert.match(
  storeJs,
  /localPost && localPost\.id === SHARE_DEMO_POST_ID/,
  'manual share demo should prefer the fresh local fixture over stale cloud data'
);
assert.match(detailWxss, /\.share-receiver-actions\b/, 'detail styles should include receiver action strip styles');
assert.match(
  readinessScript,
  /scripts\/check-share-receiver-action\.mjs/,
  'DevTools readiness should run the receiver action strip check'
);
assert.match(
  viralCandidateScript,
  /buildShareReceiverActionStrip/,
  'viral candidate check should cover receiver action strip helper'
);

console.log('Share receiver action checks passed.');
