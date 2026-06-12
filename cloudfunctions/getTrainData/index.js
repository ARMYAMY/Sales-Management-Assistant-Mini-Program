// 云函数：getTrainData - 获取训练相关数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;

  try {
    switch (action) {
      case 'session':
        return await getSession(event.sessionId, OPENID);
      case 'result':
        return await getResult(event.sessionId, OPENID);
      case 'history':
        return await getHistory(OPENID);
      case 'growth':
        return await getGrowth(OPENID);
      case 'benchmarks':
        return await getBenchmarks();
      default:
        return { code: 400, message: '未知的 action: ' + action };
    }
  } catch (err) {
    console.error('getTrainData error:', err);
    return { code: 500, message: err.message };
  }
};

// 获取会话
async function getSession(sessionId, openid) {
  const res = await db.collection('train_sessions').doc(sessionId).get();
  const session = res.data;
  if (session._openid !== openid) {
    return { code: 403, message: '无权访问此会话' };
  }
  return {
    code: 0,
    data: {
      messages: session.messages || [],
      scenario: session.scenario,
      benchmarkName: session.benchmarkName
    }
  };
}

// 获取结果
async function getResult(sessionId, openid) {
  const res = await db.collection('train_sessions').doc(sessionId).get();
  const session = res.data;
  if (session._openid !== openid) {
    return { code: 403, message: '无权访问' };
  }
  return {
    code: 0,
    data: {
      summary: session.summary || null,
      scoreChange: session.scoreChange || 0
    }
  };
}

// 获取历史
async function getHistory(openid) {
  const res = await db.collection('train_sessions')
    .where({ _openid: openid, status: 'completed' })
    .orderBy('createTime', 'desc')
    .limit(50)
    .get();

  const list = res.data.map(item => ({
    _id: item._id,
    scenarioType: item.scenarioType,
    scenarioName: item.scenarioName,
    benchmarkName: item.benchmarkName,
    totalScore: item.summary?.totalScore || 0,
    createTime: item.createTime
  }));

  const scores = list.map(i => i.totalScore).filter(s => s > 0);
  return {
    code: 0,
    data: {
      list,
      totalCount: list.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      bestScore: scores.length > 0 ? Math.max(...scores) : 0
    }
  };
}

// 获取成长数据
async function getGrowth(openid) {
  const res = await db.collection('train_sessions')
    .where({ _openid: openid, status: 'completed' })
    .orderBy('createTime', 'desc')
    .limit(30)
    .get();

  const sessions = res.data.reverse();
  const data = sessions.map(s => ({
    date: s.createTime ? s.createTime.split('T')[0] : '',
    score: s.summary?.totalScore || 0
  }));

  const scores = data.map(d => d.score).filter(s => s > 0);
  return {
    code: 0,
    data: {
      data,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      totalSessions: sessions.length,
      totalRounds: sessions.reduce((sum, s) => sum + (s.rounds || 0), 0),
      bestScore: scores.length > 0 ? Math.max(...scores) : 0
    }
  };
}

// 获取对标列表
async function getBenchmarks() {
  // 从数据库或返回默认列表
  const list = [
    { slug: 'topsales.zhang-san', name: '张三', avatar: '👨', methodology: '大客户销售方法论', version: 3, recordCount: 156, score: 78, tags: ['制药/器械', '中等狼性'], isDefault: true },
    { slug: 'topsales.li-si', name: '李四', avatar: '👩', methodology: '渠道拓展方法论', version: 2, recordCount: 98, score: 82, tags: ['耗材/流通', '高狼性'], isDefault: false },
    { slug: 'topsales.wang-wu', name: '王五', avatar: '👨', methodology: 'SaaS AE 方法论', version: 1, recordCount: 56, score: 65, tags: ['软件/SaaS', '咨询型'], isDefault: false }
  ];
  return { code: 0, data: { list } };
}
