// pages/visit/detail.js
const app = getApp();

Page({
  data: {
    visitId: '',
    visit: {},
    loading: true
  },

  onLoad(options) {
    const id = options.id || options._id;
    if (!id || id === 'undefined' || id === 'null') {
      wx.showToast({ title: '缺少拜访ID', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ visitId: id });
    this.loadDetail(id);
  },

  onPullDownRefresh() {
    this.loadDetail(this.data.visitId).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载拜访详情
  loadDetail(id) {
    const that = this;
    that.setData({ loading: true });

    return app.call('getVisitDetail', { id }).then(data => {
      // 格式化日期和时间
      const visitDate = data.visit_date ? data.visit_date.split('T')[0] : '';
      const visitTime = data.visit_date ? data.visit_date.split('T')[1].slice(0, 5) : '';

      that.setData({
        visit: {
          id: data._id || data.id,
          customerName: data.customer_name || '',
          contactPerson: data.contact_person || '',
          visitDate: visitDate,
          visitTime: visitTime,
          location: data.location || '',
          stage: data.stage || '',
          intent: data.intent || '',
          result: data.result || '',
          background: data.background || '',
          content: data.content || '',
          nextStep: data.next_step || '',
          amount: data.amount || 0,
          amountSensitive: data.amount_sensitive || false,
          competitorInfo: data.competitor_info || '',
          isCoreCustomer: data.is_core_customer || false,
          status: data.status || 'completed'
        },
        loading: false
      });
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      that.setData({ loading: false });
    });
  },

  // 编辑
  onEdit() {
    const id = this.data.visitId;
    if (!id) {
      wx.showToast({ title: '记录ID缺失', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/visit/record?id=' + id
    });
  },

  // 分享
  onShare() {
    // 实际场景可调用生成分享图或转发给同事
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
  },

  onShareAppMessage() {
    const v = this.data.visit;
    return {
      title: v.customerName + ' - ' + v.stage,
      path: '/pages/visit/detail?id=' + v.id,
      desc: v.result || '拜访记录'
    };
  }
});
