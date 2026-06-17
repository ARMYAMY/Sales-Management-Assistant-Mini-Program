// pages/role-select/index.js
const app = getApp();

Page({
  data: {
    selectedRole: '',   // 'sales' | 'manager'
    currentRole: '',    // 当前已选角色（仅展示）
    loading: false
  },

  onLoad() {
    // 读取当前已选角色，让用户看到自己现在是什么角色
    const userInfo = wx.getStorageSync('userInfo') || {};
    const role = userInfo.role || '';
    this.setData({
      currentRole: role,
      // 如果已选角色，自动预选
      selectedRole: role
    });
  },

  // 选择角色（点卡片）
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ selectedRole: role });
  },

  // 确认/切换角色
  async confirmRole() {
    const { selectedRole, loading, currentRole } = this.data;
    if (!selectedRole || loading) return;

    this.setData({ loading: true });

    // 本地先更新 storage（即使云函数失败也能切换）
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.role = selectedRole;
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('userRole', selectedRole);
    if (app && app.globalData) {
      app.globalData.user = userInfo;
    }

    // 跳转到对应首页
    const targetUrl = selectedRole === 'sales'
      ? '/pages/home/sales'
      : '/pages/dashboard/index';

    // 如果是切换角色，reLaunch 强制清空页面栈
    // 如果是首次选择，reLaunch 也无妨
    wx.showToast({
      title: currentRole && currentRole !== selectedRole
        ? `已切换为${selectedRole === 'sales' ? '销售' : '管理者'}`
        : '角色已设置',
      icon: 'success',
      duration: 800
    });

    setTimeout(() => {
      wx.reLaunch({ url: targetUrl });
    }, 500);
  },

  // 重置角色（不选任何，直接清空回到选择页）
  resetRole() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.role = '';
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('userRole', '');
    if (app && app.globalData) {
      app.globalData.user = userInfo;
    }
    this.setData({ selectedRole: '', currentRole: '' });
    wx.showToast({ title: '已重置，请重新选择', icon: 'none' });
  },

  // 清除本地缓存（兜底）
  clearCache() {
    wx.showModal({
      title: '确认清除缓存？',
      content: '将清除所有本地数据，下次启动需重新登录。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          if (app && app.globalData) {
            app.globalData.user = {};
            app.globalData.openid = '';
          }
          this.setData({ selectedRole: '', currentRole: '' });
          wx.showToast({ title: '缓存已清除', icon: 'success' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/role-select/index' });
          }, 800);
        }
      }
    });
  }
});
