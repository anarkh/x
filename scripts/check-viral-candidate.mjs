import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildDetailShareMessage } = await import('../utils/share-message.js');
const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');
const { buildShareReceiverActionStrip } = await import('../utils/share-receiver-actions.js');
const {
  buildDetailTimelineShare,
  shouldShowDetailTimelineShare
} = await import('../utils/timeline-share.js');
const { buildCommentRelayPrompt } = await import('../utils/comment-relay.js');
const { buildActionRelayPrompt } = await import('../utils/action-relay.js');
const { buildReceiverConversionPrompt } = await import('../utils/receiver-conversion.js');
const {
  buildPublishSpreadPlan,
  buildPublishSpreadSharePath
} = await import('../utils/publish-spread.js');

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');

assert.match(detailJs, /buildDetailShareMessage/, 'detail page should use share-message helper');
assert.match(detailJs, /buildShareReceiverGuide/, 'detail page should use share-receiver helper');
assert.match(detailJs, /buildShareReceiverActionStrip/, 'detail page should use share receiver action helper');
assert.match(detailJs, /buildCommentRelayPrompt/, 'detail page should use comment-relay helper');
assert.match(detailJs, /buildActionRelayPrompt/, 'detail page should use action-relay helper');
assert.match(detailJs, /buildReceiverConversionPrompt/, 'detail page should use receiver-conversion helper');
assert.match(detailJs, /buildPublishSpreadPlan/, 'detail page should use publish-spread helper');
assert.match(detailJs, /buildPublishSpreadSharePath\(post\.id, this\.data\.entryQuery\)/, 'publish share path should strip publisher-only context');
assert.match(detailWxml, /showPublishSuccess && publishSpreadPlan/, 'publish context should render spread plan');
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !receiverConversionPrompt && !actionRelayPrompt && !commentRelayPrompt && shareMessage/,
  'ordinary context should render share guidance only when receiver and relay prompts are absent'
);
assert.match(detailWxml, /share-receiver/, 'share entry should render receiver guidance');
assert.match(detailWxml, /shareReceiverActionStrip && !receiverConversionPrompt/, 'share entry should render receiver action strip before conversion');
assert.match(detailWxml, /receiverConversionPrompt/, 'receiver conversion should render relay prompt when present');
assert.match(detailWxml, /commentRelayPrompt/, 'comment success should render relay prompt when present');
assert.match(detailWxml, /actionRelayPrompt/, 'trust action success should render relay prompt when present');

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

const timelineShare = buildDetailTimelineShare(activePost);
assert.equal(timelineShare.query, 'id=post_candidate&from=share&source=timeline&shareChannel=timeline');
assert.ok(!Object.prototype.hasOwnProperty.call(timelineShare, 'path'));
assert.match(timelineShare.title, /附近线索|东门蓝色门禁卡/);
assert.equal(shouldShowDetailTimelineShare(activePost), true);
assert.equal(shouldShowDetailTimelineShare({ ...activePost, staleCount: 1 }), false);
assert.equal(shouldShowDetailTimelineShare({ ...activePost, reportCount: 1 }), false);

const shareReceiverGuide = buildShareReceiverGuide(activePost, 2, { entryFrom: 'share' });
assert.ok(shareReceiverGuide);
assert.match(shareReceiverGuide.summary, /评论|现场/);
assert.equal(buildShareReceiverGuide(activePost, 0, { entryFrom: 'detail' }), null);

const timelineReceiverGuide = buildShareReceiverGuide(activePost, 2, {
  entryFrom: 'share',
  source: 'timeline'
});
assert.ok(timelineReceiverGuide);
assert.equal(timelineReceiverGuide.kicker, '朋友圈看到');
assert.equal(timelineReceiverGuide.title, '附近任务，先核对一下');
assert.match(timelineReceiverGuide.summary, /朋友圈|附近任务/);
assert.match(timelineReceiverGuide.summary, /状态|评论/);
assert.match(timelineReceiverGuide.summary, /确认|线索/);
assert.match(timelineReceiverGuide.rows[1].value, /状态|确认信号|最新评论|确认|评论/);
assert.match(timelineReceiverGuide.rows[2].value, /不要盲目确认|更可能路过的人/);
assert.match(timelineReceiverGuide.note, /朋友圈|状态|评论|线索/);
assert.doesNotMatch(
  [
    timelineReceiverGuide.kicker,
    timelineReceiverGuide.title,
    timelineReceiverGuide.summary,
    ...timelineReceiverGuide.rows.map((row) => row.value),
    timelineReceiverGuide.note
  ].join('\n'),
  /已验证|属实|放心转发|帮忙扩散|必须转发|转发有奖|联系人|通讯录|群成员|好友列表/
);

const shareReceiverActionStrip = buildShareReceiverActionStrip(activePost, { entryFrom: 'share' });
assert.ok(shareReceiverActionStrip);
assert.equal(shareReceiverActionStrip.confirmText, '我在附近，确认一下');
assert.equal(shareReceiverActionStrip.commentText, '补一条线索');
assert.equal(buildShareReceiverActionStrip(activePost, { entryFrom: 'detail' }), null);
assert.equal(buildShareReceiverActionStrip({ ...activePost, reportCount: 1 }, { entryFrom: 'share' }), null);
assert.equal(buildShareReceiverActionStrip({ ...activePost, staleCount: 1 }, { entryFrom: 'share' }), null);
assert.equal(buildShareReceiverActionStrip({ ...activePost, reportCount: 2 }, { entryFrom: 'share' }), null);
assert.equal(buildShareReceiverActionStrip({ ...activePost, status: 'stale', staleCount: 3 }, { entryFrom: 'share' }), null);

const commentSourceReceiverGuide = buildShareReceiverGuide(activePost, 2, {
  entryFrom: 'share',
  source: 'comment'
});
assert.ok(commentSourceReceiverGuide);
assert.equal(commentSourceReceiverGuide.title, '有人刚补了线索');
assert.match(commentSourceReceiverGuide.summary, /最新评论|新线索/);
assert.match(commentSourceReceiverGuide.rows[0].value, /最新评论|评论接力/);
assert.match(commentSourceReceiverGuide.note, /最新评论/);

const confirmSourceReceiverGuide = buildShareReceiverGuide({ ...activePost, confirmations: 2 }, 1, {
  entryFrom: 'share',
  source: 'confirm'
});
assert.ok(confirmSourceReceiverGuide);
assert.equal(confirmSourceReceiverGuide.title, '有人刚确认过');
assert.match(confirmSourceReceiverGuide.summary, /确认信号|评论/);

const receiverSourceGuide = buildShareReceiverGuide(activePost, 2, {
  entryFrom: 'share',
  source: 'receiver'
});
assert.ok(receiverSourceGuide);
assert.equal(receiverSourceGuide.title, '有人接力转给你');
assert.match(receiverSourceGuide.summary, /接力|确认和评论/);

const riskyCommentSourceGuide = buildShareReceiverGuide({ ...activePost, reportCount: 2 }, 2, {
  entryFrom: 'share',
  source: 'comment'
});
assert.ok(riskyCommentSourceGuide);
assert.equal(riskyCommentSourceGuide.title, '先谨慎核对');
assert.match(riskyCommentSourceGuide.summary, /举报/);

const weakReportTimelineGuide = buildShareReceiverGuide({ ...activePost, reportCount: 1 }, 2, {
  entryFrom: 'share',
  source: 'timeline'
});
assert.ok(weakReportTimelineGuide);
assert.equal(weakReportTimelineGuide.title, '先核对现场变化');
assert.match(weakReportTimelineGuide.summary, /举报|核对/);
assert.doesNotMatch(weakReportTimelineGuide.title, /附近任务，先核对一下/);

const staleStatusTimelineGuide = buildShareReceiverGuide({ ...activePost, status: 'stale' }, 0, {
  entryFrom: 'share',
  source: 'timeline'
});
assert.ok(staleStatusTimelineGuide);
assert.equal(staleStatusTimelineGuide.title, '先看最新情况');
assert.match(staleStatusTimelineGuide.summary, /过时|最新情况/);

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

const actionRelayPrompt = buildActionRelayPrompt({ ...activePost, confirmations: 1 }, 'confirm');
assert.ok(actionRelayPrompt);
assert.equal(actionRelayPrompt.shouldEncourageRelay, true);
assert.match(actionRelayPrompt.sharePath, /from=share&source=confirm/);
assert.match(actionRelayPrompt.summary, /确认信号|路过的人/);

const riskyActionRelayPrompt = buildActionRelayPrompt({ ...activePost, reportCount: 2 }, 'confirm');
assert.ok(riskyActionRelayPrompt);
assert.equal(riskyActionRelayPrompt.shouldEncourageRelay, false);
assert.match(riskyActionRelayPrompt.note, /举报|误传/);

const receiverConversionPrompt = buildReceiverConversionPrompt(activePost, 'confirm', {
  entryFrom: 'share'
});
assert.ok(receiverConversionPrompt);
assert.equal(receiverConversionPrompt.shouldRelay, true);
assert.match(receiverConversionPrompt.sharePath, /from=share&source=receiver/);
assert.match(receiverConversionPrompt.body, /确认|路过的人|现场/);

const riskyReceiverConversionPrompt = buildReceiverConversionPrompt({ ...activePost, staleCount: 3 }, 'comment', {
  entryFrom: 'share'
});
assert.ok(riskyReceiverConversionPrompt);
assert.equal(riskyReceiverConversionPrompt.shouldRelay, false);
assert.match(riskyReceiverConversionPrompt.note, /过时|最新情况/);

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

const journeyEvidence = spawnSync(process.execPath, ['--no-warnings', 'scripts/check-viral-journey-evidence.mjs'], {
  cwd: rootDir,
  encoding: 'utf8',
  stdio: 'inherit'
});
assert.equal(
  journeyEvidence.status,
  0,
  'viral candidate check should include the viral journey evidence model'
);

const timelineShareCheck = spawnSync(process.execPath, ['--no-warnings', 'scripts/check-timeline-share.mjs'], {
  cwd: rootDir,
  encoding: 'utf8',
  stdio: 'inherit'
});
assert.equal(
  timelineShareCheck.status,
  0,
  'viral candidate check should include timeline share payload checks'
);

const viralAttributionCheck = spawnSync(process.execPath, ['--no-warnings', 'scripts/check-viral-attribution.mjs'], {
  cwd: rootDir,
  encoding: 'utf8',
  stdio: 'inherit'
});
assert.equal(
  viralAttributionCheck.status,
  0,
  'viral candidate check should include viral attribution event checks'
);

console.log('Viral candidate checks passed.');
