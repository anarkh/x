import config from './config.js';
import { categoryLabel } from './format.js';

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

function buildLead(post, counts, categoryText) {
  // Share titles should stay cautious: status and risk signals outrank category labels.
  if (post.status === 'hidden') {
    return '内容已隐藏';
  }
  if (post.status === 'resolved') {
    return '已关闭';
  }
  if (post.status === 'expired') {
    return '已过期';
  }
  if (counts.reportCount >= 2) {
    return '有举报提醒';
  }
  if (counts.staleCount >= 3) {
    return '可能过时';
  }
  if (counts.confirmations > 0) {
    return '有人确认过';
  }
  if (counts.comments > 0) {
    return '有补充线索';
  }
  return categoryText;
}

function buildAudience(post, counts) {
  if (post.status === 'hidden') {
    return '管理员或发布者本人';
  }
  if (post.status === 'resolved') {
    return '刚好关心结果的人';
  }
  if (post.status === 'expired') {
    return '刚好路过的人';
  }
  if (counts.reportCount >= 2) {
    return '熟悉现场的人';
  }
  if (counts.staleCount >= 3) {
    return '能看见现场变化的人';
  }
  if (counts.confirmations > 0) {
    return '能继续核对的人';
  }
  if (post.category === 'lost_found') {
    return post.intent === 'found'
      ? '失主、附近住户或值班人员'
      : '附近住户、物业、保安或常经过这边的人';
  }
  if (post.category === 'street_update') {
    return '同一条路附近的人';
  }
  if (post.category === 'help_needed') {
    return '附近能立刻看一眼的人';
  }
  return '附近会帮忙的人';
}

function buildReason(post, counts) {
  if (post.status === 'hidden') {
    return '内容已被隐藏，先别继续公开扩散。';
  }
  if (post.status === 'resolved') {
    return '这条任务已经关闭，适合当历史线索参考。';
  }
  if (post.status === 'expired') {
    return '任务已过期，发给刚好路过的人更有参考价值。';
  }
  if (counts.reportCount >= 2) {
    return '已有较多举报，先让熟悉现场的人核对再转。';
  }
  if (counts.staleCount >= 3) {
    return '有过时反馈，先确认最新情况再继续发。';
  }
  if (counts.confirmations > 0) {
    return '已经有人确认过，发给能继续核对的人更稳妥。';
  }
  if (counts.comments > 0) {
    return `评论里已经有${counts.comments}条补充，转发时一起带上更完整。`;
  }
  if (post.category === 'lost_found') {
    return post.intent === 'found'
      ? '可能有人正在认领，附近的人更容易帮忙对上。'
      : '失主或见过的人更可能补线索。';
  }
  if (post.category === 'street_update') {
    return '同一条路上的人更可能知道现在是不是还是这样。';
  }
  if (post.category === 'help_needed') {
    return '附近的人更容易立刻回应或补充信息。';
  }
  return '让更可能看见现场的人帮忙确认。';
}

function buildBenefit(post, counts) {
  if (post.status === 'hidden') {
    return '减少误传，先把线索收敛到发布者或管理员。';
  }
  if (post.status === 'resolved') {
    return '帮助对方把它当作已处理的历史记录看。';
  }
  if (post.status === 'expired') {
    return '避免重复确认，让人直接看最新任务。';
  }
  if (counts.reportCount >= 2) {
    return '让更多判断建立在评论和现场核对上。';
  }
  if (counts.staleCount >= 3) {
    return '更快知道信息是否已经变化。';
  }
  if (counts.confirmations > 0) {
    return '把已有确认一起带出去，减少来回问。';
  }
  if (counts.comments > 0) {
    return '把评论里的补充一起带出去，方便继续接力。';
  }
  if (post.category === 'lost_found') {
    return post.intent === 'found' ? '更快帮失主认领。' : '更快缩小找回范围。';
  }
  if (post.category === 'street_update') {
    return '更快判断现在是否还有效。';
  }
  if (post.category === 'help_needed') {
    return '更快拿到回应或补线索。';
  }
  return '更快拿到确认、更新或关闭的结果。';
}

function buildSummary(post, counts, surface) {
  if (surface === 'publish') {
    return '已发布到附近，顺手转给更可能看见的人，能更快得到确认或补线索。';
  }
  if (post.status === 'hidden') {
    return '内容已隐藏，先别继续公开扩散。';
  }
  if (post.status === 'resolved') {
    return '已关闭的任务更适合作为历史线索发给关心结果的人。';
  }
  if (post.status === 'expired') {
    return '已过期的任务适合发给刚好路过的人做参考。';
  }
  if (counts.reportCount >= 2) {
    return '已有举报提醒，先让熟悉现场的人核对再转更稳妥。';
  }
  if (counts.staleCount >= 3) {
    return '有过时反馈，先确认最新情况再继续发。';
  }
  if (counts.confirmations > 0) {
    return '已经有人确认过，转给能继续核对的人更省时间。';
  }
  if (counts.comments > 0) {
    return '评论里已有补充，把任务发给附近的人更容易继续。';
  }
  return '把任务发给更可能看见现场的人，帮忙确认或补线索。';
}

function buildNote(post, counts) {
  if (post.status === 'hidden') {
    return '如果你是发布者或管理员，再按需要处理这条记录。';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return '也可以把评论一起转过去，方便对方快速看完。';
  }
  if (counts.reportCount >= 2 || counts.staleCount >= 3) {
    return '转发前最好把评论一起带上，避免误传。';
  }
  if (counts.comments > 0) {
    return '转发时顺手把评论里的补充带上，会更完整。';
  }
  return '如果你知道更多现场信息，也可以先补一条评论。';
}

export function buildDetailShareMessage(post = {}, commentCount = 0, options = {}) {
  const currentPost = post && post.id ? post : null;
  if (!currentPost) {
    return {
      heading: '转发给会帮忙的人',
      summary: '把任务发给更可能看见现场的人，帮忙确认或补线索。',
      rows: [
        { label: '转给谁', value: '附近会帮忙的人' },
        { label: '为什么转', value: '让更多人看到这条任务' },
        { label: '能帮什么', value: '更快拿到确认或补线索' }
      ],
      note: '如果你知道更多现场信息，也可以先补一条评论。',
      title: config.appInfo.shareTitle,
      path: '/pages/map/map?from=share'
    };
  }

  const counts = {
    confirmations: normalizeCount(currentPost.confirmations),
    staleCount: normalizeCount(currentPost.staleCount),
    reportCount: normalizeCount(currentPost.reportCount),
    comments: normalizeCount(commentCount)
  };
  const categoryText = categoryLabel(currentPost.category);
  const lead = buildLead(currentPost, counts, categoryText);
  const titleBody = shortenText(currentPost.title || categoryText || config.appInfo.shareTitle, 18);
  const title = `${lead}：${titleBody}`;
  // The page copy can note a fresh publish state without changing the actual share payload.
  const surface = options.surface === 'publish' ? 'publish' : 'detail';

  return {
    heading: '转发给会帮忙的人',
    summary: buildSummary(currentPost, counts, surface),
    rows: [
      { label: '转给谁', value: buildAudience(currentPost, counts) },
      { label: '为什么转', value: buildReason(currentPost, counts) },
      { label: '能帮什么', value: buildBenefit(currentPost, counts) }
    ],
    note: buildNote(currentPost, counts),
    title,
    path: `/pages/detail/detail?id=${encodeURIComponent(currentPost.id)}&from=share`
  };
}
