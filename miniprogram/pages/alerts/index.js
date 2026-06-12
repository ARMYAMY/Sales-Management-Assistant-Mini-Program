// pages/alerts/index.js - 风险预警页
Page({
  data: {
    alerts: [
      { id: '1', level: 'high', sales: '赵六', text: 'A公司 32天未拜访', time: '本周' },
      { id: '2', level: 'medium', sales: '钱七', text: '连续2周达标<80%', time: '本周' },
      { id: '3', level: 'medium', sales: '孙八', text: '训练分持续下降', time: '本周' },
      { id: '4', level: 'low', sales: '张三', text: '核心客户B科技即将到期', time: '3天前' }
    ]
  },

  goBack() {
    wx.navigateBack();
  }
});
