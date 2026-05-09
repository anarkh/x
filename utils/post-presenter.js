import {
  categoryLabel,
  formatConfirmationText,
  formatCreatedAt,
  formatTimeLeft,
  intentLabel,
  statusLabel
} from './format.js';

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

export function decoratePost(post) {
  return {
    ...post,
    categoryText: categoryLabel(post.category),
    intentText: intentLabel(post.intent),
    statusText: statusLabel(post.status),
    confirmationText: formatConfirmationText(post.confirmations, post.lastConfirmedAt),
    createdText: formatCreatedAt(post.createdAt),
    expiryText: post.status === 'resolved' ? '已关闭' : formatTimeLeft(post.expiresAt)
  };
}

export function buildActivities(posts, reactions) {
  const postById = posts.reduce((map, post) => ({
    ...map,
    [post.id]: post
  }), {});
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
