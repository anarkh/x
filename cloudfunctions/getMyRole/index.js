const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const result = await db.collection('admins')
    .where({
      openid: OPENID,
      enabled: true
    })
    .limit(1)
    .get();
  const admin = result.data && result.data[0];
  return {
    openid: OPENID,
    role: admin && admin.role === 'admin' ? 'admin' : 'user'
  };
};
