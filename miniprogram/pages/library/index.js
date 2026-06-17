// pages/library/index.js - 话术库
const app = getApp();

Page({
  data: {
    // 维度切换：scene | sales
    activeDimension: 'scene',
    activeCategory: 'all',
    // 是否管理者（管理者可打星）
    isManager: false,
    categories: [
      { key: 'first_visit', name: '初次拜访' },
      { key: 'needs_discovery', name: '需求挖掘' },
      { key: 'price_negotiation', name: '价格谈判' },
      { key: 'objection_handling', name: '异议处理' },
      { key: 'closing', name: '促成成交' },
      { key: 'relationship', name: '关系维护' }
    ],
    salesList: [
      { key: 'zhangsan', name: '张三', avatar: '张' },
      { key: 'lisi', name: '李四', avatar: '李' },
      { key: 'wangwu', name: '王五', avatar: '王' },
      { key: 'zhaoliu', name: '赵六', avatar: '赵' },
      { key: 'qianqi', name: '钱七', avatar: '钱' }
    ],
    skills: [],
    allSkills: [],
    starArr: [1, 2, 3, 4, 5]
  },

  onLoad() {
    // 检测角色：有 managerToken 或 role=manager 时为管理者
    const role = wx.getStorageSync('userRole') || 'sales';
    this.setData({ isManager: role === 'manager' });
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
        const skills = this.mergeRatings(result.skills);
        this.setData({ allSkills: skills, skills });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('加载话术库失败:', err);
      this.loadDemoData();
    }
  },

  // 从本地 storage 合并已保存的打星数据
  mergeRatings(skills) {
    const saved = wx.getStorageSync('library_ratings') || {};
    return skills.map(s => ({
      ...s,
      managerRating: saved[s._id] !== undefined ? saved[s._id] : (s.managerRating || 0),
      ratingStars: this.buildStars(saved[s._id] !== undefined ? saved[s._id] : (s.managerRating || 0))
    }));
  },

  buildStars(rating) {
    return [1, 2, 3, 4, 5].map(n => n <= rating ? 'full' : 'empty');
  },

  setDimension(e) {
    const dim = e.currentTarget.dataset.dim;
    this.setData({ activeDimension: dim, activeCategory: 'all', skills: this.data.allSkills });
  },

  setCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ activeCategory: cat });

    if (cat === 'all') {
      this.setData({ skills: this.data.allSkills });
    } else if (this.data.activeDimension === 'scene') {
      const filtered = this.data.allSkills.filter(s => s.category === cat);
      this.setData({ skills: filtered });
    } else {
      const filtered = this.data.allSkills.filter(s => s.salesPerson === cat);
      this.setData({ skills: filtered });
    }
  },

  // 管理者打星
  rateSkill(e) {
    if (!this.data.isManager) return;
    const { id, star } = e.currentTarget.dataset;
    const rating = parseInt(star);

    // 更新内存数据
    const allSkills = this.data.allSkills.map(s => {
      if (s._id === id) {
        return { ...s, managerRating: rating, ratingStars: this.buildStars(rating) };
      }
      return s;
    });
    const skills = this.data.skills.map(s => {
      if (s._id === id) {
        return { ...s, managerRating: rating, ratingStars: this.buildStars(rating) };
      }
      return s;
    });
    this.setData({ allSkills, skills });

    // 持久化到 storage
    const saved = wx.getStorageSync('library_ratings') || {};
    saved[id] = rating;
    wx.setStorageSync('library_ratings', saved);

    // 同步到全局，训练页可读取
    const globalRatings = app.globalData || {};
    if (!globalRatings.libraryRatings) globalRatings.libraryRatings = {};
    globalRatings.libraryRatings[id] = rating;

    wx.showToast({ title: `已评 ${rating} 星`, icon: 'none', duration: 1000 });
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
    const salesMap = {
      zhangsan: { name: '张三', avatar: '张', color: '#3B82F6' },
      lisi: { name: '李四', avatar: '李', color: '#10B981' },
      wangwu: { name: '王五', avatar: '王', color: '#F59E0B' },
      zhaoliu: { name: '赵六', avatar: '赵', color: '#EF4444' },
      qianqi: { name: '钱七', avatar: '钱', color: '#8B5CF6' }
    };
    const demoSkills = [
      {
        _id: '1', name: 'SPIN 需求挖掘法', icon: '🔍',
        category: 'needs_discovery', salesPerson: 'zhangsan',
        salesInfo: salesMap.zhangsan,
        description: '通过情景、问题、暗示、需求四个层次，深入挖掘客户真实痛点',
        tags: ['经典模型', '必学'],
        scriptCount: 12, useCount: 356, avgRating: 4.8, managerRating: 5,
        preview: '「您目前在这个环节主要遇到了哪些困扰？」→「这个问题如果持续下去，可能会带来...」'
      },
      {
        _id: '2', name: '价格谈判三步法', icon: '💰',
        category: 'price_negotiation', salesPerson: 'lisi',
        salesInfo: salesMap.lisi,
        description: '先确认价值、再处理异议、最后给出方案的标准化价格谈判流程',
        tags: ['高转化', '实战'],
        scriptCount: 8, useCount: 289, avgRating: 4.6, managerRating: 4,
        preview: '「我完全理解您对价格的关注，我们先来确认一下这个方案能为贵公司带来的价值...」'
      },
      {
        _id: '3', name: '初次拜访破冰话术', icon: '💼',
        category: 'first_visit', salesPerson: 'zhangsan',
        salesInfo: salesMap.zhangsan,
        description: '首次见面快速建立信任、引发兴趣的开口话术合集',
        tags: ['新手必备'],
        scriptCount: 15, useCount: 412, avgRating: 4.5, managerRating: 5,
        preview: '「李总您好，感谢您今天抽出时间。我在来之前了解到贵司最近在...」'
      },
      {
        _id: '4', name: '异议处理 LSCPA', icon: '🛡️',
        category: 'objection_handling', salesPerson: 'wangwu',
        salesInfo: salesMap.wangwu,
        description: '倾听-分担-澄清-陈述-要求的五步异议处理模型',
        tags: ['系统方法'],
        scriptCount: 10, useCount: 198, avgRating: 4.7, managerRating: 4,
        preview: '「您说之前用过类似产品效果不太好，能具体说说是在哪个方面让您不满意吗？」'
      },
      {
        _id: '5', name: '促成成交逼单话术', icon: '🎯',
        category: 'closing', salesPerson: 'zhaoliu',
        salesInfo: salesMap.zhaoliu,
        description: '识别成交信号、推动客户决策的临门一脚话术',
        tags: ['临门一脚'],
        scriptCount: 6, useCount: 156, avgRating: 4.4, managerRating: 3,
        preview: '「如果方案没有问题的话，您看这个月启动还是下个月启动比较合适？」'
      },
      {
        _id: '6', name: '客户关怀维护话术', icon: '🤝',
        category: 'relationship', salesPerson: 'qianqi',
        salesInfo: salesMap.qianqi,
        description: '成交后持续维护客户关系、挖掘增购机会的话术',
        tags: ['长期价值'],
        scriptCount: 9, useCount: 134, avgRating: 4.3, managerRating: 4,
        preview: '「王总，产品上线一个月了，我想了解一下使用体验，看有没有需要优化的地方。」'
      },
      {
        _id: '7', name: 'FABE 产品推介法', icon: '📊',
        category: 'needs_discovery', salesPerson: 'lisi',
        salesInfo: salesMap.lisi,
        description: '特征-优势-利益-证据四步法，让客户清晰感知产品价值',
        tags: ['产品推介', '经典'],
        scriptCount: 10, useCount: 278, avgRating: 4.5, managerRating: 4,
        preview: '「这款产品的核心特征是能提升30%效率，相比竞品我们的优势在于...」'
      },
      {
        _id: '8', name: '冷启动客户开发话术', icon: '❄️',
        category: 'first_visit', salesPerson: 'wangwu',
        salesInfo: salesMap.wangwu,
        description: '针对从未接触过的潜在客户，快速引起注意并争取面谈机会',
        tags: ['冷启动', '电销'],
        scriptCount: 14, useCount: 198, avgRating: 4.2, managerRating: 3,
        preview: '「张总您好，冒昧打扰。我是XX科技的小王，我们专注...」'
      },
      {
        _id: '9', name: '竞争对比话术', icon: '⚖️',
        category: 'objection_handling', salesPerson: 'zhaoliu',
        salesInfo: salesMap.zhaoliu,
        description: '客户提到竞品时的专业应对话术，既不贬低对手又突出差异',
        tags: ['竞品应对'],
        scriptCount: 7, useCount: 167, avgRating: 4.5, managerRating: 5,
        preview: '「您提到XX品牌确实也不错，他们的优势主要在...而我们的差异点是...」'
      },
      {
        _id: '10', name: '老客转介绍话术', icon: '🔗',
        category: 'relationship', salesPerson: 'qianqi',
        salesInfo: salesMap.qianqi,
        description: '通过满意的老客户获取高质量转介绍资源的技巧与话术',
        tags: ['转介绍', '增购'],
        scriptCount: 5, useCount: 98, avgRating: 4.6, managerRating: 4,
        preview: '「王总，非常感谢您的信任和支持。我想冒昧问一下，您身边有没有...」'
      }
    ];
    const skills = this.mergeRatings(demoSkills);
    this.setData({ allSkills: skills, skills });
  }
});

Page({
  data: {
    // 维度切换：scene | sales
    activeDimension: 'scene',
    activeCategory: 'all',
    categories: [
      { key: 'first_visit', name: '初次拜访' },
      { key: 'needs_discovery', name: '需求挖掘' },
      { key: 'price_negotiation', name: '价格谈判' },
      { key: 'objection_handling', name: '异议处理' },
      { key: 'closing', name: '促成成交' },
      { key: 'relationship', name: '关系维护' }
    ],
    salesList: [
      { key: 'zhangsan', name: '张三', avatar: '张' },
      { key: 'lisi', name: '李四', avatar: '李' },
      { key: 'wangwu', name: '王五', avatar: '王' },
      { key: 'zhaoliu', name: '赵六', avatar: '赵' },
      { key: 'qianqi', name: '钱七', avatar: '钱' }
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

  setDimension(e) {
    const dim = e.currentTarget.dataset.dim;
    this.setData({ activeDimension: dim, activeCategory: 'all', skills: this.data.allSkills });
  },

  setCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ activeCategory: cat });

    if (cat === 'all') {
      this.setData({ skills: this.data.allSkills });
    } else if (this.data.activeDimension === 'scene') {
      const filtered = this.data.allSkills.filter(s => s.category === cat);
      this.setData({ skills: filtered });
    } else {
      const filtered = this.data.allSkills.filter(s => s.salesPerson === cat);
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
    const salesMap = {
      zhangsan: { name: '张三', avatar: '张', color: '#3B82F6' },
      lisi: { name: '李四', avatar: '李', color: '#10B981' },
      wangwu: { name: '王五', avatar: '王', color: '#F59E0B' },
      zhaoliu: { name: '赵六', avatar: '赵', color: '#EF4444' },
      qianqi: { name: '钱七', avatar: '钱', color: '#8B5CF6' }
    };
    const demoSkills = [
      {
        _id: '1', name: 'SPIN 需求挖掘法', icon: '🔍',
        category: 'needs_discovery', salesPerson: 'zhangsan',
        salesInfo: salesMap.zhangsan,
        description: '通过情景、问题、暗示、需求四个层次，深入挖掘客户真实痛点',
        tags: ['经典模型', '必学'],
        scriptCount: 12, useCount: 356, avgRating: 4.8,
        preview: '「您目前在这个环节主要遇到了哪些困扰？」→「这个问题如果持续下去，可能会带来...」'
      },
      {
        _id: '2', name: '价格谈判三步法', icon: '💰',
        category: 'price_negotiation', salesPerson: 'lisi',
        salesInfo: salesMap.lisi,
        description: '先确认价值、再处理异议、最后给出方案的标准化价格谈判流程',
        tags: ['高转化', '实战'],
        scriptCount: 8, useCount: 289, avgRating: 4.6,
        preview: '「我完全理解您对价格的关注，我们先来确认一下这个方案能为贵公司带来的价值...」'
      },
      {
        _id: '3', name: '初次拜访破冰话术', icon: '💼',
        category: 'first_visit', salesPerson: 'zhangsan',
        salesInfo: salesMap.zhangsan,
        description: '首次见面快速建立信任、引发兴趣的开口话术合集',
        tags: ['新手必备'],
        scriptCount: 15, useCount: 412, avgRating: 4.5,
        preview: '「李总您好，感谢您今天抽出时间。我在来之前了解到贵司最近在...」'
      },
      {
        _id: '4', name: '异议处理 LSCPA', icon: '🛡️',
        category: 'objection_handling', salesPerson: 'wangwu',
        salesInfo: salesMap.wangwu,
        description: '倾听-分担-澄清-陈述-要求的五步异议处理模型',
        tags: ['系统方法'],
        scriptCount: 10, useCount: 198, avgRating: 4.7,
        preview: '「您说之前用过类似产品效果不太好，能具体说说是在哪个方面让您不满意吗？」'
      },
      {
        _id: '5', name: '促成成交逼单话术', icon: '🎯',
        category: 'closing', salesPerson: 'zhaoliu',
        salesInfo: salesMap.zhaoliu,
        description: '识别成交信号、推动客户决策的临门一脚话术',
        tags: ['临门一脚'],
        scriptCount: 6, useCount: 156, avgRating: 4.4,
        preview: '「如果方案没有问题的话，您看这个月启动还是下个月启动比较合适？」'
      },
      {
        _id: '6', name: '客户关怀维护话术', icon: '🤝',
        category: 'relationship', salesPerson: 'qianqi',
        salesInfo: salesMap.qianqi,
        description: '成交后持续维护客户关系、挖掘增购机会的话术',
        tags: ['长期价值'],
        scriptCount: 9, useCount: 134, avgRating: 4.3,
        preview: '「王总，产品上线一个月了，我想了解一下使用体验，看有没有需要优化的地方。」'
      },
      {
        _id: '7', name: 'FABE 产品推介法', icon: '📊',
        category: 'needs_discovery', salesPerson: 'lisi',
        salesInfo: salesMap.lisi,
        description: '特征-优势-利益-证据四步法，让客户清晰感知产品价值',
        tags: ['产品推介', '经典'],
        scriptCount: 10, useCount: 278, avgRating: 4.5,
        preview: '「这款产品的核心特征是能提升30%效率，相比竞品我们的优势在于...」'
      },
      {
        _id: '8', name: '冷启动客户开发话术', icon: '❄️',
        category: 'first_visit', salesPerson: 'wangwu',
        salesInfo: salesMap.wangwu,
        description: '针对从未接触过的潜在客户，快速引起注意并争取面谈机会',
        tags: ['冷启动', '电销'],
        scriptCount: 14, useCount: 198, avgRating: 4.2,
        preview: '「张总您好，冒昧打扰。我是XX科技的小王，我们专注...」'
      },
      {
        _id: '9', name: '竞争对比话术', icon: '⚖️',
        category: 'objection_handling', salesPerson: 'zhaoliu',
        salesInfo: salesMap.zhaoliu,
        description: '客户提到竞品时的专业应对话术，既不贬低对手又突出差异',
        tags: ['竞品应对'],
        scriptCount: 7, useCount: 167, avgRating: 4.5,
        preview: '「您提到XX品牌确实也不错，他们的优势主要在...而我们的差异点是...」'
      },
      {
        _id: '10', name: '老客转介绍话术', icon: '🔗',
        category: 'relationship', salesPerson: 'qianqi',
        salesInfo: salesMap.qianqi,
        description: '通过满意的老客户获取高质量转介绍资源的技巧与话术',
        tags: ['转介绍', '增购'],
        scriptCount: 5, useCount: 98, avgRating: 4.6,
        preview: '「王总，非常感谢您的信任和支持。我想冒昧问一下，您身边有没有...」'
      }
    ];
    this.setData({ allSkills: demoSkills, skills: demoSkills });
  }
});
