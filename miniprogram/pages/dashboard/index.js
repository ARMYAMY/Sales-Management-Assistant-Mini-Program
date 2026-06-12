// pages/dashboard/index.js - 数据看板（管理者端）
const app = getApp();

Page({
  data: {
    loading: true,
    teamName: '北京办事处团队',
    weekLabel: '',
    stats: {
      totalSales: 0,
      totalVisits: 0,
      coreCoverage: 0,
      avgScore: 0
    },
    trendData: [],
    trendType: 'visit', // visit | deal
    rankList: [],
    funnel: [],
    alerts: []
  },

  onLoad() {
    const now = new Date();
    const weekNum = this.getWeekNumber(now);
    this.setData({ weekLabel: `${now.getFullYear()}年 第${weekNum}周` });
    this.loadDashboardData();
  },

  onPullDownRefresh() {
    this.loadDashboardData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadDashboardData() {
    this.setData({ loading: true });
    try {
      const result = await app.call('getTeamStats', {});
      // 如果返回的数据全是空的，使用demo数据
      const hasData = result && (
        (result.stats && result.stats.visitCount > 0) ||
        (result.rankList && result.rankList.length > 0)
      );

      if (hasData) {
        this.setData({
          stats: {
            totalSales: result.overview?.teamSize || 0,
            totalVisits: result.stats?.visitCount || 0,
            coreCoverage: Math.round((result.stats?.dealCount || 0) / Math.max(result.stats?.visitCount || 1, 1) * 100),
            avgScore: result.stats?.avgScore || 0
          },
          trendData: result.trendData || [],
          rankList: result.rankList || [],
          funnel: result.funnel || [],
          alerts: result.alerts || []
        });
      } else {
        // 数据为空也加载demo
        this.loadDemoData();
      }
    } catch (err) {
      console.error('加载看板数据失败:', err);
      this.loadDemoData();
    }
    this.setData({ loading: false });
  },

  loadDemoData() {
    const demoTrend = [
      { date: '周一', label: '周一', value: 18 },
      { date: '周二', label: '周二', value: 15 },
      { date: '周三', label: '周三', value: 22 },
      { date: '周四', label: '周四', value: 14 },
      { date: '周五', label: '周五', value: 12 },
      { date: '周六', label: '周六', value: 6 },
      { date: '周日', label: '周日', value: 0 }
    ];

    const demoRank = [
      { name: '张三', visitCount: 12, coreRatio: '10/10', avgScore: 85 },
      { name: '李四', visitCount: 9, coreRatio: '8/10', avgScore: 78 },
      { name: '王五', visitCount: 7, coreRatio: '6/10', avgScore: 72 },
      { name: '赵六', visitCount: 5, coreRatio: '5/10', avgScore: 65 },
      { name: '钱七', visitCount: 4, coreRatio: '3/10', avgScore: 60 }
    ];

    const demoFunnel = [
      { name: '初次拜访', count: 42, percent: 100, color: '#3B82F6' },
      { name: '需求洽谈', count: 25, percent: 60, color: '#6366F1' },
      { name: '方案演示', count: 12, percent: 29, color: '#8B5CF6' },
      { name: '商务谈判', count: 5, percent: 12, color: '#EC4899' },
      { name: '合同签订', count: 3, percent: 7, color: '#10B981' }
    ];

    const demoAlerts = [
      { id: '1', level: 'high', text: '赵六 · A公司 32天未拜访', time: '本周' },
      { id: '2', level: 'medium', text: '钱七 · 连续2周达标<80%', time: '本周' },
      { id: '3', level: 'medium', text: '孙八 · 训练分持续下降', time: '本周' }
    ];

    this.setData({
      stats: { totalSales: 15, totalVisits: 87, coreCoverage: 78, avgScore: 72 },
      trendData: demoTrend,
      rankList: demoRank,
      funnel: demoFunnel,
      alerts: demoAlerts
    });
  },

  switchTrend(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ trendType: type });
  },

  goSalesDetail(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({ url: `/pages/dashboard/sales-detail?name=${name}` });
  },

  goAllAlerts() {
    wx.navigateTo({ url: '/pages/alerts/index' });
  },

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  // 计算趋势最大值用于柱状图比例
  getTrendMax() {
    const values = this.data.trendData.map(t => t.value);
    const max = Math.max(...values, 1);
    return Math.ceil(max / 5) * 5;
  }
});
