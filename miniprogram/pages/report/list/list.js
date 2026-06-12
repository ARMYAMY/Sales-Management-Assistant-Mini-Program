// pages/report/list/list.js
const app = getApp();

Page({
  data: {
    // 当前选中的标签 daily/weekly
    currentTab: 'daily',

    // 日期选择
    selectedDate: '',
    selectedWeekLabel: '',

    // 生成状态
    generating: false,

    // 历史报告（本地缓存）
    historyList: [],

    // 本周范围
    weekRange: ''
  },

  onLoad() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({ selectedDate: today });
    this.calcWeekRange();
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  // 计算本周范围
  calcWeekRange() {
    const now = new Date();
    const day = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const range = `${mon.getMonth() + 1}/${mon.getDate()}-${sun.getMonth() + 1}/${sun.getDate()}`;
    this.setData({ weekRange: range, selectedWeekLabel: range });
  },

  // 切换日报/周报
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  // 日期选择变化
  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value });
  },

  // 生成报告
  async generateReport() {
    const { currentTab, selectedDate, generating } = this.data;
    if (generating) return;

    this.setData({ generating: true });

    try {
      // 1. 获取聚合数据（app.call 成功时直接返回 result.data）
      const reportData = await app.call('getReportData', {
        type: currentTab,
        date: selectedDate
      });

      // 2. 调用 AI 生成报告摘要（app.call 成功时直接返回 result.data）
      const aiSummary = await app.call('generateReport', {
        type: currentTab,
        reportData: reportData
      });

      // 3. 组装完整报告并缓存
      const fullReport = {
        id: `${currentTab}_${selectedDate}_${Date.now()}`,
        type: currentTab,
        date: selectedDate,
        title: reportData.title,
        createdAt: new Date().toISOString(),
        summary: reportData.summary,
        purposeDistribution: reportData.purposeDistribution,
        resultDistribution: reportData.resultDistribution,
        customerList: reportData.customerList,
        visits: reportData.visits,
        aiSummary: aiSummary,
        source: 'ai'
      };

      this.saveToHistory(fullReport);

      // 4. 跳转到详情页
      wx.navigateTo({
        url: `/pages/report/detail/detail?id=${fullReport.id}`
      });

    } catch (err) {
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  },

  // 快速生成今日日报
  generateToday() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({ currentTab: 'daily', selectedDate: today });
    this.generateReport();
  },

  // 快速生成本周周报
  generateThisWeek() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({ currentTab: 'weekly', selectedDate: today });
    this.generateReport();
  },

  // 查看历史报告
  viewReport(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/report/detail/detail?id=${id}` });
  },

  // 删除历史报告
  deleteReport(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      success: (res) => {
        if (res.confirm) {
          let historyList = wx.getStorageSync('reportHistory') || [];
          historyList = historyList.filter(r => r.id !== id);
          wx.setStorageSync('reportHistory', historyList);
          this.setData({ historyList });
        }
      }
    });
  },

  // 加载历史
  loadHistory() {
    const historyList = wx.getStorageSync('reportHistory') || [];
    // 按时间倒序
    historyList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    this.setData({ historyList });
  },

  // 保存到历史
  saveToHistory(report) {
    let historyList = wx.getStorageSync('reportHistory') || [];
    // 同类型同日期的旧报告替换掉
    historyList = historyList.filter(r => !(r.type === report.type && r.date === report.date));
    historyList.unshift(report);
    // 最多保留 30 条
    if (historyList.length > 30) historyList = historyList.slice(0, 30);
    wx.setStorageSync('reportHistory', historyList);
    this.setData({ historyList });
  }
});
