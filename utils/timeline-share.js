import config from './config.js';
import { categoryLabel } from './format.js';

const TITLE_LIMIT = 24;

function trimText(value) {
  return String(value || '').trim();
}

function shortenText(value, limit = TITLE_LIMIT) {
  const text = trimText(value);
  if (!text) {
    return '';
  }
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(1, limit - 1))}…`;
}

function buildQuery(postId) {
  const params = [];
  if (postId) {
    params.push(['id', String(postId)]);
  }
  // Timeline visitors still enter the normal share receiver path; channel keeps attribution distinct.
  params.push(['from', 'share'], ['source', 'timeline'], ['shareChannel', 'timeline']);
  return params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function firstImageUrl(post = {}) {
  if (!Array.isArray(post.imageUrls)) {
    return '';
  }
  return post.imageUrls.map(trimText).find(Boolean) || '';
}

function isStalePost(post = {}) {
  return post.status === 'stale' || Number(post.staleCount || 0) >= 3;
}

function hasRiskSignal(post = {}) {
  return Number(post.staleCount || 0) > 0 || Number(post.reportCount || 0) > 0;
}

export function shouldShowDetailTimelineShare(post = {}) {
  return Boolean(post && post.id && post.status === 'active' && !hasRiskSignal(post));
}

function buildActiveLead(post = {}) {
  if (post.category === 'lost_found') {
    return '附近线索';
  }
  if (post.category === 'street_update') {
    return '附近提醒';
  }
  return '附近任务';
}

function buildTimelineTitle(post = {}) {
  if (post.status === 'hidden') {
    return '内容暂不可查看';
  }
  if (post.status === 'resolved') {
    return `已关闭：${shortenText(post.title || categoryLabel(post.category), 15)}`;
  }
  if (post.status === 'expired') {
    return `已过期：${shortenText(post.title || categoryLabel(post.category), 15)}`;
  }
  if (isStalePost(post)) {
    return `线索待核对：${shortenText(post.title || categoryLabel(post.category), 13)}`;
  }
  if (Number(post.reportCount || 0) > 0) {
    return `线索需谨慎：${shortenText(post.title || categoryLabel(post.category), 13)}`;
  }
  if (Number(post.staleCount || 0) > 0) {
    return `线索待核对：${shortenText(post.title || categoryLabel(post.category), 13)}`;
  }
  const body = shortenText(post.title || post.placeName || categoryLabel(post.category), 15);
  return `${buildActiveLead(post)}：${body}`;
}

export function buildDetailTimelineShare(post = null, options = {}) {
  const currentPost = post && post.id ? post : null;
  if (!currentPost) {
    return {
      title: shortenText(options.title || config.appInfo.shareTitle || '附近任务'),
      query: buildQuery()
    };
  }

  const payload = {
    title: buildTimelineTitle(currentPost),
    query: buildQuery(currentPost.id)
  };
  const imageUrl = shouldShowDetailTimelineShare(currentPost) ? firstImageUrl(currentPost) : '';
  if (imageUrl) {
    payload.imageUrl = imageUrl;
  }
  return payload;
}
