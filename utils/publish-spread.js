function safeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function hasImages(post = {}) {
  return Array.isArray(post.imageUrls) && post.imageUrls.length > 0;
}

function buildOpenPlan(post) {
  const category = post.category || 'check_in';
  if (category === 'lost_found') {
    if (post.intent === 'found') {
      return {
        audience: '附近群、门卫、物业或可能认识失主的人',
        signalGoal: '请失主或认识失主的人补充领取线索，先核对特征再联系。',
        followUp: '有人认领时回看评论，确认特征后联系，处理完及时关闭。'
      };
    }
    return {
      audience: '门卫、物业、附近店员或常路过的附近群',
      signalGoal: '请看到过的人补充最后位置、时间或点确认，避免公开隐私。',
      followUp: '过一会儿回看评论，有线索就回复；找回后及时关闭。'
    };
  }
  if (category === 'street_update') {
    return {
      audience: '业主群、物业、通勤路过的人',
      signalGoal: '请附近的人确认是否还在、影响范围和是否需要绕行。',
      followUp: '回看评论里的最新状态；恢复或变化明显时补充说明并关闭。'
    };
  }
  if (category === 'help_needed') {
    return {
      audience: '朋友、邻居或能看到现场的附近群',
      signalGoal: '请知道情况的人回答问题、补线索或帮忙确认现场。',
      followUp: '收到回答后回复评论，问题解决就关闭，避免继续打扰。'
    };
  }
  return {
    audience: '邻居、同好或刚好在附近的群',
    signalGoal: '请刚路过的人确认还适合、补充人流或现场变化。',
    followUp: '过一会儿回看评论；如果状态变化，就补充最新情况。'
  };
}

function buildClosedPlan(post, comments) {
  if (post.status === 'resolved') {
    return {
      shouldEncourageSpread: false,
      tone: 'done',
      title: '已关闭，不用扩散',
      body: '这条任务已经处理完，保留给附近的人回看处理过程。',
      audience: '不用继续转发',
      signalGoal: '可以查看已有确认和评论，了解处理经过。',
      followUp: comments > 0 ? `已有${comments}条历史线索；有新情况时再发一条更准确的任务。` : '有新情况时，再发一条更准确的任务。',
      imageHint: hasImages(post) ? '有图，后续新发时可继续用图片说明特征。' : '没有图片，后续新发时可补充现场图。',
      commentHint: comments > 0 ? `已有${comments}条评论，可作为历史参考。` : '暂无评论，当前不需要继续收集线索。',
      sharePrompt: '不用继续扩散，可把处理结果留给需要的人参考。',
      actionText: '返回地图'
    };
  }
  return {
    shouldEncourageSpread: false,
    tone: 'neutral',
    title: '已过期，先别扩散',
    body: '这条任务已经超过有效期，继续转发可能让附近的人看到旧信息。',
    audience: '不用继续转发',
    signalGoal: comments > 0 ? '可先查看历史线索，判断是否需要重新发布。' : '如果现场情况还存在，建议重新发布新任务。',
    followUp: comments > 0 ? `已有${comments}条历史线索；情况仍存在时，发布新任务更清楚。` : '情况仍存在时，发布新任务更清楚。',
    imageHint: hasImages(post) ? '有图，重新发布时可沿用能说明现场的图片。' : '没有图片，重新发布时可补一张现场图。',
    commentHint: comments > 0 ? `已有${comments}条评论，先回看再决定是否新发。` : '暂无评论，可回到地图查看新的附近任务。',
    sharePrompt: '不用继续扩散旧任务，必要时重新发布。',
    actionText: '返回地图'
  };
}

export function buildPublishSpreadPlan(post = {}, commentCount = 0) {
  const comments = safeCount(commentCount);
  const status = post.status || 'active';
  if (status === 'resolved' || status === 'expired' || status === 'hidden') {
    return buildClosedPlan({ ...post, status: status === 'hidden' ? 'resolved' : status }, comments);
  }

  const plan = buildOpenPlan(post);
  const staleHint = status === 'stale' || safeCount(post.staleCount) >= 3
    ? '当前有过时信号，先请附近的人确认是否还准确。'
    : '发布后这段时间最适合请附近的人帮忙确认。';

  return {
    shouldEncourageSpread: true,
    tone: status === 'stale' ? 'warn' : 'good',
    title: '扩散计划',
    body: staleHint,
    ...plan,
    imageHint: hasImages(post)
      ? '有图，转发时提醒大家看图片里的特征和位置。'
      : '没有图片，转发时把地点、时间和可识别信息说清楚。',
    commentHint: comments > 0
      ? `已有${comments}条评论，转发前先回看评论，避免重复提问。`
      : '还没有评论，第一轮可以先请人确认或补线索。',
    sharePrompt: hasImages(post)
      ? '转发时补一句：请看图片、特征和位置，看到再确认。'
      : '转发时补一句：看到现场或有线索再确认。',
    actionText: '转发扩散'
  };
}

export function buildPublishSpreadSharePath(postId, query = {}) {
  const params = [['id', String(postId || '')]];
  Object.keys(query || {}).forEach((key) => {
    if (key === 'id' || key === 'from') {
      // Keep the receiver on a normal detail page; the spread plan is publisher-only.
      return;
    }
    const value = query[key];
    if (value === undefined || value === null || value === '') {
      return;
    }
    params.push([key, String(value)]);
  });
  const queryText = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `/pages/detail/detail?${queryText}`;
}
