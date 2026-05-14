import mockPosts from './mock-posts.js';
import config from './config.js';
import { distanceMeters } from './geo.js';
import { getCurrentUser, isAdmin } from './auth.js';

const STORAGE_KEY = 'posts';
const REACTIONS_STORAGE_KEY = 'post_reactions';
const CLOSED_STATUSES = ['hidden', 'resolved'];
const POSTS_CACHE_TTL_MS = 8000;
let postsLoadPromise = null;
let postsCache = {
  data: null,
  expiresAt: 0,
  includeHidden: false
};

function cachedPosts(options = {}) {
  const needsHidden = Boolean(options.includeHidden);
  if (!postsCache.data || postsCache.expiresAt <= Date.now()) {
    return null;
  }
  if (needsHidden && !postsCache.includeHidden) {
    return null;
  }
  return postsCache.data;
}

function rememberPosts(posts, options = {}) {
  postsCache = {
    data: Array.isArray(posts) ? posts : [],
    expiresAt: Date.now() + POSTS_CACHE_TTL_MS,
    includeHidden: Boolean(options.includeHidden)
  };
  return postsCache.data;
}

function rememberCloudPost(post) {
  if (!post || !postsCache.data) {
    return;
  }
  const existingIndex = postsCache.data.findIndex((item) => item.id === post.id);
  const nextData = existingIndex >= 0
    ? postsCache.data.map((item) => (item.id === post.id ? post : item))
    : [post, ...postsCache.data];
  postsCache = {
    ...postsCache,
    data: nextData.slice(0, config.maxVisiblePosts),
    expiresAt: Math.max(postsCache.expiresAt, Date.now() + POSTS_CACHE_TTL_MS)
  };
}

function removeCachedPost(id) {
  if (!postsCache.data) {
    return;
  }
  postsCache = {
    ...postsCache,
    data: postsCache.data.filter((post) => post.id !== id),
    expiresAt: Math.max(postsCache.expiresAt, Date.now() + POSTS_CACHE_TTL_MS)
  };
}

function shouldUseCloud() {
  return Boolean(config.cloud && config.cloud.enabled && config.cloud.envId && wx.cloud);
}

function isCloudFallbackError(error) {
  const message = String(error && (error.errMsg || error.message || ''));
  const errCode = Number(error && error.errCode);
  return error
    && (error.code === 'MISSING_COLLECTION'
      || (!error.code && [-501000, -504002, -404011].indexOf(errCode) >= 0)
      || (!error.code && message.indexOf('callFunction') >= 0)
      || (!error.code && message.indexOf('cloud function') >= 0)
      || (!error.code && message.indexOf('云函数') >= 0)
      || message.indexOf('FunctionName') >= 0
      || message.indexOf('function not found') >= 0
      || message.indexOf('ResourceNotFound') >= 0);
}

function cloudError(code, message) {
  const error = new Error(message || 'Cloud post operation failed');
  error.code = code || 'CLOUD_POSTS_FAILED';
  return error;
}

async function callPostsFunction(action, data = {}) {
  const result = await wx.cloud.callFunction({
    name: 'posts',
    data: {
      action,
      ...data
    }
  });
  const payload = result.result || {};
  if (!payload.ok) {
    throw cloudError(payload.code, payload.message);
  }
  return payload.data || {};
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
  rememberPosts(posts, { includeHidden: true });
}

function updateLocalPost(id, data) {
  const posts = seedPosts().map((post) => (
    post.id === id ? { ...post, ...data } : post
  ));
  savePosts(posts);
}

function normalizePost(post) {
  return post ? {
    ...post,
    id: post.id || post._id
  } : null;
}

async function fetchPosts(options = {}) {
  if (!shouldUseCloud()) {
    return seedPosts();
  }
  const data = await callPostsFunction('list', {
    includeHidden: Boolean(options.includeHidden),
    limit: config.maxVisiblePosts
  });
  return (data.posts || []).map(normalizePost).filter(Boolean);
}

async function loadPosts(options = {}) {
  if (!options.force) {
    const cached = cachedPosts(options);
    if (cached) {
      return cached;
    }
    if (postsLoadPromise && !options.includeHidden) {
      return postsLoadPromise;
    }
  }

  postsLoadPromise = fetchPosts(options)
    .then((posts) => {
      postsLoadPromise = null;
      return rememberPosts(posts, options);
    })
    .catch((error) => {
      postsLoadPromise = null;
      if (isCloudFallbackError(error)) {
        return rememberPosts(seedPosts(), { includeHidden: true });
      }
      throw error;
    });
  return postsLoadPromise;
}

async function findPost(id) {
  if (!shouldUseCloud()) {
    return seedPosts().find((post) => post.id === id);
  }
  const cached = cachedPosts({ includeHidden: true }) || cachedPosts();
  const cachedPost = cached ? cached.find((post) => post.id === id) : null;
  if (cachedPost) {
    return cachedPost;
  }
  try {
    const data = await callPostsFunction('get', { id });
    return normalizePost(data.post);
  } catch (error) {
    if (isCloudFallbackError(error)) {
      return seedPosts().find((post) => post.id === id);
    }
    throw error;
  }
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

function authRequiredError() {
  const error = new Error('Login is required to publish a post.');
  error.code = 'AUTH_REQUIRED';
  return error;
}

function derivePost(post, now, center) {
  const isExpired = post.expiresAt <= now;
  const status = isExpired && CLOSED_STATUSES.indexOf(post.status) < 0 ? 'expired' : post.status;
  return {
    ...post,
    status,
    distance: distanceMeters(center, post)
  };
}

function canTrustReact(post, now) {
  return CLOSED_STATUSES.indexOf(post.status) < 0 && post.expiresAt > now;
}

function statusRank(status) {
  const ranks = {
    active: 0,
    stale: 0,
    resolved: 1,
    expired: 2
  };
  return ranks[status] === undefined ? 3 : ranks[status];
}

function viewablePost(post, center = config.defaultCenter) {
  if (!post) {
    return null;
  }
  const derived = derivePost(post, Date.now(), center);
  return isAdmin(getCurrentUser()) || derived.status !== 'hidden' ? derived : null;
}

async function sortedDerivedPosts(center, options = {}) {
  const now = Date.now();
  const posts = await loadPosts(options);
  return posts
    .map((post) => derivePost(post, now, center))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.createdAt - a.createdAt);
}

export async function listAllPosts(center = config.defaultCenter) {
  const posts = await sortedDerivedPosts(center, { includeHidden: true });
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
  return viewablePost(post);
}

export async function createPost(input) {
  const user = getCurrentUser();
  if (user.isGuest) {
    throw authRequiredError();
  }

  if (shouldUseCloud()) {
    try {
      const data = await callPostsFunction('create', {
        input: {
          ...input,
          publisher: user.nickname,
          publisherAvatarUrl: user.avatarUrl || '',
          publisherLoggedInAt: user.loggedInAt || 0
        }
      });
      const post = normalizePost(data.post);
      rememberCloudPost(post);
      return post;
    } catch (error) {
      if (!isCloudFallbackError(error)) {
        throw error;
      }
    }
  }

  const posts = await loadPosts();
  const markerId = posts.reduce((max, post) => Math.max(max, Number(post.markerId) || 0), 0) + 1;
  const now = Date.now();
  const post = {
    id: `post_${now}`,
    markerId,
    title: input.title.trim(),
    body: input.body.trim(),
    imageUrls: Array.isArray(input.imageUrls) ? input.imageUrls.filter(Boolean) : [],
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
    publisher: String(input.publisher || user.nickname || '匿名用户').trim(),
    publisherAvatarUrl: user.avatarUrl || '',
    publisherRole: user.role || 'user',
    publisherLoggedInAt: user.loggedInAt || 0,
    isMine: true
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

export async function reactToPost(id, action) {
  if (shouldUseCloud()) {
    try {
      const data = await callPostsFunction('react', {
        id,
        reaction: action
      });
      const post = normalizePost(data.post);
      if (data.reactedAt || data.duplicate) {
        rememberReaction(id, action, data.reactedAt || Date.now());
      }
      if (post) {
        rememberCloudPost(post);
      } else {
        removeCachedPost(id);
      }
      return post ? viewablePost(post) : null;
    } catch (error) {
      if (!isCloudFallbackError(error)) {
        throw error;
      }
    }
  }

  const now = Date.now();
  if (hasReactedToPost(id, action)) {
    return getPost(id);
  }
  const post = await findPost(id);
  if (!post || !canTrustReact(post, now)) {
    return viewablePost(post);
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
  updateLocalPost(id, patch);
  rememberReaction(id, action, now);
  return viewablePost({ ...post, ...patch });
}

export async function resolvePost(id) {
  if (shouldUseCloud()) {
    try {
      const data = await callPostsFunction('resolve', { id });
      const post = normalizePost(data.post);
      if (post) {
        rememberCloudPost(post);
      }
      return post ? viewablePost(post) : null;
    } catch (error) {
      if (!isCloudFallbackError(error)) {
        throw error;
      }
    }
  }

  const now = Date.now();
  const post = await findPost(id);
  let patch = null;
  if (post && canTrustReact(post, now)) {
    patch = { status: 'resolved' };
    updateLocalPost(id, patch);
  }
  return viewablePost(patch ? { ...post, ...patch } : post);
}

export async function hidePost(id) {
  if (shouldUseCloud()) {
    try {
      const data = await callPostsFunction('hide', { id });
      const post = normalizePost(data.post);
      if (post) {
        rememberCloudPost(post);
      } else {
        removeCachedPost(id);
      }
      return;
    } catch (error) {
      if (!isCloudFallbackError(error)) {
        throw error;
      }
    }
  }
  updateLocalPost(id, { status: 'hidden' });
}

export async function preparePostImageUpload(ext, index) {
  if (!shouldUseCloud()) {
    return null;
  }
  try {
    const data = await callPostsFunction('prepareUpload', {
      ext,
      index
    });
    return data.cloudPath || null;
  } catch (error) {
    if (isCloudFallbackError(error)) {
      return null;
    }
    throw error;
  }
}
