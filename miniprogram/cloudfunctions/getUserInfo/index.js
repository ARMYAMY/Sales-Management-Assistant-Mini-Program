const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  const userRes = await db.collection('users')
    .where({ _openid: OPENID })
    .get();

  if (userRes.data.length === 0) {
    return { code: 401, message: '用户未登录' };
  }

  const user = userRes.data[0];
  return {
    code: 0,
    message: 'success',
    data: {
      _id: user._id,
      name: user.name,
      role: user.role,
      slug: user.slug,
      team: user.team,
      avatar: user.avatar,
      joinDate: user.joinDate
    }
  };
};