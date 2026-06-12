// pages/visit/voice-confirm.js
const app = getApp();

Page({
  data: {
    // 录音状态
    recording: false,
    canRecord: true,
    recordTime: 0,
    recognizedText: '',
    parsedData: {},
    tempFilePath: '',
    loading: false,

    // 表单数据（从语音解析 + 用户补充）
    customerName: '',
    contactPerson: '',
    visitDate: '',
    visitTime: '',
    visitLocation: '',
    purposeIndex: -1,
    resultIndex: -1,
    background: '',
    content: '',
    nextStep: '',
    amount: '',
    amountSensitive: false,
    competitorInfo: '',
    isCoreCustomer: false,

    // 选项
    locationOptions: ['上门', '电话', '线上', '其他'],
    purposeOptions: ['初次拜访', '需求挖掘', '方案演示', '商务谈判', '合同签订', '售后服务', '其他'],
    resultOptions: ['达成意向', '推进中', '待决策', '已成交', '未达成', '其他'],

    // 提交状态
    canSubmit: false,

    // 当前步骤：recording（录音）| editing（编辑表单）
    step: 'recording'
  },

  recorderManager: null,
  recordTimer: null,

  onLoad() {
    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStop(this.onRecordStop.bind(this));
    this.recorderManager.onError(this.onRecordError.bind(this));
  },

  onUnload() {
    this.clearRecordTimer();
  },

  // ========== 录音相关 ==========

  onStartRecord() {
    if (this.data.recording || !this.data.canRecord) return;

    const that = this;
    wx.authorize({
      scope: 'scope.record',
      success() {
        that.setData({ recording: true, recordTime: 0 });
        that.startRecordTimer();

        that.recorderManager.start({
          duration: 60000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: 'mp3'
        });
      },
      fail() {
        wx.showModal({
          title: '需要录音权限',
          content: '请在设置中开启录音权限',
          success(res) {
            if (res.confirm) wx.openSetting();
          }
        });
      }
    });
  },

  onStopRecord() {
    if (!this.data.recording) return;
    this.setData({ recording: false });
    this.clearRecordTimer();
    this.recorderManager.stop();
  },

  onRecordStop(res) {
    const tempFilePath = res.tempFilePath;
    this.setData({ tempFilePath });
    this.uploadAndRecognize(tempFilePath);
  },

  onRecordError(err) {
    console.error('录音错误:', err);
    this.setData({ recording: false, canRecord: true });
    this.clearRecordTimer();
    wx.showToast({ title: '录音失败，请重试', icon: 'none' });
  },

  startRecordTimer() {
    this.recordTimer = setInterval(() => {
      const newTime = this.data.recordTime + 1;
      this.setData({ recordTime: newTime });
      if (newTime >= 60) this.onStopRecord();
    }, 1000);
  },

  clearRecordTimer() {
    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = null;
    }
  },

  // ========== 上传并识别 ==========

  uploadAndRecognize(filePath) {
    this.setData({ loading: true });
    wx.showLoading({ title: '识别中...' });

    const cloudPath = `voice/${Date.now()}.mp3`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath
    }).then(uploadRes => {
      const fileID = uploadRes.fileID;
      return app.call('recognizeSpeech', { fileID });
    }).then(recognizeRes => {
      const text = recognizeRes.text;
      this.setData({ recognizedText: text });
      return app.call('parseVisitText', { text });
    }).then(parseRes => {
      parseRes.confidencePercent = parseRes.confidence
        ? Math.round(parseRes.confidence * 100)
        : 0;
      this.setData({
        parsedData: parseRes,
        loading: false
      });
      wx.hideLoading();

      // 自动填充解析结果到表单
      this.fillParsedData(parseRes);

      // 切换到编辑步骤
      this.setData({ step: 'editing' });
    }).catch(err => {
      console.error('识别失败:', err);
      wx.hideLoading();
      wx.showToast({ title: err.message || '识别失败', icon: 'none' });
      this.setData({ loading: false });
    });
  },

  // 将解析结果填充到表单
  fillParsedData(data) {
    const purposeOptions = this.data.purposeOptions;
    const resultOptions = this.data.resultOptions;
    const purposeIndex = purposeOptions.indexOf(data.purpose || '');
    const resultIndex = resultOptions.indexOf(data.result || '');

    this.setData({
      customerName: data.customer_name || '',
      contactPerson: data.contact_person || '',
      visitDate: data.visit_date || '',
      visitTime: data.visit_time || '',
      visitLocation: data.location || '',
      purposeIndex: purposeIndex >= 0 ? purposeIndex : -1,
      resultIndex: resultIndex >= 0 ? resultIndex : -1,
      content: this.data.recognizedText || '',
      nextStep: data.next_step || '',
      amount: data.amount ? String(data.amount) : '',
      competitorInfo: data.competitor_info || ''
    });
    this.checkCanSubmit();
  },

  // 重新录制
  onReRecord() {
    this.setData({
      step: 'recording',
      recognizedText: '',
      parsedData: {},
      tempFilePath: '',
      recordTime: 0,
      // 清空表单
      customerName: '',
      contactPerson: '',
      visitDate: '',
      visitTime: '',
      visitLocation: '',
      purposeIndex: -1,
      resultIndex: -1,
      background: '',
      content: '',
      nextStep: '',
      amount: '',
      amountSensitive: false,
      competitorInfo: '',
      isCoreCustomer: false,
      canSubmit: false
    });
  },

  // ========== 表单编辑相关 ==========

  onCustomerInput(e) {
    this.setData({ customerName: e.detail.value });
    this.checkCanSubmit();
  },

  onContactInput(e) {
    this.setData({ contactPerson: e.detail.value });
    this.checkCanSubmit();
  },

  onDateChange(e) {
    this.setData({ visitDate: e.detail.value });
    this.checkCanSubmit();
  },

  onTimeChange(e) {
    this.setData({ visitTime: e.detail.value });
    this.checkCanSubmit();
  },

  onLocationSelect(e) {
    this.setData({ visitLocation: e.currentTarget.dataset.value });
    this.checkCanSubmit();
  },

  onPurposeChange(e) {
    this.setData({ purposeIndex: Number(e.detail.value) });
    this.checkCanSubmit();
  },

  onResultChange(e) {
    this.setData({ resultIndex: Number(e.detail.value) });
    this.checkCanSubmit();
  },

  onBackgroundInput(e) { this.setData({ background: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onNextStepInput(e) { this.setData({ nextStep: e.detail.value }); },
  onAmountInput(e) { this.setData({ amount: e.detail.value }); },
  onCompetitorInput(e) { this.setData({ competitorInfo: e.detail.value }); },

  onToggleSensitive() {
    this.setData({ amountSensitive: !this.data.amountSensitive });
  },

  onToggleCore() {
    if (this.data.isCoreCustomer) return;
    this.setData({ isCoreCustomer: !this.data.isCoreCustomer });
  },

  // 校验必填
  checkCanSubmit() {
    const d = this.data;
    const ok = d.customerName.length > 0
      && d.contactPerson.length > 0
      && d.visitDate.length > 0
      && d.visitTime.length > 0
      && d.visitLocation.length > 0
      && d.purposeIndex >= 0
      && d.resultIndex >= 0;
    this.setData({ canSubmit: ok });
  },

  // 提交
  onSubmit() {
    if (!this.data.canSubmit || this.data.loading) return;
    this.setData({ loading: true });

    const d = this.data;
    const payload = {
      customer_name: d.customerName,
      contact_person: d.contactPerson,
      visit_date: d.visitDate + 'T' + d.visitTime + ':00+08:00',
      location: d.visitLocation,
      stage: d.purposeOptions[d.purposeIndex],
      intent: '',
      result: d.resultOptions[d.resultIndex],
      background: d.background,
      content: d.content,
      next_step: d.nextStep,
      amount: d.amount ? Number(d.amount) : null,
      amount_sensitive: d.amountSensitive,
      competitor_info: d.competitorInfo,
      is_core_customer: d.isCoreCustomer
    };

    app.call('createVisit', { data: payload }).then(() => {
      wx.showToast({ title: '拜访记录已保存', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/sales' });
      }, 1500);
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    });
  }
});
