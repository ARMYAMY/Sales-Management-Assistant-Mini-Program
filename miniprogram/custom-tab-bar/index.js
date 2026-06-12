// custom-tab-bar/index.js
const app = getApp();

Component({
  data: {
    activeIndex: 0,
    role: 'sales',   // 'sales' | 'manager'
    tabs: []       // 当前角色对应的 tab 列表
  },

  lifetimes: {
    attached() {
      this.initTabs();
      // 延迟更新 activeIndex，确保页面已加载
      setTimeout(() => this.updateActiveIndex(), 100);
    }
  },

  pageLifetimes: {
    // 页面切换时更新 activeIndex
    show() {
      this.updateActiveIndex();
    }
  },

  methods: {
    // 根据角色初始化 Tab 列表
    initTabs() {
      const role = this.getRole();
      const salesTabs = [
        { text: '工作台', iconText: '🏠', pagePath: '/pages/home/sales', center: false },
        { text: '录入', iconText: '', pagePath: '/pages/visit/record', center: true },
        { text: 'AI训练', iconText: '🗣️', pagePath: '/pages/train/index', center: false },
        { text: '我的', iconText: '👤', pagePath: '/pages/profile/sales', center: false }
      ];
      const managerTabs = [
        { text: '数据看板', iconText: '📊', pagePath: '/pages/dashboard/index', center: false },
        { text: '团队', iconText: '👥', pagePath: '/pages/team/index', center: false },
        { text: '话术库', iconText: '📚', pagePath: '/pages/library/index', center: false },
        { text: '我的', iconText: '👤', pagePath: '/pages/profile/manager', center: false }
      ];

      this.setData({
        role: role,
        tabs: role === 'manager' ? managerTabs : salesTabs
      });

      this.updateActiveIndex();
    },

    // 获取当前用户角色
    getRole() {
      // 先从 globalData 读取，再从 storage 读取
      try {
        const userInfo = wx.getStorageSync('userInfo') || {};
        return userInfo.role || 'sales';
      } catch (e) {
        return 'sales';
      }
    },

    // 根据当前页面路径更新 activeIndex
    updateActiveIndex() {
      const pages = getCurrentPages();
      if (!pages || pages.length === 0) return;

      const currentRoute = pages[pages.length - 1].route;
      const tabs = this.data.tabs;

      let activeIndex = -1;
      for (let i = 0; i < tabs.length; i++) {
        const tabPath = tabs[i].pagePath.replace(/^\//, '');
        if (currentRoute === tabPath || currentRoute.indexOf(tabPath) === 0) {
          activeIndex = i;
          break;
        }
      }

      if (activeIndex >= 0) {
        this.setData({ activeIndex });
      }
    },

    // 切换 Tab
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path = e.currentTarget.dataset.path;

      if (index === this.data.activeIndex) {
        console.log('已在当前页，无需切换');
        return;
      }

      wx.switchTab({
        url: path,
        fail: (err) => {
          console.error('切换 Tab 失败:', err);
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    }
  }
});
