// pages/distill/trigger.js - 蒸馏发起页（设计文档4.3.3）
Page({
  data: {
    salesName: '',
    salesId: '',
    checking: true,
    gates: [],
    canStart: false,
    dateRange: { start: '2025-09-01', end: '2026-06-12' },
    recordCount: 156,
    analysisDims: [
      { name: 'Work: 方法论/话术/报价策略', checked: true },
      { name: 'Persona: 风格/互动/决策模式', checked: true }
    ]
  },

  onLoad(options) {
    const { id, name } = options;
    this.setData({ salesId: id || '', salesName: name || '张三' });
    this.runGateCheck();
  },

  runGateCheck() {
    // 模拟数据检查动画
    const gates = [
      { name: '数据源检查', status: 'checking', detail: '' },
      { name: '拜访记录', status: 'pending', detail: '' },
      { name: '质量评分', status: 'pending', detail: '' },
      { name: '覆盖客户', status: 'pending', detail: '' },
      { name: '覆盖阶段', status: 'pending', detail: '' },
      { name: '客户多样性', status: 'pending', detail: '' }
    ];
    this.setData({ gates, checking: true, canStart: false });

    // 逐个检查动画
    const results = [
      { name: '数据源检查', status: 'pass', detail: '通过' },
      { name: '拜访记录', status: 'pass', detail: '156条 (≥8)' },
      { name: '质量评分', status: 'warn', detail: '72/100' },
      { name: '覆盖客户', status: 'pass', detail: '23个 (≥2)' },
      { name: '覆盖阶段', status: 'pass', detail: '5个 (≥3)' },
      { name: '客户多样性', status: 'warn', detail: '仅3个行业' }
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= results.length) {
        clearInterval(interval);
        const allFail = results.every(r => r.status === 'fail');
        this.setData({ checking: false, canStart: !allFail });
        return;
      }
      const newGates = [...this.data.gates];
      newGates[i] = results[i];
      this.setData({ gates: newGates });
      i++;
    }, 400);
  },

  startDistill() {
    if (!this.data.canStart) return;
    wx.navigateTo({
      url: `/pages/distill/progress?id=${this.data.salesId}&name=${this.data.salesName}`
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
