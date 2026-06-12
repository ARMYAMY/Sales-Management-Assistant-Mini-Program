const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { customerName, isCore } = event;

  if (!customerName) {
    return { code: 400, message: '缺少客户名称' };
  }

  try {
    // 更新该客户的所有拜访记录
    const updateRes = await db.collection('visits')
      .where({
        _openid: OPENID,
        customer_name: customerName
      })
      .update({
        data: {
          is_core_customer: isCore
        }
      });

    return {
      code: 0,
      message: 'success',
      data: {
        customerName,
        isCore,
        updated: updateRes.stats.updated || 0
      }
    };
  } catch (err) {
    console.error('更新失败:', err);
    return { code: 500, message: '更新失败: ' + err.message };
  }
};
