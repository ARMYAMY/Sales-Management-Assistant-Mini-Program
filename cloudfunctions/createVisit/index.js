const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const data = event.data || {};

  // 必填校验
  const required = ['customer_name', 'contact_person', 'visit_date', 'location', 'stage', 'result'];
  for (const field of required) {
    if (!data[field]) {
      return { code: 400, message: `缺少必填字段: ${field}` };
    }
  }

  const now = db.serverDate();

  // 构建拜访记录
  const visitData = {
    _openid: OPENID,
    customer_name: data.customer_name,
    contact_person: data.contact_person,
    contact_phone: data.contact_phone || '',
    visit_date: data.visit_date,
    location: data.location,
    stage: data.stage,
    intent: data.intent || '',
    result: data.result,
    background: data.background || '',
    content: data.content || '',
    next_step: data.next_step || '',
    amount: data.amount || null,
    amount_sensitive: data.amount_sensitive || false,
    competitor_info: data.competitor_info || '',
    is_core_customer: data.is_core_customer || false,
    status: 'completed',
    createdAt: now,
    updatedAt: now
  };

  const addRes = await db.collection('visits').add({ data: visitData });

  // 更新用户总拜访数
  const userRes = await db.collection('users')
    .where({ _openid: OPENID })
    .get();

  if (userRes.data.length > 0) {
    const user = userRes.data[0];
    const totalVisits = (user.metrics?.totalVisits || 0) + 1;
    await db.collection('users').doc(user._id).update({
      data: {
        'metrics.totalVisits': totalVisits,
        updatedAt: now
      }
    });
  }

  return {
    code: 0,
    message: '创建成功',
    data: { id: addRes._id }
  };
};