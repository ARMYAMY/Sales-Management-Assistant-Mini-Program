// pages/dashboard/index.js - 数据看板（管理者端）
const app = getApp();

Page({
  data: {
    loading: true,
    teamName: '北京办事处团队',

    // 时间筛选：按周 / 按月 / 按季度 + 具体周期
    timeModeOptions: ['按周', '按月', '按季度'],
    timeModeKeys: ['week', 'month', 'quarter'],
    timeModeIndex: 0,
    timeRangeOptions: [],
    timeRangeIndex: 0,
    currentRange: {
      type: 'week',
      label: '',
      startDate: '',
      endDate: ''
    },
    currentPeriodLabel: '',

    stats: {
      totalSales: 0,
      totalVisits: 0,
      coreCoverage: 0,
      avgScore: 0
    },
    trendData: [],
    trendMax: 25,
    trendType: 'visit', // visit | deal
    rankList: [],
    funnel: [],
    alerts: [],
    todayMissing: []
  },

  onLoad() {
    this.initTimeRange();
    this.loadDashboardData();
  },

  onPullDownRefresh() {
    this.loadDashboardData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 初始化时间范围：默认按周 + 当前自然周
  initTimeRange() {
    const ranges = this.generateRanges('week');
    const currentRange = ranges[0];
    this.setData({
      timeModeIndex: 0,
      timeRangeOptions: ranges,
      timeRangeIndex: 0,
      currentRange,
      currentPeriodLabel: currentRange.label
    });
  },

  // 切换统计维度：按周 / 按月 / 按季度
  onTimeModeChange(e) {
    const timeModeIndex = Number(e.detail.value || 0);
    const mode = this.data.timeModeKeys[timeModeIndex] || 'week';
    const ranges = this.generateRanges(mode);
    const currentRange = ranges[0];

    this.setData({
      timeModeIndex,
      timeRangeOptions: ranges,
      timeRangeIndex: 0,
      currentRange,
      currentPeriodLabel: currentRange.label
    });
    this.loadDashboardData();
  },

  // 切换具体周期：第几周 / 第几月 / 第几季度
  onTimeRangeChange(e) {
    const timeRangeIndex = Number(e.detail.value || 0);
    const currentRange = this.data.timeRangeOptions[timeRangeIndex] || this.data.timeRangeOptions[0];
    if (!currentRange) return;

    this.setData({
      timeRangeIndex,
      currentRange,
      currentPeriodLabel: currentRange.label
    });
    this.loadDashboardData();
  },

  async loadDashboardData() {
    const { currentRange } = this.data;
    this.setData({ loading: true });

    let result = null;
    try {
      result = await app.call('getTeamStats', {
        rangeType: currentRange.type,
        startDate: currentRange.startDate,
        endDate: currentRange.endDate
      });
    } catch (err) {
      console.warn('加载看板数据失败，使用演示数据:', err);
      this.loadDemoData();
      this.setData({ loading: false });
      return;
    }

    // 服务端业务错误（code !== 0）或数据为空时，都用 demo
    if (!result || result.code !== 0) {
      console.warn('getTeamStats 返回异常:', result);
      this.loadDemoData();
      this.setData({ loading: false });
      return;
    }

    const hasData = (result.stats && result.stats.visitCount > 0) ||
                    (result.rankList && result.rankList.length > 0);
    if (hasData) {
      const trendData = result.trendData || [];
      this.setData({
        stats: {
          totalSales: result.overview?.teamSize || 0,
          totalVisits: result.stats?.visitCount || 0,
          coreCoverage: Math.round((result.stats?.dealCount || 0) / Math.max(result.stats?.visitCount || 1, 1) * 100),
          avgScore: result.stats?.avgScore || 0
        },
        trendData,
        trendMax: this.calcTrendMax(trendData),
        rankList: this.normalizeRankList(result.rankList || []),
        funnel: result.funnel || [],
        alerts: result.alerts || [],
        todayMissing: result.todayMissing || []
      });
    } else {
      this.loadDemoData();
    }
    this.setData({ loading: false });
  },

  loadDemoData() {
    const { currentRange } = this.data;
    const rangeType = currentRange.type || 'week';

    const demoTrend = this.generateDemoTrend(rangeType, currentRange);
    const multiplier = rangeType === 'week' ? 1 : (rangeType === 'month' ? 4 : 12);
    const demoVisits = demoTrend.reduce((sum, item) => sum + item.value, 0);

    const demoStats = {
      totalSales: 15,
      totalVisits: demoVisits,
      coreCoverage: rangeType === 'week' ? 78 : (rangeType === 'month' ? 82 : 85),
      avgScore: rangeType === 'week' ? 72 : (rangeType === 'month' ? 74 : 76)
    };

    const baseRank = [
      { name: '李四', visitCount: 9 * multiplier, coreRatio: '8/10', avgScore: 78 },
      { name: '王五', visitCount: 7 * multiplier, coreRatio: '6/10', avgScore: 72 },
      { name: '赵六', visitCount: 5 * multiplier, coreRatio: '5/10', avgScore: 65 },
      { name: '钱七', visitCount: 4 * multiplier, coreRatio: '3/10', avgScore: 60 }
    ];

    const demoFunnel = [
      { name: '初次拜访', count: 42 * multiplier, percent: 100, color: '#3B82F6' },
      { name: '需求洽谈', count: 25 * multiplier, percent: 60, color: '#6366F1' },
      { name: '方案演示', count: 12 * multiplier, percent: 29, color: '#8B5CF6' },
      { name: '商务谈判', count: 5 * multiplier, percent: 12, color: '#EC4899' },
      { name: '合同签订', count: 3 * multiplier, percent: 7, color: '#10B981' }
    ];

    const demoAlerts = [
      { id: '1', level: 'high', text: `赵六 · ${currentRange.label}内核心客户拜访不足`, time: currentRange.label },
      { id: '2', level: 'medium', text: `钱七 · ${currentRange.label}达标率低于80%`, time: currentRange.label },
      { id: '3', level: 'medium', text: `孙八 · ${currentRange.label}训练分持续下降`, time: currentRange.label }
    ];

    this.setData({
      stats: demoStats,
      trendData: demoTrend,
      trendMax: this.calcTrendMax(demoTrend),
      rankList: baseRank,
      funnel: demoFunnel,
      alerts: demoAlerts,
      todayMissing: rangeType === 'week' ? ['王五', '赵六'] : []
    });
  },

  generateRanges(type) {
    if (type === 'month') return this.generateMonthRanges(12);
    if (type === 'quarter') return this.generateQuarterRanges(8);
    return this.generateWeekRanges(12);
  },

  generateWeekRanges(count) {
    const ranges = [];
    const currentMonday = this.getMonday(new Date());

    for (let i = 0; i < count; i++) {
      const start = new Date(currentMonday);
      start.setDate(currentMonday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const weekNum = this.getWeekNumber(start);
      ranges.push({
        type: 'week',
        label: `${start.getFullYear()}年第${weekNum}周`,
        startDate: this.formatDate(start),
        endDate: this.formatDate(end),
        shortLabel: `第${weekNum}周`
      });
    }
    return ranges;
  },

  generateMonthRanges(count) {
    const ranges = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      ranges.push({
        type: 'month',
        label: `${start.getFullYear()}年${start.getMonth() + 1}月`,
        startDate: this.formatDate(start),
        endDate: this.formatDate(end),
        shortLabel: `${start.getMonth() + 1}月`
      });
    }
    return ranges;
  },

  generateQuarterRanges(count) {
    const ranges = [];
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentQuarterStartMonth = currentQuarter * 3;

    for (let i = 0; i < count; i++) {
      const start = new Date(now.getFullYear(), currentQuarterStartMonth - i * 3, 1);
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
      ranges.push({
        type: 'quarter',
        label: `${start.getFullYear()}年Q${quarter}`,
        startDate: this.formatDate(start),
        endDate: this.formatDate(end),
        shortLabel: `Q${quarter}`
      });
    }
    return ranges;
  },

  generateDemoTrend(rangeType, range) {
    const start = this.parseDate(range.startDate) || new Date();
    if (rangeType === 'week') {
      const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      return labels.map((label, index) => {
        const d = new Date(start);
        d.setDate(start.getDate() + index);
        const valueList = [1, 2, 0, 1, 1, 1, 1];
        return { date: this.formatDate(d), label, value: valueList[index] };
      });
    }

    if (rangeType === 'month') {
      return [
        { date: 'week1', label: '第1周', value: 18 },
        { date: 'week2', label: '第2周', value: 22 },
        { date: 'week3', label: '第3周', value: 15 },
        { date: 'week4', label: '第4周', value: 20 },
        { date: 'week5', label: '第5周', value: 12 }
      ];
    }

    const month = start.getMonth() + 1;
    return [0, 1, 2].map((offset, index) => {
      const d = new Date(start.getFullYear(), start.getMonth() + offset, 1);
      const values = [65, 78, 87];
      return { date: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${d.getMonth() + 1}月`, value: values[index] };
    });
  },

  normalizeRankList(rankList) {
    return rankList.map(item => ({
      name: item.name || '未命名',
      visitCount: item.visitCount !== undefined ? item.visitCount : (item.count || 0),
      coreRatio: item.coreRatio || '0/0',
      avgScore: item.avgScore || 0
    }));
  },

  calcTrendMax(trendData) {
    const values = (trendData || []).map(item => item.value || 0);
    const max = Math.max(...values, 1);
    return Math.ceil(max / 5) * 5;
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

  getMonday(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
  },

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
});
