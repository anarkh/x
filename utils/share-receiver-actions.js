function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function canEncourageFirstAction(post, counts) {
  return post.status === 'active' && counts.reportCount === 0 && counts.staleCount === 0;
}

export function buildShareReceiverActionStrip(post = {}, options = {}) {
  const currentPost = post && post.id ? post : null;
  if (!currentPost || options.entryFrom !== 'share') {
    return null;
  }

  const counts = {
    staleCount: normalizeCount(currentPost.staleCount),
    reportCount: normalizeCount(currentPost.reportCount)
  };
  if (!canEncourageFirstAction(currentPost, counts)) {
    return null;
  }

  const confirmDisabled = Boolean(currentPost.confirmedByMe);
  return {
    tone: 'good',
    title: '先帮一步',
    body: '如果你在附近，先确认有效；知道更多，就补一条线索。',
    confirmText: confirmDisabled ? '已确认' : '我在附近，确认一下',
    commentText: '补一条线索',
    confirmDisabled,
    note: '这里只记录你的确认或评论，不会自动转发。'
  };
}
