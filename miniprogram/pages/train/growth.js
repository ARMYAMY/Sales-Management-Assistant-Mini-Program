// pages/train/growth.js - 成长曲线页
const app = getApp();

Page({
  data: {
    avgScore: 0,
    growthData: [],
    dimensionTrends: [
      { name: '话术匹配度', current: 28, max: 35, change: 3 },
      { name: '风格接近度', current: 18, max: 25, change: -2 },
      { name: '策略一致性', current: 16, max: 20, change: 1 },
      { name: '沟通有效性', current: 10, max: 20, change: 4 }
    ],
    totalSessions: 14,
    totalRounds: 86,
    bestScore: 85
  },

  onLoad() {
    this.loadGrowthData();
  },

  async loadGrowthData() {
    try {
      const result = await app.call('getTrainData', { action: 'growth' });
      if (result) {
        // 计算坐标位置
        const data = (result.data || []).map((item, i, arr) => ({
          ...item,
          x: arr.length > 1 ? (i / (arr.length - 1)) * 90 + 5 : 50,
          label: item.date ? item.date.slice(5) : `T${i + 1}`
        }));

        this.setData({
          growthData: data,
          avgScore: result.avgScore || 0,
          totalSessions: result.totalSessions || 0,
          totalRounds: result.totalRounds || 0,
          bestScore: result.bestScore || 0,
          dimensionTrends: result.dimensionTrends || this.data.dimensionTrends
        });
      }
    } catch (err) {
      console.error('加载成长数据失败:', err);
      // 使用默认数据
      this.setData({
        avgScore: 68,
        growthData: [
          { date: '06-05', score: 55, x: 5, label: '06-05' },
          { date: '06-06', score: 62, x: 20, label: '06-06' },
          { date: '06-07', score: 58, x: 35, label: '06-07' },
          { date: '06-08', score: 70, x: 50, label: '06-08' },
          { date: '06-09', score: 68, x: 65, label: '06-09' },
          { date: '06-10', score: 75, x: 80, label: '06-10' },
          { date: '06-11', score: 72, x: 95, label: '06-11' }
        ]
      });
    }
  }
});
