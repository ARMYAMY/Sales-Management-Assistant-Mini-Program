// pages/dashboard/sales-detail.js - 销售详情页（含每日拜访记录+日报+周报）
Page({
  data: {
    name: '',
    salesId: '',
    stats: {
      totalVisits: 156,
      customerCount: 23,
      coreRatio: '10/10',
      avgScore: 85
    },
    // 按日期排列的拜访记录（最近7天）
    dailyRecords: [],
    missingDays: 0,
    missingDates: [],
    // 周报
    weeklyReport: null,
    activeTab: 'daily' // daily | weekly
  },

  onLoad(options) {
    const { name, id } = options;
    this.setData({
      name: name || '张三',
      salesId: id || ''
    });
    this.loadDetailData();
  },

  loadDetailData() {
    // 模拟加载该销售的每日拜访数据
    const dailyRecords = this.generateDailyRecords();
    const missingDates = dailyRecords.filter(d => !d.hasVisit).map(d => d.date);
    const weeklyReport = this.generateWeeklyReport(dailyRecords);

    this.setData({
      dailyRecords,
      missingDays: missingDates.length,
      missingDates,
      weeklyReport
    });
  },

  // 生成最近7天的每日记录
  generateDailyRecords() {
    const records = [];
    const today = new Date();
    // 模拟数据：不同销售有不同的提交模式
    const name = this.data.name;
    // 根据名字确定不同的拜访模式（固定seed效果）
    const hasVisitMap = {
      '张三': [true, true, true, true, true, false, false],  // 今天、昨天都交了
      '李四': [false, true, true, true, true, true, false],  // 今天没交
      '王五': [false, false, true, true, true, true, true],  // 今天昨天都没交
      '赵六': [false, true, false, true, false, true, false],// 间隔提交
      '钱七': [true, true, true, true, true, true, true]     // 全勤
    };
    const pattern = hasVisitMap[name] || [true, true, true, false, true, false, false];

    const demoVisits = {
      '张三': [
        { customer: '华为技术', stage: '需求洽谈', result: '达成意向', amount: 150000 },
        { customer: '中国移动', stage: '初次拜访', result: '建立联系', amount: 0 },
        { customer: '腾讯科技', stage: '方案演示', result: '待反馈', amount: 80000 },
        { customer: '阿里巴巴', stage: '商务谈判', result: '推进中', amount: 200000 },
        { customer: '字节跳动', stage: '需求洽谈', result: '达成意向', amount: 120000 }
      ],
      '李四': [
        { customer: '招商银行', stage: '初次拜访', result: '建立联系', amount: 0 },
        { customer: '比亚迪', stage: '方案演示', result: '待反馈', amount: 50000 },
        { customer: '平安保险', stage: '商务谈判', result: '推进中', amount: 300000 },
        { customer: '国家电网', stage: '需求洽谈', result: '达成意向', amount: 180000 }
      ],
      '王五': [
        { customer: '京东集团', stage: '初次拜访', result: '建立联系', amount: 0 },
        { customer: '美的集团', stage: '方案演示', result: '待反馈', amount: 90000 },
        { customer: '海尔智家', stage: '商务谈判', result: '推进中', amount: 250000 }
      ],
      '赵六': [
        { customer: '小米科技', stage: '初次拜访', result: '建立联系', amount: 0 },
        { customer: 'OPPO', stage: '需求洽谈', result: '达成意向', amount: 100000 },
        { customer: 'VIVO', stage: '方案演示', result: '待反馈', amount: 60000 }
      ],
      '钱七': [
        { customer: '联想集团', stage: '初次拜访', result: '建立联系', amount: 0 },
        { customer: '中兴通讯', stage: '需求洽谈', result: '达成意向', amount: 110000 },
        { customer: '科大讯飞', stage: '方案演示', result: '待反馈', amount: 70000 }
      ]
    };
    const visits = demoVisits[name] || demoVisits['张三'];
    let visitIdx = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayName = dayNames[d.getDay()];
      const isToday = i === 0;
      const hasVisit = pattern[6 - i];

      let visitsToday = [];
      if (hasVisit && visitIdx < visits.length) {
        // 随机分配1-2条拜访记录
        const count = Math.random() > 0.5 ? 2 : 1;
        for (let j = 0; j < count && visitIdx < visits.length; j++) {
          const v = visits[visitIdx];
          visitsToday.push({
            id: `${name}-${visitIdx}`,
            customer: v.customer,
            stage: v.stage,
            result: v.result,
            amount: v.amount,
            amountFormatted: v.amount >= 10000 ? (v.amount / 10000).toFixed(1) + '万' : String(v.amount),
            time: `${9 + Math.floor(Math.random() * 6)}:${Math.floor(Math.random() * 6)}0`
          });
          visitIdx++;
        }
      }

      records.push({
        date: dateStr,
        dayName,
        isToday,
        hasVisit,
        visits: visitsToday,
        // 日报内容（如果有拜访就有日报）
        dailyReport: hasVisit ? this.generateDailyReport(visitsToday, dateStr) : null
      });
    }
    return records;
  },

  generateDailyReport(visits, date) {
    const summary = visits.map(v =>
      `拜访${v.customer}，${v.stage}，${v.result}${v.amount > 0 ? '，涉及金额' + (v.amount / 10000).toFixed(1) + '万' : ''}`
    ).join('；');
    return {
      summary,
      nextPlan: '继续跟进意向客户，准备下周方案演示',
      mood: '积极'
    };
  },

  generateWeeklyReport(dailyRecords) {
    const hasVisits = dailyRecords.filter(d => d.hasVisit);
    const totalVisits = hasVisits.reduce((s, d) => s + d.visits.length, 0);
    const totalAmount = hasVisits.reduce((s, d) =>
      s + d.visits.reduce((ss, v) => ss + (v.amount || 0), 0), 0);
    const customers = [...new Set(hasVisits.flatMap(d => d.visits.map(v => v.customer)))];
    const stages = {};
    hasVisits.forEach(d => {
      d.visits.forEach(v => {
        stages[v.stage] = (stages[v.stage] || 0) + 1;
      });
    });

    return {
      period: '本周',
      totalVisits,
      visitDays: hasVisits.length,
      missingDays: dailyRecords.length - hasVisits.length,
      totalAmount,
      amountFormatted: totalAmount >= 10000 ? (totalAmount / 10000).toFixed(1) + '万' : String(totalAmount),
      customerCount: customers.length,
      customers: customers.slice(0, 5),
      stageBreakdown: Object.entries(stages).map(([name, count]) => ({ name, count })),
      highlights: [
        `本周共完成 ${totalVisits} 次客户拜访，覆盖 ${customers.length} 家客户`,
        `重点推进阶段：${Object.entries(stages).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无'}`,
        `本周涉及商机金额：${totalAmount >= 10000 ? (totalAmount / 10000).toFixed(1) + '万' : String(totalAmount)}`
      ]
    };
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  goBack() {
    wx.navigateBack();
  }
});
