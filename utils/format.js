import config from './config.js';

export function categoryLabel(value) {
  const legacyLabels = {
    question: '求助问答'
  };
  if (legacyLabels[value]) {
    return legacyLabels[value];
  }
  const item = config.categories.find((category) => category.value === value);
  return item ? item.label : '街区任务';
}

export function statusLabel(status) {
  const labels = {
    active: '有效',
    stale: '疑似过时',
    expired: '已过期',
    hidden: '已隐藏',
    resolved: '已解决'
  };
  return labels[status] || '有效';
}

export function resolveActionLabel(category) {
  const labels = {
    lost_found: '已找回',
    street_update: '已恢复',
    help_needed: '已解决',
    check_in: '已结束'
  };
  return labels[category] || '关闭任务';
}

export function intentLabel(intent) {
  const labels = {
    lost: '我丢了',
    found: '我捡到'
  };
  return labels[intent] || '';
}

export function formatConfirmationText(confirmations, lastConfirmedAt) {
  if (!lastConfirmedAt) {
    return `确认 ${confirmations}`;
  }
  return `确认 ${confirmations} · ${formatCreatedAt(lastConfirmedAt)}确认`;
}

function safeCount(value) {
  return Math.max(0, Number(value) || 0);
}

export function formatTrustInsight(post = {}, commentCount = 0) {
  const confirmations = safeCount(post.confirmations);
  const staleCount = safeCount(post.staleCount);
  const reportCount = safeCount(post.reportCount);
  const comments = safeCount(commentCount);
  const status = post.status || 'active';
  const lastConfirmedText = post.lastConfirmedAt ? `${formatCreatedAt(post.lastConfirmedAt)}确认` : '暂无最近确认';
  let tone = 'neutral';
  let title = '还缺信任信号';
  let body = '暂时没有确认、过时或举报记录，建议结合现场情况判断。';
  let hint = '你可以先用评论提问，或在现场核实后再记录判断。';

  if (status === 'resolved') {
    tone = 'done';
    title = '任务已关闭';
    body = '发布者或管理员已标记处理完成，评论仅作为历史线索参考。';
    hint = '不需要继续确认，可查看评论了解处理经过。';
  } else if (status === 'hidden') {
    tone = 'danger';
    title = '内容已隐藏';
    body = '这条任务因举报或管理处理被隐藏，普通列表不会继续展示。';
    hint = '如需复核，请联系管理员处理。';
  } else if (status === 'expired') {
    tone = 'neutral';
    title = '任务已过期';
    body = comments > 0 ? `已超过有效期，仍可查看${comments}条历史线索。` : '已超过有效期，暂时没有历史评论可参考。';
    hint = '不再接收确认，建议返回地图查看新的附近任务。';
  } else if (reportCount >= 2) {
    tone = 'danger';
    title = '存在多次举报';
    body = `已有${reportCount}次举报，发布内容需要谨慎判断。`;
    hint = '不要直接行动，先看评论或等待管理员处理。';
  } else if (status === 'stale' || staleCount >= 3) {
    tone = 'warn';
    title = '可能已经过时';
    body = `已有${staleCount}次过时反馈，信息可能不再准确。`;
    hint = '如果你在现场看到变化，可以补充评论说明最新情况。';
  } else if (reportCount > 0) {
    tone = 'warn';
    title = '有举报提醒';
    body = `已有${reportCount}次举报，建议先核对评论和现场情况。`;
    hint = '如确认内容不当，可继续举报；如内容有效，可补充评论。';
  } else if (staleCount > 0) {
    tone = 'warn';
    title = '有人认为需复核';
    body = `已有${staleCount}次过时反馈，信息可能发生了变化。`;
    hint = '看到最新情况时，优先写评论补充现场状态。';
  } else if (confirmations > 0) {
    tone = 'good';
    title = '有确认信号';
    body = `已有${confirmations}次确认信号，${lastConfirmedText}。`;
    hint = '仍建议结合现场和评论判断；看到情况属实再点确认。';
  } else if (comments > 0) {
    tone = 'neutral';
    title = '先看评论线索';
    body = `已有${comments}条评论，先看补充信息再决定是否行动。`;
    hint = '如果评论仍不够清楚，可以继续提问或补充线索。';
  }

  return {
    tone,
    title,
    body,
    hint,
    signals: [
      {
        key: 'confirm',
        label: '有效确认',
        value: confirmations,
        note: post.lastConfirmedAt ? lastConfirmedText : '等现场确认',
        tone: confirmations > 0 ? 'good' : 'neutral'
      },
      {
        key: 'stale',
        label: '过时反馈',
        value: staleCount,
        note: staleCount >= 3 ? '已触发过时' : '3次会标记',
        tone: staleCount > 0 ? 'warn' : 'neutral'
      },
      {
        key: 'report',
        label: '举报提醒',
        value: reportCount,
        note: reportCount >= 2 ? '达到隐藏阈值' : '2次会隐藏',
        tone: reportCount > 0 ? 'danger' : 'neutral'
      },
      {
        key: 'comment',
        label: '评论线索',
        value: comments,
        note: comments > 0 ? '先看补充' : '等待补充',
        tone: comments > 0 ? 'comment' : 'neutral'
      }
    ]
  };
}

export function formatTimeLeft(expiresAt) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) {
    return '已过期';
  }
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours}小时后过期`;
  }
  return `${Math.ceil(hours / 24)}天后过期`;
}

export function formatCreatedAt(createdAt) {
  const minutes = Math.max(1, Math.floor((Date.now() - createdAt) / 60000));
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}小时前`;
  }
  return `${Math.floor(hours / 24)}天前`;
}
