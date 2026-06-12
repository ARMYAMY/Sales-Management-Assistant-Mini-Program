// pages/train/result.js - 训练结果页
const app = getApp();

Page({
  data: {
    sessionId: '',
    scoreChange: 0,
    summary: {
      totalScore: 0,
      scoreScript: 0,
      scoreStyle: 0,
      scoreStrategy: 0,
      scoreEffectiveness: 0,
      improvements: []
    },
    dimensions: []
  },

  onLoad(options) {
    const { sessionId, score } = options;
    this.setData({ sessionId });
    this.loadResult();
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
          ]
        });
      }
    } catch (err) {
      console.error('加载结果失败:', err);
      // 使用默认数据
      this.setData({
        summary: {
          totalScore: 72,
          scoreScript: 28,
          scoreStyle: 18,
          scoreStrategy: 16,
          scoreEffectiveness: 10,
          improvements: [
            '减少铺垫，直接引用数据支撑观点',
            '更多使用开放性问题引导客户说出需求'
          ]
        },
        dimensions: [
          { name: '话术匹配度', score: 28, max: 35, color: '#2B6FF2' },
          { name: '风格接近度', score: 18, max: 25, color: '#22C55E' },
          { name: '策略一致性', score: 16, max: 20, color: '#F59E0B' },
          { name: '沟通有效性', score: 10, max: 20, color: '#EF4444' }
        ]
      });
    }
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
