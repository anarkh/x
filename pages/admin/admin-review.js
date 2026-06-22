import {
  categoryLabel,
  formatConfirmationText,
  formatCreatedAt,
  formatTimeLeft,
  intentLabel,
  statusLabel
} from '../../utils/format.js';

export const adminFilterOptions = [
  { value: 'needs_review', label: '待处理' },
  { value: 'all', label: '全部' },
  { value: 'reported', label: '有举报' },
  { value: 'stale', label: '过时' },
  { value: 'active', label: '有效' },
  { value: 'closed', label: '已关闭' },
  { value: 'hidden', label: '已隐藏' }
];

function isClosed(post) {
  return post.status === 'resolved' || post.status === 'expired' || post.status === 'hidden';
}

function needsReview(post) {
  if (post.status === 'hidden' || post.status === 'resolved') {
    return false;
  }
  return post.reportCount > 0 || post.staleCount > 0 || post.status === 'stale' || post.status === 'expired';
}

function riskScore(post) {
  if (post.status === 'hidden' || post.status === 'resolved') {
    return 0;
  }
  if (post.reportCount >= 2) {
    return 4;
  }
  if (post.reportCount > 0) {
    return 3;
  }
  if (post.status === 'stale' || post.staleCount >= 2) {
    return 2;
  }
  if (post.status === 'expired') {
    return 1;
  }
  return 0;
}

function riskMeta(post) {
  const score = riskScore(post);
  if (score >= 4) {
    return { riskText: '高优先级', riskTone: 'danger' };
  }
  if (score === 3) {
    return { riskText: '需复核', riskTone: 'danger' };
  }
  if (score === 2) {
    return { riskText: '可能过时', riskTone: 'warn' };
  }
  if (score === 1) {
    return { riskText: '已过期', riskTone: 'neutral' };
  }
  if (post.status === 'hidden') {
    return { riskText: '已隐藏', riskTone: 'neutral' };
  }
  if (post.status === 'resolved') {
    return { riskText: '已关闭', riskTone: 'done' };
  }
  return { riskText: '正常', riskTone: 'done' };
}

function riskReasonText(post) {
  const reasons = [];
  if (post.reportCount > 0) {
    reasons.push(`${post.reportCount} 次举报`);
  }
  if (post.staleCount > 0) {
    reasons.push(`${post.staleCount} 次过时`);
  }
  if (post.status === 'stale') {
    reasons.push('当前疑似过时');
  }
  if (post.status === 'expired') {
    reasons.push('已过期');
  }
  if (post.status === 'hidden') {
    reasons.push('已隐藏，普通用户不可见');
  }
  if (post.status === 'resolved') {
    reasons.push('已关闭归档');
  }
  return reasons.length ? reasons.join(' · ') : '暂无风险信号';
}

function suggestedActionText(post) {
  if (post.status === 'hidden') {
    return '已隐藏留档';
  }
  if (post.reportCount >= 2) {
    return '优先隐藏';
  }
  if (post.reportCount > 0) {
    return '先查看详情';
  }
  if (post.status === 'expired') {
    return '可隐藏下线';
  }
  if (post.status === 'stale' || post.staleCount >= 2) {
    return '可关闭归档';
  }
  if (post.status === 'resolved') {
    return '无需处理';
  }
  return '保持观察';
}

function statusTone(status) {
  if (status === 'stale') {
    return 'warn';
  }
  if (status === 'resolved') {
    return 'done';
  }
  if (status === 'expired' || status === 'hidden') {
    return 'neutral';
  }
  return '';
}

function searchableText(post) {
  return [
    post.id,
    post.title,
    post.body,
    post.placeName,
    post.publisher,
    post.categoryText,
    post.intentText,
    post.statusText,
    post.riskReasonText,
    post.suggestedActionText
  ].join(' ').toLowerCase();
}

export function decorateAdminPost(post, options = {}) {
  const categoryText = categoryLabel(post.category);
  const intentText = intentLabel(post.intent);
  const statusText = statusLabel(post.status);
  const publisher = post.publisher || '匿名用户';
  const meta = {
    ...post,
    ...riskMeta(post),
    categoryText,
    intentText,
    statusText,
    statusTone: statusTone(post.status),
    publisher,
    createdText: formatCreatedAt(post.createdAt),
    expiryText: post.status === 'resolved' ? '已关闭' : formatTimeLeft(post.expiresAt),
    confirmationText: formatConfirmationText(post.confirmations, post.lastConfirmedAt),
    riskReasonText: riskReasonText(post),
    suggestedActionText: suggestedActionText(post),
    canResolve: post.status === 'active' || post.status === 'stale',
    canHide: post.status !== 'hidden',
    isBusy: options.busyPostId === post.id
  };
  return {
    ...meta,
    searchText: searchableText(meta)
  };
}

function filterPost(post, filter) {
  if (filter === 'needs_review') {
    return needsReview(post);
  }
  if (filter === 'reported') {
    return post.reportCount > 0;
  }
  if (filter === 'stale') {
    return post.staleCount > 0 || post.status === 'stale';
  }
  if (filter === 'active') {
    return post.status === 'active';
  }
  if (filter === 'closed') {
    return isClosed(post);
  }
  if (filter === 'hidden') {
    return post.status === 'hidden';
  }
  return true;
}

function matchesQuery(post, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => post.searchText.indexOf(term) >= 0);
}

function countForFilter(posts, filter) {
  return posts.filter((post) => filterPost(post, filter)).length;
}

export function buildAdminReviewState(posts, options = {}) {
  const activeFilter = options.activeFilter || 'needs_review';
  const query = options.query || '';
  const decoratedPosts = posts
    .map((post) => decorateAdminPost(post, { busyPostId: options.busyPostId || '' }))
    .sort((a, b) => riskScore(b) - riskScore(a) || b.createdAt - a.createdAt);
  const visiblePosts = decoratedPosts
    .filter((post) => filterPost(post, activeFilter))
    .filter((post) => matchesQuery(post, query));

  return {
    posts: decoratedPosts,
    visiblePosts,
    filterOptions: adminFilterOptions.map((item) => ({
      ...item,
      count: countForFilter(decoratedPosts, item.value)
    })),
    stats: {
      total: decoratedPosts.length,
      needsReview: decoratedPosts.filter(needsReview).length,
      active: decoratedPosts.filter((post) => post.status === 'active').length,
      stale: decoratedPosts.filter((post) => post.status === 'stale').length,
      resolved: decoratedPosts.filter((post) => post.status === 'resolved').length,
      reported: decoratedPosts.filter((post) => post.reportCount > 0).length,
      hidden: decoratedPosts.filter((post) => post.status === 'hidden').length
    }
  };
}
