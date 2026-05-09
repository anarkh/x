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
  const { OPENID } = cloud.getWXContext();
  let result = { data: [] };
  try {
    result = await db.collection('admins')
      .where({
        openid: OPENID,
        enabled: true
      })
      .limit(1)
      .get();
  } catch (error) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }
  }
  const admin = result.data && result.data[0];
  return {
    openid: OPENID,
    role: admin && admin.role === 'admin' ? 'admin' : 'user'
  };
};
