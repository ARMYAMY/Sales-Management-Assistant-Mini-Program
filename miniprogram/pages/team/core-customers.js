// pages/team/core-customers.js - 核心客户设定页
Page({
  data: {
    salesId: '',
    salesName: '',
    coreList: [],
    newCustomerName: ''
  },

  onLoad(options) {
    const { id } = options;
    this.setData({
      salesId: id || '',
      salesName: '张三',
      coreList: [
        { id: '1', name: 'A公司', industry: '制药', lastVisit: '2026-05-10', days: 32 },
        { id: '2', name: 'B科技', industry: 'IT', lastVisit: '2026-06-08', days: 4 },
        { id: '3', name: 'C医疗', industry: '器械', lastVisit: '2026-06-05', days: 7 },
        { id: '4', name: 'D集团', industry: '制造', lastVisit: '2026-05-20', days: 22 },
        { id: '5', name: 'E药业', industry: '制药', lastVisit: '2026-06-01', days: 11 }
      ]
    });
  },

  onNameInput(e) {
    this.setData({ newCustomerName: e.detail.value });
  },

  addCustomer() {
    const name = this.data.newCustomerName.trim();
    if (!name) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' });
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      name,
      industry: '待补充',
      lastVisit: '-',
      days: '-'
    };
    this.setData({
      coreList: [newItem, ...this.data.coreList],
      newCustomerName: ''
    });
  },

  removeCustomer(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认移除',
      content: '移除此核心客户？',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.coreList.filter(c => c.id !== id);
          this.setData({ coreList: list });
        }
      }
    });
  },

  save() {
    wx.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  }
});
