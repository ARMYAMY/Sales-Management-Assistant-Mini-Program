// pages/login/index.js
const app = getApp();

Page({
  data: {
    loading: false
  },

  onLoad() {
    // 页面加载时静默尝试自动登录
    this.autoLogin();
  },

  // 自动登录（静默）
  autoLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    app.call('login', {}).then(res => {
      wx.setStorageSync('openid', res.openid);
      wx.setStorageSync('userInfo', res.user);
      app.globalData.openid = res.openid;
      app.globalData.user = res.user;

      // 跳转到工作台
      wx.reLaunch({ url: '/pages/home/sales' });
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    });
  },

  // 点击按钮进入（备用）
  onEnter() {
    this.autoLogin();
  }
});
