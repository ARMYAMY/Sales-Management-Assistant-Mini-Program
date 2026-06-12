// pages/distill/result.js - 蒸馏结果页（设计文档4.3.5）
Page({
  data: {
    salesName: '',
    qualityScore: 78,
    recordCount: 156,
    workExpanded: false,
    personaExpanded: false,
    workData: {
      customerGroup: '制药/器械行业',
      methods: [
        '线索获取：行业会议+老客户转介绍',
        '需求挖掘：SPIN提问法',
        '方案呈现：数据对比+ROI计算',
        '异议处理：先认同再重构价值',
        '谈判成交：阶梯式让步+打包方案'
      ]
    },
    personaData: {
      style: '直接、数据驱动',
      catchphrase: '"实话跟你说""咱们算笔账"',
      interaction: '先给价值再建立关系',
      negotiation: '不让价，加服务'
    }
  },

  onLoad(options) {
    const { name } = options;
    this.setData({ salesName: name || '张三' });
  },

  toggleWork() {
    this.setData({ workExpanded: !this.data.workExpanded });
  },

  togglePersona() {
    this.setData({ personaExpanded: !this.data.personaExpanded });
  },

  saveToLibrary() {
    wx.showToast({ title: '已保存到话术库', icon: 'success' });
  },

  reAnalyze() {
    wx.navigateBack({ delta: 2 });
  },

  goBack() {
    wx.navigateBack();
  }
});
