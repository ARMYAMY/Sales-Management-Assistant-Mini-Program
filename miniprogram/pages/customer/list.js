// pages/customer/list.js
const app = getApp();

Page({
  data: {
    keyword: '',
    filter: 'all', // all | core
    customers: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    total: 0,
    coreCount: 0
  },

  onLoad() {
    this.loadCustomers();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, customers: [] });
    this.loadCustomers().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadCustomers(true);
    }
  },

  // 加载客户列表
  loadCustomers(append = false) {
    const that = this;
    that.setData({ loading: true });

    return app.call('getCustomerList', {
      keyword: that.data.keyword,
      filter: that.data.filter,
      page: append ? that.data.page + 1 : 1,
      pageSize: that.data.pageSize
    }).then(res => {
      const list = append
        ? [...that.data.customers, ...res.list]
        : res.list;

      that.setData({
        customers: list,
        total: res.total,
        hasMore: res.hasMore,
        page: append ? that.data.page + 1 : 1,
        loading: false,
        coreCount: res.list.filter(c => c.isCore).length
      });
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      that.setData({ loading: false });
    });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 搜索确认
  onSearchConfirm() {
    this.setData({ page: 1, customers: [] });
    this.loadCustomers();
  },

  // 清空搜索
  onClearSearch() {
    this.setData({ keyword: '', page: 1, customers: [] });
    this.loadCustomers();
  },

  // 切换筛选
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter === this.data.filter) return;
    this.setData({ filter, page: 1, customers: [] });
    this.loadCustomers();
  },

  // 切换核心客户标记
  onToggleCore(e) {
    const index = e.currentTarget.dataset.index;
    const customer = this.data.customers[index];
    const newStatus = !customer.isCore;

    wx.showLoading({ title: '更新中...' });

    app.call('toggleCustomerCore', {
      customerName: customer.name,
      isCore: newStatus
    }).then(() => {
      wx.hideLoading();
      // 更新本地数据
      const customers = [...this.data.customers];
      customers[index].isCore = newStatus;
      this.setData({ customers });
      wx.showToast({
        title: newStatus ? '已标记为核心客户' : '已取消核心客户',
        icon: 'success'
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    });
  },

  // 点击客户 - 新建拜访
  onCustomerTap(e) {
    const name = e.currentTarget.dataset.name;
    const isCore = e.currentTarget.dataset.core;
    wx.navigateTo({
      url: `/pages/visit/record?customer=${encodeURIComponent(name)}&core=${isCore ? 1 : 0}`
    });
  },

  // 查看客户拜访历史
  onViewHistory(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: `/pages/visit/history?customer=${encodeURIComponent(name)}`
    });
  }
});
