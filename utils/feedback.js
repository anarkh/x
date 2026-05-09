import config from './config.js';
import { getCurrentUser } from './auth.js';

const FEEDBACK_STORAGE_KEY = 'feedback_items';

function loadFeedback() {
  const stored = wx.getStorageSync(FEEDBACK_STORAGE_KEY);
  return Array.isArray(stored) ? stored : [];
}

function saveFeedback(items) {
  wx.setStorageSync(FEEDBACK_STORAGE_KEY, items);
}

export function feedbackTypeLabel(value) {
  const item = config.feedbackTypes.find((type) => type.value === value);
  return item ? item.label : '反馈';
}

export function createFeedback(input) {
  const user = getCurrentUser();
  const now = Date.now();
  const item = {
    id: `feedback_${now}`,
    type: input.type || config.feedbackTypes[0].value,
    body: String(input.body || '').trim(),
    contact: String(input.contact || '').trim(),
    userId: user.id,
    nickname: user.nickname || '街区用户',
    role: user.role || 'user',
    createdAt: now
  };
  saveFeedback([item, ...loadFeedback()]);
  return item;
}

export function listFeedback() {
  return loadFeedback().sort((a, b) => b.createdAt - a.createdAt);
}
