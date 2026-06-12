// pages/profile/manager.js - 管理者我的页
const app = getApp();

Page({
  data: {
    userInfo: {},
    overview: {
      teamSize: 0,
      pendingAlerts: 0,
      thisMonthVisits: 0
    }
  },

  onShow() {
    this.loadUserInfo();
    this.loadOverview();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ userInfo });
  },

  async loadOverview() {
    try {
      const result = await app.call('getTeamStats', {});
      if (result && result.overview) {
        this.setData({ overview: result.overview });
      }
    } catch (err) {
      // 使用演示数据
      this.setData({
        overview: { teamSize: 5, pendingAlerts: 3, thisMonthVisits: 128 }
      });
    }
  },

  goAlerts() {
    wx.showToast({ title: '风险预警开发中', icon: 'none' });
  },

  goExport() {
    wx.showToast({ title: '数据导出开发中', icon: 'none' });
  },

  goLibraryManage() {
    wx.switchTab({ url: '/pages/library/index' });
  },

  goSettings() {
    wx.showToast({ title: '系统设置开发中', icon: 'none' });
  },

  switchRole() {
    wx.reLaunch({ url: '/pages/role-select/index' });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需重新登录',
      success: (res) => {
        if (res.confirm) app.logout();
      }
    });
  }
});
