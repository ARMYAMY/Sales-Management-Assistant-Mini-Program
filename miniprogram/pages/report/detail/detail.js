// pages/report/detail/detail.js
const app = getApp();

Page({
  data: {
    report: null,
    loading: true,
    activeTab: 'summary' // summary | visits
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '缺少报告ID', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.loadReport(id);
  },

  // 从本地缓存加载报告
  loadReport(id) {
    const historyList = wx.getStorageSync('reportHistory') || [];
    const report = historyList.find(r => r.id === id);

    if (!report) {
      wx.showToast({ title: '报告不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 处理分布数据用于图表展示
    const purposeItems = Object.entries(report.purposeDistribution || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const resultItems = Object.entries(report.resultDistribution || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    this.setData({
      report: {
        ...report,
        purposeItems,
        resultItems,
        createdAtStr: report.createdAt.slice(0, 16).replace('T', ' ')
      },
      loading: false
    });
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 查看拜访详情
  goToVisitDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/visit/detail?id=${id}` });
  },

  // 复制报告全文
  copyReport() {
    const { report } = this.data;
    if (!report || !report.aiSummary) return;

    const text = `${report.type === 'daily' ? '日报' : '周报'} - ${report.title}\n\n` +
      `概览：${report.aiSummary.overview}\n\n` +
      `${report.aiSummary.fullText}\n\n` +
      `亮点：${(report.aiSummary.highlights || []).join('、')}\n` +
      `关注：${(report.aiSummary.concerns || []).join('、')}\n` +
      `下一步：${report.aiSummary.nextWeekPlan}`;

    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  // 分享报告
  onShareAppMessage() {
    const { report } = this.data;
    return {
      title: `${report.title} ${report.type === 'daily' ? '日报' : '周报'}`,
      path: `/pages/report/detail/detail?id=${report.id}`
    };
  }
});
