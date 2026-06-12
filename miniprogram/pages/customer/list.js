// pages/customer/list.js - 客户管理页面
const app = getApp();

Page({
  data: {
    loading: true,
    keyword: '',
    currentFilter: 'all', // all, core, deal, active

    // 统计数据
    totalCount: 0,
    coreCount: 0,
    dealCount: 0,
    totalAmount: 0,
    totalAmountFormatted: '0',

    // 客户列表
    customerList: [],
    filteredList: [],

    // 筛选选项
    filterTabs: [
      { key: 'all', label: '全部' },
      { key: 'core', label: '核心客户' },
      { key: 'deal', label: '有商机' },
      { key: 'active', label: '近期活跃' }
    ],

    // 添加客户弹窗
    showAddModal: false,
    newCustomer: { name: '', contact: '', phone: '', industry: '', isCore: false, remark: '' }
  },

  onLoad() {
    this.loadCustomerData();
  },

  onShow() {
    this.loadCustomerData();
  },

  onPullDownRefresh() {
    this.loadCustomerData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载客户数据（合并拜访记录提取 + 手动录入）
  async loadCustomerData() {
    this.setData({ loading: true });
    try {
      // 先尝试从后端获取
      const result = await app.call('getCustomerList', { page: 1, page_size: 100 });
      if (result && result.list && result.list.length > 0) {
        this.processData(result.list);
      } else {
        // 后端无数据时，合并 demo 拜访记录 + 手动录入客户
        this.useMergedMockData();
      }
    } catch (err) {
      this.useMergedMockData();
    }
    this.setData({ loading: false });
  },

  // 合并拜访记录 demo 数据 + 手动录入客户
  useMergedMockData() {
    // 1. 从拜访记录 demo 数据聚合客户信息（与拜访历史保持一致）
    const visitRecords = this.getVisitDemoRecords();
    const customerMap = {};
    visitRecords.forEach(v => {
      const name = v.customerName;
      if (!name) return;
      if (!customerMap[name]) {
        customerMap[name] = {
          name,
          isCore: v.isCoreCustomer || false,
          visits: [],
          lastVisitDate: v.visitDate,
          stage: v.stage || '未分类',
          totalAmount: 0,
          contact: v.contactPerson || '',
          industry: this.guessIndustry(name),
          source: 'visit' // 来源：拜访记录
        };
      }
      customerMap[name].visits.push(v);
      const d = new Date(v.visitDate);
      const lastD = new Date(customerMap[name].lastVisitDate);
      if (d > lastD) {
        customerMap[name].lastVisitDate = v.visitDate;
        customerMap[name].stage = v.stage || customerMap[name].stage;
      }
      if (v.amount) {
        customerMap[name].totalAmount += parseFloat(v.amount);
      }
      if (v.contactPerson && !customerMap[name].contact) {
        customerMap[name].contact = v.contactPerson;
      }
    });

    // 2. 加载手动录入的客户
    const manualCustomers = this.loadManualCustomers();
    manualCustomers.forEach(c => {
      if (customerMap[c.name]) {
        // 如果已存在，合并标记为核心
        if (c.isCore) customerMap[c.name].isCore = true;
        if (c.contact && !customerMap[c.name].contact) customerMap[c.name].contact = c.contact;
        if (c.industry && !customerMap[c.name].industry) customerMap[c.name].industry = c.industry;
        if (c.remark && !customerMap[c.name].recentVisit) customerMap[c.name].recentVisit = c.remark;
      } else {
        customerMap[c.name] = {
          ...c,
          visits: [],
          lastVisitDate: c.lastVisitDate || '',
          stage: c.stage || '潜在客户',
          totalAmount: c.totalAmount || 0,
          source: 'manual' // 来源：手动录入
        };
      }
    });

    // 3. 生成最终客户列表
    const customers = Object.values(customerMap).map(c => {
      const recent = c.visits && c.visits.length > 0
        ? c.visits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))[0]
        : null;
      return {
        ...c,
        visitCount: c.visits ? c.visits.length : 0,
        amountFormatted: c.totalAmount >= 10000
          ? (c.totalAmount / 10000).toFixed(1) + '万'
          : String(Math.round(c.totalAmount)),
        lastVisitLabel: this.formatLastVisit(c.lastVisitDate),
        daysSinceVisit: this.daysSince(c.lastVisitDate),
        recentVisit: c.recentVisit || (recent ? this.formatRecentVisit(recent) : '')
      };
    });

    // 按最后拜访时间倒序，未拜访的放最后
    customers.sort((a, b) => {
      if (!a.lastVisitDate) return 1;
      if (!b.lastVisitDate) return -1;
      return new Date(b.lastVisitDate) - new Date(a.lastVisitDate);
    });

    const coreCount = customers.filter(c => c.isCore).length;
    const dealCount = customers.filter(c => c.totalAmount > 0).length;
    const totalAmount = customers.reduce((s, c) => s + c.totalAmount, 0);

    this.setData({
      customerList: customers,
      totalCount: customers.length,
      coreCount,
      dealCount,
      totalAmount,
      totalAmountFormatted: totalAmount >= 10000
        ? (totalAmount / 10000).toFixed(1) + '万'
        : String(Math.round(totalAmount))
    });
    this.applyFilter();
  },

  // 拜访记录 demo 数据（与拜访历史页面保持一致）
  getVisitDemoRecords() {
    return [
      { customerName: '华为技术有限公司', contactPerson: '张经理', visitDate: new Date().toISOString(), stage: '需求挖掘', result: '待决策', amount: 150000, isCoreCustomer: true, location: '上门' },
      { customerName: '华为技术有限公司', contactPerson: '张经理', visitDate: new Date(Date.now() - 604800000).toISOString(), stage: '初次拜访', result: '推进中', amount: 0, isCoreCustomer: true, location: '上门' },
      { customerName: '腾讯科技', contactPerson: '李总监', visitDate: new Date(Date.now() - 86400000).toISOString(), stage: '初次拜访', result: '推进中', amount: 30000, isCoreCustomer: false, location: '电话' },
      { customerName: '腾讯科技', contactPerson: '李总监', visitDate: new Date(Date.now() - 172800000).toISOString(), stage: '初次拜访', result: '推进中', amount: 0, isCoreCustomer: false, location: '电话' },
      { customerName: '阿里巴巴', contactPerson: '王主管', visitDate: new Date(Date.now() - 172800000).toISOString(), stage: '方案演示', result: '达成意向', amount: 80000, isCoreCustomer: true, location: '上门' },
      { customerName: '字节跳动', contactPerson: '赵经理', visitDate: new Date(Date.now() - 259200000).toISOString(), stage: '商务谈判', result: '已成交', amount: 200000, isCoreCustomer: false, location: '线上' },
      { customerName: '美团点评', contactPerson: '刘总监', visitDate: new Date(Date.now() - 345600000).toISOString(), stage: '合同签订', result: '已成交', amount: 500000, isCoreCustomer: true, location: '上门' }
    ];
  },

  // 根据客户名猜测行业
  guessIndustry(name) {
    const map = {
      '华为技术有限公司': 'IT/通信',
      '腾讯科技': '互联网',
      '阿里巴巴': '互联网/电商',
      '字节跳动': '互联网',
      '美团点评': '互联网/本地生活'
    };
    return map[name] || '其他';
  },

  // 格式化最近拜访摘要
  formatRecentVisit(v) {
    const d = new Date(v.visitDate);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}-${day} ${v.stage}，${v.location}拜访，${v.result}`;
  },

  // 加载手动录入的客户
  loadManualCustomers() {
    try {
      const stored = wx.getStorageSync('manual_customers');
      return stored ? JSON.parse(stored) : this.getDefaultManualCustomers();
    } catch (e) {
      return this.getDefaultManualCustomers();
    }
  },

  // 默认手动录入客户（演示用）
  getDefaultManualCustomers() {
    return [
      {
        name: '京东集团',
        contact: '陈总监',
        phone: '13800138001',
        industry: '互联网/电商',
        isCore: false,
        remark: '潜在客户，计划下周首次拜访',
        stage: '潜在客户',
        totalAmount: 0,
        lastVisitDate: ''
      },
      {
        name: '中国移动通信集团',
        contact: '李经理',
        phone: '13900139002',
        industry: '运营商',
        isCore: true,
        remark: '核心客户，正在跟进数据中心项目',
        stage: '需求沟通',
        totalAmount: 2800000,
        lastVisitDate: '2026-06-01'
      }
    ];
  },

  // ========== 添加客户功能 ==========

  // 显示添加客户弹窗
  showAddCustomer() {
    this.setData({
      showAddModal: true,
      newCustomer: { name: '', contact: '', phone: '', industry: '', isCore: false, remark: '' }
    });
  },

  // 关闭添加弹窗
  closeAddModal() {
    this.setData({ showAddModal: false });
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`newCustomer.${field}`]: value });
  },

  // 切换核心客户
  toggleCore() {
    this.setData({ 'newCustomer.isCore': !this.data.newCustomer.isCore });
  },

  // 保存手动添加的客户
  saveCustomer() {
    const { newCustomer } = this.data;
    if (!newCustomer.name.trim()) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' });
      return;
    }

    const customer = {
      name: newCustomer.name.trim(),
      contact: newCustomer.contact.trim(),
      phone: newCustomer.phone.trim(),
      industry: newCustomer.industry.trim(),
      isCore: newCustomer.isCore,
      remark: newCustomer.remark.trim(),
      stage: '潜在客户',
      totalAmount: 0,
      lastVisitDate: ''
    };

    const manualCustomers = this.loadManualCustomers();
    // 去重：同名覆盖
    const idx = manualCustomers.findIndex(c => c.name === customer.name);
    if (idx >= 0) {
      manualCustomers[idx] = customer;
    } else {
      manualCustomers.push(customer);
    }

    wx.setStorageSync('manual_customers', JSON.stringify(manualCustomers));
    wx.showToast({ title: '添加成功', icon: 'success' });
    this.setData({ showAddModal: false });
    this.loadCustomerData();
  },

  // 处理并计算统计数据（后端数据 + 手动录入合并）
  processData(list) {
    // 聚合客户数据：按客户名称合并拜访记录
    const customerMap = {};
    list.forEach(v => {
      const name = v.customer_name || v.customerName || '';
      if (!name) return;
      if (!customerMap[name]) {
        customerMap[name] = {
          name,
          isCore: v.is_core || v.isCore || false,
          visits: [],
          lastVisitDate: v.visit_date || v.visitDate || '',
          stage: v.stage || '未分类',
          totalAmount: 0,
          contact: v.contact_person || v.contactPerson || '',
          industry: v.industry || this.guessIndustry(name) || '',
          source: 'visit'
        };
      }
      customerMap[name].visits.push(v);
      if (v.visit_date || v.visitDate) {
        const d = new Date(v.visit_date || v.visitDate);
        const lastD = new Date(customerMap[name].lastVisitDate);
        if (d > lastD) {
          customerMap[name].lastVisitDate = v.visit_date || v.visitDate;
          customerMap[name].stage = v.stage || customerMap[name].stage;
        }
      }
      if (v.amount) {
        customerMap[name].totalAmount += parseFloat(v.amount);
      }
      const cp = v.contact_person || v.contactPerson;
      if (cp && !customerMap[name].contact) customerMap[name].contact = cp;
    });

    // 合并手动录入的客户
    const manualCustomers = this.loadManualCustomers();
    manualCustomers.forEach(c => {
      if (customerMap[c.name]) {
        if (c.isCore) customerMap[c.name].isCore = true;
        if (c.contact && !customerMap[c.name].contact) customerMap[c.name].contact = c.contact;
        if (c.industry && !customerMap[c.name].industry) customerMap[c.name].industry = c.industry;
        if (c.remark && !customerMap[c.name].recentVisit) customerMap[c.name].recentVisit = c.remark;
      } else {
        customerMap[c.name] = {
          ...c,
          visits: [],
          lastVisitDate: c.lastVisitDate || '',
          stage: c.stage || '潜在客户',
          totalAmount: c.totalAmount || 0,
          source: 'manual'
        };
      }
    });

    const customers = Object.values(customerMap).map(c => {
      const recent = c.visits && c.visits.length > 0
        ? c.visits.sort((a, b) => new Date(b.visitDate || b.visit_date) - new Date(a.visitDate || a.visit_date))[0]
        : null;
      return {
        ...c,
        visitCount: c.visits ? c.visits.length : 0,
        amountFormatted: c.totalAmount >= 10000
          ? (c.totalAmount / 10000).toFixed(1) + '万'
          : String(Math.round(c.totalAmount)),
        lastVisitLabel: this.formatLastVisit(c.lastVisitDate),
        daysSinceVisit: this.daysSince(c.lastVisitDate),
        recentVisit: c.recentVisit || (recent ? this.formatRecentVisit(recent) : '')
      };
    });

    customers.sort((a, b) => {
      if (!a.lastVisitDate) return 1;
      if (!b.lastVisitDate) return -1;
      return new Date(b.lastVisitDate) - new Date(a.lastVisitDate);
    });

    const coreCount = customers.filter(c => c.isCore).length;
    const dealCount = customers.filter(c => c.totalAmount > 0).length;
    const totalAmount = customers.reduce((s, c) => s + c.totalAmount, 0);

    this.setData({
      customerList: customers,
      totalCount: customers.length,
      coreCount,
      dealCount,
      totalAmount,
      totalAmountFormatted: totalAmount >= 10000
        ? (totalAmount / 10000).toFixed(1) + '万'
        : String(Math.round(totalAmount))
    });
    this.applyFilter();
  },

  // 使用 Mock 数据
  useMockData() {
    const mockCustomers = [
      {
        name: '华为技术有限公司',
        isCore: true,
        visitCount: 12,
        stage: '推进中',
        totalAmount: 3500000,
        lastVisitDate: '2026-06-12',
        contact: '张经理',
        industry: 'IT/通信',
        recentVisit: '06-12 产品演示，客户对新一代服务器方案很感兴趣，下周安排技术交流'
      },
      {
        name: '中国移动通信集团',
        isCore: true,
        visitCount: 8,
        stage: '达成意向',
        totalAmount: 2800000,
        lastVisitDate: '2026-06-11',
        contact: '李总监',
        industry: '运营商',
        recentVisit: '06-11 报价讨论，客户要求再优惠5%，已反馈给主管'
      },
      {
        name: '深圳腾讯科技',
        isCore: false,
        visitCount: 5,
        stage: '初次拜访',
        totalAmount: 800000,
        lastVisitDate: '2026-06-10',
        contact: '王工',
        industry: '互联网',
        recentVisit: '06-10 初次接触，介绍了鲲泰服务器产品线，客户留下联系方式'
      },
      {
        name: '招商银行深圳分行',
        isCore: false,
        visitCount: 3,
        stage: '需求挖掘',
        totalAmount: 1200000,
        lastVisitDate: '2026-06-09',
        contact: '陈主任',
        industry: '金融',
        recentVisit: '06-09 了解客户IT基础设施现状，计划下月提交方案'
      },
      {
        name: '比亚迪汽车',
        isCore: true,
        visitCount: 15,
        stage: '已成交',
        totalAmount: 5000000,
        lastVisitDate: '2026-06-08',
        contact: '刘经理',
        industry: '制造业',
        recentVisit: '06-08 合同签署完成，客户对交付时间表示满意，已安排实施团队对接'
      },
      {
        name: '字节跳动',
        isCore: false,
        visitCount: 2,
        stage: '初次拜访',
        totalAmount: 0,
        lastVisitDate: '2026-06-05',
        contact: '赵工',
        industry: '互联网',
        recentVisit: '06-05 初次拜访，客户目前使用的是竞品设备，有替换意向'
      },
      {
        name: '平安保险集团',
        isCore: false,
        visitCount: 4,
        stage: '待决策',
        totalAmount: 600000,
        lastVisitDate: '2026-06-03',
        contact: '孙经理',
        industry: '金融',
        recentVisit: '06-03 方案汇报完毕，客户内部正在评估，预计两周内反馈'
      },
      {
        name: '国家电网',
        isCore: true,
        visitCount: 10,
        stage: '推进中',
        totalAmount: 2000000,
        lastVisitDate: '2026-06-01',
        contact: '周主任',
        industry: '能源',
        recentVisit: '06-01 技术方案评审会议，客户对高可用性配置提出额外要求'
      }
    ];

    const customers = mockCustomers.map(c => ({
      ...c,
      amountFormatted: c.totalAmount >= 10000
        ? (c.totalAmount / 10000).toFixed(1) + '万'
        : String(Math.round(c.totalAmount)),
      lastVisitLabel: this.formatLastVisit(c.lastVisitDate),
      daysSinceVisit: this.daysSince(c.lastVisitDate)
    }));

    const coreCount = customers.filter(c => c.isCore).length;
    const dealCount = customers.filter(c => c.totalAmount > 0).length;
    const totalAmount = customers.reduce((s, c) => s + c.totalAmount, 0);

    this.setData({
      customerList: customers,
      totalCount: customers.length,
      coreCount,
      dealCount,
      totalAmount,
      totalAmountFormatted: totalAmount >= 10000
        ? (totalAmount / 10000).toFixed(1) + '万'
        : String(Math.round(totalAmount))
    });
    this.applyFilter();
  },

  // 应用筛选
  applyFilter() {
    const { customerList, keyword, currentFilter } = this.data;
    let list = [...customerList];

    // 关键词搜索
    if (keyword) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (c.contact && c.contact.includes(keyword)) ||
        (c.industry && c.industry.includes(keyword))
      );
    }

    // 分类筛选
    switch (currentFilter) {
      case 'core':
        list = list.filter(c => c.isCore);
        break;
      case 'deal':
        list = list.filter(c => c.totalAmount > 0);
        break;
      case 'active':
        list = list.filter(c => c.daysSinceVisit <= 7);
        break;
    }

    this.setData({ filteredList: list });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, () => {
      this.applyFilter();
    });
  },

  // 搜索确认
  onSearchConfirm() {
    this.applyFilter();
  },

  // 切换筛选
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter }, () => {
      this.applyFilter();
    });
  },

  // 格式化最近拜访
  formatLastVisit(dateStr) {
    if (!dateStr) return '未拜访';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return diff + '天前';
    if (diff < 30) return Math.floor(diff / 7) + '周前';
    return d.getMonth() + 1 + '/' + d.getDate();
  },

  // 计算距今天数
  daysSince(dateStr) {
    if (!dateStr) return 999;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / 86400000);
  },

  // 跳转到客户详情
  goToCustomerDetail(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({ url: '/pages/visit/history?customer=' + encodeURIComponent(name) });
  },

  // 拨打电话
  callContact(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    }
  }
});
