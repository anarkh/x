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

function receiverActionParam(action) {
  return ['confirm', 'comment'].includes(action) ? `&receiverAction=${action}` : '';
}

function sharePathForPost(post, action) {
  const id = encodeURIComponent(post.id || '');
  return `/pages/detail/detail?id=${id}&from=share&source=receiver${receiverActionParam(action)}`;
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

function buildShareReason(action) {
  return {
    label: '转给下一位时可以说',
    text: action === 'comment'
      ? '我刚补了线索，你先看最新评论'
      : '我刚确认过，帮忙再核对一下'
  };
}

function channel(label, hint, priorityReason) {
  return { label, hint, priorityReason };
}

function actionChannels(confirmChannels, commentChannels, action) {
  return action === 'comment' ? commentChannels : confirmChannels;
}

function lostFoundRelayChannels(post, action) {
  if (post.intent === 'found') {
    return actionChannels(
      [
        channel('楼栋群', '方便失主看到线索', 'found-confirm-owner-reach'),
        channel('门卫/前台', '适合现场代管核对', 'found-confirm-onsite-handoff'),
        channel('附近邻居', '可能知道失主', 'found-confirm-nearby-owner')
      ],
      [
        channel('附近邻居', '刚补线索，先看评论', 'found-comment-local-clue'),
        channel('门卫/前台', '方便按线索核对', 'found-comment-onsite-check'),
        channel('楼栋群', '可能触达失主', 'found-comment-owner-reach')
      ],
      action
    );
  }

  return actionChannels(
    [
      channel('路过朋友', '刚有确认，适合现场核对', 'lost-confirm-passerby-check'),
      channel('门卫/前台', '方便留意丢失地点', 'lost-confirm-onsite-watch'),
      channel('楼栋群', '可能有人刚经过', 'lost-confirm-building-pass')
    ],
    [
      channel('楼栋群', '刚补线索，先看评论', 'lost-comment-building-clue'),
      channel('门卫/前台', '方便按线索核对', 'lost-comment-onsite-check'),
      channel('路过朋友', '可能见过细节', 'lost-comment-passerby-detail')
    ],
    action
  );
}

function buildRelayChannels(post, action) {
  if (post.category === 'lost_found') {
    return lostFoundRelayChannels(post, action);
  }
  if (post.category === 'help_needed') {
    return actionChannels(
      [
        channel('能搭把手的人', '刚有确认，可直接帮忙', 'help-confirm-capable-helper'),
        channel('附近邻居', '离现场更近', 'help-confirm-nearby-neighbor'),
        channel('店员/前台', '熟悉现场动线', 'help-confirm-onsite-staff')
      ],
      [
        channel('店员/前台', '刚补线索，先看评论', 'help-comment-onsite-clue'),
        channel('附近邻居', '方便理解现场需求', 'help-comment-nearby-context'),
        channel('能搭把手的人', '适合接着行动', 'help-comment-capable-helper')
      ],
      action
    );
  }
  if (post.category === 'street_update') {
    return actionChannels(
      [
        channel('同路线邻居', '刚有确认，适合核对', 'street-confirm-same-route'),
        channel('路过朋友', '可能马上经过', 'street-confirm-passerby'),
        channel('楼栋群', '提醒同楼附近', 'street-confirm-building')
      ],
      [
        channel('楼栋群', '刚补线索，先看评论', 'street-comment-building-clue'),
        channel('同路线邻居', '方便判断是否绕行', 'street-comment-route-decision'),
        channel('路过朋友', '可能补充现场情况', 'street-comment-passerby-context')
      ],
      action
    );
  }
  if (post.category === 'check_in') {
    return actionChannels(
      [
        channel('附近朋友', '刚有确认，适合参考', 'checkin-confirm-nearby-reference'),
        channel('同社区邻居', '熟悉地点状态', 'checkin-confirm-community'),
        channel('会到这里的人', '可能正要到场', 'checkin-confirm-arrival')
      ],
      [
        channel('同社区邻居', '刚补线索，先看评论', 'checkin-comment-community-clue'),
        channel('会到这里的人', '方便安排到场', 'checkin-comment-arrival-plan'),
        channel('附近朋友', '可能补充体验', 'checkin-comment-nearby-context')
      ],
      action
    );
  }
  return actionChannels(
    [
      channel('能核对地点的人', '刚有确认，适合核对', 'fallback-confirm-place-check'),
      channel('可能路过的人', '方便补现场信息', 'fallback-confirm-passerby')
    ],
    [
      channel('能核对地点的人', '刚补线索，先看评论', 'fallback-comment-place-check'),
      channel('可能路过的人', '方便补现场信息', 'fallback-comment-passerby')
    ],
    action
  );
}

function targetAudienceForPost(post) {
  if (post.category === 'lost_found') {
    if (post.intent === 'found') {
      return '可能在附近丢东西的人、楼栋群或前台';
    }
    return '可能路过丢失地点的人、门卫或前台';
  }
  if (post.category === 'help_needed') {
    return '能搭把手的邻居、店员或熟悉情况的人';
  }
  if (post.category === 'street_update') {
    return '即将经过这里的人、同楼栋或同路线邻居';
  }
  if (post.category === 'check_in') {
    return '会到这里的人、附近朋友或同社区邻居';
  }
  return '熟悉这个地点、能帮忙核对的人';
}

function nextReceiverCueForPost(post) {
  if (post.category === 'lost_found') {
    return '物品特征、地点和最新评论';
  }
  if (post.category === 'help_needed') {
    return '求助内容、地点和最新评论';
  }
  if (post.category === 'street_update') {
    return '更新时间、地点和过时信号';
  }
  if (post.category === 'check_in') {
    return '地点状态、评论和适合到场时间';
  }
  return '地点、确认数和最新评论';
}

function buildTargetRows(post, action) {
  return [
    {
      label: '推荐转给',
      value: targetAudienceForPost(post)
    },
    {
      label: '为什么可信',
      value: action === 'comment' ? '刚补了线索，评论可直接核对' : '刚有人确认，现场信号更新'
    },
    {
      label: '下一位先看',
      value: nextReceiverCueForPost(post)
    }
  ];
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
    targetRows: shouldRelay ? buildTargetRows(currentPost, normalizedAction) : [],
    relayChannels: shouldRelay ? buildRelayChannels(currentPost, normalizedAction) : [],
    shareReason: shouldRelay ? buildShareReason(normalizedAction) : null,
    shareTitle: shouldRelay
      ? `${normalizedAction === 'comment' ? '已补充线索' : '已确认接力'}：${titleText(currentPost)}`
      : `附近任务：${titleText(currentPost)}`,
    sharePath: shouldRelay ? sharePathForPost(currentPost, normalizedAction) : sharePathForPost(currentPost)
  };
}
