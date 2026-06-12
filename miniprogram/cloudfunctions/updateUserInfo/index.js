const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const updateData = event.data || {};

  // 不允许修改的字段
  delete updateData._id;
  delete updateData._openid;
  delete updateData.createdAt;

  const userRes = await db.collection('users')
    .where({ _openid: OPENID })
    .get();

  if (userRes.data.length === 0) {
    return { code: 401, message: '用户未登录' };
  }

  updateData.updatedAt = db.serverDate();

  await db.collection('users').doc(userRes.data[0]._id).update({
    data: updateData
  });

  return { code: 0, message: '更新成功' };
};