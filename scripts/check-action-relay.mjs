import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildActionRelayPrompt } = await import('../utils/action-relay.js');
const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');

function post(overrides = {}) {
  return {
    id: 'post_confirm_1',
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

{
  const result = buildActionRelayPrompt(post(), 'confirm');
  assert.ok(result, 'confirm action should create a relay prompt');
  assert.equal(result.kicker, '确认已记录');
  assert.equal(result.shouldEncourageRelay, true);
  assert.equal(result.tone, 'good');
  assert.match(result.title, /确认信号|接力/);
  assert.match(result.summary, /确认信号|路过的人/);
  assert.match(result.rows[0].value, /确认 1 次/);
  assert.match(result.rows[1].value, /附近|物业|保安|路过/);
  assert.match(result.shareTitle, /已确认|门禁卡/);
  assert.equal(result.sharePath, '/pages/detail/detail?id=post_confirm_1&from=share&source=confirm');
}

{
  const stale = buildActionRelayPrompt(post({ status: 'stale', staleCount: 3 }), 'stale');
  assert.ok(stale);
  assert.equal(stale.shouldEncourageRelay, false);
  assert.equal(stale.tone, 'warn');
  assert.match(stale.summary, /过时|不要把旧信息继续扩散/);
  assert.match(stale.note, /旧信息|最新现场/);

  const report = buildActionRelayPrompt(post({ reportCount: 2 }), 'report');
  assert.ok(report);
  assert.equal(report.shouldEncourageRelay, false);
  assert.equal(report.tone, 'danger');
  assert.match(report.summary, /举报|不要继续公开扩散/);
  assert.match(report.note, /举报|误传/);
}

{
  const highReport = buildActionRelayPrompt(post({ reportCount: 2 }), 'confirm');
  assert.ok(highReport);
  assert.equal(highReport.shouldEncourageRelay, false);
  assert.equal(highReport.tone, 'danger');
  assert.match(highReport.summary, /举报|不要继续公开扩散/);

  const resolved = buildActionRelayPrompt(post({ status: 'resolved', confirmations: 3 }), 'confirm');
  assert.ok(resolved);
  assert.equal(resolved.shouldEncourageRelay, false);
  assert.equal(resolved.tone, 'done');
  assert.match(resolved.summary, /关闭|不需要继续公开扩散/);

  const expired = buildActionRelayPrompt(post({ status: 'expired' }), 'confirm');
  assert.ok(expired);
  assert.equal(expired.shouldEncourageRelay, false);
  assert.equal(expired.tone, 'done');
  assert.match(expired.summary, /过期|历史参考/);

  const hidden = buildActionRelayPrompt(post({ status: 'hidden', reportCount: 3 }), 'confirm');
  assert.ok(hidden);
  assert.equal(hidden.shouldEncourageRelay, false);
  assert.equal(hidden.tone, 'danger');
  assert.match(hidden.summary, /隐藏|管理员/);
}

{
  assert.equal(buildActionRelayPrompt(null, 'confirm'), null);
  assert.equal(buildActionRelayPrompt({ status: 'active' }, 'confirm'), null);
  assert.equal(buildActionRelayPrompt(post(), ''), null);
  assert.equal(buildActionRelayPrompt(post(), 'unknown'), null);
}

{
  const receiver = buildShareReceiverGuide(post({ confirmations: 2 }), 1, {
    entryFrom: 'share',
    source: 'confirm'
  });
  assert.ok(receiver);
  assert.equal(receiver.title, '有人刚确认过');
  assert.match(receiver.summary, /确认信号|评论/);
  assert.match(receiver.rows[0].value, /确认接力|确认和评论/);
  assert.match(receiver.note, /确认和评论/);
}

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const detailWxml = readFileSync('pages/detail/detail.wxml', 'utf8');
const detailWxss = readFileSync('pages/detail/detail.wxss', 'utf8');
const loadPostStart = detailJs.indexOf('async loadPost()');
const loadPostEnd = detailJs.indexOf('  renderPost', loadPostStart);
const loadPostBody = detailJs.slice(loadPostStart, loadPostEnd);

assert.match(detailJs, /buildActionRelayPrompt/, 'detail page should import action relay helper');
assert.match(detailJs, /actionRelayPrompt: null/, 'action relay prompt should default to hidden');
assert.match(loadPostBody, /actionRelayPrompt: null/, 'loading post should reset action relay prompt');
assert.match(detailJs, /actionRelayPrompt:\s*buildActionRelayPrompt\(post, action\)/, 'react success should create action relay prompt');
assert.match(detailJs, /shareContext === 'actionRelay'/, 'action relay share button should have its own share payload');
assert.match(detailWxml, /actionRelayPrompt/, 'detail page should render action relay prompt');
assert.match(detailWxml, /data-share-context="actionRelay"/, 'action relay share button should identify share context');
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !actionRelayPrompt && !commentRelayPrompt && shareMessage/,
  'ordinary share panel should hide while receiver, action relay, or comment relay prompts are active'
);
assert.match(detailWxss, /\.comment-relay\b/, 'action relay panel should reuse relay panel styles');

console.log('Action relay checks passed.');
