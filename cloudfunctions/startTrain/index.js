// 云函数：startTrain - 开始AI训练会话
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 场景模板
const SCENARIO_TEMPLATES = {
  first_visit: {
    customerName: '李总',
    title: '采购总监',
    company: 'XX科技',
    background: '初次接触，对方对竞品已有了解',
    goal: '建立信任，了解对方真实需求',
    opening: '你好，我是XX科技的采购负责人，听说你们的产品不错，想了解一下。'
  },
  needs_discovery: {
    customerName: '王经理',
    title: 'IT负责人',
    company: 'YY集团',
    background: '已有初步接触，需要深入了解痛点',
    goal: '挖掘深层需求，找到切入点',
    opening: '上次聊完后，我回去整理了一些思路，想再跟您确认一下。'
  },
  price_negotiation: {
    customerName: '张总',
    title: '采购经理',
    company: 'ZZ医疗',
    background: '对竞品价格满意，但对我们售后服务有好感',
    goal: '拿到更好的价格',
    opening: '你们的报价比A公司高了15%，这个差距太大了。'
  },
  objection_handling: {
    customerName: '陈总监',
    title: '运营总监',
    company: 'WW物流',
    background: '之前用过类似产品，效果不太好',
    goal: '消除顾虑，重建信任',
    opening: '说实话，我们之前用过类似方案，投入很大但效果一般。'
  }
};

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { scenarioType, scenarioName, benchmarkSlug, difficulty, customProfile } = event;

  try {
    // 生成场景设定
    let scenario;
    if (scenarioType === 'custom' && customProfile) {
      scenario = {
        customerName: customProfile.customer.split(' ')[0] || '客户',
        title: customProfile.customer || '负责人',
        company: customProfile.industry || '某公司',
        background: `${customProfile.industry}行业，${customProfile.goal}`,
        goal: customProfile.goal,
        opening: `你好，我是${customProfile.customer}。关于${customProfile.goal}的事情，想再聊聊。`,
        description: `你是${customProfile.customer}（${customProfile.industry}）。你的目标是${customProfile.goal}。`
      };
    } else {
      scenario = SCENARIO_TEMPLATES[scenarioType] || SCENARIO_TEMPLATES.first_visit;
      scenario.description = `你是${scenario.company}的${scenario.title}${scenario.customerName}。${scenario.background}。本次会面的目标是${scenario.goal}。`;
    }

    // 创建会话记录
    const sessionData = {
      _openid: OPENID,
      scenarioType: scenarioType || 'first_visit',
      scenarioName: scenarioName || '初次拜访',
      benchmarkSlug: benchmarkSlug || 'topsales.zhang-san',
      benchmarkName: '张三',
      difficulty: difficulty || '普通',
      scenario: scenario,
      status: 'active',
      messages: [
        { role: 'ai', content: scenario.opening, timestamp: new Date().toISOString() }
      ],
      rounds: 1,
      scores: [],
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const res = await db.collection('train_sessions').add({ data: sessionData });

    return {
      code: 0,
      message: 'success',
      data: {
        sessionId: res._id,
        scenario: scenario
      }
    };
  } catch (err) {
    console.error('startTrain error:', err);
    return { code: 500, message: '开始训练失败: ' + err.message };
  }
};
