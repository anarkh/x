import config from './config.js';

const USER_STORAGE_KEY = 'user';

function guestUser() {
  return {
    id: `guest_${Date.now()}`,
    nickname: '游客',
    avatarUrl: '',
    role: 'user',
    isGuest: true,
    loggedInAt: 0
  };
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }
  const role = user.role === 'admin' ? 'admin' : 'user';
  const id = user.id || (role === 'admin' ? 'local_admin' : 'local_guest');
  const isLegacyGuest = role === 'user'
    && !user.loggedInAt
    && (id === 'local_guest' || String(id).startsWith('guest_'));
  return {
    id,
    nickname: user.nickname || (role === 'admin' ? config.admin.displayName : '街区用户'),
    avatarUrl: user.avatarUrl || '',
    role,
    isGuest: Boolean(user.isGuest) || isLegacyGuest,
    loggedInAt: user.loggedInAt || 0
  };
}

function saveUser(user) {
  const normalized = normalizeUser(user) || guestUser();
  wx.setStorageSync(USER_STORAGE_KEY, normalized);
  return normalized;
}

export function ensureUser() {
  const user = normalizeUser(wx.getStorageSync(USER_STORAGE_KEY)) || guestUser();
  wx.setStorageSync(USER_STORAGE_KEY, user);
  return user;
}

export function getCurrentUser() {
  return ensureUser();
}

export function loginAsUser(profile = {}) {
  const previous = getCurrentUser();
  return saveUser({
    id: previous.id || `user_${Date.now()}`,
    nickname: profile.nickName || profile.nickname || (previous.isGuest ? '街区用户' : previous.nickname) || '街区用户',
    avatarUrl: profile.avatarUrl || previous.avatarUrl || '',
    role: 'user',
    isGuest: false,
    loggedInAt: Date.now()
  });
}

export function loginAsAdmin(code) {
  const passcode = String(code || '').trim();
  if (passcode !== config.admin.localLoginCode) {
    return {
      ok: false,
      message: '管理口令不正确'
    };
  }
  const previous = getCurrentUser();
  return {
    ok: true,
    user: saveUser({
      id: 'local_admin',
      nickname: config.admin.displayName,
      avatarUrl: previous.avatarUrl || '',
      role: 'admin',
      isGuest: false,
      loggedInAt: Date.now()
    })
  };
}

export function logout() {
  return saveUser(guestUser());
}

export function isAdmin(user = getCurrentUser()) {
  return user.role === 'admin' && !user.isGuest;
}
