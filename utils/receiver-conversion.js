function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function trimText(value) {
  return String(value || '').trim();
}

function isLowRisk(post, counts) {
  return post.status === 'active' && counts.reportCount === 0 && counts.staleCount === 0;
}

function titleText(post) {
  const title = trimText(post.title || '附近任务');
  return title.length > 18 ? `${title.slice(0, 17)}…` : title;
}

function sharePathForPost(post) {
  const id = encodeURIComponent(post.id || '');
  return `/pages/detail/detail?id=${id}&from=share&source=receiver`;
}

function buildSafeTitle(action) {
  return action === 'comment'
    ? '你已经补了评论，可以接力给下一位更可能路过的人'
    : '你已经帮忙确认，可以接力给下一位更可能路过的人';
}

function buildSafeBody(action) {
  return action === 'comment'
    ? '刚补过评论后继续转给更可能路过的人，下一位会先看确认和评论。'
    : '刚确认过这条后继续转给更可能路过的人，能更快补全现场信息。';
}

function buildRiskTitle(post, counts) {
  if (post.status === 'hidden') {
    return '内容已隐藏，先别继续扩散';
  }
  if (post.status === 'resolved') {
    return '这条已关闭，先看结果';
  }
  if (post.status === 'expired') {
    return '这条已过期，先看最新情况';
  }
  if (counts.reportCount >= 2) {
    return '已有较多举报，先谨慎核对';
  }
  if (counts.staleCount >= 3 || post.status === 'stale') {
    return '已有过时提醒，先看最新情况';
  }
  return '先看确认和评论，再决定要不要接力';
}

function buildRiskBody(post, counts, action) {
  if (post.status === 'hidden') {
    return '隐藏内容只适合给发布者或管理员看处理记录，不建议继续公开扩散。';
  }
  if (post.status === 'resolved') {
    return '这条已经处理完，适合当历史结果看，不需要继续扩散。';
  }
  if (post.status === 'expired') {
    return '这条已经过期，先看最新任务，再决定要不要继续转。';
  }
  if (counts.reportCount >= 2) {
    return '举报信号比较多，先核对评论和现场变化，再决定是否继续传播。';
  }
  if (counts.staleCount >= 3 || post.status === 'stale') {
    return '过时信号比较明显，先确认最新情况，别把旧信息继续传开。';
  }
  return action === 'comment'
    ? '评论已经补上，但这条状态还不够稳，先看确认和评论，再决定要不要继续接力。'
    : '确认已经补上，但这条状态还不够稳，先看确认和评论，再决定要不要继续接力。';
}

function buildNote(post, counts, shouldRelay) {
  if (shouldRelay) {
    return '接收侧会先看到确认和评论，方便下一位更快判断。';
  }
  if (post.status === 'hidden') {
    return '隐藏内容只适合给发布者或管理员看。';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return '已关闭或已过期时，只把它当历史线索。';
  }
  if (counts.reportCount >= 2) {
    return '有较多举报时，先核对再转，别把旧判断继续传开。';
  }
  if (counts.staleCount >= 3 || post.status === 'stale') {
    return '有过时反馈时，先确认最新情况，再决定是否继续转发。';
  }
  return '先把确认和评论看完整，再决定要不要继续转给别人。';
}

function buildTone(post, counts) {
  if (post.status === 'hidden' || counts.reportCount >= 2) {
    return 'danger';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return 'done';
  }
  if (counts.staleCount >= 3 || post.status === 'stale') {
    return 'warn';
  }
  return 'good';
}

export function buildReceiverConversionPrompt(post = {}, action = '', options = {}) {
  const currentPost = post && post.id ? post : null;
  if (!currentPost || options.entryFrom !== 'share') {
    return null;
  }

  const normalizedAction = String(action || '').trim();
  if (!['confirm', 'comment', 'stale', 'report'].includes(normalizedAction)) {
    return null;
  }

  const counts = {
    staleCount: normalizeCount(currentPost.staleCount),
    reportCount: normalizeCount(currentPost.reportCount)
  };
  const shouldRelay = ['confirm', 'comment'].includes(normalizedAction) && isLowRisk(currentPost, counts);

  return {
    visible: true,
    shouldRelay,
    tone: buildTone(currentPost, counts),
    kicker: shouldRelay ? '接力转发' : '先谨慎看',
    title: shouldRelay ? buildSafeTitle(normalizedAction) : buildRiskTitle(currentPost, counts),
    body: shouldRelay ? buildSafeBody(normalizedAction) : buildRiskBody(currentPost, counts, normalizedAction),
    buttonText: shouldRelay ? '继续接力' : '先看确认和评论',
    note: buildNote(currentPost, counts, shouldRelay),
    shareTitle: shouldRelay
      ? `${normalizedAction === 'comment' ? '已补充线索' : '已确认接力'}：${titleText(currentPost)}`
      : `附近任务：${titleText(currentPost)}`,
    sharePath: sharePathForPost(currentPost)
  };
}
