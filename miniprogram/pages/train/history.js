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
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
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
