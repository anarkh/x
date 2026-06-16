import config from './config.js';
import { categoryLabel } from './format.js';

const COMMENT_SUMMARY_LIMIT = 24;

function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function trimText(value) {
  return String(value || '').trim();
}

function shortenText(value, limit) {
  const text = trimText(value);
  if (!text) {
    return '';
  }
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(1, limit - 1))}…`;
}

function commentBody(comment) {
  if (typeof comment === 'string') {
    return comment;
  }
  return comment && comment.body;
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

function buildTone(post, counts) {
  if (post.status === 'hidden' || hasHighReport(counts)) {
    return 'danger';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return 'done';
  }
  if (hasStaleRisk(post, counts)) {
    return 'warn';
  }
  return 'good';
}

function buildTitle(post, shouldEncourageRelay) {
  if (post.status === 'hidden') {
    return '已隐藏，先别公开接力';
  }
  if (post.status === 'resolved') {
    return '已关闭，线索留在这里';
  }
  if (post.status === 'expired') {
    return '已过期，先看最新任务';
  }
  if (!shouldEncourageRelay) {
    return '先核对，再决定接力';
  }
  return '把这条线索接力出去';
}

function buildAudience(post, counts) {
  const place = trimText(post.placeName);
  const placeHint = place ? `、常路过${place}的人` : '或常路过的人';
  if (post.status === 'hidden') {
    return '发布者或管理员';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return '关心结果的人，不需要公开扩散';
  }
  if (hasHighReport(counts) || hasStaleRisk(post, counts)) {
    return '熟悉现场、能先核对的人';
  }
  if (post.category === 'lost_found') {
    return post.intent === 'found'
      ? `失主、附近住户、物业或保安${placeHint}`
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

function buildSummary(post, counts, latestComment, shouldEncourageRelay) {
  if (post.status === 'hidden') {
    return '这条任务已隐藏，最新线索只适合给发布者或管理员看，不要继续公开扩散。';
  }
  if (post.status === 'resolved') {
    return '这条任务已经关闭，这条补充更适合作为历史线索，不用继续公开扩散。';
  }
  if (post.status === 'expired') {
    return '这条任务已过期，最新线索可以留作历史参考，不用继续公开扩散。';
  }
  if (hasHighReport(counts)) {
    return '已有举报提醒，先核对评论和现场，不要继续公开扩散。';
  }
  if (hasStaleRisk(post, counts)) {
    return '这条任务已有过时提醒，先核对最新情况，别盲转给更多人。';
  }
  if (shouldEncourageRelay) {
    return `最新线索“${latestComment}”已经补上，适合转给更可能路过的人继续确认。`;
  }
  return '这条线索已补上，先让熟悉现场的人看一眼。';
}

function buildReminder(post, counts, shouldEncourageRelay) {
  if (post.status === 'hidden') {
    return '隐藏内容只收敛给发布者或管理员处理。';
  }
  if (post.status === 'resolved') {
    return '已关闭任务只作为结果参考。';
  }
  if (post.status === 'expired') {
    return '如需继续处理，优先查看最新任务或把它当历史线索参考。';
  }
  if (hasHighReport(counts)) {
    return '有举报时先核对，避免盲转造成误传。';
  }
  if (hasStaleRisk(post, counts)) {
    return '有过时反馈时先核对现场，别盲转旧信息。';
  }
  if (shouldEncourageRelay) {
    return '接力时提醒对方先看评论，再确认或补充。';
  }
  return '先看评论，再决定是否继续转给别人。';
}

function buildActionText(shouldEncourageRelay) {
  return shouldEncourageRelay ? '接力转发' : '先看评论';
}

export function buildCommentRelayPrompt(post = {}, comment = {}, commentCount = 0) {
  const currentPost = post && post.id ? post : null;
  const latestComment = shortenText(commentBody(comment), COMMENT_SUMMARY_LIMIT);
  if (!currentPost || !latestComment) {
    return null;
  }

  const counts = {
    comments: Math.max(1, normalizeCount(commentCount)),
    staleCount: normalizeCount(currentPost.staleCount),
    reportCount: normalizeCount(currentPost.reportCount)
  };
  const shouldEncourageRelay =
    currentPost.status === 'active' &&
    !isClosed(currentPost) &&
    !hasHighReport(counts) &&
    !hasStaleRisk(currentPost, counts);
  const titleText = shortenText(currentPost.title || categoryLabel(currentPost.category) || config.appInfo.shareTitle, 18);

  return {
    kicker: '评论已发出',
    title: buildTitle(currentPost, shouldEncourageRelay),
    summary: buildSummary(currentPost, counts, latestComment, shouldEncourageRelay),
    latestComment,
    rows: [
      { label: '最新线索', value: latestComment },
      { label: '适合转给', value: buildAudience(currentPost, counts) },
      { label: '提醒对方', value: buildReminder(currentPost, counts, shouldEncourageRelay) }
    ],
    note: `评论区现在有${counts.comments}条线索。${buildReminder(currentPost, counts, shouldEncourageRelay)}`,
    actionText: buildActionText(shouldEncourageRelay),
    shouldEncourageRelay,
    tone: buildTone(currentPost, counts),
    shareTitle: `新线索：${titleText}`,
    sharePath: `/pages/detail/detail?id=${encodeURIComponent(currentPost.id)}&from=share`
  };
}
