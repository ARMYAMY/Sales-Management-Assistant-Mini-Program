// pages/visit/record.js
const app = getApp();

Page({
  data: {
    // 表单数据
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

    // 日期限制：只允许今天或昨天
    dateMin: '',
    dateMax: '',

    // 选项
    locationOptions: ['上门', '电话', '线上', '其他'],
    purposeOptions: ['初次拜访', '需求挖掘', '方案演示', '商务谈判', '合同签订', '售后服务', '其他'],
    resultOptions: ['达成意向', '推进中', '待决策', '已成交', '未达成', '其他'],

    // 搜索建议
    showSuggest: false,
    customerSuggest: [],

    // 提交状态
    canSubmit: false,
    loading: false,

    // 编辑模式
    editMode: false,
    editId: ''
  },

  onLoad(options) {
    // 计算日期边界：只允许今天或昨天
    const now = new Date();
    const today = this.formatDate(now);
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const yesterday = this.formatDate(yest);

    // 编辑模式：从详情页跳转
    if (options.id) {
      this.setData({ editMode: true, editId: options.id, dateMin: yesterday, dateMax: today });
      this.loadVisitData(options.id);
      return;
    }

    // 从待办跳转时，自动填入客户名
    if (options.customer) {
      this.setData({
        customerName: decodeURIComponent(options.customer),
        isCoreCustomer: true,
        dateMin: yesterday,
        dateMax: today
      });
      this.checkCanSubmit();
    } else {
      this.setData({ dateMin: yesterday, dateMax: today });
    }

    // 语音录入页现在直接提交，不再通过 storage 回填
    wx.removeStorageSync('voiceFillData');
  },

  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 加载已有拜访数据（编辑模式）
  loadVisitData(id) {
    const that = this;
    that.setData({ loading: true });
    app.call('getVisitDetail', { id }).then(data => {
      const purposeOptions = that.data.purposeOptions;
      const resultOptions = that.data.resultOptions;
      const purposeIndex = purposeOptions.indexOf(data.stage || '');
      const resultIndex = resultOptions.indexOf(data.result || '');

      const visitDate = data.visit_date ? data.visit_date.split('T')[0] : '';
      const visitTime = data.visit_date ? data.visit_date.split('T')[1].slice(0, 5) : '';

      that.setData({
        customerName: data.customer_name || '',
        contactPerson: data.contact_person || '',
        visitDate: visitDate,
        visitTime: visitTime,
        visitLocation: data.location || '',
        purposeIndex: purposeIndex >= 0 ? purposeIndex : -1,
        resultIndex: resultIndex >= 0 ? resultIndex : -1,
        background: data.background || '',
        content: data.content || '',
        nextStep: data.next_step || '',
        amount: data.amount ? String(data.amount) : '',
        amountSensitive: data.amount_sensitive || false,
        competitorInfo: data.competitor_info || '',
        isCoreCustomer: data.is_core_customer || false,
        loading: false
      });
      that.checkCanSubmit();
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      that.setData({ loading: false });
    });
  },

  // 从语音数据填充表单（已废弃，语音确认页直接提交）
  fillFromVoice(data) {
    // 语音确认页现在直接提交，不再通过 storage 回填
    console.log('语音数据已直接在确认页处理');
  },

  // 客户名称输入 + 搜索建议
  onCustomerInput(e) {
    const v = e.detail.value;
    this.setData({ customerName: v, showSuggest: v.length > 0 });
    if (v.length > 0) {
      this.fetchCustomerSuggest(v);
    }
    this.checkCanSubmit();
  },

  fetchCustomerSuggest(keyword) {
    app.call('getCustomers', { keyword, limit: 10 }).then(res => {
      this.setData({ customerSuggest: res || [] });
    }).catch(() => {});
  },

  onShowCustomerSuggest() { this.setData({ showSuggest: true }); },
  onSelectCustomer(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({ customerName: name, showSuggest: false });
    this.checkCanSubmit();
  },

  // 联系人
  onContactInput(e) {
    this.setData({ contactPerson: e.detail.value });
    this.checkCanSubmit();
  },

  // 日期 / 时间
  onDateChange(e) { this.setData({ visitDate: e.detail.value }); this.checkCanSubmit(); },
  onTimeChange(e) { this.setData({ visitTime: e.detail.value }); this.checkCanSubmit(); },

  // 地点
  onLocationSelect(e) {
    this.setData({ visitLocation: e.currentTarget.dataset.value });
    this.checkCanSubmit();
  },

  // 拜访目的
  onPurposeChange(e) {
    this.setData({ purposeIndex: Number(e.detail.value) });
    this.checkCanSubmit();
  },

  // 拜访结果
  onResultChange(e) {
    this.setData({ resultIndex: Number(e.detail.value) });
    this.checkCanSubmit();
  },

  // 选填字段
  onBackgroundInput(e) { this.setData({ background: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onNextStepInput(e) { this.setData({ nextStep: e.detail.value }); },
  onAmountInput(e) { this.setData({ amount: e.detail.value }); },
  onCompetitorInput(e) { this.setData({ competitorInfo: e.detail.value }); },

  onToggleSensitive() { this.setData({ amountSensitive: !this.data.amountSensitive }); },
  onToggleCore() {
    if (this.data.isCoreCustomer) return; // 核心客户不可取消
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

    // 编辑模式调用 updateVisit，新增模式调用 createVisit
    const apiName = d.editMode ? 'updateVisit' : 'createVisit';
    const apiData = d.editMode ? { id: d.editId, data: payload } : { data: payload };

    app.call(apiName, apiData).then(res => {
      // 新增拜访记录后，自动划掉"填写今日拜访记录"默认待办
      if (!d.editMode) {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const defaultId = 'default_visit_' + todayStr;
        let todos = wx.getStorageSync('todo_list') || [];
        const idx = todos.findIndex(t => t.id === defaultId);
        if (idx >= 0) {
          todos[idx].done = true;
          wx.setStorageSync('todo_list', todos);
        }
        // 缓存今日已拜访标记
        wx.setStorageSync('today_visit_cached', true);
      }

      const msg = d.editMode ? '修改已保存' : '拜访记录已保存';
      wx.showToast({ title: msg, icon: 'success' });
      setTimeout(() => {
        if (d.editMode) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/home/sales' });
        }
      }, 1500);
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    });
  },

  // 语音录入
  goToVoice() {
    wx.navigateTo({ url: '/pages/visit/voice-confirm' });
  },

  onHide() { this.setData({ showSuggest: false }); },
  onUnload() { this.setData({ showSuggest: false }); }
});
