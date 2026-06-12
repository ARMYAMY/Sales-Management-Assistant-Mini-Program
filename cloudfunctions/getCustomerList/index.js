const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { keyword = '', filter = 'all', page = 1, pageSize = 20 } = event;

  // 基础查询条件
  let where = { _openid: OPENID };
  if (keyword) {
    where.customer_name = db.RegExp({ regexp: keyword, options: 'i' });
  }

  // 获取该用户的所有拜访记录（按时间倒序）
  const visitsRes = await db.collection('visits')
    .where(where)
    .field({
      customer_name: true,
      is_core_customer: true,
      visit_date: true,
      result: true,
      amount: true,
      contact_person: true
    })
    .orderBy('visit_date', 'desc')
    .limit(500)
    .get();

  // 按客户名聚合
  const customerMap = new Map();

  visitsRes.data.forEach(v => {
    const name = v.customer_name;
    if (!name) return;

    if (!customerMap.has(name)) {
      customerMap.set(name, {
        name: name,
        isCore: v.is_core_customer || false,
        visitCount: 0,
        lastVisitDate: '',
        lastResult: '',
        lastContact: v.contact_person || '',
        totalAmount: 0
      });
    }

    const c = customerMap.get(name);
    c.visitCount++;
    c.isCore = c.isCore || v.is_core_customer || false;
    c.totalAmount += (v.amount || 0);

    // 只记录最近的一次
    if (!c.lastVisitDate || (v.visit_date && v.visit_date > c.lastVisitDate)) {
      c.lastVisitDate = v.visit_date;
      c.lastResult = v.result || '';
      c.lastContact = v.contact_person || c.lastContact;
    }
  });

  let customers = Array.from(customerMap.values());

  // 筛选
  if (filter === 'core') {
    customers = customers.filter(c => c.isCore);
  }

  // 排序：核心客户优先，然后按最近拜访时间
  customers.sort((a, b) => {
    if (a.isCore !== b.isCore) return b.isCore ? 1 : -1;
    return (b.lastVisitDate || '') > (a.lastVisitDate || '') ? 1 : -1;
  });

  // 分页
  const total = customers.length;
  const start = (page - 1) * pageSize;
  customers = customers.slice(start, start + pageSize);

  // 格式化日期
  customers.forEach(c => {
    if (c.lastVisitDate) {
      c.lastVisitDateStr = formatDate(c.lastVisitDate);
    } else {
      c.lastVisitDateStr = '';
    }
  });

  return {
    code: 0,
    message: 'success',
    data: {
      list: customers,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total
    }
  };
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 86400000;

  if (diff < 1) return '今天';
  if (diff < 2) return '昨天';
  if (diff < 7) return Math.floor(diff) + '天前';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
