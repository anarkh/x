import assert from 'node:assert/strict';
import { buildMeState } from '../pages/me/me-state.js';

const now = new Date('2026-06-13T08:00:00Z').getTime();
Date.now = () => now;

function user(overrides = {}) {
  return {
    id: 'user_1',
    isGuest: false,
    profileCompleted: true,
    nickname: '附近用户',
    ...overrides
  };
}

function post(overrides = {}) {
  return {
    id: 'post_1',
    title: '取快递',
    body: '帮忙看一下',
    category: 'help_needed',
    placeName: '小区门口',
    status: 'active',
    confirmations: 0,
    lastConfirmedAt: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 20 * 60 * 1000,
    expiresAt: now + 2 * 60 * 60 * 1000,
    publisherId: 'user_1',
    publisher: '附近用户',
    isMine: true,
    ...overrides
  };
}

function reaction(id, action, minutesAgo) {
  return {
    id,
    action,
    reactedAt: now - minutesAgo * 60 * 1000
  };
}

{
  const state = buildMeState({ user: user({ isGuest: true }), posts: [], reactions: [] });
  assert.equal(state.nextAction.action, 'login');
  assert.equal(state.nextAction.buttonText, '去登录');
}

{
  const state = buildMeState({ user: user({ profileCompleted: false }), posts: [], reactions: [], profileNeedsSetup: true });
  assert.equal(state.nextAction.action, 'profile');
  assert.match(state.nextAction.title, /补全/);
}

{
  const state = buildMeState({ user: user(), posts: [], reactions: [] });
  assert.equal(state.nextAction.action, 'publish');
  assert.equal(state.myPostsText, '还没有发布过任务');
  assert.equal(state.activitiesText, '还没有参与记录');
}

{
  const state = buildMeState({
    user: user(),
    posts: [post({ id: 'post_open' }), post({ id: 'post_done', status: 'resolved' })],
    reactions: []
  });
  assert.equal(state.nextAction.action, 'myPosts');
  assert.equal(state.stats.find((item) => item.label === '处理中').value, 1);
  assert.equal(state.myPostsText, '1 条处理中，1 条已关闭');
}

{
  const posts = [
    post({ id: 'post_other_1', title: '路灯', publisherId: 'other', isMine: false }),
    post({ id: 'post_other_2', title: '广告', publisherId: 'other', isMine: false }),
    post({ id: 'post_other_3', title: '问路', publisherId: 'other', isMine: false })
  ];
  const state = buildMeState({
    user: user(),
    posts,
    reactions: [
      reaction('post_other_1', 'confirm', 5),
      reaction('post_other_2', 'report', 9),
      reaction('post_other_3', 'stale', 12)
    ]
  });
  assert.equal(state.nextAction.action, 'activities');
  assert.equal(state.recentActivities.length, 2);
  assert.deepEqual(state.recentActivities.map((item) => item.id), ['post_other_1', 'post_other_2']);
  assert.equal(state.activitiesText, '确认 1 次，举报 1 次');
}

console.log('Me state checks passed.');
