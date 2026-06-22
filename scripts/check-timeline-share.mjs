import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const {
  buildDetailTimelineShare,
  shouldShowDetailTimelineShare
} = await import('../utils/timeline-share.js');

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const helperJs = readFileSync('utils/timeline-share.js', 'utf8');

const forbiddenWords = ['马上转发', '扩散起来', '奖励', '强制', '拉人'];

function parseQuery(query) {
  return Object.fromEntries(new URLSearchParams(query));
}

function assertNoPath(payload, label) {
  assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'path'), `${label} must not return path`);
}

function assertTimelineQuery(payload, expectedId) {
  const params = parseQuery(payload.query);
  if (expectedId) {
    assert.equal(params.id, expectedId);
  } else {
    assert.ok(!params.id, 'generic timeline query should not invent a post id');
  }
  assert.equal(params.from, 'share');
  assert.equal(params.source, 'timeline');
  assert.equal(params.shareChannel, 'timeline');
}

function assertNoForbiddenText(value, label) {
  const text = JSON.stringify(value);
  for (const word of forbiddenWords) {
    assert.doesNotMatch(text, new RegExp(word), `${label} must not include inducement word: ${word}`);
  }
}

const activePost = {
  id: 'post_timeline_001',
  title: '东门蓝色门禁卡',
  category: 'lost_found',
  intent: 'lost',
  status: 'active',
  imageUrls: ['cloud://timeline-image']
};

const genericShare = buildDetailTimelineShare(null);
assertNoPath(genericShare, 'generic share');
assertTimelineQuery(genericShare);
assert.match(genericShare.title, /附近任务/);
assertNoForbiddenText(genericShare, 'generic share');

const activeShare = buildDetailTimelineShare(activePost);
assertNoPath(activeShare, 'active share');
assertTimelineQuery(activeShare, activePost.id);
assert.match(activeShare.title, /附近(任务|线索)/);
assert.match(activeShare.title, /东门蓝色门禁卡/);
assert.equal(activeShare.imageUrl, 'cloud://timeline-image');
assert.equal(shouldShowDetailTimelineShare(activePost), true, 'active low-risk post should show timeline menu');
assertNoForbiddenText(activeShare, 'active share');

const riskyPosts = [
  { status: 'active', staleCount: 1, expected: /待核对|可能过时/ },
  { status: 'active', reportCount: 1, expected: /谨慎|举报|核对/ },
  { status: 'resolved', expected: /已关闭/ },
  { status: 'expired', expected: /已过期/ },
  { status: 'stale', expected: /待核对|可能过时/ },
  { status: 'hidden', expected: /暂不可查看|已隐藏/ }
];

for (const { status, expected, staleCount = 0, reportCount = 0 } of riskyPosts) {
  const riskyPost = { ...activePost, status, staleCount, reportCount };
  const payload = buildDetailTimelineShare(riskyPost);
  assertNoPath(payload, `${status} share`);
  assertTimelineQuery(payload, activePost.id);
  assert.match(payload.title, expected, `${status} title should be cautious`);
  assert.equal(shouldShowDetailTimelineShare(riskyPost), false, `${status} should not show timeline menu`);
  assert.ok(!payload.imageUrl, `${status} share should not expose a task image`);
  assert.doesNotMatch(payload.title, /紧急|马上|扩散|奖励|拉人/, `${status} title should not encourage broad spread`);
  assertNoForbiddenText(payload, `${status} share`);
}

assert.match(detailJs, /buildDetailTimelineShare/, 'detail page should use timeline share helper');
assert.match(detailJs, /onShareTimeline\(\)\s*{[\s\S]*const post = this\.data\.post[\s\S]*buildDetailTimelineShare\(post\)/, 'detail page should define onShareTimeline from current post');
assert.match(detailJs, /onShareTimeline\(\)\s*{[\s\S]*appendViralRelayQuery\(payload\.query, relaySession\)/, 'timeline re-share should append attribution params to the timeline query when available');
assert.doesNotMatch(
  detailJs.match(/onShareTimeline\(\)\s*{[\s\S]*?\n  },/)?.[0] || '',
  /\bpath\s*:/,
  'onShareTimeline must not return a custom page path'
);
assert.match(
  detailJs,
  /shouldShowDetailTimelineShare\(post\)[\s\S]*\? \['shareAppMessage', 'shareTimeline'\][\s\S]*: \['shareAppMessage'\]/,
  'timeline menu should only be configured for active low-risk posts'
);
assert.doesNotMatch(
  detailJs.match(/onLoad\(query = \{\}\)[\s\S]*?onShow\(\)/)?.[0] || '',
  /shareTimeline/,
  'onLoad should not enable timeline before the latest post state is known'
);
assertNoForbiddenText(helperJs, 'timeline helper source');

console.log('Timeline share checks passed.');
