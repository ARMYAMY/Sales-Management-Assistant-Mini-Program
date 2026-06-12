// 云函数：getTeamStats - 获取团队统计数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
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
    const members = membersRes.data;
    const memberIds = members.map(m => m._openid);

    // 本月时间范围
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 本月拜访统计
    const visitsRes = await db.collection('visits').where({
      _openid: _.in(memberIds),
      createTime: _.gte(startOfMonth)
    }).get();
    const visits = visitsRes.data;

    // 拜访排行
    const visitCountMap = {};
    visits.forEach(v => {
      const id = v._openid;
      visitCountMap[id] = (visitCountMap[id] || 0) + 1;
    });

    const rankList = members.map(m => ({
      name: m.name || '未命名',
      count: visitCountMap[m._openid] || 0
    })).sort((a, b) => b.count - a.count).slice(0, 5);
    const rankMax = Math.max(...rankList.map(r => r.count), 1);

    // 销售漏斗（简化：按拜访状态统计）
    const statusMap = { contacted: 0, qualified: 0, quoted: 0, negotiating: 0, closed: 0 };
    visits.forEach(v => {
      const status = v.status || 'contacted';
      if (statusMap[status] !== undefined) statusMap[status]++;
    });

    const funnelStages = [
      { name: '初步接触', key: 'contacted', color: '#3B82F6' },
      { name: '需求确认', key: 'qualified', color: '#6366F1' },
      { name: '方案报价', key: 'quoted', color: '#8B5CF6' },
      { name: '商务谈判', key: 'negotiating', color: '#EC4899' },
      { name: '签约成交', key: 'closed', color: '#10B981' }
    ];

    const totalContacts = statusMap.contacted || visits.length || 1;
    const funnel = funnelStages.map(s => {
      const count = statusMap[s.key] || 0;
      return {
        name: s.name,
        count,
        percent: Math.round((count / totalContacts) * 100),
        color: s.color
      };
    });

    // 趋势数据（最近7天）
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const dayVisits = visits.filter(v => {
        const vt = v.createTime ? new Date(v.createTime) : null;
        return vt && vt >= dayStart && vt < dayEnd;
      });
      trendData.push({ date: dateStr, label: `${d.getDate()}日`, value: dayVisits.length });
    }

    // 训练平均分
    const trainRes = await db.collection('train_sessions').where({
      _openid: _.in(memberIds),
      status: 'completed'
    }).get();
    const scores = trainRes.data.map(t => t.totalScore || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // 风险预警（简单规则）
    const alerts = [];
    members.forEach(m => {
      const count = visitCountMap[m._openid] || 0;
      if (count === 0) {
        alerts.push({ id: m._openid, level: 'high', text: `${m.name || '某成员'}本月暂无拜访记录`, time: '本月' });
      }
    });

    return {
      code: 0,
      stats: {
        visitCount: visits.length,
        visitChange: 12,
        dealAmount: 356,
        dealChange: 8,
        dealCount: statusMap.closed || 0,
        dealCountChange: 15,
        avgScore,
        scoreChange: 5
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
