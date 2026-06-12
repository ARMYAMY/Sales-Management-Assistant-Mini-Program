// pages/profile/sales.js
const app = getApp();

Page({
  data: {
    user: {
      name: '',
      team: '',
      avatar: '',
      joinDate: ''
    },
    role: 'sales',
    joinDays: 0,
    stats: {
      totalVisits: 0,
      totalTrains: 0,
      customerCount: 0,
      avgScore: 0
    },
    benchmarkName: '',
    loading: true
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    // 每次显示刷新数据和角色
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ role: userInfo.role || 'sales' });
    if (typeof this.loadProfile === 'function') {
      this.loadProfile();
    }
  },

  onPullDownRefresh() {
    this.loadProfile().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载个人数据
  loadProfile() {
    const that = this;
    that.setData({ loading: true });

    // 同步全局用户信息
    const globalUser = app.globalData.user;
    if (globalUser && globalUser.name) {
      that.setData({
        user: {
          name: globalUser.name,
          team: globalUser.team || '',
          avatar: globalUser.avatar || '',
          joinDate: globalUser.joinDate || ''
        }
      });
      that.calcJoinDays(globalUser.joinDate);
    }

    return app.call('getDashboard').then(data => {
      that.setData({
        stats: {
          totalVisits: data.totalVisits || 0,
          totalTrains: data.totalTrains || 0,
          customerCount: data.customerCount || 0,
          avgScore: data.avgScore || 0
        },
        benchmarkName: data.benchmarkName || '',
        loading: false
      });
    }).catch(() => {
      that.setData({ loading: false });
    });
  },

  // 计算已加入天数
  calcJoinDays(joinDate) {
    if (!joinDate) return;
    const join = new Date(joinDate);
    const now = new Date();
    const diff = Math.floor((now - join) / 86400000);
    this.setData({ joinDays: diff > 0 ? diff : 0 });
  },

  // 导航
  goToHistory() {
    wx.navigateTo({ url: '/pages/visit/history' });
  },
  goToCustomers() {
    wx.navigateTo({ url: '/pages/customer/list' });
  },
  goToTrainHistory() {
    wx.navigateTo({ url: '/pages/train/history' });
  },
  goToGrowth() {
    wx.navigateTo({ url: '/pages/train/growth' });
  },
  goToWeeklyReport() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
    // wx.navigateTo({ url: '/pages/report/weekly' });
  },
  goToBenchmark() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
    // wx.navigateTo({ url: '/pages/train/select-benchmark' });
  },
  goToSettings() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
    // wx.navigateTo({ url: '/pages/settings/index' });
  },

  // 切换角色
  switchRole() {
    wx.reLaunch({ url: '/pages/role-select/index' });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后将需要重新登录',
      confirmColor: '#EF4444',
      success(res) {
        if (res.confirm) {
          app.logout();
        }
      }
    });
  }
});
