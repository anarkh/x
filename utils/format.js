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
