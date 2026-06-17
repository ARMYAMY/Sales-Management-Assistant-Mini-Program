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
    let role = wx.getStorageSync('userRole');
    if (!role) {
      // 首次进入默认管理者（开发态体验），可在"我的"页切换
      role = 'manager';
      try { wx.setStorageSync('userRole', role); } catch (e) {}
    }
    this.setData({ isManager: role === 'manager' });
    this.loadLibraryData();
  },

  onShow() {
    // 详情页改星后回到列表，刷新缓存
    const saved = wx.getStorageSync('library_ratings') || {};
    if (Object.keys(saved).length > 0) {
      this.loadLibraryData();
    }
  },

  async loadLibraryData() {
    try {
      wx.showLoading({ title: '加载中...' });
      const result = await app.call('getLibraryList', {});
      wx.hideLoading();

      if (result && result.code === 0 && result.skills && result.skills.length > 0) {
        const skills = this.mergeRatings(result.skills);
        this.setData({ allSkills: skills, skills });
        try { wx.setStorageSync('library_allSkills_cache', skills); } catch (e) {}
      } else {
        // 云端无数据时走本地演示
        this.loadDemoData();
        try { wx.setStorageSync('library_allSkills_cache', this.data.allSkills); } catch (e) {}
      }
    } catch (err) {
      wx.hideLoading();
      console.warn('加载话术库失败，使用演示数据:', err);
      this.loadDemoData();
    }
  },

  // 从本地 storage 合并已保存的打星数据
  mergeRatings(skills) {
    const saved = wx.getStorageSync('library_ratings') || {};
    return skills.map(s => {
      const rating = saved[s._id] !== undefined ? saved[s._id] : (s.managerRating || 0);
      return {
        ...s,
        managerRating: rating,
        ratingStars: this.buildStars(rating)
      };
    });
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

  // 占位防冒泡
  noop() {},

  // 管理者打星
  rateSkill(e) {
    if (!this.data.isManager) {
      wx.showToast({ title: '仅管理者可评级', icon: 'none' });
      return;
    }
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
    if (!app.globalData.libraryRatings) app.globalData.libraryRatings = {};
    app.globalData.libraryRatings[id] = rating;

    wx.showToast({ title: `已评 ${rating} 星`, icon: 'none', duration: 1000 });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const skill = this.data.allSkills.find(s => s._id === id);
    if (skill) {
      // 存到全局，详情页读取
      app.globalData.currentSkill = skill;
    }
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
        detail: 'SPIN 销售法是由尼尔·拉克姆提出的经典销售模型，包含四个递进的问题层次：\n\n1. 【Situation 状况问题】了解客户当前的背景情况\n   例："贵公司目前的数据存储方案是自建还是外包？"\n\n2. 【Problem 难点问题】挖掘客户现有的痛点\n   例："这套方案在扩展性方面是否遇到什么挑战？"\n\n3. 【Implication 暗示问题】放大痛点的影响和后果\n   例："如果存储瓶颈持续，是不是会影响到业务部门的项目交付？"\n\n4. 【Need-payoff 需求效益问题】引导客户自己说出解决痛点的价值\n   例："如果能把存储效率提升一倍，对贵公司的运维成本会有什么影响？"\n\n适用场景：B2B 大客户销售、复杂方案销售、决策周期长的项目。',
        tags: ['经典模型', '必学'],
        scriptCount: 12, useCount: 356, avgRating: 4.8, managerRating: 5,
        preview: '「您目前在这个环节主要遇到了哪些困扰？」→「这个问题如果持续下去，可能会带来...」'
      },
      {
        _id: '2', name: '价格谈判三步法', icon: '💰',
        category: 'price_negotiation', salesPerson: 'lisi',
        salesInfo: salesMap.lisi,
        description: '先确认价值、再处理异议、最后给出方案的标准化价格谈判流程',
        detail: '价格谈判不是降价比赛，而是价值博弈。\n\n【第一步：价值锚定】\n在讨论价格前，先把方案能为客户创造的价值讲透。\n例："我们这套方案上线后，预计能帮您节省30%运维人力成本，按贵公司20人团队计算，一年可节省约150万。"\n\n【第二步：处理异议】\n客户说"太贵了"时，不要立即降价，而是分解异议：\n- "您觉得贵的具体是哪个部分？"\n- "和什么产品对比觉得贵？"\n- "如果分阶段实施，是否能缓解预算压力？"\n\n【第三步：方案置换】\n用"加量不加价"或"调整付款方式"代替直接降价：\n- 增送增值服务（培训、延保）\n- 调整付款节奏（季度→月度）\n- 配套服务打包\n\n记住：让客户觉得"值"比"便宜"更重要。',
        tags: ['高转化', '实战'],
        scriptCount: 8, useCount: 289, avgRating: 4.6, managerRating: 4,
        preview: '「我完全理解您对价格的关注，我们先来确认一下这个方案能为贵公司带来的价值...」'
      },
      {
        _id: '3', name: '初次拜访破冰话术', icon: '💼',
        category: 'first_visit', salesPerson: 'zhangsan',
        salesInfo: salesMap.zhangsan,
        description: '首次见面快速建立信任、引发兴趣的开口话术合集',
        detail: '初次拜访的前 3 分钟决定客户愿不愿继续听你说。\n\n【三段式破冰】\n1. 感谢 + 赞美（10秒）\n   "李总您好，非常感谢您今天抽出宝贵时间。听说您刚主导完成了XX项目升级，真的很了不起。"\n\n2. 共鸣点建立（20秒）\n   "我之前也接触过几家和贵公司类似的客户，他们在XX方面都有类似的困扰。"\n\n3. 价值预告（30秒）\n   "今天我主要想和您分享一个我们帮XX行业客户提升30%效率的方案，您看方便吗？"\n\n【避坑提醒】\n- 不要一上来就讲产品功能\n- 不要过度恭维，会显得假\n- 准备 2-3 个行业共性话题作为"破冰弹药"',
        tags: ['新手必备'],
        scriptCount: 15, useCount: 412, avgRating: 4.5, managerRating: 5,
        preview: '「李总您好，感谢您今天抽出时间。我在来之前了解到贵司最近在...」'
      },
      {
        _id: '4', name: '异议处理 LSCPA', icon: '🛡️',
        category: 'objection_handling', salesPerson: 'wangwu',
        salesInfo: salesMap.wangwu,
        description: '倾听-分担-澄清-陈述-要求的五步异议处理模型',
        detail: '客户提出异议 = 还在考虑 = 还有机会。LSCPA 模型帮你专业应对：\n\n【L - Listen 倾听】\n让客户完整说出顾虑，不要打断。\n\n【S - Share 分担】\n"我完全理解您的顾虑"、"很多客户一开始也有类似的想法"\n\n【C - Clarify 澄清】\n"您说的XX具体是指？"\n"您担心的是A方面还是B方面？"\n\n【P - Present 陈述】\n针对客户的真实异议，给出数据和案例回应。\n\n【A - Ask 要求】\n回到下一步动作：\n"基于这些情况，您看我们下一步可以做什么？"\n\n【原则】异议处理不是辩论，而是共同寻找最佳方案。',
        tags: ['系统方法'],
        scriptCount: 10, useCount: 198, avgRating: 4.7, managerRating: 4,
        preview: '「您说之前用过类似产品效果不太好，能具体说说是在哪个方面让您不满意吗？」'
      },
      {
        _id: '5', name: '促成成交逼单话术', icon: '🎯',
        category: 'closing', salesPerson: 'zhaoliu',
        salesInfo: salesMap.zhaoliu,
        description: '识别成交信号、推动客户决策的临门一脚话术',
        detail: '当客户释放以下信号时，是促成的最佳时机：\n\n【成交信号识别】\n- 问价格细节、付款方式\n- 问交付时间、实施周期\n- 问售后保障、合同条款\n- "我们内部再讨论一下"（其实是好消息）\n\n【三句逼单话术】\n1. 二选一法：\n   "您看是本月启动还是下个月启动比较合适？"\n\n2. 假设成交法：\n   "如果方案确认后，您希望我们的实施团队什么时候进场？"\n\n3. 稀缺性法：\n   "我们本季度还有3个交付名额，建议本周内确认可以锁定实施档期。"\n\n【避坑】\n- 不要连续逼单超过 2 次\n- 客户说"再考虑"时，回："完全理解，那您主要还需要考虑哪些方面？我可以提供更多信息。"',
        tags: ['临门一脚'],
        scriptCount: 6, useCount: 156, avgRating: 4.4, managerRating: 3,
        preview: '「如果方案没有问题的话，您看这个月启动还是下个月启动比较合适？」'
      },
      {
        _id: '6', name: '客户关怀维护话术', icon: '🤝',
        category: 'relationship', salesPerson: 'qianqi',
        salesInfo: salesMap.qianqi,
        description: '成交后持续维护客户关系、挖掘增购机会的话术',
        detail: '成交不是结束，而是长期合作的开始。\n\n【T+1 关怀节奏】\n- 成交当天：感谢短信 + 实施对接\n- 第 7 天：使用回访\n- 第 30 天：价值复盘 + 优化建议\n- 第 90 天：续约/增购探讨\n\n【关怀话术模板】\n\n使用回访：\n"王总，产品上线一周了，使用体验如何？团队有没有什么不顺畅的地方？"\n\n价值复盘：\n"我们系统数据显示，本月贵司的XX效率提升了25%，比预期还高。"\n\n增购探讨：\n"随着贵司业务扩展，要不要考虑把XX模块也纳入进来？我帮您做个扩展方案。"\n\n【核心原则】先给价值，再谈生意。',
        tags: ['长期价值'],
        scriptCount: 9, useCount: 134, avgRating: 4.3, managerRating: 4,
        preview: '「王总，产品上线一个月了，我想了解一下使用体验，看有没有需要优化的地方。」'
      },
      {
        _id: '7', name: 'FABE 产品推介法', icon: '📊',
        category: 'needs_discovery', salesPerson: 'lisi',
        salesInfo: salesMap.lisi,
        description: '特征-优势-利益-证据四步法，让客户清晰感知产品价值',
        detail: 'FABE 是把产品功能"翻译"成客户利益的经典框架。\n\n【F - Feature 特征】\n产品本身的属性/功能：\n"我们的产品支持1000+并发连接"\n\n【A - Advantage 优势】\n相对竞品的差异化：\n"对比市场上同类产品，我们的并发能力是平均水平的3倍"\n\n【B - Benefit 利益】\n对客户业务的价值：\n"这意味着在业务高峰期，您的系统不会出现卡顿，能稳定承接大促活动流量"\n\n【E - Evidence 证据】\n数据、案例、奖项：\n"双十一期间我们帮助XX客户承接了200万笔订单，系统零故障"\n\n【使用顺序】永远按 FABE 顺序说，不要先说证据再说利益。',
        tags: ['产品推介', '经典'],
        scriptCount: 10, useCount: 278, avgRating: 4.5, managerRating: 4,
        preview: '「这款产品的核心特征是能提升30%效率，相比竞品我们的优势在于...」'
      },
      {
        _id: '8', name: '冷启动客户开发话术', icon: '❄️',
        category: 'first_visit', salesPerson: 'wangwu',
        salesInfo: salesMap.wangwu,
        description: '针对从未接触过的潜在客户，快速引起注意并争取面谈机会',
        detail: '电话/微信冷启动成功率约 5-10%，关键是前 15 秒抓住客户注意力。\n\n【15 秒钩子公式】\n1. 自报家门（5秒）："张总您好，我是XX科技的小王"\n2. 价值钩子（10秒）："我们帮XX行业的XX客户在3个月内把XX效率提升了40%"\n\n【三种有效钩子】\n\n【数据钩子】\n"我们近期帮XX集团把XX成本降低了30%，想和您分享下方法论。"\n\n【痛点钩子】\n"很多制造业客户反馈XX环节是最大瓶颈，您是否也有类似困扰？"\n\n【同行钩子】\n"您的同行XX公司上个月刚采用了我们的方案，效果不错。"\n\n【避坑】\n- 不要念稿，要像聊天\n- 客户说"没兴趣"时，回："完全理解，那您方便告诉我贵司目前主要用什么方案吗？"\n- 不要纠缠，被拒后礼貌结束',
        tags: ['冷启动', '电销'],
        scriptCount: 14, useCount: 198, avgRating: 4.2, managerRating: 3,
        preview: '「张总您好，冒昧打扰。我是XX科技的小王，我们专注...」'
      },
      {
        _id: '9', name: '竞争对比话术', icon: '⚖️',
        category: 'objection_handling', salesPerson: 'zhaoliu',
        salesInfo: salesMap.zhaoliu,
        description: '客户提到竞品时的专业应对话术，既不贬低对手又突出差异',
        detail: '客户提到竞品 = 在做选择 = 你还有机会。\n\n【三原则】\n1. 不贬低对手（会显得不专业，也会让客户质疑你）\n2. 不回避对比（回避会显得心虚）\n3. 突出差异化（讲你独有的、客户最在意的价值）\n\n【标准话术结构】\n\n第一层：认同对手\n"XX品牌确实不错，他们在A方面做得很好。"\n\n第二层：客观对比\n"和XX相比，我们在B方面有差异化优势——比如XX功能/服务。"\n\n第三层：聚焦客户场景\n"不过具体到贵公司的需求，XX是不是更关键？"\n\n【万能兜底】\n"其实每家产品都有适合的场景，建议您可以从三个维度评估：功能匹配度、售后服务、长期成本。我们可以提供详细的对比表。"\n\n【避坑】\n- 不要主动说竞品坏话\n- 不要拿不出证据的"吊打"\n- 让客户自己得出结论',
        tags: ['竞品应对'],
        scriptCount: 7, useCount: 167, avgRating: 4.5, managerRating: 5,
        preview: '「您提到XX品牌确实也不错，他们的优势主要在...而我们的差异点是...」'
      },
      {
        _id: '10', name: '老客转介绍话术', icon: '🔗',
        category: 'relationship', salesPerson: 'qianqi',
        salesInfo: salesMap.qianqi,
        description: '通过满意的老客户获取高质量转介绍资源的技巧与话术',
        detail: '老客户转介绍是最高质量的获客渠道，转化率是陌生拜访的 3-5 倍。\n\n【转介绍 4 步法】\n\n1. 价值超预期（前置条件）\n   让客户在产品/服务上有超预期的体验，才好意思开口。\n\n2. 识别时机\n   - 客户主动表扬时\n   - 帮客户解决重大问题后\n   - 续约/复购成功后\n\n3. 开口请求\n   "王总，非常感谢您这段时间的支持。冒昧问一下，您身边有没有朋友或同行也面临类似问题？如果有，我非常乐意提供免费咨询。"\n\n4. 降低门槛\n   - 强调"只是认识一下，不一定合作"\n   - 提供"我先发个资料"而非"直接见面"作为第一步\n\n【激励机制】\n- 成功转介绍后，赠送增值服务（培训课时、延保）\n- 季度/年度评选"金牌推荐官"',
        tags: ['转介绍', '增购'],
        scriptCount: 5, useCount: 98, avgRating: 4.6, managerRating: 4,
        preview: '「王总，非常感谢您的信任和支持。我想冒昧问一下，您身边有没有...」'
      }
    ];
    const skills = this.mergeRatings(demoSkills);
    this.setData({ allSkills: skills, skills });
  }
});
