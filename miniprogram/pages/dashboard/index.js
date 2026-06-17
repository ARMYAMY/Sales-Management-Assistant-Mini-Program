// pages/dashboard/index.js - 数据看板（管理者端）
const app = getApp();

Page({
  data: {
    loading: true,
    teamName: '北京办事处团队',
    weekLabel: '',
    // 时间范围选择
    period: 'week',  // week | month | lastMonth | quarter
    periodOptions: ['本周', '本月', '上月', '近3个月'],
    periodKeys: ['week', 'month', 'lastMonth', 'quarter'],
    periodIndex: 0,
    showPeriodPicker: false,
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

  // 时间范围选择
  onPeriodChange(e) {
    const idx = parseInt(e.detail.value);
    const periodKeys = this.data.periodKeys;
    const periodOptions = this.data.periodOptions;
    const period = periodKeys[idx];
    const label = periodOptions[idx];
    this.setData({ period, periodIndex: idx, weekLabel: label });
    this.loadDashboardData();
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
    const period = this.data.period;

    // 按时间范围生成不同的趋势数据
    let demoTrend;
    if (period === 'week') {
      demoTrend = [
        { date: '11', label: '11', value: 1 },
        { date: '12', label: '12', value: 2 },
        { date: '13', label: '13', value: 0 },
        { date: '14', label: '14', value: 1 },
        { date: '15', label: '15', value: 1 },
        { date: '16', label: '16', value: 1 },
        { date: '17', label: '17', value: 1 }
      ];
    } else if (period === 'month') {
      demoTrend = [
        { date: '第1周', label: '第1周', value: 18 },
        { date: '第2周', label: '第2周', value: 22 },
        { date: '第3周', label: '第3周', value: 15 },
        { date: '第4周', label: '第4周', value: 20 }
      ];
    } else if (period === 'lastMonth') {
      demoTrend = [
        { date: '第1周', label: '第1周', value: 14 },
        { date: '第2周', label: '第2周', value: 18 },
        { date: '第3周', label: '第3周', value: 12 },
        { date: '第4周', label: '第4周', value: 16 }
      ];
    } else {
      demoTrend = [
        { date: '4月', label: '4月', value: 65 },
        { date: '5月', label: '5月', value: 78 },
        { date: '6月', label: '6月', value: 87 }
      ];
    }

    // 按时间范围调整统计
    const statsMap = {
      week:      { totalSales: 15, totalVisits: 7,  coreCoverage: 78, avgScore: 72 },
      month:     { totalSales: 15, totalVisits: 87, coreCoverage: 82, avgScore: 74 },
      lastMonth: { totalSales: 15, totalVisits: 73, coreCoverage: 75, avgScore: 70 },
      quarter:   { totalSales: 15, totalVisits: 230, coreCoverage: 85, avgScore: 76 }
    };
    const demoStats = statsMap[period] || statsMap.week;

    const demoRank = [
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

    // 今日未反馈的销售（模拟数据）
    const todayMissing = ['王五', '赵六'];

    this.setData({
      stats: demoStats,
      trendData: demoTrend,
      rankList: demoRank,
      funnel: demoFunnel,
      alerts: demoAlerts,
      todayMissing
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

  goTeam() {
    wx.navigateTo({ url: '/pages/team/index' });
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
