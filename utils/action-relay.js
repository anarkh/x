import config from './config.js';
import { categoryLabel } from './format.js';

function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function trimText(value) {
  return String(value || '').trim();
}

function hasHighReport(counts) {
  return counts.reportCount >= 2;
}

function hasStaleRisk(post, counts) {
  return post.status === 'stale' || counts.staleCount >= 3;
}

function isClosed(post) {
  return post.status === 'resolved' || post.status === 'expired' || post.status === 'hidden';
}

function titleText(post) {
  const title = trimText(post.title || categoryLabel(post.category) || config.appInfo.shareTitle);
  return title.length > 18 ? `${title.slice(0, 17)}…` : title;
}

function buildTone(post, counts, action) {
  if (post.status === 'hidden' || hasHighReport(counts) || action === 'report') {
    return 'danger';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return 'done';
  }
  if (hasStaleRisk(post, counts) || action === 'stale') {
    return 'warn';
  }
  return 'good';
}

function buildAudience(post, counts, shouldEncourageRelay) {
  const place = trimText(post.placeName);
  const placeHint = place ? `、常路过${place}的人` : '或常路过的人';
  if (!shouldEncourageRelay) {
    return hasHighReport(counts) || hasStaleRisk(post, counts)
      ? '熟悉现场、能先核对的人'
      : '先留在这条任务里';
  }
  if (post.category === 'lost_found') {
    return post.intent === 'found'
      ? `失主、物业、保安${placeHint}`
      : `附近住户、物业、保安${placeHint}`;
  }
  if (post.category === 'street_update') {
    return `同一条路附近的人${placeHint}`;
  }
  if (post.category === 'help_needed') {
    return `附近能立刻看一眼的人${placeHint}`;
  }
  return `附近会帮忙的人${placeHint}`;
}

function buildSummary(post, counts, action, shouldEncourageRelay) {
  if (action === 'stale') {
    return '你已提醒这条任务可能过时，先让附近的人核对，不要把旧信息继续扩散。';
  }
  if (action === 'report') {
    return '你已提交举报，接下来等管理员或发布者处理，不要继续公开扩散。';
  }
  if (post.status === 'hidden') {
    return '这条任务已隐藏，只适合给发布者或管理员看处理记录。';
  }
  if (post.status === 'resolved') {
    return '这条任务已经关闭，确认记录会留作结果参考，不需要继续公开扩散。';
  }
  if (post.status === 'expired') {
    return '这条任务已过期，确认记录可以当历史参考，不需要继续公开扩散。';
  }
  if (hasHighReport(counts)) {
    return '已有举报提醒，先核对评论和现场，不要继续公开扩散。';
  }
  if (hasStaleRisk(post, counts)) {
    return '这条任务已有过时提醒，先确认最新情况，别盲转给更多人。';
  }
  if (shouldEncourageRelay) {
    return '你刚刚帮这条任务补了一个确认信号，适合转给更可能路过的人继续补线索。';
  }
  return '这次动作已记录，先看评论和现场变化，再决定要不要继续转给别人。';
}

function buildReminder(post, counts, action, shouldEncourageRelay) {
  if (action === 'stale' || hasStaleRisk(post, counts)) {
    return '提醒对方先看最新现场，不要直接按旧信息处理。';
  }
  if (action === 'report' || hasHighReport(counts)) {
    return '有举报时先核对，避免盲转造成误传。';
  }
  if (post.status === 'resolved' || post.status === 'expired' || post.status === 'hidden') {
    return '已关闭、过期或隐藏时，只当历史线索看。';
  }
  if (shouldEncourageRelay) {
    return '提醒对方先看确认和评论，再补充或继续核对。';
  }
  return '先看评论，再决定是否继续转给别人。';
}

export function buildActionRelayPrompt(post = {}, action = '') {
  const currentPost = post && post.id ? post : null;
  if (!currentPost || !action) {
    return null;
  }

  const counts = {
    confirmations: normalizeCount(currentPost.confirmations),
    staleCount: normalizeCount(currentPost.staleCount),
    reportCount: normalizeCount(currentPost.reportCount)
  };
  const normalizedAction = String(action);
  if (!['confirm', 'stale', 'report'].includes(normalizedAction)) {
    return null;
  }
  const shouldEncourageRelay =
    normalizedAction === 'confirm' &&
    currentPost.status === 'active' &&
    !isClosed(currentPost) &&
    !hasHighReport(counts) &&
    !hasStaleRisk(currentPost, counts);

  return {
    kicker: normalizedAction === 'confirm' ? '确认已记录' : '反馈已记录',
    title: shouldEncourageRelay ? '把确认信号接力出去' : '先核对，再决定接力',
    summary: buildSummary(currentPost, counts, normalizedAction, shouldEncourageRelay),
    rows: [
      {
        label: '刚刚完成',
        value: normalizedAction === 'confirm'
          ? `确认 ${counts.confirmations} 次`
          : normalizedAction === 'stale'
            ? `过时提醒 ${counts.staleCount} 次`
            : `举报 ${counts.reportCount} 次`
      },
      {
        label: '适合转给',
        value: buildAudience(currentPost, counts, shouldEncourageRelay)
      },
      {
        label: '提醒对方',
        value: buildReminder(currentPost, counts, normalizedAction, shouldEncourageRelay)
      }
    ],
    note: buildReminder(currentPost, counts, normalizedAction, shouldEncourageRelay),
    actionText: shouldEncourageRelay ? '接力转发' : '先看评论',
    shouldEncourageRelay,
    tone: buildTone(currentPost, counts, normalizedAction),
    shareTitle: `已确认：${titleText(currentPost)}`,
    sharePath: `/pages/detail/detail?id=${encodeURIComponent(currentPost.id)}&from=share&source=${encodeURIComponent('confirm')}`
  };
}
