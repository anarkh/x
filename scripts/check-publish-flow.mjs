import assert from 'node:assert/strict';

import { buildPublishState } from '../pages/publish/publish-state.js';

const baseForm = {
  title: '',
  body: '',
  category: 'check_in',
  intent: '',
  placeName: '',
  expiryHours: 24
};

function state(overrides = {}) {
  return buildPublishState({
    form: { ...baseForm, ...(overrides.form || {}) },
    isGuest: Boolean(overrides.isGuest),
    hasLocation: Boolean(overrides.hasLocation),
    locationStatus: overrides.locationStatus || 'idle',
    imageCount: Number(overrides.imageCount) || 0,
    submitting: Boolean(overrides.submitting)
  });
}

const guestState = state({ isGuest: true });
assert.equal(guestState.buttonText, '去登录');
assert.equal(guestState.actionDisabled, false);
assert.equal(guestState.items.find((item) => item.key === 'account').done, false);

const emptyState = state();
assert.equal(emptyState.buttonText, '继续填写');
assert.equal(emptyState.actionDisabled, true);
assert.equal(emptyState.missing[0], '标题');
assert.equal(emptyState.items.find((item) => item.key === 'content').done, false);

const lostFoundState = state({
  hasLocation: true,
  locationStatus: 'ready',
  form: {
    title: '蓝色门禁卡',
    body: '在地铁口附近丢失，有挂绳。',
    category: 'lost_found'
  }
});
assert.equal(lostFoundState.actionDisabled, true);
assert.deepEqual(lostFoundState.missing, ['失物方向']);

const readyState = state({
  hasLocation: true,
  locationStatus: 'ready',
  imageCount: 2,
  form: {
    title: '社区花园今天很适合拍照',
    body: '下午光线很好，人也不多。',
    category: 'check_in'
  }
});
assert.equal(readyState.ready, true);
assert.equal(readyState.actionDisabled, false);
assert.equal(readyState.buttonText, '发布');
assert.equal(readyState.title, '可以发布到附近');
assert.equal(readyState.completionText, '4/4');
assert.match(readyState.note, /2张图片/);

console.log('Publish flow checks passed.');
