import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') {
    console.warn(warning.stack || warning.message);
  }
});

const { buildReceiverConversionPrompt } = await import('../utils/receiver-conversion.js');
const { buildShareReceiverGuide } = await import('../utils/share-receiver.js');

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

{
  const confirmed = buildReceiverConversionPrompt(post(), 'confirm', { entryFrom: 'share' });
  assert.ok(confirmed, 'share-entry confirm should create a receiver conversion prompt');
  assert.equal(confirmed.shouldRelay, true);
  assert.equal(confirmed.tone, 'good');
  assert.match(confirmed.title, /确认|接力/);
  assert.match(confirmed.body, /确认|路过的人|现场/);
  assert.match(confirmed.buttonText, /接力/);
  assert.equal(confirmed.sharePath, '/pages/detail/detail?id=post_receiver_1&from=share&source=receiver');

  const commented = buildReceiverConversionPrompt(post(), 'comment', { entryFrom: 'share' });
  assert.ok(commented);
  assert.equal(commented.shouldRelay, true);
  assert.match(commented.title, /评论|接力/);
  assert.match(commented.body, /评论|确认/);
  assert.match(commented.shareTitle, /已补充线索/);
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
}

{
  const guide = buildShareReceiverGuide(post(), 2, {
    entryFrom: 'share',
    source: 'receiver'
  });
  assert.ok(guide);
  assert.equal(guide.title, '有人接力转给你');
  assert.match(guide.summary, /接力|确认和评论/);
  assert.match(guide.rows[1].value, /继续接力|确认和评论/);
  assert.match(guide.note, /确认和评论/);

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
assert.match(detailWxml, /data-share-context="receiverConversion"/, 'receiver conversion share button should identify share context');
assert.match(
  detailWxml,
  /!showPublishSuccess && !shareReceiverGuide && !receiverConversionPrompt && !actionRelayPrompt && !commentRelayPrompt && shareMessage/,
  'ordinary share panel should hide while receiver conversion or relay prompts are active'
);
assert.match(detailWxss, /\.receiver-conversion\b/, 'detail styles should include receiver conversion panel');

console.log('Receiver conversion checks passed.');
