// 云函数：getTeamMembers - 获取团队成员列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 获取当前用户信息
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

    // 获取本月拜访统计
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const visitsRes = await db.collection('visits').where({
      _openid: _.in(memberIds),
      createTime: _.gte(startOfMonth)
    }).get();
    const visits = visitsRes.data;

    const visitMap = {};
    const dealMap = {};
    visits.forEach(v => {
      const id = v._openid;
      visitMap[id] = (visitMap[id] || 0) + 1;
      if (v.status === 'closed') {
        dealMap[id] = (dealMap[id] || 0) + 1;
      }
    });

    // 获取训练平均分
    const trainRes = await db.collection('train_sessions').where({
      _openid: _.in(memberIds),
      status: 'completed'
    }).get();

    const trainMap = {};
    trainRes.data.forEach(t => {
      const id = t._openid;
      if (!trainMap[id]) trainMap[id] = { total: 0, count: 0 };
      trainMap[id].total += t.totalScore || 0;
      trainMap[id].count++;
    });

    // 组装成员数据
    const enrichedMembers = members.map(m => {
      const vCount = visitMap[m._openid] || 0;
      const dCount = dealMap[m._openid] || 0;
      const tData = trainMap[m._openid];
      const avgScore = tData ? Math.round(tData.total / tData.count) : 0;

      // 状态判断
      let status = 'normal';
      if (avgScore >= 80 && vCount >= 20) status = 'high';
      else if (vCount < 5 || avgScore < 60) status = 'warning';

      return {
        _id: m._id,
        name: m.name || '未命名',
        status,
        visitCount: vCount,
        dealCount: dCount,
        avgScore,
        lastActivity: m.lastActivity || ''
      };
    });

    // 团队概览
    const total = enrichedMembers.length;
    const avgScore = total > 0
      ? Math.round(enrichedMembers.reduce((s, m) => s + m.avgScore, 0) / total)
      : 0;
    const avgVisits = total > 0
      ? Math.round(enrichedMembers.reduce((s, m) => s + m.visitCount, 0) / total)
      : 0;

    return {
      code: 0,
      members: enrichedMembers,
      overview: { total, avgScore, avgVisits }
    };

  } catch (err) {
    console.error('getTeamMembers error:', err);
    return { code: 500, message: err.message };
  }
};
