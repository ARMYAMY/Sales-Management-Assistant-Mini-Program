// pages/library/detail/index.js - 话术详情
const app = getApp();

Page({
  data: {
    skill: null,
    ratingStars: [1, 2, 3, 4, 5],
    isManager: false
  },

  onLoad(options) {
    const role = wx.getStorageSync('userRole') || 'sales';
    this.setData({ isManager: role === 'manager' });

    const id = options.id;
    let skill = app.globalData && app.globalData.currentSkill;

    // 如果全局没有（直接扫码进入等），从 allSkills 找
    if (!skill || skill._id !== id) {
      const allSkills = wx.getStorageSync('library_allSkills_cache') || [];
      skill = allSkills.find(s => s._id === id);
    }

    if (!skill) {
      // 兜底：取本页面参数或默认
      skill = this.getFallbackSkill(id);
    }

    if (skill) {
      // 合并本地打分
      const saved = wx.getStorageSync('library_ratings') || {};
      const rating = saved[skill._id] !== undefined ? saved[skill._id] : (skill.managerRating || 0);
      skill.managerRating = rating;
      skill.ratingStars = [1, 2, 3, 4, 5].map(n => n <= rating ? 'full' : 'empty');
      this.setData({ skill });
      wx.setNavigationBarTitle({ title: skill.name });
    } else {
      wx.showToast({ title: '未找到该话术', icon: 'none' });
    }
  },

  // 演示数据兜底（防止极端情况下没数据）
  getFallbackSkill(id) {
    const map = {
      '1': { _id: '1', name: 'SPIN 需求挖掘法', icon: '🔍', category: 'needs_discovery', tags: ['经典模型', '必学'], scriptCount: 12, useCount: 356, avgRating: 4.8, managerRating: 5, preview: '「您目前在这个环节主要遇到了哪些困扰？」', description: '通过情景、问题、暗示、需求四个层次，深入挖掘客户真实痛点', detail: 'SPIN 销售法是由尼尔·拉克姆提出的经典销售模型...' }
    };
    return map[id];
  },

  rateSkill(e) {
    if (!this.data.isManager) {
      wx.showToast({ title: '仅管理者可评级', icon: 'none' });
      return;
    }
    const { star } = e.currentTarget.dataset;
    const rating = parseInt(star);
    const skill = this.data.skill;
    if (!skill) return;

    const newSkill = {
      ...skill,
      managerRating: rating,
      ratingStars: [1, 2, 3, 4, 5].map(n => n <= rating ? 'full' : 'empty')
    };
    this.setData({ skill: newSkill });

    // 持久化
    const saved = wx.getStorageSync('library_ratings') || {};
    saved[skill._id] = rating;
    wx.setStorageSync('library_ratings', saved);

    // 同步全局
    if (!app.globalData.libraryRatings) app.globalData.libraryRatings = {};
    app.globalData.libraryRatings[skill._id] = rating;

    // 同步回列表缓存
    if (app.globalData.currentSkill) {
      app.globalData.currentSkill = newSkill;
    }

    wx.showToast({ title: `已评 ${rating} 星`, icon: 'none', duration: 1000 });
  },

  copyText(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制话术', icon: 'success' });
      }
    });
  },

  useSkill() {
    wx.showToast({ title: '已记录使用 +1', icon: 'success' });
  }
});
