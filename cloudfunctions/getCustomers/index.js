const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { keyword = '', limit = 10 } = event;

  let where = { _openid: OPENID };

  if (keyword) {
    where.customer_name = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  // 从拜访记录中提取客户名（去重）
  const visitsRes = await db.collection('visits')
    .where(where)
    .field({ customer_name: true, is_core_customer: true })
    .orderBy('visit_date', 'desc')
    .limit(100)
    .get();

  // 去重并标记核心客户
  const customerMap = new Map();
  visitsRes.data.forEach(v => {
    if (!customerMap.has(v.customer_name)) {
      customerMap.set(v.customer_name, {
        name: v.customer_name,
        isCore: v.is_core_customer || false
      });
    }
  });

  let customers = Array.from(customerMap.values());

  // 按关键词过滤
  if (keyword) {
    customers = customers.filter(c => c.name.includes(keyword));
  }

  // 限制数量
  customers = customers.slice(0, limit);

  return {
    code: 0,
    message: 'success',
    data: customers
  };
};