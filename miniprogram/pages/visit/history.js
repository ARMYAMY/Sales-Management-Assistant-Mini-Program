// pages/visit/history.js
const app = getApp();

Page({
  data: {
    visitList: [],
    total: 0,
    currentFilter: 'all',   // all | core | week
    customerFilter: '',     // 按客户名筛选
    page: 1,
    loading: true,
    noMore: false
  },

  onLoad(options) {
    // 从客户清单页跳转，按客户名筛选
    if (options.customer) {
      this.setData({
        customerFilter: decodeURIComponent(options.customer)
      });
    }
    this.loadList(true);
  },
  onShow() { this.loadList(true); },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadList(false);
    }
  },

  // 筛选
  onFilter(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentFilter: type });
    this.loadList(true);
  },

  // 加载列表
  loadList(refresh) {
    const that = this;
    const page = refresh ? 1 : that.data.page + 1;
    that.setData({ loading: true, page });
    if (refresh) that.setData({ visitList: [], noMore: false });

    const params = `?page=${page}&page_size=20&filter=${that.data.currentFilter}`;

    return app.call('getVisitList', {
      page,
      page_size: 20,
      filter: that.data.currentFilter,
      customerName: that.data.customerFilter || ''
    }).then(data => {
      const list = (data.list || []).map(v => ({
        ...v,
        timeLabel: that.formatTime(v.visitDate),
        amountLabel: v.amount ? that.formatAmount(v.amount) : ''
      }));
      const all = refresh ? list : that.data.visitList.concat(list);
      that.setData({
        visitList: all,
        total: data.total || 0,
        loading: false,
        noMore: list.length < 20
      });
    }).catch(() => {
      that.setData({ loading: false });
    });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 86400000;
    if (diff < 1) return '今天';
    if (diff < 2) return '昨天';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  formatAmount(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString();
  },

  goToRecord() { wx.switchTab({ url: '/pages/visit/record' }); },
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/visit/detail?id=' + id });
  }
});
