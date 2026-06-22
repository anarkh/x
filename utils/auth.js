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

function saveAdminCheckFallbackUser(previous) {
  // A failed admin check should revoke stale admin state, but must not turn a guest into a logged-in user.
  return saveUser({
    ...previous,
    role: 'user',
    authSource: '',
    isGuest: Boolean(previous.isGuest),
    loggedInAt: previous.isGuest ? previous.loggedInAt || 0 : previous.loggedInAt || Date.now()
  });
}

function adminCheckInfo(data = {}, fallbackReason = '') {
  const reason = data.reason || fallbackReason;
  return {
    reason,
    nextStep: data.nextStep || '',
    missingCollection: reason === '管理员配置不可用',
    needsFunctionDeploy: Boolean(data.needsFunctionDeploy)
  };
}

export function formatAdminRoleError(error) {
  const rawMessage = String(error && (error.errMsg || error.message || error) || '');
  if (rawMessage.indexOf('wx-server-sdk') >= 0) {
    return {
      reason: 'getMyRole 云函数依赖未安装',
      nextStep: '在微信开发者工具中右键 cloudfunctions/getMyRole，选择“上传并部署：云端安装依赖”后重试。',
      needsFunctionDeploy: true
    };
  }
  if (
    rawMessage.indexOf('function not found') >= 0
    || rawMessage.indexOf('FunctionName') >= 0
    || rawMessage.indexOf('ResourceNotFound') >= 0
  ) {
    return {
      reason: 'getMyRole 云函数未部署或环境不匹配',
      nextStep: '确认云开发环境后，重新上传部署 getMyRole 云函数。'
    };
  }
  return {
    reason: '管理员校验云函数暂不可用',
    nextStep: '检查云开发环境、getMyRole 云函数部署状态和 admins 集合后重试。'
  };
}

export async function refreshAdminRole() {
  const previous = getCurrentUser();
  if (!canUseCloudRole()) {
    const user = saveAdminCheckFallbackUser(previous);
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
    const user = saveAdminCheckFallbackUser(previous);
    const check = adminCheckInfo(formatAdminRoleError(error));
    return {
      ok: false,
      message: check.reason || '管理员校验失败',
      check,
      user
    };
  }
  const data = result.result || {};
  if (data.role !== 'admin' || data.ok !== true) {
    const user = saveAdminCheckFallbackUser(previous);
    const check = adminCheckInfo(data);
    return {
      ok: false,
      message: check.reason || '当前微信不是管理员',
      check,
      user
    };
  }
  const user = saveCloudUser(previous, 'admin', data.openid);
  const check = adminCheckInfo(data);
  return {
    ok: true,
    message: '',
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
