import assert from 'node:assert/strict';

import { formatAdminRoleError } from '../utils/auth.js';

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

console.log('Admin auth error checks passed.');
