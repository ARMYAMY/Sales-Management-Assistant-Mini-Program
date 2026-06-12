// pages/library/index.js - 话术库
const app = getApp();

Page({
  data: {
    activeCategory: 'all',
    categories: [
      { key: 'first_visit', name: '初次拜访' },
      { key: 'needs_discovery', name: '需求挖掘' },
      { key: 'price_negotiation', name: '价格谈判' },
      { key: 'objection_handling', name: '异议处理' },
      { key: 'closing', name: '促成成交' },
      { key: 'relationship', name: '关系维护' }
    ],
    skills: [],
    allSkills: []
  },

  onLoad() {
    this.loadLibraryData();
  },

  onShow() {
    this.loadLibraryData();
  },

  async loadLibraryData() {
    try {
      wx.showLoading({ title: '加载中...' });
      const result = await app.call('getLibraryList', {});
      wx.hideLoading();

      if (result && result.skills) {
        this.setData({
          allSkills: result.skills,
          skills: result.skills
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('加载话术库失败:', err);
      this.loadDemoData();
    }
  },

  setCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ activeCategory: cat });

    if (cat === 'all') {
      this.setData({ skills: this.data.allSkills });
    } else {
      const filtered = this.data.allSkills.filter(s => s.category === cat);
      this.setData({ skills: filtered });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/library/detail?id=${id}` });
  },

  addSkill() {
    wx.navigateTo({ url: '/pages/library/edit' });
  },

  // 演示数据
  loadDemoData() {
    const demoSkills = [
      {
        _id: '1', name: 'SPIN 需求挖掘法', icon: '🔍',
        category: 'needs_discovery',
        description: '通过情景、问题、暗示、需求四个层次，深入挖掘客户真实痛点',
        tags: ['经典模型', '必学'],
        scriptCount: 12, useCount: 356, avgRating: 4.8,
        preview: '「您目前在这个环节主要遇到了哪些困扰？」→「这个问题如果持续下去，可能会带来...」'
      },
      {
        _id: '2', name: '价格谈判三步法', icon: '💰',
        category: 'price_negotiation',
        description: '先确认价值、再处理异议、最后给出方案的标准化价格谈判流程',
        tags: ['高转化', '实战'],
        scriptCount: 8, useCount: 289, avgRating: 4.6,
        preview: '「我完全理解您对价格的关注，我们先来确认一下这个方案能为贵公司带来的价值...」'
      },
      {
        _id: '3', name: '初次拜访破冰话术', icon: '💼',
        category: 'first_visit',
        description: '首次见面快速建立信任、引发兴趣的开口话术合集',
        tags: ['新手必备'],
        scriptCount: 15, useCount: 412, avgRating: 4.5,
        preview: '「李总您好，感谢您今天抽出时间。我在来之前了解到贵司最近在...」'
      },
      {
        _id: '4', name: '异议处理 LSCPA', icon: '🛡️',
        category: 'objection_handling',
        description: '倾听-分担-澄清-陈述-要求的五步异议处理模型',
        tags: ['系统方法'],
        scriptCount: 10, useCount: 198, avgRating: 4.7,
        preview: '「您说之前用过类似产品效果不太好，能具体说说是在哪个方面让您不满意吗？」'
      },
      {
        _id: '5', name: '促成成交逼单话术', icon: '🎯',
        category: 'closing',
        description: '识别成交信号、推动客户决策的临门一脚话术',
        tags: ['临门一脚'],
        scriptCount: 6, useCount: 156, avgRating: 4.4,
        preview: '「如果方案没有问题的话，您看这个月启动还是下个月启动比较合适？」'
      },
      {
        _id: '6', name: '客户关怀维护话术', icon: '🤝',
        category: 'relationship',
        description: '成交后持续维护客户关系、挖掘增购机会的话术',
        tags: ['长期价值'],
        scriptCount: 9, useCount: 134, avgRating: 4.3,
        preview: '「王总，产品上线一个月了，我想了解一下使用体验，看有没有需要优化的地方。」'
      }
    ];
    this.setData({ allSkills: demoSkills, skills: demoSkills });
  }
});
