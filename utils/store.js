import mockPosts from './mock-posts.js';
import config from './config.js';
import { distanceMeters } from './geo.js';

const STORAGE_KEY = 'posts';

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

export function listPosts(center = config.pilotCenter) {
  const now = Date.now();
  return seedPosts()
    .map((post) => ({
      ...post,
      status: post.expiresAt <= now ? 'expired' : post.status,
      distance: distanceMeters(center, post)
    }))
    .filter((post) => post.status !== 'hidden')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, config.maxVisiblePosts);
}

export function getPost(id) {
  return listPosts().find((post) => post.id === id);
}

export function createPost(input) {
  const posts = seedPosts();
  const markerId = posts.reduce((max, post) => Math.max(max, Number(post.markerId) || 0), 0) + 1;
  const now = Date.now();
  const post = {
    id: `post_${now}`,
    markerId,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    placeName: input.placeName.trim(),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    status: 'active',
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now,
    expiresAt: now + Number(input.expiryHours) * 60 * 60 * 1000,
    publisher: input.publisher || '匿名用户'
  };
  savePosts([post, ...posts]);
  return post;
}

export function reactToPost(id, action) {
  const posts = seedPosts();
  const next = posts.map((post) => {
    if (post.id !== id) {
      return post;
    }
    if (action === 'confirm') {
      return { ...post, confirmations: post.confirmations + 1 };
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
  return getPost(id);
}

export function hidePost(id) {
  const posts = seedPosts().map((post) => (
    post.id === id ? { ...post, status: 'hidden' } : post
  ));
  savePosts(posts);
}
