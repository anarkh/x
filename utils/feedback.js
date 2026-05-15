import config from './config.js';
import { getCurrentUser } from './auth.js';

const FEEDBACK_STORAGE_KEY = 'feedback_items';
const FEEDBACK_FUNCTION_NAME = 'posts';

function shouldUseCloud() {
  return Boolean(config.cloud && config.cloud.enabled && config.cloud.envId && wx.cloud);
}

function cloudError(code, message) {
  const error = new Error(message || 'Feedback cloud operation failed');
  error.code = code || 'CLOUD_FEEDBACK_FAILED';
  return error;
}

function isCloudUnavailableError(error) {
  const message = String(error && (error.errMsg || error.message || ''));
  const errCode = Number(error && error.errCode);
  return error
    && (!error.code || error.code === 'CLOUD_FEEDBACK_FAILED')
    && ([-501000, -504002, -404011].indexOf(errCode) >= 0
      || message.indexOf('callFunction') >= 0
      || message.indexOf('cloud function') >= 0
      || message.indexOf('云函数') >= 0
      || message.indexOf('FunctionName') >= 0
      || message.indexOf('function not found') >= 0
      || message.indexOf('ResourceNotFound') >= 0);
}

async function callFeedbackFunction(action, data = {}) {
  const result = await wx.cloud.callFunction({
    name: FEEDBACK_FUNCTION_NAME,
    data: {
      action,
      ...data
    }
  });
  const payload = result.result || {};
  if (!payload.ok) {
    throw cloudError(payload.code, payload.message);
  }
  return payload.data || {};
}

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

function normalizeFeedback(item) {
  if (!item) {
    return null;
  }
  return {
    ...item,
    id: item.id || item._id,
    type: item.type || config.feedbackTypes[0].value,
    body: String(item.body || '').trim(),
    contact: String(item.contact || '').trim(),
    nickname: item.nickname || '街区用户',
    role: item.role || 'user',
    createdAt: Number(item.createdAt) || 0
  };
}

function buildLocalFeedback(input) {
  const user = getCurrentUser();
  const now = Date.now();
  return {
    id: `feedback_${now}`,
    type: input.type || config.feedbackTypes[0].value,
    body: String(input.body || '').trim(),
    contact: String(input.contact || '').trim(),
    userId: user.id,
    nickname: user.nickname || '街区用户',
    role: user.role || 'user',
    createdAt: now
  };
}

export async function createFeedback(input) {
  const item = buildLocalFeedback(input);
  if (!shouldUseCloud()) {
    saveFeedback([item, ...loadFeedback()]);
    return item;
  }
  try {
    const data = await callFeedbackFunction('createFeedback', {
      input: {
        type: item.type,
        body: item.body,
        contact: item.contact,
        nickname: item.nickname
      }
    });
    return normalizeFeedback(data.feedback) || item;
  } catch (error) {
    if (isCloudUnavailableError(error)) {
      saveFeedback([item, ...loadFeedback()]);
      return item;
    }
    throw error;
  }
}

export async function listFeedback() {
  if (!shouldUseCloud()) {
    return loadFeedback()
      .map(normalizeFeedback)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  try {
    const data = await callFeedbackFunction('listFeedback');
    return (data.feedbacks || [])
      .map(normalizeFeedback)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    if (isCloudUnavailableError(error)) {
      return loadFeedback()
        .map(normalizeFeedback)
        .filter(Boolean)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    throw error;
  }
}
