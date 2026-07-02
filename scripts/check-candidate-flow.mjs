import assert from 'node:assert/strict';

import { buildPublishState } from '../pages/publish/publish-state.js';
import { formatTrustInsight } from '../utils/format.js';

const filledForm = {
  title: '东门临时取件点',
  body: '快递架旁边有临时取件提示，路过可以看一下。',
  category: 'check_in',
  intent: '',
  placeName: '',
  expiryHours: 168
};

function publishState(overrides = {}) {
  return buildPublishState({
    form: { ...filledForm, ...(overrides.form || {}) },
    isGuest: Boolean(overrides.isGuest),
    hasLocation: Boolean(overrides.hasLocation),
    locationStatus: overrides.locationStatus || 'idle',
    imageCount: Number(overrides.imageCount) || 0,
    submitting: Boolean(overrides.submitting)
  });
}

function trustInsight(overrides = {}, commentCount = 0) {
  return formatTrustInsight({
    status: 'active',
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    lastConfirmedAt: 0,
    ...overrides
  }, commentCount);
}

{
  const result = publishState({
    isGuest: true,
    form: { title: '', body: '', category: 'check_in' }
  });
  assert.equal(result.primaryAction, 'login');
}

{
  const result = publishState();
  assert.equal(result.primaryAction, 'confirmLocation');
}

{
  const result = publishState({ locationStatus: 'failed' });
  assert.equal(result.primaryAction, 'confirmLocation');
  assert.ok(result.buttonText);
  assert.ok(result.note);
}

{
  const result = publishState({ hasLocation: true, locationStatus: 'ready' });
  assert.equal(result.primaryAction, 'publish');
}

{
  const result = publishState({ submitting: true });
  assert.equal(result.primaryAction, 'submitting');
}

{
  const result = trustInsight({ confirmations: 5, lastConfirmedAt: Date.now() - 60 * 1000 });
  assert.equal(result.title, '有确认信号');
  assert.match(result.hint, /现场|评论|判断/);
}

{
  const result = trustInsight({ confirmations: 1, reportCount: 2 });
  assert.equal(result.title, '存在多次举报');
  assert.match(`${result.body}${result.hint}`, /谨慎|不要直接行动|管理员/);
}

{
  const result = trustInsight({ confirmations: 3, staleCount: 3 });
  assert.equal(result.title, '可能已经过时');
  assert.match(`${result.body}${result.hint}`, /不再准确|最新情况|补充/);
}

{
  const result = trustInsight({}, 4);
  assert.equal(result.title, '先看评论线索');
  assert.match(`${result.body}${result.hint}`, /先看|提问|补充/);
}

{
  const result = trustInsight({ status: 'resolved', confirmations: 3 }, 2);
  assert.equal(result.title, '任务已关闭');
  assert.match(`${result.body}${result.hint}`, /历史线索|不需要继续确认/);
}

{
  const result = trustInsight({ status: 'expired', confirmations: 3 }, 2);
  assert.equal(result.title, '任务已过期');
  assert.match(`${result.body}${result.hint}`, /历史线索|不再接收确认/);
}

console.log('Candidate flow checks passed.');
