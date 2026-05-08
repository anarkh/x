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
