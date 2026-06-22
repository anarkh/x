import assert from 'node:assert/strict';

import { resolvePost } from '../utils/store.js';

const POST_ID = 'permission_post';
const now = Date.now();
let storage = {};

function basePost(overrides = {}) {
  return {
    id: POST_ID,
    markerId: 9001,
    title: '权限检查任务',
    body: '验证本地关闭权限',
    category: 'help_needed',
    intent: '',
    placeName: '测试地点',
    latitude: 39.9,
    longitude: 116.3,
    status: 'active',
    confirmations: 0,
    lastConfirmedAt: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 1000,
    expiresAt: now + 3600000,
    publisherId: 'owner_user',
    publisher: '发布者',
    publisherAvatarUrl: '',
    publisherRole: 'user',
    isMine: false,
    ...overrides
  };
}

function user(overrides = {}) {
  return {
    id: 'viewer_user',
    nickname: '附近用户',
    avatarUrl: '',
    role: 'user',
    authSource: '',
    isGuest: false,
    profileCompleted: false,
    loggedInAt: now,
    ...overrides
  };
}

function resetStorage(currentUser, post = basePost()) {
  storage = {
    user: currentUser,
    posts: [post]
  };
  globalThis.wx = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    }
  };
}

function storedPost() {
  return storage.posts.find((post) => post.id === POST_ID);
}

resetStorage(user({ id: 'not_owner' }), basePost({ isMine: true }));
await assert.rejects(
  () => resolvePost(POST_ID),
  (error) => error && error.code === 'FORBIDDEN' && /发布者或管理员/.test(error.message)
);
assert.equal(storedPost().status, 'active');

resetStorage(user({ id: 'owner_user' }));
const ownerPost = await resolvePost(POST_ID);
assert.equal(ownerPost.status, 'resolved');
assert.equal(storedPost().status, 'resolved');

resetStorage(user({
  id: 'admin_user',
  role: 'admin',
  authSource: 'cloud'
}));
const adminPost = await resolvePost(POST_ID);
assert.equal(adminPost.status, 'resolved');
assert.equal(storedPost().status, 'resolved');

console.log('Store permission guard checks passed.');
