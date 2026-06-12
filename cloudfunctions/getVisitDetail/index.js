const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { id } = event;

  if (!id || id === 'undefined' || id === 'null') {
    return { code: 400, message: '缺少拜访ID' };
  }

  let detailRes;
  try {
    detailRes = await db.collection('visits').doc(id).get();
  } catch (e) {
    return { code: 404, message: '拜访记录不存在' };
  }

  const visit = detailRes.data;

  if (!visit) {
    return { code: 404, message: '拜访记录不存在' };
  }

  // 权限检查：只能查看自己的记录
  if (visit._openid !== OPENID) {
    return { code: 403, message: '无权访问此记录' };
  }

  return {
    code: 0,
    message: 'success',
    data: visit
  };
};