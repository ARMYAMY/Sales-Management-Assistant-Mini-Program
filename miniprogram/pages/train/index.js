// pages/train/index.js - AI训练入口页
const app = getApp();

Page({
  data: {
    benchmark: {
      name: '张三',
      desc: '大客户销售方法论',
      score: 72,
      change: 5
    },
    scenarios: [
      { type: 'first_visit', name: '初次拜访', icon: '💼', desc: '首次接触新客户，建立信任关系', count: 3, avgScore: 78, isWeak: false },
      { type: 'needs_discovery', name: '需求挖掘', icon: '🔍', desc: '深入了解客户痛点，引导需求', count: 5, avgScore: 65, isWeak: false },
      { type: 'price_negotiation', name: '价格谈判', icon: '💰', desc: '处理价格异议，达成双赢协议', count: 2, avgScore: 58, isWeak: true },
      { type: 'objection_handling', name: '异议处理', icon: '🚫', desc: '应对客户疑虑和反对意见', count: 4, avgScore: 71, isWeak: false }
    ],
    growthData: [],
    showCustomModal: false,
    customCustomer: '',
    customIndustry: '',
    customGoal: ''
  },

  onLoad() {
    this.loadTrainData();
  },

  onShow() {
    // 每次显示刷新数据
    this.loadTrainData();
  },

  // 加载训练数据
  async loadTrainData() {
    try {
      // 从云数据库获取训练统计
      const db = wx.cloud.database();
      const _ = db.command;
      const openid = app.globalData.openid || wx.getStorageSync('openid');

      // 获取最近训练记录统计
      const historyRes = await db.collection('train_sessions')
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .limit(30)
        .get();

      const sessions = historyRes.data || [];

      // 计算各场景统计
      const scenarioStats = {};
      sessions.forEach(s => {
        const type = s.scenarioType || 'unknown';
        if (!scenarioStats[type]) {
          scenarioStats[type] = { count: 0, totalScore: 0 };
        }
        scenarioStats[type].count++;
        scenarioStats[type].totalScore += s.totalScore || 0;
      });

      // 更新场景数据
      const scenarios = this.data.scenarios.map(s => {
        const stats = scenarioStats[s.type];
        if (stats) {
          return {
            ...s,
            count: stats.count,
            avgScore: Math.round(stats.totalScore / stats.count),
            isWeak: Math.round(stats.totalScore / stats.count) < 60
          };
        }
        return s;
      });

      // 生成成长曲线数据（最近7次训练）
      const growthData = sessions.slice(0, 7).reverse().map((s, i) => ({
        date: s.createTime ? s.createTime.split('T')[0].slice(5) : '',
        label: `T${i + 1}`,
        score: s.totalScore || 0
      }));

      this.setData({ scenarios, growthData });
      // 同步话术库评级到训练场景卡片
      this.syncLibraryRatings();
    } catch (err) {
      console.error('加载训练数据失败:', err);
      this.syncLibraryRatings();
    }
  },

  // 从话术库读取管理者评级，显示在训练场景上
  syncLibraryRatings() {
    const saved = wx.getStorageSync('library_ratings') || {};
    // 场景类型与话术库ID对应（demo: SPIN挖掘=1,初次拜访破冰=3,价格谈判=2,异议处理=4）
    const sceneToSkillId = {
      first_visit: '3',
      needs_discovery: '1',
      price_negotiation: '2',
      objection_handling: '4'
    };
    const scenarios = this.data.scenarios.map(s => {
      const skillId = sceneToSkillId[s.type];
      const rating = skillId && saved[skillId] !== undefined ? saved[skillId] : 0;
      return { ...s, managerRating: rating, ratingStars: this.buildStars(rating) };
    });
    this.setData({ scenarios });
  },

  buildStars(rating) {
    return [1, 2, 3, 4, 5].map(n => n <= rating ? 'full' : 'empty');
  },

  // 跳转到选择对标页
  goToSelectBenchmark() {
    wx.navigateTo({ url: '/pages/train/select-benchmark' });
  },

  // 开始训练
  async startTraining(e) {
    const { type, name } = e.currentTarget.dataset;
    wx.showLoading({ title: '准备训练中...' });

    try {
      const result = await app.call('startTrain', {
        scenarioType: type,
        scenarioName: name,
        benchmarkSlug: 'topsales.zhang-san',
        difficulty: '普通'
      });

      wx.hideLoading();
      // 跳转到对话训练页
      wx.navigateTo({
        url: `/pages/train/chat?sessionId=${result.sessionId}&scenario=${encodeURIComponent(name)}`
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '开始训练失败', icon: 'none' });
    }
  },

  // 显示自定义场景弹窗
  showCustomModal() {
    this.setData({ showCustomModal: true });
  },

  // 隐藏自定义场景弹窗
  hideCustomModal() {
    this.setData({ showCustomModal: false });
  },

  preventBubble() {
    // 阻止冒泡
  },

  onCustomCustomerInput(e) {
    this.setData({ customCustomer: e.detail.value });
  },

  onCustomIndustryInput(e) {
    this.setData({ customIndustry: e.detail.value });
  },

  onCustomGoalInput(e) {
    this.setData({ customGoal: e.detail.value });
  },

  // 开始自定义训练
  async startCustomTraining() {
    const { customCustomer, customIndustry, customGoal } = this.data;
    if (!customCustomer || !customGoal) {
      wx.showToast({ title: '请填写客户类型和对话目标', icon: 'none' });
      return;
    }

    this.hideCustomModal();
    wx.showLoading({ title: '准备训练中...' });

    try {
      const result = await app.call('startTrain', {
        scenarioType: 'custom',
        scenarioName: '自定义场景',
        customProfile: { customer: customCustomer, industry: customIndustry, goal: customGoal },
        benchmarkSlug: 'topsales.zhang-san',
        difficulty: '普通'
      });

      wx.hideLoading();
      wx.navigateTo({
        url: `/pages/train/chat?sessionId=${result.sessionId}&scenario=${encodeURIComponent('自定义场景')}`
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '开始训练失败', icon: 'none' });
    }
  },

  // 跳转到成长曲线页
  goToGrowth() {
    wx.navigateTo({ url: '/pages/train/growth' });
  }
});
