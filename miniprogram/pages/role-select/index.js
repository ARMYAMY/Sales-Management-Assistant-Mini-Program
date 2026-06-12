// pages/role-select/index.js
const app = getApp();

Page({
  data: {
    selectedRole: '',   // 'sales' | 'manager'
    loading: false
  },

  // 选择角色
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ selectedRole: role });
  },

  // 确认角色
  async confirmRole() {
    const { selectedRole, loading } = this.data;
    if (!selectedRole || loading) return;

    this.setData({ loading: true });

    try {
      // 调用云函数保存角色
      await app.call('updateUserRole', { role: selectedRole });

      // 本地也存一份，供自定义 Tab 栏读取
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.role = selectedRole;
      wx.setStorageSync('userInfo', userInfo);

      // 跳转到对应首页（用 reLaunch 清空页面栈）
      const targetUrl = selectedRole === 'sales'
        ? '/pages/home/sales'
        : '/pages/dashboard/index';

      wx.reLaunch({ url: targetUrl });

    } catch (err) {
      wx.showToast({
        title: err.message || '设置角色失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
