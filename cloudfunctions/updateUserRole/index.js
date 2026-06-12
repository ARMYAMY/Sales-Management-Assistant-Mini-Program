const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { role } = event;

  if (!role || (role !== 'sales' && role !== 'manager')) {
    return { code: 400, message: 'role 值无效，应为 sales 或 manager' };
  }

  try {
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return { code: 401, message: '用户不存在' };
    }

    await db.collection('users')
      .where({ _openid: OPENID })
      .update({ data: { role } });

    return {
      code: 0,
      message: '角色更新成功',
      data: { role }
    };
  } catch (err) {
    console.error('更新角色失败:', err);
    return { code: 500, message: '更新角色失败' };
  }
};
