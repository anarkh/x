import assert from 'node:assert/strict';
import { buildAdminReviewState } from '../pages/admin/admin-review.js';

const now = new Date('2026-06-13T08:00:00Z').getTime();
Date.now = () => now;

function makePost(overrides) {
  return {
    id: 'post_base',
    markerId: 1,
    title: '普通求助',
    body: '需要邻居帮忙确认',
    category: 'help_needed',
    placeName: '社区门口',
    latitude: 39.9,
    longitude: 116.3,
    status: 'active',
    confirmations: 0,
    lastConfirmedAt: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 30 * 60 * 1000,
    expiresAt: now + 2 * 60 * 60 * 1000,
    publisher: '匿名用户',
    ...overrides
  };
}

const posts = [
  makePost({
    id: 'post_stale',
    title: '路灯故障',
    body: '晚上仍然很暗',
    category: 'street_update',
    status: 'stale',
    staleCount: 3,
    createdAt: now - 2 * 60 * 60 * 1000,
    publisher: '小周'
  }),
  makePost({
    id: 'post_reported',
    title: '可疑广告',
    body: '疑似引流内容',
    reportCount: 2,
    createdAt: now - 60 * 60 * 1000,
    publisher: '小李'
  }),
  makePost({
    id: 'post_expired',
    title: '旧物转交',
    status: 'expired',
    expiresAt: now - 60 * 1000,
    createdAt: now - 3 * 60 * 60 * 1000
  }),
  makePost({
    id: 'post_hidden',
    title: '已隐藏内容',
    status: 'hidden',
    reportCount: 4,
    createdAt: now - 4 * 60 * 60 * 1000
  }),
  makePost({
    id: 'post_resolved',
    title: '已经关闭',
    status: 'resolved',
    createdAt: now - 5 * 60 * 60 * 1000
  })
];

{
  const state = buildAdminReviewState(posts);
  assert.equal(state.posts[0].id, 'post_reported', '高举报内容应排在处置队列最前');
  assert.equal(state.posts[0].riskText, '高优先级');
  assert.equal(state.posts[0].suggestedActionText, '优先隐藏');
  assert.match(state.posts[0].riskReasonText, /2 次举报/);
}

{
  const state = buildAdminReviewState(posts, { activeFilter: 'needs_review' });
  const stale = state.posts.find((post) => post.id === 'post_stale');
  const expired = state.posts.find((post) => post.id === 'post_expired');
  assert.match(stale.riskReasonText, /3 次过时/);
  assert.match(stale.riskReasonText, /疑似过时/);
  assert.equal(stale.suggestedActionText, '可关闭归档');
  assert.match(expired.riskReasonText, /已过期/);
  assert.equal(expired.suggestedActionText, '可隐藏下线');
  assert.deepEqual(
    state.visiblePosts.map((post) => post.id),
    ['post_reported', 'post_stale', 'post_expired'],
    '待处理只应包含举报、过时或已过期内容'
  );
}

{
  const state = buildAdminReviewState(posts, { activeFilter: 'all' });
  const hidden = state.posts.find((post) => post.id === 'post_hidden');
  const expired = state.posts.find((post) => post.id === 'post_expired');
  const resolved = state.posts.find((post) => post.id === 'post_resolved');
  assert.equal(hidden.canHide, false, '已隐藏内容不能再次隐藏');
  assert.equal(hidden.canResolve, false, '已隐藏内容不能关闭');
  assert.equal(expired.canResolve, false, '已过期内容不能使用关闭任务动作');
  assert.equal(resolved.canResolve, false, '已关闭内容不能再次关闭');
  assert.equal(resolved.canHide, true, '已关闭内容仍可隐藏以从普通列表移除');
}

{
  const state = buildAdminReviewState(posts, { activeFilter: 'all', query: '小周 路灯' });
  assert.deepEqual(state.visiblePosts.map((post) => post.id), ['post_stale']);
}

{
  const state = buildAdminReviewState(posts);
  assert.deepEqual(state.stats, {
    total: 5,
    needsReview: 3,
    active: 1,
    stale: 1,
    resolved: 1,
    reported: 2,
    hidden: 1
  });
  assert.equal(state.filterOptions.find((item) => item.value === 'hidden').count, 1);
  assert.equal(state.filterOptions.find((item) => item.value === 'closed').count, 3);
}

console.log('Admin review helper checks passed.');
