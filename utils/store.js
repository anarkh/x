import mockPosts from './mock-posts.js';
import config from './config.js';
import { distanceMeters } from './geo.js';
import { getCurrentUser, isAdmin } from './auth.js';

const STORAGE_KEY = 'posts';
const REACTIONS_STORAGE_KEY = 'post_reactions';
const CLOSED_STATUSES = ['hidden', 'resolved'];

function seedPosts() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (Array.isArray(stored) && stored.length) {
    return stored;
  }
  wx.setStorageSync(STORAGE_KEY, mockPosts);
  return mockPosts;
}

function savePosts(posts) {
  wx.setStorageSync(STORAGE_KEY, posts);
}

function loadReactionMap() {
  const stored = wx.getStorageSync(REACTIONS_STORAGE_KEY);
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

function saveReactionMap(reactions) {
  wx.setStorageSync(REACTIONS_STORAGE_KEY, reactions);
}

function currentUserId() {
  return getCurrentUser().id;
}

function reactionKey(id, action) {
  return `${currentUserId()}:${id}:${action}`;
}

function rememberReaction(id, action, now) {
  const reactions = loadReactionMap();
  reactions[reactionKey(id, action)] = now;
  saveReactionMap(reactions);
}

function derivePost(post, now, center) {
  const isExpired = post.expiresAt <= now;
  const status = isExpired && !CLOSED_STATUSES.includes(post.status) ? 'expired' : post.status;
  return {
    ...post,
    status,
    distance: distanceMeters(center, post)
  };
}

function canTrustReact(post, now) {
  return !CLOSED_STATUSES.includes(post.status) && post.expiresAt > now;
}

function statusRank(status) {
  const ranks = {
    active: 0,
    stale: 0,
    resolved: 1,
    expired: 2
  };
  return ranks[status] ?? 3;
}

function sortedDerivedPosts(center) {
  const now = Date.now();
  return seedPosts()
    .map((post) => derivePost(post, now, center))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.createdAt - a.createdAt);
}

export function listAllPosts(center = config.defaultCenter) {
  return sortedDerivedPosts(center).slice(0, config.maxVisiblePosts);
}

export function listPosts(center = config.defaultCenter) {
  return sortedDerivedPosts(center)
    .filter((post) => post.status !== 'hidden')
    .slice(0, config.maxVisiblePosts);
}

export function getPost(id) {
  return (isAdmin(getCurrentUser()) ? listAllPosts() : listPosts()).find((post) => post.id === id);
}

export function createPost(input) {
  const posts = seedPosts();
  const markerId = posts.reduce((max, post) => Math.max(max, Number(post.markerId) || 0), 0) + 1;
  const now = Date.now();
  const user = getCurrentUser();
  const post = {
    id: `post_${now}`,
    markerId,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    intent: input.category === 'lost_found' ? input.intent : '',
    placeName: (input.placeName || '').trim() || '当前位置',
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    status: 'active',
    confirmations: 0,
    lastConfirmedAt: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now,
    expiresAt: now + Number(input.expiryHours) * 60 * 60 * 1000,
    publisherId: user.id,
    publisher: String(input.publisher || user.nickname || '匿名用户').trim()
  };
  savePosts([post, ...posts]);
  return post;
}

export function listMyReactions() {
  const reactions = loadReactionMap();
  const prefix = `${currentUserId()}:`;
  return Object.keys(reactions)
    .filter((key) => key.startsWith(prefix))
    .map((key) => {
      const value = key.slice(prefix.length);
      const segments = value.split(':');
      const action = segments.pop();
      return {
        id: segments.join(':'),
        action,
        reactedAt: reactions[key]
      };
    })
    .filter((item) => item.id && item.action)
    .sort((a, b) => b.reactedAt - a.reactedAt);
}

export function hasReactedToPost(id, action) {
  const reactions = loadReactionMap();
  return Boolean(reactions[reactionKey(id, action)]);
}

export function reactToPost(id, action) {
  const posts = seedPosts();
  const now = Date.now();
  if (hasReactedToPost(id, action)) {
    return getPost(id);
  }
  let didReact = false;
  const next = posts.map((post) => {
    if (post.id !== id) {
      return post;
    }
    if (!canTrustReact(post, now)) {
      return post;
    }
    didReact = true;
    if (action === 'confirm') {
      return { ...post, confirmations: post.confirmations + 1, lastConfirmedAt: now };
    }
    if (action === 'stale') {
      const staleCount = post.staleCount + 1;
      return { ...post, staleCount, status: staleCount >= 3 ? 'stale' : post.status };
    }
    if (action === 'report') {
      const reportCount = post.reportCount + 1;
      return { ...post, reportCount, status: reportCount >= 2 ? 'hidden' : post.status };
    }
    return post;
  });
  savePosts(next);
  if (didReact) {
    rememberReaction(id, action, now);
  }
  return getPost(id);
}

export function resolvePost(id) {
  const posts = seedPosts();
  const now = Date.now();
  const next = posts.map((post) => {
    if (post.id !== id || !canTrustReact(post, now)) {
      return post;
    }
    return { ...post, status: 'resolved' };
  });
  savePosts(next);
  return getPost(id);
}

export function hidePost(id) {
  const posts = seedPosts().map((post) => (
    post.id === id ? { ...post, status: 'hidden' } : post
  ));
  savePosts(posts);
}
