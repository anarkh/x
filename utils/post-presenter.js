import {
  categoryLabel,
  formatConfirmationText,
  formatCreatedAt,
  formatTimeLeft,
  intentLabel,
  statusLabel
} from './format.js';
import { formatDistance } from './geo.js';

export const actionMeta = {
  confirm: {
    label: '确认有效',
    tone: 'done'
  },
  stale: {
    label: '标记过时',
    tone: 'warn'
  },
  report: {
    label: '举报',
    tone: 'danger'
  }
};

export function isOpenPost(post) {
  return post.status === 'active' || post.status === 'stale';
}

function safeDistance(value) {
  const distance = Number(value);
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;
}

function safeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function browseHintForPost(post, index) {
  if (index === 0) {
    return '最近';
  }
  if (post.status === 'stale' || safeCount(post.staleCount) >= 3) {
    return '待复核';
  }
  if (safeCount(post.confirmations) > 0) {
    return '已确认';
  }
  return '附近';
}

function previewTitle(title, maxLength = 14) {
  const value = String(title || '').trim();
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export function decoratePost(post) {
  const imageUrls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  return {
    ...post,
    imageUrls,
    coverImage: imageUrls[0] || '',
    imageCount: imageUrls.length,
    categoryText: categoryLabel(post.category),
    intentText: intentLabel(post.intent),
    statusText: statusLabel(post.status),
    confirmationText: formatConfirmationText(post.confirmations, post.lastConfirmedAt),
    createdText: formatCreatedAt(post.createdAt),
    expiryText: post.status === 'resolved' ? '已关闭' : formatTimeLeft(post.expiresAt, post.expiryType)
  };
}

export function decorateMapPost(post, selectedPostId = '') {
  const distance = safeDistance(post.distance);
  return {
    ...decoratePost(post),
    distanceText: Number.isFinite(distance) ? formatDistance(distance) : '距离未知',
    isSelected: Boolean(selectedPostId && post.id === selectedPostId)
  };
}

export function buildNearbyPreviewPosts(posts, selectedPostId = '', limit = 3) {
  return posts
    .filter(isOpenPost)
    .slice()
    .sort((a, b) => {
      const distanceDiff = safeDistance(a.distance) - safeDistance(b.distance);
      if (distanceDiff !== 0) {
        return distanceDiff;
      }
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    })
    .slice(0, limit)
    .map((post, index) => ({
      ...decorateMapPost(post, selectedPostId),
      browseRank: index + 1,
      browseHint: browseHintForPost(post, index),
      previewTitle: previewTitle(post.title)
    }));
}

export function buildActivities(posts, reactions) {
  const postById = {};
  posts.forEach((post) => {
    postById[post.id] = post;
  });
  return reactions
    .map((item) => {
      const post = postById[item.id];
      const meta = actionMeta[item.action] || { label: '参与', tone: 'neutral' };
      return post
        ? {
          ...item,
          ...meta,
          activityKey: `${item.id}:${item.action}`,
          reactedText: formatCreatedAt(item.reactedAt),
          post
        }
        : null;
    })
    .filter(Boolean);
}
