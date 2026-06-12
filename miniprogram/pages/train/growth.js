// pages/train/growth.js - 成长曲线页（综合：训练+拜访+成交）
const app = getApp();

Page({
  data: {
    // 当前选中的维度
    currentTab: 'train', // train | visit | deal

    // 训练维度
    trainData: [],
    trainAvg: 0,
    trainBest: 0,
    trainCount: 0,

    // 拜访维度
    visitData: [],
    visitTotal: 0,
    visitAvgWeek: 0,

    // 成交维度
    dealData: [],
    dealTotal: 0,
    dealAvg: 0,
    dealTotalFormatted: '0',
    dealAvgFormatted: '0',

    // 维度趋势
    dimensionTrends: [
      { name: '话术匹配度', current: 28, max: 35, change: 3 },
      { name: '风格接近度', current: 18, max: 25, change: -2 },
      { name: '策略一致性', current: 16, max: 20, change: 1 },
      { name: '沟通有效性', current: 10, max: 20, change: 4 }
    ]
  },

  onLoad() {
    this.loadAllData();
  },

  onShow() {
    this.loadAllData();
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  async loadAllData() {
    this.loadTrainData();
    this.loadVisitData();
    this.loadDealData();
  },

  // 加载训练数据
  async loadTrainData() {
    try {
      const result = await app.call('getTrainData', { action: 'growth' });
      if (result) {
        const data = (result.data || []).map((item, i, arr) => ({
          ...item,
          x: arr.length > 1 ? (i / (arr.length - 1)) * 90 + 5 : 50,
          label: item.date ? item.date.slice(5) : `T${i + 1}`
        }));
        this.setData({
          trainData: data,
          trainAvg: result.avgScore || 0,
          trainBest: result.bestScore || 0,
          trainCount: result.totalSessions || 0,
          dimensionTrends: result.dimensionTrends || this.data.dimensionTrends
        });
      }
    } catch (err) {
      // Demo数据
      this.setData({
        trainData: [
          { date: '06-05', score: 55, x: 5, label: '06-05' },
          { date: '06-06', score: 62, x: 20, label: '06-06' },
          { date: '06-07', score: 58, x: 35, label: '06-07' },
          { date: '06-08', score: 70, x: 50, label: '06-08' },
          { date: '06-09', score: 68, x: 65, label: '06-09' },
          { date: '06-10', score: 75, x: 80, label: '06-10' },
          { date: '06-11', score: 72, x: 95, label: '06-11' }
        ],
        trainAvg: 68, trainBest: 75, trainCount: 7
      });
    }
  },

  // 加载拜访数据
  async loadVisitData() {
    try {
      const result = await app.call('getVisitList', { page: 1, page_size: 100, filter: 'all' });
      const list = (result.list || []).map(v => ({
        date: v.visit_date ? v.visit_date.slice(5, 10) : '',
        count: 1
      }));
      // 按日期聚合
      const grouped = {};
      list.forEach(item => {
        if (item.date) grouped[item.date] = (grouped[item.date] || 0) + 1;
      });
      const dates = Object.keys(grouped).sort().slice(-14); // 最近14天
      const data = dates.map((d, i) => ({
        date: d, score: grouped[d] * 20, // 映射到0-100
        x: dates.length > 1 ? (i / (dates.length - 1)) * 90 + 5 : 50,
        label: d, realCount: grouped[d]
      }));
      const total = list.length;
      this.setData({
        visitData: data,
        visitTotal: total,
        visitAvgWeek: total > 0 ? (total / Math.max(1, dates.length) * 7).toFixed(1) : 0
      });
    } catch (err) {
      this.setData({
        visitData: [
          { date: '06-05', score: 20, x: 5, label: '06-05', realCount: 1 },
          { date: '06-06', score: 40, x: 20, label: '06-06', realCount: 2 },
          { date: '06-08', score: 20, x: 50, label: '06-08', realCount: 1 },
          { date: '06-10', score: 60, x: 80, label: '06-10', realCount: 3 },
          { date: '06-11', score: 40, x: 95, label: '06-11', realCount: 2 }
        ],
        visitTotal: 14, visitAvgWeek: 4.5
      });
    }
  },

  // 加载成交数据
  async loadDealData() {
    try {
      const result = await app.call('getVisitList', { page: 1, page_size: 100, filter: 'all' });
      const deals = (result.list || []).filter(v => v.result === '已成交' || v.result === '达成意向');
      const grouped = {};
      deals.forEach(v => {
        const d = v.visit_date ? v.visit_date.slice(5, 10) : '';
        if (d) grouped[d] = (grouped[d] || 0) + (v.amount || 0);
      });
      const dates = Object.keys(grouped).sort().slice(-14);
      const maxAmount = Math.max(...Object.values(grouped), 1);
      const data = dates.map((d, i) => ({
        date: d, score: (grouped[d] / maxAmount) * 100,
        x: dates.length > 1 ? (i / (dates.length - 1)) * 90 + 5 : 50,
        label: d, realAmount: grouped[d]
      }));
      const total = deals.reduce((s, v) => s + (v.amount || 0), 0);
      const avg = dates.length > 0 ? Math.round(total / dates.length) : 0;
      data.forEach(d => {
        d.amountFormatted = d.realAmount >= 10000
          ? (d.realAmount / 10000).toFixed(1) + '万'
          : String(d.realAmount);
      });
      this.setData({
        dealData: data,
        dealTotal: total,
        dealAvg: avg,
        dealTotalFormatted: total >= 10000 ? (total / 10000).toFixed(1) + '万' : String(total),
        dealAvgFormatted: avg >= 10000 ? (avg / 10000).toFixed(1) + '万' : String(avg)
      });
    } catch (err) {
      const dealData = [
        { date: '06-05', score: 30, x: 5, label: '06-05', realAmount: 50000 },
        { date: '06-08', score: 60, x: 50, label: '06-08', realAmount: 100000 },
        { date: '06-10', score: 100, x: 80, label: '06-10', realAmount: 150000 },
        { date: '06-11', score: 80, x: 95, label: '06-11', realAmount: 120000 }
      ];
      dealData.forEach(d => {
        d.amountFormatted = d.realAmount >= 10000
          ? (d.realAmount / 10000).toFixed(1) + '万'
          : String(d.realAmount);
      });
      this.setData({
        dealData,
        dealTotal: 420000,
        dealAvg: 105000,
        dealTotalFormatted: '42.0万',
        dealAvgFormatted: '10.5万'
      });
    }
  }
});
