const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { name } = event;

  // 查找或创建用户
  let userRes = await db.collection('users')
    .where({ _openid: OPENID })
    .get();

  let user;
  const now = db.serverDate();

  if (userRes.data.length === 0) {
    // 新用户：创建
    const newUser = {
      _openid: OPENID,
      name: name || '销售' + OPENID.slice(-4),
      role: 'sales',
      slug: '',
      team: '',
      avatar: '',
      joinDate: new Date().toISOString().split('T')[0],
      metrics: {
        totalVisits: 0,
        totalTrains: 0,
        customerCount: 0,
        avgScore: 0
      },
      createdAt: now,
      updatedAt: now
    };
    const addRes = await db.collection('users').add({ data: newUser });
    user = { ...newUser, _id: addRes._id };
  } else {
    // 老用户：直接返回
    user = userRes.data[0];
  }

  return {
    code: 0,
    message: '登录成功',
    data: {
      openid: OPENID,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        slug: user.slug,
        team: user.team,
        avatar: user.avatar,
        joinDate: user.joinDate
      }
    }
  };
};