const DIAGNOSTICS_KEY = 'runtime_diagnostics';
const MAX_ENTRIES = 12;

function compactText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function timeText(timestamp) {
  const date = new Date(timestamp || Date.now());
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function describeError(error) {
  if (!error) {
    return 'unknown error';
  }
  if (typeof error === 'string') {
    return compactText(error);
  }
  const parts = [
    error.code,
    error.errCode,
    error.errMsg,
    error.message
  ].filter((item) => item !== undefined && item !== null && item !== '');
  if (parts.length) {
    return compactText(parts.join(' | '));
  }
  try {
    return compactText(JSON.stringify(error));
  } catch (jsonError) {
    return compactText(String(error));
  }
}

export function addDiagnostic(scope, detail) {
  const entry = {
    time: Date.now(),
    scope: compactText(scope || 'runtime'),
    message: describeError(detail)
  };
  try {
    const stored = wx.getStorageSync(DIAGNOSTICS_KEY);
    const entries = Array.isArray(stored) ? stored : [];
    wx.setStorageSync(DIAGNOSTICS_KEY, [entry, ...entries].slice(0, MAX_ENTRIES));
  } catch (storageError) {
    // Diagnostics must never become the reason the app fails to launch.
  }
  return entry;
}

export function listDiagnostics(limit = 6) {
  try {
    const stored = wx.getStorageSync(DIAGNOSTICS_KEY);
    return (Array.isArray(stored) ? stored : [])
      .slice(0, limit)
      .map((entry) => `${timeText(entry.time)} ${entry.scope}: ${entry.message}`);
  } catch (storageError) {
    return [];
  }
}
