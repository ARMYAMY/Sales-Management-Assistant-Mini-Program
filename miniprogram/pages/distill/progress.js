// pages/distill/progress.js - 蒸馏进度页（设计文档4.3.4）
Page({
  data: {
    salesName: '',
    progress: 0,
    currentStep: '准备中...',
    steps: [],
    estimatedTime: '3分钟',
    timer: null
  },

  onLoad(options) {
    const { id, name } = options;
    this.setData({
      salesName: name || '张三',
      steps: [
        { name: '职责范围', status: 'pending' },
        { name: '销售流程方法', status: 'pending' },
        { name: '报价策略', status: 'pending' },
        { name: '客户分级管理', status: 'pending' },
        { name: '关键话术', status: 'pending' },
        { name: '经验教训', status: 'pending' }
      ]
    });
    this.startProgress();
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer);
  },

  startProgress() {
    let progress = 0;
    const steps = [...this.data.steps];
    let currentStepIndex = 0;

    const timer = setInterval(() => {
      progress += Math.floor(Math.random() * 5) + 2;
      if (progress > 100) progress = 100;

      // 更新步骤状态
      const stepIndex = Math.floor(progress / 17);
      if (stepIndex > currentStepIndex && stepIndex < steps.length) {
        for (let i = 0; i < stepIndex; i++) {
          steps[i].status = 'done';
        }
        steps[stepIndex].status = 'running';
        currentStepIndex = stepIndex;
      }

      const currentStep = steps.find(s => s.status === 'running');
      const stepText = currentStep ? `正在分析 ${currentStep.name}...` : '分析完成';
      const remaining = Math.max(1, Math.ceil((100 - progress) / 20));

      this.setData({
        progress,
        currentStep: stepText,
        steps,
        estimatedTime: `${remaining} 分钟`
      });

      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/distill/result?name=${this.data.salesName}`
          });
        }, 800);
      }
    }, 300);

    this.setData({ timer });
  },

  minimize() {
    wx.navigateBack();
  }
});
