import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import config from '../utils/config.js';
import { formatTimeLeft } from '../utils/format.js';
import { buildPublishState } from '../pages/publish/publish-state.js';

assert.deepEqual(config.expiryOptions, [
  { value: 168, label: '1周' },
  { value: 720, label: '1月' },
  { value: config.longTermExpiryHours, label: '长期', type: 'long_term' },
  { value: 'custom', label: '自定义' }
]);
assert.equal(config.expiryOptions.findIndex((option) => option.type === 'long_term'), 2);

const publishJs = readFileSync(new URL('../pages/publish/publish.js', import.meta.url), 'utf8');
assert.ok(
  publishJs.includes("config.expiryOptions.findIndex((option) => option.type === 'long_term')"),
  'publish page should derive its default expiry from the long-term option'
);
assert.ok(
  publishJs.includes('expiryHours: DEFAULT_EXPIRY_OPTION.value'),
  'publish default form should use the long-term expiry value'
);
assert.ok(
  publishJs.includes("expiryType: DEFAULT_EXPIRY_OPTION.type || ''"),
  'publish default form should keep the long-term display marker'
);
assert.ok(
  publishJs.includes('expiryIndex: DEFAULT_EXPIRY_INDEX'),
  'publish page should select the long-term option by default'
);

const baseForm = {
  title: '',
  body: '',
  category: 'check_in',
  intent: '',
  placeName: '',
  expiryHours: config.longTermExpiryHours,
  expiryType: 'long_term'
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
assert.equal(guestState.primaryAction, 'login');
assert.equal(guestState.items.find((item) => item.key === 'account').done, false);

const emptyState = state();
assert.equal(emptyState.buttonText, '补标题');
assert.equal(emptyState.actionDisabled, true);
assert.equal(emptyState.primaryAction, 'fill');
assert.equal(emptyState.missing[0], '标题');
assert.equal(emptyState.items.find((item) => item.key === 'content').done, false);

const locatingState = state({
  locationStatus: 'locating',
  form: {
    title: '楼下快递架有积水',
    body: '经过的人注意绕一下，已经提醒物业。',
    category: 'check_in'
  }
});
assert.equal(locatingState.ready, false);
assert.equal(locatingState.actionDisabled, true);
assert.equal(locatingState.buttonText, '确认位置中');
assert.equal(locatingState.title, '正在确认位置');
assert.equal(locatingState.primaryAction, 'waitLocation');
assert.equal(locatingState.items.find((item) => item.key === 'location').value, '确认中');

const needsLocationState = state({
  form: {
    title: '楼下快递架有积水',
    body: '经过的人注意绕一下，已经提醒物业。',
    category: 'check_in'
  }
});
assert.equal(needsLocationState.ready, false);
assert.equal(needsLocationState.actionDisabled, false);
assert.equal(needsLocationState.buttonText, '确认位置');
assert.equal(needsLocationState.title, '确认当前位置');
assert.equal(needsLocationState.primaryAction, 'confirmLocation');

const failedLocationState = state({
  locationStatus: 'failed',
  form: {
    title: '东门钥匙串招领',
    body: '放在保安室前台，可以报挂件颜色领取。',
    category: 'lost_found',
    intent: 'found'
  }
});
assert.equal(failedLocationState.ready, false);
assert.equal(failedLocationState.actionDisabled, false);
assert.equal(failedLocationState.buttonText, '重试定位');
assert.equal(failedLocationState.title, '位置未确认');
assert.equal(failedLocationState.primaryAction, 'confirmLocation');
assert.match(failedLocationState.note, /授权|重试/);
assert.equal(failedLocationState.items.find((item) => item.key === 'location').value, '待重试');

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
assert.equal(lostFoundState.buttonText, '选失物方向');
assert.equal(lostFoundState.primaryAction, 'fill');

const missingExpiryState = state({
  hasLocation: true,
  locationStatus: 'ready',
  form: {
    title: '社区花园今天很适合拍照',
    body: '下午光线很好，人也不多。',
    category: 'check_in',
    expiryHours: 0,
    expiresAt: 0
  }
});
assert.equal(missingExpiryState.ready, false);
assert.deepEqual(missingExpiryState.missing, ['有效期']);
assert.equal(missingExpiryState.buttonText, '选有效期');
assert.equal(missingExpiryState.items.find((item) => item.key === 'expiry').done, false);

const readyLostFoundState = state({
  hasLocation: true,
  locationStatus: 'ready',
  form: {
    title: '捡到蓝色门禁卡',
    body: '在地铁口附近捡到，有挂绳。',
    category: 'lost_found',
    intent: 'found'
  }
});
assert.equal(readyLostFoundState.ready, true);
assert.equal(readyLostFoundState.actionDisabled, false);
assert.equal(readyLostFoundState.buttonText, '发布');
assert.equal(readyLostFoundState.primaryAction, 'publish');

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
assert.equal(readyState.completionText, '5/5');
assert.equal(readyState.primaryAction, 'publish');
assert.match(readyState.note, /2张图片/);

const customExpiryState = state({
  hasLocation: true,
  locationStatus: 'ready',
  form: {
    title: '社区花园今天很适合拍照',
    body: '下午光线很好，人也不多。',
    category: 'check_in',
    expiryHours: 0,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000
  }
});
assert.equal(customExpiryState.ready, true);
assert.equal(customExpiryState.items.find((item) => item.key === 'expiry').value, '已设置');

const longCustomExpiryState = state({
  hasLocation: true,
  locationStatus: 'ready',
  form: {
    title: '社区花园长期约拍点',
    body: '周末傍晚光线一直不错，可以慢慢约时间。',
    category: 'check_in',
    expiryHours: 0,
    expiresAt: Date.now() + 45 * 24 * 60 * 60 * 1000
  }
});
assert.equal(longCustomExpiryState.ready, true, 'custom expiry should not have a 30-day maximum.');
assert.equal(
  formatTimeLeft(Date.now() + config.longTermExpiryHours * 60 * 60 * 1000, 'long_term'),
  '长期有效'
);

console.log('Publish flow checks passed.');
