const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { page = 1, page_size = 20, filter = 'all' } = event;

  let where = { _openid: OPENID };

  // 筛选条件
  if (filter === 'core') {
    where.is_core_customer = true;
  } else if (filter === 'week') {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    where.visit_date = _.gte(monday.toISOString()).and(_.lte(sunday.toISOString()));
  }

  // 查询总数
  const countRes = await db.collection('visits').where(where).count();

  // 查询列表
  const listRes = await db.collection('visits')
    .where(where)
    .orderBy('visit_date', 'desc')
    .skip((page - 1) * page_size)
    .limit(page_size)
    .get();

  return {
    code: 0,
    message: 'success',
    data: {
      list: listRes.data,
      total: countRes.total
    }
  };
};