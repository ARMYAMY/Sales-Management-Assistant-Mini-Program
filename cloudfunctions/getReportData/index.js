const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { type = 'daily', date = '' } = event;

  if (!date) {
    return { code: 400, message: '缺少日期参数' };
  }

  let start, end;
  let title = '';

  let startStr, endStr;

  if (type === 'daily') {
    // 日报：date 格式 YYYY-MM-DD
    startStr = date;
    endStr = date;
    title = formatDateCN(date);
  } else if (type === 'weekly') {
    // 周报：date 格式 YYYY-MM-DD（该周任意一天）
    const d = new Date(date + 'T00:00:00.000Z');
    const day = d.getDay() || 7; // 周日=7
    const mon = new Date(d);
    mon.setDate(d.getDate() - day + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    startStr = mon.toISOString().split('T')[0];
    endStr = sun.toISOString().split('T')[0];
    title = `${formatDateShort(mon)} ~ ${formatDateShort(sun)}`;
  } else {
    return { code: 400, message: '不支持的报告类型' };
  }

  // 查询该时间段的拜访记录（visit_date 是 YYYY-MM-DD 字符串）
  const visitsRes = await db.collection('visits')
    .where({
      _openid: OPENID,
      visit_date: _.gte(startStr).and(_.lte(endStr))
    })
    .orderBy('visit_date', 'asc')
    .get();

  const visits = visitsRes.data;

  // 统计
  const stats = {
    totalVisits: visits.length,
    customerSet: new Set(),
    coreVisits: 0,
    totalAmount: 0,
    purposeCount: {},
    resultCount: {},
    newCustomerCount: 0
  };

  visits.forEach(v => {
    stats.customerSet.add(v.customer_name);
    if (v.is_core_customer) stats.coreVisits++;
    stats.totalAmount += (v.amount || 0);

    const p = v.purpose || '其他';
    stats.purposeCount[p] = (stats.purposeCount[p] || 0) + 1;

    const r = v.result || '其他';
    stats.resultCount[r] = (stats.resultCount[r] || 0) + 1;

    if (p === '初次拜访') stats.newCustomerCount++;
  });

  // 格式化输出
  const customers = Array.from(stats.customerSet);

  return {
    code: 0,
    message: 'success',
    data: {
      type,
      date,
      title,
      period: {
        start: startStr,
        end: endStr
      },
      summary: {
        totalVisits: visits.length,
        customerCount: customers.length,
        coreVisits: stats.coreVisits,
        totalAmount: stats.totalAmount,
        newCustomerCount: stats.newCustomerCount
      },
      purposeDistribution: stats.purposeCount,
      resultDistribution: stats.resultCount,
      visits: visits.map(v => ({
        _id: v._id,
        customerName: v.customer_name,
        contactPerson: v.contact_person,
        visitDate: v.visit_date,
        visitTime: v.visit_time,
        purpose: v.purpose,
        result: v.result,
        amount: v.amount,
        location: v.location,
        nextStep: v.next_step,
        isCore: v.is_core_customer
      })),
      customerList: customers
    }
  };
};

function formatDateCN(dateStr) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  now.setDate(now.getDate() - 1);
  const yesterday = now.toISOString().split('T')[0];

  let prefix = '';
  if (dateStr === today) prefix = '今天';
  else if (dateStr === yesterday) prefix = '昨天';
  else {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    prefix = weekDays[d.getDay()];
  }
  return `${prefix} ${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateShort(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
