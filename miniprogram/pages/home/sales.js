// pages/home/sales.js
const app = getApp();

Page({
  data: {
    // 用户信息
    userName: '',
    avatarUrl: '',
    greeting: '你好',
    weekNumber: 0,
    weekRange: '',

    // 指标数据
    visitCount: 0,
    visitTarget: 5,
    visitRate: 0,
    coreDone: 0,
    coreTotal: 0,
    coreRate: 0,
    trainScore: 0,
    scoreTrend: 0,
    absScoreTrend: 0,
    complianceWeeks: 0,

    // 待办
    todos: [],

    // 最近拜访
    visitList: [],
    loading: true,

    // 日报提醒
    dailyReportSubmitted: true,
    showDailyReminder: false
  },

  onLoad() {
    this.calcGreeting();
    this.calcWeekInfo();
    this.loadData();
  },

  onShow() {
    // 每次切回页面刷新数据
    if (typeof this.loadData === 'function') {
      this.loadData();
    }
    // 检查日报提交状态
    this.checkDailyReport();
  },

  // 检查当天日报是否已提交
  checkDailyReport() {
    const that = this;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 先检查本地缓存（今天是否已提醒过）
    const remindedKey = 'daily_reminder_' + todayStr;
    const alreadyReminded = wx.getStorageSync(remindedKey);

    app.call('getVisitList', {
      page: 1,
      page_size: 1,
      filter: 'today'
    }).then(data => {
      const hasTodayVisit = (data.list || []).length > 0;
      const hour = new Date().getHours();
      const isLate = hour >= 22;

      that.setData({
        dailyReportSubmitted: hasTodayVisit,
        showDailyReminder: !hasTodayVisit
      });

      // 晚上10点后且当天未提交，弹强提醒（每天只弹一次）
      if (!hasTodayVisit && isLate && !alreadyReminded) {
        wx.setStorageSync(remindedKey, true);
        wx.showModal({
          title: '日报提醒',
          content: '今天还没有录入拜访记录，请及时补录日报。',
          confirmText: '去录入',
          cancelText: '知道了',
          success(res) {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/visit/record' });
            }
          }
        });
      }
    }).catch(() => {
      // 接口失败时不打扰用户
    });
  },

  // 关闭日报提醒横幅
  closeDailyReminder() {
    this.setData({ showDailyReminder: false });
  },

  // 从提醒横幅跳转录入
  goToRecordFromReminder() {
    wx.navigateTo({ url: '/pages/visit/record' });
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 计算问候语
  calcGreeting() {
    const h = new Date().getHours();
    let g = '你好';
    if (h < 6) g = '夜深了';
    else if (h < 9) g = '早上好';
    else if (h < 12) g = '上午好';
    else if (h < 14) g = '中午好';
    else if (h < 18) g = '下午好';
    else g = '晚上好';
    const user = app.globalData.user;
    this.setData({
      greeting: g,
      userName: user.name || '销售'
    });
  },

  // 计算本周序号和日期范围
  calcWeekInfo() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const weekNum = Math.ceil((diff / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);

    // 本周一和周日
    const day = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const range = `${mon.getMonth() + 1}/${mon.getDate()}日-${sun.getMonth() + 1}/${sun.getDate()}日`;
    this.setData({ weekNumber: weekNum, weekRange: range });
  },

  // 加载所有数据
  loadData() {
    const that = this;
    that.setData({ loading: true });

    return app.call('getDashboard').then(data => {
      const coreRate = data.coreTotal > 0
        ? Math.min(100, Math.round(data.coreDone / data.coreTotal * 100))
        : 0;
      const visitRate = data.visitTarget > 0
        ? Math.min(100, Math.round(data.visitCount / data.visitTarget * 100))
        : 0;

      that.setData({
        visitCount: data.visitCount || 0,
        visitTarget: data.visitTarget || app.globalData.config.weekly_visit_target || 5,
        visitRate,
        coreDone: data.coreDone || 0,
        coreTotal: data.coreTotal || 0,
        coreRate,
        trainScore: data.trainScore || 0,
        scoreTrend: data.scoreTrend || 0,
        absScoreTrend: Math.abs(data.scoreTrend || 0),
        complianceWeeks: data.complianceWeeks || 0,
        todos: data.todos || [],
        visitList: (data.recentVisits || []).map(v => ({
          ...v,
          timeLabel: that.formatTime(v.visitDate)
        })),
        loading: false
      });
    }).catch(() => {
      // 接口失败时展示骨架屏占位
      that.setData({ loading: false });
    });
  },

  // 时间格式化
  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 3600000;
    if (diff < 1) return '刚刚';
    if (diff < 24) return Math.round(diff) + '小时前';
    if (diff < 48) return '昨天';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  // 导航
  goToRecord() { wx.navigateTo({ url: '/pages/visit/record' }); },
  goToVoiceRecord() { wx.navigateTo({ url: '/pages/visit/voice-confirm' }); },
  goToTrain() { wx.switchTab({ url: '/pages/train/index' }); },
  goToHistory() { wx.navigateTo({ url: '/pages/visit/history' }); },
  goToCustomers() { wx.navigateTo({ url: '/pages/customer/list' }); },
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/visit/detail?id=' + id });
  },
  goToReport() { wx.navigateTo({ url: '/pages/report/list/list' }); },

  onTodoTap(e) {
    const item = e.currentTarget.dataset.item;
    if (item.action === 'visit') {
      wx.navigateTo({ url: '/pages/visit/record' });
    } else if (item.action === 'train') {
      wx.switchTab({ url: '/pages/train/index' });
    }
  }
});
