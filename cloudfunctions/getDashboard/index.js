const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: OPENID })
    .get();

  if (userRes.data.length === 0) {
    return { code: 401, message: '用户未登录' };
  }

  const user = userRes.data[0];

  // 计算本周起止时间
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // 1. 本周拜访数
  const visitCountRes = await db.collection('visits')
    .where({
      _openid: OPENID,
      visit_date: _.gte(monday.toISOString()).and(_.lte(sunday.toISOString()))
    })
    .count();

  const visitCount = visitCountRes.total;

  // 2. 核心客户拜访数
  const coreCountRes = await db.collection('visits')
    .where({
      _openid: OPENID,
      is_core_customer: true,
      visit_date: _.gte(monday.toISOString()).and(_.lte(sunday.toISOString()))
    })
    .count();

  // 3. 获取系统配置
  const configRes = await db.collection('configs')
    .where({ key: 'weekly_visit_target' })
    .get();
  const visitTarget = configRes.data.length > 0 ? configRes.data[0].value : 5;

  // 4. 核心客户总数（去重）
  const coreCustomersRes = await db.collection('visits')
    .where({
      _openid: OPENID,
      is_core_customer: true
    })
    .get();
  const coreCustomerNames = [...new Set(coreCustomersRes.data.map(v => v.customer_name))];
  const coreTotal = coreCustomerNames.length;

  // 5. 最近拜访
  const recentVisitsRes = await db.collection('visits')
    .where({ _openid: OPENID })
    .orderBy('visit_date', 'desc')
    .limit(5)
    .get();

  // 6. 构建待办
  const todos = [];
  if (visitCount < visitTarget) {
    todos.push({
      id: 'todo_visit',
      title: `本周还需拜访 ${visitTarget - visitCount} 家客户`,
      action: 'visit'
    });
  }

  // 7. 计算训练分（简化：基于拜访量）
  const trainScore = Math.min(100, Math.round(visitCount / visitTarget * 100));
  const scoreTrend = trainScore - (user.metrics?.avgScore || 0);

  // 8. 达标周数（简化：连续达标周数，实际应根据历史数据计算）
  const complianceWeeks = visitCount >= visitTarget ? 1 : 0;

  return {
    code: 0,
    message: 'success',
    data: {
      visitCount,
      visitTarget,
      coreDone: coreCountRes.total,
      coreTotal,
      trainScore,
      scoreTrend: Math.round(scoreTrend),
      complianceWeeks,
      todos,
      recentVisits: recentVisitsRes.data.map(v => ({
        id: v._id,
        customerName: v.customer_name,
        visitDate: v.visit_date,
        stage: v.stage,
        result: v.result
      })),
      totalVisits: user.metrics?.totalVisits || 0,
      totalTrains: user.metrics?.totalTrains || 0,
      customerCount: coreTotal,
      avgScore: user.metrics?.avgScore || 0,
      benchmarkName: ''
    }
  };
};