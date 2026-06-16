import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildCommentRelayPrompt } = await import('../utils/comment-relay.js');

function post(overrides = {}) {
  return {
    id: 'post_comment_1',
    title: '东门蓝色门禁卡',
    body: '在地铁口附近丢失，有挂绳。',
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

function prompt(overrides = {}, commentBody = '我刚路过，保安说可能在值班室，可以去问问。', commentCount = 1) {
  return buildCommentRelayPrompt(
    post(overrides),
    { id: 'comment_1', body: commentBody },
    commentCount
  );
}

{
  const result = prompt();
  assert.ok(result, 'active post with a fresh comment should show a relay prompt');
  assert.equal(result.shouldEncourageRelay, true);
  assert.equal(result.tone, 'good');
  assert.match(result.title, /接力|线索/);
  assert.match(result.summary, /最新线索|路过的人/);
  assert.match(result.latestComment, /保安|值班室/);
  assert.match(result.rows[0].value, /值班室/);
  assert.match(result.rows[1].value, /附近|路过|物业|保安/);
  assert.match(result.actionText, /接力|转发/);
  assert.match(result.shareTitle, /新线索|门禁卡/);
  assert.equal(result.sharePath, '/pages/detail/detail?id=post_comment_1&from=share&source=comment');
}

{
  const longBody = '我刚到东门口看了一圈，门卫说下午三点左右有人把蓝色门禁卡交到值班室，卡套上有一条黑色挂绳。';
  const result = prompt({}, longBody, 2);
  assert.ok(result);
  assert.ok(result.latestComment.length <= 25, 'comment summary should stay compact for narrow screens');
  assert.match(result.latestComment, /…$/);
  assert.match(result.note, /2条线索|评论/);
}

{
  const stale = prompt({ status: 'stale', staleCount: 3 }, '我看到现场已经变了，原来的提示可能不准。', 4);
  assert.ok(stale);
  assert.equal(stale.shouldEncourageRelay, false);
  assert.equal(stale.tone, 'warn');
  assert.match(stale.summary, /过时|先核对|别盲转/);
  assert.match(stale.actionText, /先看|不公开/);

  const highReport = prompt({ reportCount: 2 }, '这个信息和现场对不上。', 3);
  assert.ok(highReport);
  assert.equal(highReport.shouldEncourageRelay, false);
  assert.equal(highReport.tone, 'danger');
  assert.match(highReport.summary, /举报|先核对|别公开扩散/);
  assert.match(highReport.note, /盲转|误传/);
}

{
  const resolved = prompt({ status: 'resolved' }, '发布者说已经找到了。', 5);
  assert.ok(resolved);
  assert.equal(resolved.shouldEncourageRelay, false);
  assert.equal(resolved.tone, 'done');
  assert.match(resolved.title, /已关闭/);
  assert.match(resolved.summary, /历史|不用继续公开/);

  const expired = prompt({ status: 'expired' }, '已经过了时间。', 2);
  assert.ok(expired);
  assert.equal(expired.shouldEncourageRelay, false);
  assert.equal(expired.tone, 'done');
  assert.match(expired.title, /已过期/);
  assert.match(expired.note, /最新任务|历史线索/);

  const hidden = prompt({ status: 'hidden', reportCount: 4 }, '不确定内容是否准确。', 1);
  assert.ok(hidden);
  assert.equal(hidden.shouldEncourageRelay, false);
  assert.equal(hidden.tone, 'danger');
  assert.match(hidden.title, /已隐藏/);
  assert.match(hidden.summary, /不要继续公开扩散|管理员/);
}

{
  assert.equal(buildCommentRelayPrompt(null, { body: '补充线索' }, 1), null);
  assert.equal(buildCommentRelayPrompt({ id: 'post_without_comment', status: 'active' }, { body: '   ' }, 1), null);
  assert.equal(buildCommentRelayPrompt({ title: '缺少 id', status: 'active' }, { body: '补充线索' }, 1), null);
}

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');
const detailWxss = readFileSync('pages/detail/detail.wxss', 'utf8');
const loadCommentsStart = detailJs.indexOf('async loadComments()');
const loadCommentsEnd = detailJs.indexOf('  previewImage', loadCommentsStart);
const loadCommentsBody = detailJs.slice(loadCommentsStart, loadCommentsEnd);

assert.match(detailJs, /buildCommentRelayPrompt/, 'detail page should import and use comment relay helper');
assert.match(detailJs, /commentRelayPrompt: null/, 'comment relay prompt should default to hidden');
assert.match(detailJs, /receiverConversionPrompt: null/, 'receiver conversion prompt should default to hidden');
assert.match(detailJs, /commentRelayPrompt: receiverConversionPrompt\s*\?\s*null\s*:\s*buildCommentRelayPrompt\(/, 'comment submit success should create the relay prompt when receiver conversion is absent');
assert.match(detailJs, /const receiverConversionPrompt = buildReceiverConversionPrompt\(this\.data\.post, 'comment'/, 'comment submit success should build the receiver conversion prompt');
assert.match(detailJs, /commentRelayPrompt: receiverConversionPrompt\s*\?\s*null/, 'receiver conversion should suppress comment relay prompt');
assert.match(detailJs, /shareContext === 'commentRelay'/, 'comment relay share button should have its own share payload');
assert.match(detailJs, /shareContext === 'receiverConversion'/, 'receiver conversion share button should have its own share payload');
assert.doesNotMatch(loadCommentsBody, /commentRelayPrompt:\s*buildCommentRelayPrompt\(/, 'loading comments should not show the relay prompt by default');
assert.match(detailWxml, /commentRelayPrompt/, 'detail page should render comment relay panel');
assert.match(detailWxml, /receiverConversionPrompt/, 'detail page should render receiver conversion panel');
assert.match(detailWxml, /open-type="share"/, 'comment relay panel should offer a share button when safe');
assert.match(detailWxml, /commentRelayPrompt\.shouldEncourageRelay/, 'risky states should avoid public relay CTA');
assert.match(detailJs, /source:\s*this\.data\.entryQuery\.source/, 'detail page should pass share source into share receiver helper');
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !receiverConversionPrompt && !actionRelayPrompt && !commentRelayPrompt && shareMessage/,
  'ordinary share panel should hide while receiver, action relay, or comment relay prompts are active'
);
assert.match(detailWxss, /\.comment-relay\b/, 'detail styles should include the relay panel');

console.log('Comment relay checks passed.');
