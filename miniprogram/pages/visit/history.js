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

    return app.call('getVisitList', {
      page,
      page_size: 20,
      filter: that.data.currentFilter,
      customerName: that.data.customerFilter || ''
    }).then(data => {
      const list = (data.list || []).map(v => ({
        ...v,
        timeLabel: that.formatTime(v.visitDate),
        dateLabel: that.formatDate(v.visitDate),
        amountLabel: v.amount ? that.formatAmount(v.amount) : '',
        resultClass: that.getResultClass(v.result)
      }));
      const all = refresh ? list : that.data.visitList.concat(list);
      that.setData({
        visitList: all,
        total: data.total || 0,
        loading: false,
        noMore: list.length < 20
      });
    }).catch(() => {
      // 接口失败时加载demo数据
      that.loadDemoData();
    });
  },

  loadDemoData() {
    const demoList = [
      { _id: 'd1', customerName: '华为技术有限公司', contactPerson: '张经理', visitDate: new Date().toISOString(), stage: '需求挖掘', result: '待决策', amount: 150000, isCoreCustomer: true, location: '上门' },
      { _id: 'd2', customerName: '腾讯科技', contactPerson: '李总监', visitDate: new Date(Date.now() - 86400000).toISOString(), stage: '初次拜访', result: '推进中', amount: 30000, isCoreCustomer: false, location: '电话' },
      { _id: 'd3', customerName: '阿里巴巴', contactPerson: '王主管', visitDate: new Date(Date.now() - 172800000).toISOString(), stage: '方案演示', result: '达成意向', amount: 80000, isCoreCustomer: true, location: '上门' },
      { _id: 'd4', customerName: '字节跳动', contactPerson: '赵经理', visitDate: new Date(Date.now() - 259200000).toISOString(), stage: '商务谈判', result: '已成交', amount: 200000, isCoreCustomer: false, location: '线上' },
      { _id: 'd5', customerName: '美团点评', contactPerson: '刘总监', visitDate: new Date(Date.now() - 345600000).toISOString(), stage: '合同签订', result: '已成交', amount: 500000, isCoreCustomer: true, location: '上门' }
    ];
    const list = demoList.map(v => ({
      ...v,
      timeLabel: this.formatTime(v.visitDate),
      dateLabel: this.formatDate(v.visitDate),
      amountLabel: v.amount ? this.formatAmount(v.amount) : '',
      resultClass: this.getResultClass(v.result)
    }));
    this.setData({
      visitList: list,
      total: demoList.length,
      loading: false,
      noMore: true
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

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    // 同一年不显示年份
    if (y === now.getFullYear()) {
      return `${m}-${day} ${hh}:${mm}`;
    }
    return `${y}-${m}-${day} ${hh}:${mm}`;
  },

  formatAmount(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString();
  },

  getResultClass(result) {
    if (result === '达成意向' || result === '已成交') return 'success';
    if (result === '推进中') return 'warn';
    if (result === '待决策') return 'info';
    return 'gray';
  },

  goToRecord() { wx.switchTab({ url: '/pages/visit/record' }); },
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/visit/detail?id=' + id });
  }
});
