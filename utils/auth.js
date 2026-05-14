import config from './config.js';

const USER_STORAGE_KEY = 'user';
const BEIDOU_NAMES = ['天枢', '天璇', '天玑', '天权', '玉衡', '开阳', '摇光'];

function randomGuestName() {
  return BEIDOU_NAMES[Math.floor(Math.random() * BEIDOU_NAMES.length)];
}

function isPlaceholderNickname(nickname) {
  return !nickname || nickname === '微信用户';
}

function isDefaultProfileNickname(nickname) {
  return isPlaceholderNickname(nickname) || BEIDOU_NAMES.indexOf(nickname) >= 0;
}

function guestUser() {
  return {
    id: `guest_${Date.now()}`,
    nickname: randomGuestName(),
    avatarUrl: '',
    role: 'user',
    isGuest: true,
    profileCompleted: false,
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
    nickname: isPlaceholderNickname(user.nickname) && role !== 'admin'
      ? randomGuestName()
      : user.nickname || config.admin.displayName,
    avatarUrl: user.avatarUrl || '',
    role,
    authSource: user.authSource || '',
    isGuest: Boolean(user.isGuest) || isLegacyGuest,
    profileCompleted: Boolean(user.profileCompleted || (user.avatarUrl && !isDefaultProfileNickname(user.nickname))),
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
  const profileNickname = profile.nickName || profile.nickname || '';
  const nickname = isPlaceholderNickname(profileNickname)
    ? previous.nickname || randomGuestName()
    : profileNickname;
  return saveUser({
    id: previous.id || `user_${Date.now()}`,
    nickname,
    avatarUrl: profile.avatarUrl || previous.avatarUrl || '',
    role: 'user',
    authSource: '',
    isGuest: false,
    profileCompleted: Boolean(previous.profileCompleted),
    loggedInAt: Date.now()
  });
}

export function updateUserProfile(profile = {}) {
  const previous = getCurrentUser();
  const nickname = isPlaceholderNickname(profile.nickname || profile.nickName)
    ? previous.nickname
    : profile.nickname || profile.nickName || previous.nickname;
  const avatarUrl = profile.avatarUrl || previous.avatarUrl || '';
  return saveUser({
    ...previous,
    nickname,
    avatarUrl,
    isGuest: false,
    profileCompleted: Boolean(avatarUrl && !isDefaultProfileNickname(nickname)),
    loggedInAt: previous.loggedInAt || Date.now()
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
    profileCompleted: Boolean(previous.profileCompleted),
    loggedInAt: Date.now()
  });
}

function adminCheckInfo(data = {}, fallbackReason = '') {
  return {
    reason: data.reason || fallbackReason,
    missingCollection: data.reason === '管理员配置不可用'
  };
}

export async function refreshAdminRole() {
  const previous = getCurrentUser();
  if (!canUseCloudRole()) {
    const user = saveCloudUser(previous, 'user');
    return {
      ok: false,
      message: '请先配置云开发环境',
      check: adminCheckInfo({}, '请先配置云开发环境'),
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
      check: adminCheckInfo({}, error.errMsg || error.message || '管理员校验失败'),
      user
    };
  }
  const data = result.result || {};
  const nextRole = data.role === 'admin' ? 'admin' : 'user';
  const user = saveCloudUser(previous, nextRole, data.openid);
  const check = adminCheckInfo(data);
  const message = nextRole === 'admin' ? '' : (check.reason || '当前微信不是管理员');
  return {
    ok: nextRole === 'admin',
    message,
    check,
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
