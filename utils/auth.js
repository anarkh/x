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
    authSource: user.authSource || '',
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
    authSource: '',
    isGuest: false,
    loggedInAt: Date.now()
  });
}

function canUseCloudRole() {
  return Boolean(config.cloud && config.cloud.enabled && config.cloud.envId && wx.cloud);
}

function saveCloudUser(previous, role, openid) {
  return saveUser({
    id: openid || previous.id || `user_${Date.now()}`,
    nickname: role === 'admin' ? config.admin.displayName : previous.nickname,
    avatarUrl: previous.avatarUrl || '',
    role,
    authSource: role === 'admin' ? 'cloud' : '',
    isGuest: false,
    loggedInAt: Date.now()
  });
}

export async function refreshAdminRole() {
  const previous = getCurrentUser();
  if (!canUseCloudRole()) {
    const user = saveCloudUser(previous, 'user');
    return {
      ok: false,
      message: '请先配置云开发环境',
      user
    };
  }
  let result = null;
  try {
    result = await wx.cloud.callFunction({
      name: 'getMyRole'
    });
  } catch (error) {
    const user = saveCloudUser(previous, 'user');
    return {
      ok: false,
      message: '管理员校验失败',
      user
    };
  }
  const data = result.result || {};
  const nextRole = data.role === 'admin' ? 'admin' : 'user';
  const user = saveCloudUser(previous, nextRole, data.openid);
  return {
    ok: nextRole === 'admin',
    message: nextRole === 'admin' ? '' : '当前微信不是管理员',
    user
  };
}

export function loginAsAdmin() {
  return refreshAdminRole();
}

export function logout() {
  return saveUser(guestUser());
}

export function isAdmin(user = getCurrentUser()) {
  return user.role === 'admin' && user.authSource === 'cloud' && !user.isGuest;
}
