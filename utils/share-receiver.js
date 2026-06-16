function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function buildTone(post, counts) {
  if (post.status === 'hidden') {
    return 'danger';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return 'done';
  }
  if (counts.reportCount >= 2) {
    return 'danger';
  }
  if (counts.staleCount >= 3) {
    return 'warn';
  }
  return 'good';
}

function buildSummary(post, counts, sourceComment, sourceConfirm) {
  if (post.status === 'hidden') {
    return '这条记录已隐藏，只适合给发布者或管理员看历史处理。';
  }
  if (post.status === 'resolved') {
    return '这条任务已经关闭，适合当历史线索看，不要继续公开扩散。';
  }
  if (post.status === 'expired') {
    return '这条任务已过期，先看最新情况，再决定要不要继续转。';
  }
  if (counts.reportCount >= 2) {
    return '已有较多举报，先核对评论和现场变化，再决定是否确认。';
  }
  if (counts.staleCount >= 3) {
    return '有过时反馈，先确认最新情况，别把旧信息继续传开。';
  }
  if (sourceConfirm) {
    return '有人刚帮忙确认过，先看确认信号和评论，再决定要不要补充或转给更可能路过的人。';
  }
  if (counts.confirmations > 0) {
    return '已经有确认信号，先看现有线索，再决定确认、评论或转发。';
  }
  if (sourceComment) {
    return '有人刚在评论区补了新线索，先看最新评论，再决定要不要确认、补充或转给更可能路过的人。';
  }
  if (counts.comments > 0) {
    return `评论里已有${counts.comments}条补充，先看一眼再决定下一步。`;
  }
  return '这条任务被转给你，多半是因为你更可能看见现场或补上线索。';
}

function buildReason(post, counts, sourceComment, sourceConfirm) {
  if (post.status === 'hidden') {
    return '内容已被隐藏，只保留给发布者或管理员处理。';
  }
  if (post.status === 'resolved') {
    return '任务已关闭，适合当历史结果参考。';
  }
  if (post.status === 'expired') {
    return '任务已过期，适合给刚好路过的人做参考。';
  }
  if (counts.reportCount >= 2) {
    return '已有举报提醒，先让熟悉现场的人核对。';
  }
  if (counts.staleCount >= 3) {
    return '有人提醒过时，先确认是不是已经变化。';
  }
  if (sourceConfirm) {
    return '这条分享来自确认接力，先看确认和评论会更完整。';
  }
  if (counts.confirmations > 0) {
    return '已经有人确认过，适合继续补核对或补线索。';
  }
  if (sourceComment) {
    return '这条分享来自评论接力，先看最新评论会更完整。';
  }
  if (counts.comments > 0) {
    return '评论里已有补充，转给你是为了接着看这些线索。';
  }
  return '你更可能在附近看见现场、知道最新变化，或者补上一条有用评论。';
}

function buildNextStep(post, counts, sourceComment, sourceConfirm) {
  if (post.status === 'hidden') {
    return '只看历史，不要继续公开扩散。';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return '先看处理结果和评论，再决定要不要转给别人。';
  }
  if (counts.reportCount >= 2) {
    return '先看评论里的补充，再点确认或继续核对。';
  }
  if (counts.staleCount >= 3) {
    return '先确认现场是否还一致，别直接按旧信息处理。';
  }
  if (sourceConfirm) {
    return '先看确认和评论，再决定补充、确认或继续转给更可能路过的人。';
  }
  if (counts.confirmations > 0) {
    return '先看已有确认，再决定确认、评论或转发。';
  }
  if (sourceComment) {
    return '先看最新评论，再决定确认、补充或继续转给更可能路过的人。';
  }
  if (counts.comments > 0) {
    return '先看评论，再补一句你知道的情况。';
  }
  return '先看任务内容，能确认就确认，知道更多就补评论。';
}

function buildIfNotOnSite(post, counts, sourceComment, sourceConfirm) {
  if (post.status === 'hidden') {
    return '只当历史记录看，不要继续公开转。';
  }
  if (post.status === 'resolved' || post.status === 'expired') {
    return '可以留着做历史参考，不必继续公开扩散。';
  }
  if (counts.reportCount >= 2 || counts.staleCount >= 3) {
    return '先别盲转，最好交给更熟悉现场的人。';
  }
  if (sourceConfirm) {
    return '不在现场也可以先看确认和评论，再决定要不要继续转给别人。';
  }
  if (sourceComment) {
    return '不在现场也可以先看最新评论，再决定要不要继续转给别人。';
  }
  return '不在现场也可以先补评论，或者转给更可能路过的人。';
}

export function buildShareReceiverGuide(post = {}, commentCount = 0, options = {}) {
  const currentPost = post && post.id ? post : null;
  if (!currentPost || options.entryFrom !== 'share') {
    return null;
  }

  const counts = {
    confirmations: normalizeCount(currentPost.confirmations),
    staleCount: normalizeCount(currentPost.staleCount),
    reportCount: normalizeCount(currentPost.reportCount),
    comments: normalizeCount(commentCount)
  };
  const sourceComment = options.source === 'comment';
  const sourceConfirm = options.source === 'confirm';

  let title = '先看评论再决定';
  if (currentPost.status === 'hidden') {
    title = '已隐藏任务';
  } else if (currentPost.status === 'resolved') {
    title = '已关闭任务';
  } else if (currentPost.status === 'expired') {
    title = '已过期任务';
  } else if (counts.reportCount >= 2) {
    title = '先谨慎核对';
  } else if (counts.staleCount >= 3) {
    title = '先看最新情况';
  } else if (sourceConfirm) {
    title = '有人刚确认过';
  } else if (counts.confirmations > 0) {
    title = '已有确认信号';
  } else if (sourceComment) {
    title = '有人刚补了线索';
  }

  return {
    kicker: '来自转发',
    title,
    summary: buildSummary(currentPost, counts, sourceComment, sourceConfirm),
    rows: [
      {
        label: '为什么到你这',
        value: buildReason(currentPost, counts, sourceComment, sourceConfirm)
      },
      {
        label: '先做什么',
        value: buildNextStep(currentPost, counts, sourceComment, sourceConfirm)
      },
      {
        label: '不在现场',
        value: buildIfNotOnSite(currentPost, counts, sourceComment, sourceConfirm)
      }
    ],
    note:
      currentPost.status === 'hidden'
        ? '隐藏内容只适合给发布者或管理员看。'
        : currentPost.status === 'resolved' || currentPost.status === 'expired'
          ? '已关闭或已过期时，只把它当历史线索。'
          : counts.reportCount >= 2
            ? '有较多举报时，先核对再转，别把旧判断继续传开。'
            : counts.staleCount >= 3
              ? '有过时反馈时，先确认最新情况，再决定是否继续转发。'
              : sourceConfirm
                ? '刚有确认信号，先看确认和评论再转会更稳妥。'
              : sourceComment
                ? '评论区刚补了线索，先看最新评论再转会更完整。'
              : counts.comments > 0
                ? '评论里已有补充，转发前先看一眼会更完整。'
                : '如果你知道更多现场信息，也可以先补一条评论。',
    tone: buildTone(currentPost, counts)
  };
}
