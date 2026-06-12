const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { id, data = {} } = event;

  if (!id) {
    return { code: 400, message: '缺少拜访ID' };
  }

  // 查询原记录
  const detailRes = await db.collection('visits').doc(id).get();
  const visit = detailRes.data;

  if (!visit) {
    return { code: 404, message: '拜访记录不存在' };
  }

  if (visit._openid !== OPENID) {
    return { code: 403, message: '无权修改此记录' };
  }

  // 不允许修改的字段
  delete data._id;
  delete data._openid;
  delete data.createdAt;

  data.updatedAt = db.serverDate();

  await db.collection('visits').doc(id).update({ data });

  return { code: 0, message: '更新成功' };
};