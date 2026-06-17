// pages/train/result.js - 训练结果页
const app = getApp();

Page({
  data: {
    sessionId: '',
    scoreChange: 0,
    activeTab: 'score', // score | chat
    summary: {
      totalScore: 0,
      scoreScript: 0,
      scoreStyle: 0,
      scoreStrategy: 0,
      scoreEffectiveness: 0,
      improvements: []
    },
    dimensions: [],
    chatHistory: []
  },

  onLoad(options) {
    const { sessionId, score } = options;
    this.setData({ sessionId });
    this.loadResult();
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  async loadResult() {
    try {
      const result = await app.call('getTrainData', {
        action: 'result',
        sessionId: this.data.sessionId
      });

      if (result && result.summary) {
        const s = result.summary;
        this.setData({
          summary: s,
          scoreChange: result.scoreChange || 0,
          dimensions: [
            { name: '话术匹配度', score: s.scoreScript || 0, max: 35, color: '#2B6FF2' },
            { name: '风格接近度', score: s.scoreStyle || 0, max: 25, color: '#22C55E' },
            { name: '策略一致性', score: s.scoreStrategy || 0, max: 20, color: '#F59E0B' },
            { name: '沟通有效性', score: s.scoreEffectiveness || 0, max: 20, color: '#EF4444' }
          ],
          chatHistory: result.chatHistory || this.getDemoChatHistory()
        });
      }
    } catch (err) {
      console.error('加载结果失败:', err);
      this.setData({
        summary: {
          totalScore: 72,
          scoreScript: 28,
          scoreStyle: 18,
          scoreStrategy: 16,
          scoreEffectiveness: 10,
          improvements: [
            '客户已明确提出了解核心差异和可量化价值，销售应立即围绕产品优势、竞品对比、业务收益和量化指标进行回应，而不是仅停留在零散。',
            '初次拜访应先简短确认客户关注点，再用结构化话术展开，例如"我们相较竞品主要有三点差异：成本降低、效率提升、交付稳定性"，并可用具体数据说明价值。',
            '需要体现顾问式销售思路，通过提问了解客户已考察竞品的重点、采购标准、预算周期和当前痛点，再针对性匹配产品价值。',
            '表达风格应更专业、主动、可信，避免过程回避造成准备不足、价值感弱和客户兴趣流失。'
          ]
        },
        dimensions: [
          { name: '话术匹配度', score: 28, max: 35, color: '#2B6FF2' },
          { name: '风格接近度', score: 18, max: 25, color: '#22C55E' },
          { name: '策略一致性', score: 16, max: 20, color: '#F59E0B' },
          { name: '沟通有效性', score: 10, max: 20, color: '#EF4444' }
        ],
        chatHistory: this.getDemoChatHistory()
      });
    }
  },

  getDemoChatHistory() {
    return [
      {
        role: 'ai',
        name: 'AI客户',
        avatar: '客',
        content: '你好，我是王总，我们公司最近在考察几家供应商，你们产品和XX竞品相比有什么优势？',
        time: '10:02'
      },
      {
        role: 'user',
        name: '我',
        avatar: '我',
        content: '王总您好！我们产品在稳定性上做了很多优化，客户反馈很好。',
        time: '10:02',
        highlight: false
      },
      {
        role: 'ai',
        name: 'AI客户',
        avatar: '客',
        content: '具体能量化说明一下吗？我们采购需要有数据支撑。',
        time: '10:03'
      },
      {
        role: 'user',
        name: '我',
        avatar: '我',
        content: '我们比竞品稳定很多，之前有客户用了都说好。',
        time: '10:03',
        highlight: true,
        highlightNote: '⚠ 缺少量化数据，建议改为：相比竞品，我们的平均故障间隔时间提升42%，部署周期缩短30%。'
      },
      {
        role: 'ai',
        name: 'AI客户',
        avatar: '客',
        content: '好的，那你们的价格体系是怎么样的？有没有阶梯报价？',
        time: '10:05'
      },
      {
        role: 'user',
        name: '我',
        avatar: '我',
        content: '我们有标准版和企业版，企业版功能更完整，大客户还可以谈年框价格，您这边规模大概多少？',
        time: '10:05',
        highlight: false
      },
      {
        role: 'ai',
        name: 'AI客户',
        avatar: '客',
        content: '大概50个节点左右。那服务支持这块呢，出问题响应多快？',
        time: '10:06'
      },
      {
        role: 'user',
        name: '我',
        avatar: '我',
        content: '我们7×24小时支持，核心客户4小时到现场，您放心。',
        time: '10:07',
        highlight: false
      },
      {
        role: 'ai',
        name: 'AI客户',
        avatar: '客',
        content: '好，我了解了。我还要对比一下其他家，后续再联系你。',
        time: '10:08'
      },
      {
        role: 'user',
        name: '我',
        avatar: '我',
        content: '好的王总，方便的话我这周给您发一份详细对比报告，您看周几合适？',
        time: '10:08',
        highlight: false
      }
    ];
  },

  // 再来一局
  restartTraining() {
    wx.redirectTo({ url: '/pages/train/index' });
  },

  // 返回首页
  goHome() {
    wx.switchTab({ url: '/pages/home/sales' });
  }
});

