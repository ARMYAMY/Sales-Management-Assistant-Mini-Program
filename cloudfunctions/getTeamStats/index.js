// 云函数：getTeamStats - 获取团队统计数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const funnelStages = [
  { name: '初步接触', key: 'contacted', color: '#3B82F6' },
  { name: '需求确认', key: 'qualified', color: '#6366F1' },
  { name: '方案报价', key: 'quoted', color: '#8B5CF6' },
  { name: '商务谈判', key: 'negotiating', color: '#EC4899' },
  { name: '签约成交', key: 'closed', color: '#10B981' }
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const range = normalizeRange(event || {});

    // 获取当前用户信息（确认是管理者）
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    const user = userRes.data[0];
    if (!user || user.role !== 'manager') {
      return { code: 403, message: '无权限访问' };
    }

    const teamId = user.teamId || 'default';

    // 获取团队成员
    const membersRes = await db.collection('users').where({
      teamId: teamId,
      role: _.neq('manager')
    }).get();
    const members = membersRes.data || [];
    const memberIds = members.map(m => m._openid).filter(Boolean);

    if (members.length === 0 || memberIds.length === 0) {
      return buildEmptyResult(members.length, range);
    }

    // 按前端所选时间范围查询拜访
    const visitsRes = await db.collection('visits').where({
      _openid: _.in(memberIds),
      createTime: _.gte(range.start).and(_.lte(range.end))
    }).get();
    const visits = visitsRes.data || [];

    // 拜访排行
    const visitCountMap = {};
    visits.forEach(v => {
      const id = v._openid;
      visitCountMap[id] = (visitCountMap[id] || 0) + 1;
    });

    const rankList = members.map(m => ({
      name: m.name || '未命名',
      visitCount: visitCountMap[m._openid] || 0,
      count: visitCountMap[m._openid] || 0,
      coreRatio: '0/0',
      avgScore: 0
    })).sort((a, b) => b.visitCount - a.visitCount).slice(0, 5);
    const rankMax = Math.max(...rankList.map(r => r.visitCount), 1);

    // 销售漏斗（简化：按拜访状态统计）
    const statusMap = { contacted: 0, qualified: 0, quoted: 0, negotiating: 0, closed: 0 };
    visits.forEach(v => {
      const status = v.status || 'contacted';
      if (statusMap[status] !== undefined) statusMap[status]++;
    });

    const totalContacts = statusMap.contacted || visits.length || 1;
    const funnel = funnelStages.map(s => {
      const count = statusMap[s.key] || 0;
      return {
        name: s.name,
        key: s.key,
        count,
        percent: Math.round((count / totalContacts) * 100),
        color: s.color
      };
    });

    // 趋势数据按维度生成：周=7天，月=周粒度，季度=月粒度
    const trendData = buildTrendData(range, visits);

    // 训练平均分：按同一时间范围查询
    const trainRes = await db.collection('train_sessions').where({
      _openid: _.in(memberIds),
      status: 'completed',
      createTime: _.gte(range.start).and(_.lte(range.end))
    }).get();
    const scores = (trainRes.data || []).map(t => t.totalScore || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // 风险预警（简单规则）
    const alerts = [];
    members.forEach(m => {
      const count = visitCountMap[m._openid] || 0;
      if (count === 0) {
        alerts.push({ id: m._openid, level: 'high', text: `${m.name || '某成员'}在${range.label}暂无拜访记录`, time: range.label });
      }
    });

    return {
      code: 0,
      range: {
        type: range.type,
        label: range.label,
        startDate: formatDate(range.start),
        endDate: formatDate(range.end)
      },
      stats: {
        visitCount: visits.length,
        visitChange: 0,
        dealAmount: 0,
        dealChange: 0,
        dealCount: statusMap.closed || 0,
        dealCountChange: 0,
        avgScore,
        scoreChange: 0
      },
      funnel,
      trendData,
      rankList,
      rankMax,
      alerts,
      overview: {
        teamSize: members.length,
        pendingAlerts: alerts.length,
        thisMonthVisits: visits.length
      }
    };

  } catch (err) {
    console.error('getTeamStats error:', err);
    return { code: 500, message: err.message };
  }
};

function normalizeRange(event) {
  const type = ['week', 'month', 'quarter'].includes(event.rangeType) ? event.rangeType : 'week';
  const start = parseDate(event.startDate) || getMonday(new Date());
  let end = parseDate(event.endDate);

  if (!end) {
    end = new Date(start);
    if (type === 'week') end.setDate(start.getDate() + 6);
    if (type === 'month') end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    if (type === 'quarter') end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
  }

  // 覆盖到当天23:59:59.999，避免当天数据漏掉
  const endInclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return {
    type,
    start: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    end: endInclusive,
    label: buildRangeLabel(type, start)
  };
}

function buildEmptyResult(teamSize, range) {
  return {
    code: 0,
    range: {
      type: range.type,
      label: range.label,
      startDate: formatDate(range.start),
      endDate: formatDate(range.end)
    },
    stats: { visitCount: 0, visitChange: 0, dealAmount: 0, dealChange: 0, dealCount: 0, dealCountChange: 0, avgScore: 0, scoreChange: 0 },
    funnel: funnelStages.map(s => ({ ...s, count: 0, percent: 0 })),
    trendData: buildTrendData(range, []),
    rankList: [],
    rankMax: 1,
    alerts: [],
    overview: { teamSize, pendingAlerts: 0, thisMonthVisits: 0 }
  };
}

function buildTrendData(range, visits) {
  if (range.type === 'month') return buildMonthWeekTrend(range, visits);
  if (range.type === 'quarter') return buildQuarterMonthTrend(range, visits);
  return buildWeekDayTrend(range, visits);
}

function buildWeekDayTrend(range, visits) {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const trend = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(range.start);
    dayStart.setDate(range.start.getDate() + i);
    const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
    const count = visits.filter(v => isInRange(toDate(v.createTime), dayStart, dayEnd)).length;
    trend.push({ date: formatDate(dayStart), label: labels[i], value: count });
  }
  return trend;
}

function buildMonthWeekTrend(range, visits) {
  const trend = [];
  let cursor = new Date(range.start);
  let index = 1;
  while (cursor <= range.end) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEndExclusive = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() + 1);
    const end = weekEnd < monthEndExclusive ? weekEnd : monthEndExclusive;
    const count = visits.filter(v => isInRange(toDate(v.createTime), weekStart, end)).length;
    trend.push({ date: `week${index}`, label: `第${index}周`, value: count });
    cursor = end;
    index++;
  }
  return trend;
}

function buildQuarterMonthTrend(range, visits) {
  const trend = [];
  for (let i = 0; i < 3; i++) {
    const monthStart = new Date(range.start.getFullYear(), range.start.getMonth() + i, 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const count = visits.filter(v => isInRange(toDate(v.createTime), monthStart, monthEnd)).length;
    trend.push({ date: `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`, label: `${monthStart.getMonth() + 1}月`, value: count });
  }
  return trend;
}

function isInRange(date, start, endExclusive) {
  return date && date >= start && date < endExclusive;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function buildRangeLabel(type, start) {
  if (type === 'month') return `${start.getFullYear()}年${start.getMonth() + 1}月`;
  if (type === 'quarter') return `${start.getFullYear()}年Q${Math.floor(start.getMonth() / 3) + 1}`;
  return `${start.getFullYear()}年第${getWeekNumber(start)}周`;
}
