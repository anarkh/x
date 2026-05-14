const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function isMissingCollectionError(error) {
  return error
    && (error.errCode === -502005 || String(error.errMsg || error.message || '').includes('ResourceNotFound'));
}

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const { OPENID, APPID, ENV } = wxContext;
  let result = { data: [] };
  try {
    result = await db.collection('admins')
      .where({
        openid: OPENID
      })
      .limit(5)
      .get();
  } catch (error) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }
    console.warn('[getMyRole] admins collection missing', {
      appid: APPID,
      env: ENV
    });
    return {
      role: 'user',
      ok: false,
      reason: '管理员配置不可用'
    };
  }
  const records = result.data || [];
  const admin = records.find((item) => item.enabled === true && item.role === 'admin');
  const roleAdminRecord = records.find((item) => item.role === 'admin');
  const enabledRecord = records.find((item) => item.enabled === true);
  let reason = '';
  if (!admin) {
    if (!records.length) {
      reason = 'admins 集合里没有匹配当前 openid 的记录';
    } else if (!roleAdminRecord) {
      reason = '记录存在，但 role 不是 admin';
    } else if (!enabledRecord) {
      reason = '记录存在，但 enabled 不是 true';
    } else {
      reason = '记录存在，但没有同时满足 role=admin 且 enabled=true';
    }
  }
  console.info('[getMyRole] checked role', {
    appid: APPID,
    env: ENV,
    openid: OPENID,
    ok: Boolean(admin),
    reason,
    matchCount: records.length,
    matchedIds: records.map((item) => item._id || ''),
    roles: records.map((item) => item.role || ''),
    enabledValues: records.map((item) => item.enabled)
  });
  return {
    role: admin ? 'admin' : 'user',
    ok: Boolean(admin),
    reason: admin ? '' : '当前微信不是管理员'
  };
};
