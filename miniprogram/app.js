// app.js
App({
  onLaunch: function () {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d8glu2nbd98e9592d',
      traceUser: true
    });

    // 静默自动登录
    const openid = wx.getStorageSync('openid');
    if (openid) {
      this.globalData.openid = openid;
      this.loadUserInfoAndRoute();
    } else {
      // 没有本地缓存，静默调用 login 云函数自动创建/获取用户
      this.autoLogin();
    }
  },

  globalData: {
    openid: '',
    user: {
      _id: '',
      name: '',
      role: '',        // 'sales' | 'manager' | 'admin'
      slug: '',
      team: '',
      avatar: '',
      joinDate: ''
    },
    config: {
      weekly_visit_target: 5,
      min_distill_records: 8,
      min_distill_customers: 2
    },
    currentPage: '',
    networkStatus: 'online'
  },

  // 加载用户信息并根据角色路由
  loadUserInfoAndRoute: function () {
    const that = this;
    this.call('getUserInfo').then(data => {
      that.globalData.user = data;
      wx.setStorageSync('userInfo', data);
      that.routeByRole(data.role);
    }).catch(() => {
      // 获取失败，可能是用户被删除，清除缓存重新登录
      that.logout();
    });
  },

  // 根据角色路由到对应首页
  routeByRole: function (role) {
    const pages = getCurrentPages();
    const currentRoute = pages.length > 0 ? pages[0].route : '';

    // 无角色：强制去角色选择页
    if (!role) {
      if (currentRoute === 'pages/role-select/index') return;
      wx.reLaunch({ url: '/pages/role-select/index' });
      return;
    }

    // 已经在对应首页，不重复跳转
    if (role === 'manager' && currentRoute === 'pages/dashboard/index') return;
    if (role === 'sales' && currentRoute === 'pages/home/sales') return;

    const targetUrl = (role === 'manager')
      ? '/pages/dashboard/index'
      : '/pages/home/sales';

    wx.reLaunch({ url: targetUrl });
  },

  // 静默自动登录
  autoLogin: function () {
    const that = this;
    wx.cloud.callFunction({ name: 'login', data: {} }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        wx.setStorageSync('openid', result.data.openid);
        wx.setStorageSync('userInfo', result.data.user);
        that.globalData.openid = result.data.openid;
        that.globalData.user = result.data.user;

        // 根据角色跳转对应首页（首次登录/无角色时先去角色选择页）
        const role = result.data.user.role;
        if (!role) {
          wx.reLaunch({ url: '/pages/role-select/index' });
        } else {
          that.routeByRole(role);
        }
      }
    }).catch(err => {
      console.error('自动登录失败', err);
    });
  },

  // 统一云函数调用封装
  call: function (name, data) {
    const that = this;
    return new Promise(function (resolve, reject) {
      wx.cloud.callFunction({
        name: name,
        data: data || {}
      }).then(res => {
        const result = res.result;
        if (result.code === 0) {
          // 兼容两种返回格式：{code:0, data:{...}} 和 {code:0, ...}
          resolve(result.data !== undefined ? result.data : result);
        } else if (result.code === 401) {
          that.logout();
          reject({ code: 401, message: '登录已过期，请重新登录' });
        } else {
          reject({ code: result.code, message: result.message || '请求失败' });
        }
      }).catch(err => {
        reject({ code: -1, message: err.message || '网络错误，请稍后重试' });
      });
    });
  },

  // 退出登录
  logout: function () {
    this.globalData.openid = '';
    this.globalData.user = {
      _id: '', name: '', role: '', slug: '', team: '', avatar: '', joinDate: ''
    };
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userInfo');
    wx.reLaunch({ url: '/pages/login/index' });
  }
});
