// pages/dashboard/sales-detail.js - 销售详情页
Page({
  data: {
    name: '',
    stats: {
      totalVisits: 156,
      customerCount: 23,
      coreRatio: '10/10',
      avgScore: 85
    },
    recentVisits: [
      { id: '1', customer: 'A公司', date: '6/10', stage: '需求洽谈', result: '达成意向' },
      { id: '2', customer: 'B科技', date: '6/08', stage: '初次拜访', result: '建立联系' },
      { id: '3', customer: 'C医疗', date: '6/05', stage: '方案演示', result: '待反馈' },
      { id: '4', customer: 'D集团', date: '5/20', stage: '商务谈判', result: '推进中' }
    ]
  },

  onLoad(options) {
    const { name, id } = options;
    this.setData({ name: name || '张三' });
  },

  goBack() {
    wx.navigateBack();
  }
});
