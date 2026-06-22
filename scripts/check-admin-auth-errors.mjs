import assert from 'node:assert/strict';

import { formatAdminRoleError, refreshAdminRole } from '../utils/auth.js';

const missingSdk = formatAdminRoleError({
  errMsg: "cloud.callFunction:fail Error: Cannot find module 'wx-server-sdk'"
});

assert.equal(missingSdk.reason, 'getMyRole 云函数依赖未安装');
assert.equal(missingSdk.needsFunctionDeploy, true);
assert.match(missingSdk.nextStep, /云端安装依赖/);
assert.doesNotMatch(missingSdk.reason, /Require stack|callFunction:fail|Cannot find module/);

const missingFunction = formatAdminRoleError({
  errMsg: 'cloud.callFunction:fail function not found'
});

assert.equal(missingFunction.reason, 'getMyRole 云函数未部署或环境不匹配');
assert.match(missingFunction.nextStep, /重新上传部署 getMyRole/);

const unknown = formatAdminRoleError({
  errMsg: 'cloud.callFunction:fail timeout'
});

assert.equal(unknown.reason, '管理员校验云函数暂不可用');
assert.match(unknown.nextStep, /检查云开发环境/);

let storage = {};

function setWx(cloud) {
  storage = {};
  globalThis.wx = {
    cloud,
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    }
  };
}

async function assertGuestPreserved(label, cloud) {
  setWx(cloud);
  wx.setStorageSync('user', {
    id: 'guest_for_admin_check',
    nickname: '天枢',
    avatarUrl: '',
    role: 'user',
    isGuest: true,
    profileCompleted: false,
    loggedInAt: 0
  });
  const result = await refreshAdminRole();
  assert.equal(result.ok, false, `${label}: admin check should fail`);
  assert.equal(result.user.isGuest, true, `${label}: failed admin check must keep guest state`);
  assert.equal(wx.getStorageSync('user').isGuest, true, `${label}: stored user must remain guest`);
  assert.equal(wx.getStorageSync('user').loggedInAt, 0, `${label}: failed admin check must not stamp login time`);
}

async function assertAdminDowngraded(label, cloud) {
  setWx(cloud);
  wx.setStorageSync('user', {
    id: 'stale_admin',
    nickname: '管理员',
    avatarUrl: '',
    role: 'admin',
    authSource: 'cloud',
    isGuest: false,
    profileCompleted: true,
    loggedInAt: 12345
  });
  const result = await refreshAdminRole();
  const storedUser = wx.getStorageSync('user');
  assert.equal(result.ok, false, `${label}: stale admin check should fail`);
  assert.equal(storedUser.role, 'user', `${label}: stale admin role must be revoked`);
  assert.equal(storedUser.authSource, '', `${label}: stale admin cloud auth source must be cleared`);
  assert.equal(storedUser.isGuest, false, `${label}: logged-in non-admin user should stay non-guest`);
  assert.equal(storedUser.loggedInAt, 12345, `${label}: fallback should keep the existing login timestamp`);
}

await assertGuestPreserved('missing cloud role runtime', undefined);

await assertGuestPreserved('cloud function failure', {
  callFunction() {
    return Promise.reject({ errMsg: 'cloud.callFunction:fail timeout' });
  }
});

await assertGuestPreserved('missing admins collection', {
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'user',
        ok: false,
        reason: '管理员配置不可用'
      }
    });
  }
});

await assertGuestPreserved('not an admin', {
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'user',
        ok: false,
        reason: '当前微信不是管理员'
      }
    });
  }
});

await assertGuestPreserved('legacy user response without ok', {
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'user'
      }
    });
  }
});

await assertGuestPreserved('non-admin positive-looking response', {
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'user',
        ok: true,
        reason: ''
      }
    });
  }
});

await assertGuestPreserved('admin-shaped response without ok', {
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'admin'
      }
    });
  }
});

await assertGuestPreserved('admin-shaped response with non-boolean ok', {
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'admin',
        ok: 'true'
      }
    });
  }
});

await assertAdminDowngraded('stale admin rejected by role check', {
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'user',
        ok: false,
        reason: '当前微信不是管理员'
      }
    });
  }
});

setWx({
  callFunction() {
    return Promise.resolve({
      result: {
        role: 'admin',
        ok: true,
        reason: ''
      }
    });
  }
});
wx.setStorageSync('user', {
  id: 'guest_admin',
  nickname: '天璇',
  avatarUrl: '',
  role: 'user',
  isGuest: true,
  profileCompleted: false,
  loggedInAt: 0
});
const adminResult = await refreshAdminRole();
const storedAdmin = wx.getStorageSync('user');
assert.equal(adminResult.ok, true);
assert.equal(adminResult.user.role, 'admin');
assert.equal(adminResult.user.isGuest, false);
assert.equal(storedAdmin.role, 'admin');
assert.equal(storedAdmin.isGuest, false);

console.log('Admin auth error checks passed.');
