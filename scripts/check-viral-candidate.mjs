import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildDetailShareMessage } = await import('../utils/share-message.js');
const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');
const { buildCommentRelayPrompt } = await import('../utils/comment-relay.js');
const {
  buildPublishSpreadPlan,
  buildPublishSpreadSharePath
} = await import('../utils/publish-spread.js');

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');

assert.match(detailJs, /buildDetailShareMessage/, 'detail page should use share-message helper');
assert.match(detailJs, /buildShareReceiverGuide/, 'detail page should use share-receiver helper');
assert.match(detailJs, /buildCommentRelayPrompt/, 'detail page should use comment-relay helper');
assert.match(detailJs, /buildPublishSpreadPlan/, 'detail page should use publish-spread helper');
assert.match(detailJs, /buildPublishSpreadSharePath\(post\.id, this\.data\.entryQuery\)/, 'publish share path should strip publisher-only context');
assert.match(detailWxml, /showPublishSuccess && publishSpreadPlan/, 'publish context should render spread plan');
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !commentRelayPrompt && shareMessage/,
  'ordinary context should render share guidance only when receiver and comment relay prompts are absent'
);
assert.match(detailWxml, /share-receiver/, 'share entry should render receiver guidance');
assert.match(detailWxml, /commentRelayPrompt/, 'comment success should render relay prompt when present');

const activePost = {
  id: 'post_candidate',
  title: '东门蓝色门禁卡',
  category: 'lost_found',
  intent: 'lost',
  status: 'active',
  confirmations: 0,
  staleCount: 0,
  reportCount: 0,
  imageUrls: ['cloud://image'],
  placeName: '东门'
};

const shareMessage = buildDetailShareMessage(activePost, 0);
assert.equal(shareMessage.path, '/pages/detail/detail?id=post_candidate&from=share');
assert.match(shareMessage.title, /失物招领|东门蓝色门禁卡/);

const shareReceiverGuide = buildShareReceiverGuide(activePost, 2, { entryFrom: 'share' });
assert.ok(shareReceiverGuide);
assert.match(shareReceiverGuide.summary, /评论|现场/);
assert.equal(buildShareReceiverGuide(activePost, 0, { entryFrom: 'detail' }), null);

const commentSourceReceiverGuide = buildShareReceiverGuide(activePost, 2, {
  entryFrom: 'share',
  source: 'comment'
});
assert.ok(commentSourceReceiverGuide);
assert.equal(commentSourceReceiverGuide.title, '有人刚补了线索');
assert.match(commentSourceReceiverGuide.summary, /最新评论|新线索/);
assert.match(commentSourceReceiverGuide.rows[0].value, /最新评论|评论接力/);
assert.match(commentSourceReceiverGuide.note, /最新评论/);

const riskyCommentSourceGuide = buildShareReceiverGuide({ ...activePost, reportCount: 2 }, 2, {
  entryFrom: 'share',
  source: 'comment'
});
assert.ok(riskyCommentSourceGuide);
assert.equal(riskyCommentSourceGuide.title, '先谨慎核对');
assert.match(riskyCommentSourceGuide.summary, /举报/);

const commentRelayPrompt = buildCommentRelayPrompt(activePost, {
  body: '我刚路过，东门保安说有人见过这张门禁卡。'
}, 1);
assert.ok(commentRelayPrompt);
assert.equal(commentRelayPrompt.shouldEncourageRelay, true);
assert.match(commentRelayPrompt.sharePath, /from=share&source=comment/);
assert.match(commentRelayPrompt.summary, /最新线索|路过的人/);

const riskyRelayPrompt = buildCommentRelayPrompt({ ...activePost, reportCount: 2 }, {
  body: '现场对不上。'
}, 2);
assert.ok(riskyRelayPrompt);
assert.equal(riskyRelayPrompt.shouldEncourageRelay, false);
assert.match(riskyRelayPrompt.note, /盲转|误传/);

const spreadPlan = buildPublishSpreadPlan(activePost, 0);
assert.equal(spreadPlan.shouldEncourageSpread, true);
assert.match(spreadPlan.title, /扩散计划/);
assert.match(spreadPlan.imageHint, /有图/);

const publishSharePath = buildPublishSpreadSharePath('post_candidate', {
  from: 'publish',
  keep: '1'
});
assert.equal(publishSharePath, '/pages/detail/detail?id=post_candidate&keep=1');
assert.doesNotMatch(publishSharePath, /from=publish/);

const closedPlan = buildPublishSpreadPlan({ ...activePost, status: 'resolved' }, 2);
assert.equal(closedPlan.shouldEncourageSpread, false);
assert.match(closedPlan.sharePrompt, /不用继续扩散/);

console.log('Viral candidate checks passed.');
