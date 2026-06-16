import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildDetailShareMessage } = await import('../utils/share-message.js');
const {
  buildPublishSpreadPlan,
  buildPublishSpreadSharePath
} = await import('../utils/publish-spread.js');

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');

assert.match(detailJs, /buildDetailShareMessage/, 'detail page should use share-message helper');
assert.match(detailJs, /buildPublishSpreadPlan/, 'detail page should use publish-spread helper');
assert.match(detailJs, /buildPublishSpreadSharePath\(post\.id, this\.data\.entryQuery\)/, 'publish share path should strip publisher-only context');
assert.match(detailWxml, /showPublishSuccess && publishSpreadPlan/, 'publish context should render spread plan');
assert.match(detailWxml, /!showPublishSuccess && shareMessage/, 'ordinary context should render share guidance');

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
