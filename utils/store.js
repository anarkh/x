import mockPosts from './mock-posts.js';
import config from './config.js';
import { distanceMeters } from './geo.js';
import { getCurrentUser, isAdmin } from './auth.js';

const STORAGE_KEY = 'posts';
const REACTIONS_STORAGE_KEY = 'post_reactions';
const CLOSED_STATUSES = ['hidden', 'resolved'];

function shouldUseCloud() {
  return Boolean(config.cloud && config.cloud.enabled && config.cloud.envId && wx.cloud);
}

function postsCollection() {
  return wx.cloud.database().collection(config.cloud.collections.posts);
}

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

function normalizePost(post) {
  return {
    ...post,
    id: post.id || post._id
  };
}

async function loadPosts() {
  if (!shouldUseCloud()) {
    return seedPosts();
  }
  const result = await postsCollection()
    .orderBy('createdAt', 'desc')
    .limit(config.maxVisiblePosts)
    .get();
  return (result.data || []).map(normalizePost);
}

async function findPost(id) {
  if (!shouldUseCloud()) {
    return seedPosts().find((post) => post.id === id);
  }
  const result = await postsCollection().where({ id }).limit(1).get();
  return result.data && result.data[0] ? normalizePost(result.data[0]) : null;
}

async function updatePost(id, data) {
  if (!shouldUseCloud()) {
    const posts = seedPosts().map((post) => (
      post.id === id ? { ...post, ...data } : post
    ));
    savePosts(posts);
    return;
  }
  await postsCollection().where({ id }).update({ data });
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

async function sortedDerivedPosts(center) {
  const now = Date.now();
  const posts = await loadPosts();
  return posts
    .map((post) => derivePost(post, now, center))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.createdAt - a.createdAt);
}

export async function listAllPosts(center = config.defaultCenter) {
  const posts = await sortedDerivedPosts(center);
  return posts.slice(0, config.maxVisiblePosts);
}

export async function listPosts(center = config.defaultCenter) {
  const posts = await sortedDerivedPosts(center);
  return posts
    .filter((post) => post.status !== 'hidden')
    .slice(0, config.maxVisiblePosts);
}

export async function getPost(id) {
  const post = await findPost(id);
  if (!post) {
    return null;
  }
  const derived = derivePost(post, Date.now(), config.defaultCenter);
  return isAdmin(getCurrentUser()) || derived.status !== 'hidden' ? derived : null;
}

export async function createPost(input) {
  const posts = await loadPosts();
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
  if (shouldUseCloud()) {
    await postsCollection().add({ data: post });
  } else {
    savePosts([post, ...posts]);
  }
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

export async function reactToPost(id, action) {
  const now = Date.now();
  if (hasReactedToPost(id, action)) {
    return getPost(id);
  }
  const post = await findPost(id);
  if (!post || !canTrustReact(post, now)) {
    return getPost(id);
  }
  let patch = {};
  if (action === 'confirm') {
    patch = { confirmations: post.confirmations + 1, lastConfirmedAt: now };
  } else if (action === 'stale') {
    const staleCount = post.staleCount + 1;
    patch = { staleCount, status: staleCount >= 3 ? 'stale' : post.status };
  } else if (action === 'report') {
    const reportCount = post.reportCount + 1;
    patch = { reportCount, status: reportCount >= 2 ? 'hidden' : post.status };
  } else {
    return getPost(id);
  }
  await updatePost(id, patch);
  rememberReaction(id, action, now);
  return getPost(id);
}

export async function resolvePost(id) {
  const now = Date.now();
  const post = await findPost(id);
  if (post && canTrustReact(post, now)) {
    await updatePost(id, { status: 'resolved' });
  }
  return getPost(id);
}

export async function hidePost(id) {
  await updatePost(id, { status: 'hidden' });
}
