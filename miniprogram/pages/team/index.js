// pages/team/index.js - 团队管理（按设计文档4.3.2）
const app = getApp();

Page({
  data: {
    searchKeyword: '',
    members: [],
    allMembers: [],
    sortBy: 'visit', // visit | compliance | score
    loading: true
  },

  onLoad() {
    this.loadTeamData();
  },

  onShow() {
    this.loadTeamData();
  },

  async loadTeamData() {
    this.setData({ loading: true });
    try {
      const result = await app.call('getTeamMembers', {});
      const hasData = result && result.members && result.members.length > 0;

      if (hasData) {
        const enriched = result.members.map(m => this.enrichMember(m));
        this.setData({
          allMembers: enriched,
          members: this.sortMembers(enriched, this.data.sortBy)
        });
      } else {
        this.loadDemoData();
      }
    } catch (err) {
      console.error('加载团队数据失败:', err);
      this.loadDemoData();
    }
    this.setData({ loading: false });
  },

  enrichMember(m) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return {
      ...m,
      avatarColor: colors[(m.name || '').length % colors.length],
      // demo扩展字段
      totalVisits: m.visitCount || 0,
      customerCount: m.customerCount || Math.floor((m.visitCount || 0) * 0.7),
      coreCustomers: m.coreCustomers || Math.floor((m.visitCount || 0) * 0.4),
      coreTarget: 10,
      avgScore: m.avgScore || 0
    };
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.applySearch();
  },

  applySearch() {
    const kw = this.data.searchKeyword.trim();
    let list = [...this.data.allMembers];
    if (kw) {
      list = list.filter(m => m.name.includes(kw));
    }
    this.setData({ members: this.sortMembers(list, this.data.sortBy) });
  },

  setSort(e) {
    const sortBy = e.currentTarget.dataset.sort;
    this.setData({ sortBy });
    this.setData({
      members: this.sortMembers([...this.data.members], sortBy)
    });
  },

  sortMembers(list, sortBy) {
    return list.sort((a, b) => {
      if (sortBy === 'visit') return b.totalVisits - a.totalVisits;
      if (sortBy === 'score') return b.avgScore - a.avgScore;
      if (sortBy === 'compliance') {
        const ra = a.coreCustomers / Math.max(a.coreTarget, 1);
        const rb = b.coreCustomers / Math.max(b.coreTarget, 1);
        return rb - ra;
      }
      return 0;
    });
  },

  // 核心客户
  goCoreCustomers(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/team/core-customers?id=${id}` });
  },

  // 蒸馏
  goDistill(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({ url: `/pages/distill/trigger?id=${id}&name=${name}` });
  },

  // 详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/dashboard/sales-detail?id=${id}` });
  },

  // Demo数据
  loadDemoData() {
    const demo = [
      {
        _id: '1', name: '张三', status: 'high',
        totalVisits: 156, customerCount: 23, coreCustomers: 10, coreTarget: 10, avgScore: 85,
        lastActivity: '昨天完成3次客户拜访',
        todaySubmitted: true
      },
      {
        _id: '2', name: '李四', status: 'high',
        totalVisits: 98, customerCount: 15, coreCustomers: 8, coreTarget: 10, avgScore: 78,
        lastActivity: '今天录入1次拜访',
        todaySubmitted: true
      },
      {
        _id: '3', name: '王五', status: 'normal',
        totalVisits: 72, customerCount: 12, coreCustomers: 6, coreTarget: 10, avgScore: 72,
        lastActivity: '2天前完成AI训练',
        todaySubmitted: false
      },
      {
        _id: '4', name: '赵六', status: 'warning',
        totalVisits: 45, customerCount: 8, coreCustomers: 5, coreTarget: 10, avgScore: 65,
        lastActivity: '7天前录入拜访',
        todaySubmitted: false
      },
      {
        _id: '5', name: '钱七', status: 'normal',
        totalVisits: 38, customerCount: 7, coreCustomers: 3, coreTarget: 10, avgScore: 60,
        lastActivity: '今天完成2次拜访',
        todaySubmitted: true
      }
    ];
    const enriched = demo.map(m => this.enrichMember(m));
    this.setData({
      allMembers: enriched,
      members: this.sortMembers(enriched, 'visit')
    });
  }
});
