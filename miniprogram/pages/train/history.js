// pages/train/history.js - 训练历史页
const app = getApp();

Page({
  data: {
    historyList: [],
    totalCount: 0,
    avgScore: 0,
    bestScore: 0
  },

  onLoad() {
    this.loadHistory();
  },

  onPullDownRefresh() {
    this.loadHistory().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadHistory() {
    try {
      const result = await app.call('getTrainData', { action: 'history' });
      if (result && result.list) {
        const list = result.list.map(item => ({
          ...item,
          createTime: item.createTime ? item.createTime.split('T')[0].slice(5) : '',
          scenarioIcon: this.getScenarioIcon(item.scenarioType)
        }));

        this.setData({
          historyList: list,
          totalCount: result.totalCount || list.length,
          avgScore: result.avgScore || 0,
          bestScore: result.bestScore || 0
        });
      }
    } catch (err) {
      console.error('加载训练历史失败:', err);
      this.loadDemoData();
    }
  },

  loadDemoData() {
    const list = [
      { _id: 't1', scenarioType: 'first_visit', scenarioName: '初次拜访', benchmarkName: 'Top Sales - 张强', createTime: '06-12', totalScore: 82 },
      { _id: 't2', scenarioType: 'needs_discovery', scenarioName: '需求挖掘', benchmarkName: 'Top Sales - 张强', createTime: '06-11', totalScore: 75 },
      { _id: 't3', scenarioType: 'price_negotiation', scenarioName: '价格谈判', benchmarkName: 'Top Sales - 李磊', createTime: '06-10', totalScore: 68 },
      { _id: 't4', scenarioType: 'objection_handling', scenarioName: '异议处理', benchmarkName: 'Top Sales - 张强', createTime: '06-09', totalScore: 90 },
      { _id: 't5', scenarioType: 'custom', scenarioName: '自定义场景', benchmarkName: 'Top Sales - 王芳', createTime: '06-08', totalScore: 78 },
      { _id: 't6', scenarioType: 'first_visit', scenarioName: '初次拜访', benchmarkName: 'Top Sales - 李磊', createTime: '06-07', totalScore: 65 },
      { _id: 't7', scenarioType: 'needs_discovery', scenarioName: '需求挖掘', benchmarkName: 'Top Sales - 张强', createTime: '06-06', totalScore: 88 },
      { _id: 't8', scenarioType: 'price_negotiation', scenarioName: '价格谈判', benchmarkName: 'Top Sales - 王芳', createTime: '06-05', totalScore: 72 }
    ].map(item => ({
      ...item,
      scenarioIcon: this.getScenarioIcon(item.scenarioType)
    }));

    const scores = list.map(i => i.totalScore);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = Math.max(...scores);

    this.setData({
      historyList: list,
      totalCount: list.length,
      avgScore: avg,
      bestScore: best
    });
  },

  getScenarioIcon(type) {
    const map = {
      first_visit: '💼',
      needs_discovery: '🔍',
      price_negotiation: '💰',
      objection_handling: '🚫',
      custom: '🎯'
    };
    return map[type] || '💬';
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/train/result?sessionId=${id}`
    });
  }
});
