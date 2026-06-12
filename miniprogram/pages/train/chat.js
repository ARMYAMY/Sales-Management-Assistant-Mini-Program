// pages/train/chat.js - 对话训练页
const app = getApp();

Page({
  data: {
    sessionId: '',
    scenario: '',
    benchmarkName: '张三',
    difficulty: '普通',
    scenarioDesc: '',
    messages: [],
    inputText: '',
    currentFeedback: null,
    scrollToId: '',
    isLoading: false,
    msgIdCounter: 0
  },

  onLoad(options) {
    const sessionId = options.sessionId;
    const scenario = decodeURIComponent(options.scenario || '');
    this.setData({ sessionId, scenario });
    this.loadSession();
  },

  // 加载会话
  async loadSession() {
    try {
      const result = await app.call('getTrainData', {
        action: 'session',
        sessionId: this.data.sessionId
      });

      const data = result.data || result;
      if (data && data.messages) {
        const messages = data.messages.map((m, i) => ({
          id: i,
          role: m.role,
          content: m.content,
          senderName: m.role === 'ai' ? (data.scenario?.customerName || '客户') : '我'
        }));

        this.setData({
          messages,
          msgIdCounter: messages.length,
          scenarioDesc: data.scenario?.description || '',
          benchmarkName: data.benchmarkName || '张三'
        });

        this.scrollToBottom();
      }
    } catch (err) {
      console.error('加载会话失败:', err);
      // 如果是新会话，显示开场白
      this.showOpening();
    }
  },

  // 显示开场白（如果是新会话）
  showOpening() {
    const openings = {
      '初次拜访': '你好，我是XX公司的采购负责人。听说你们的产品不错，想了解一下。',
      '需求挖掘': '我们现在确实有一些痛点，但不确定你们能不能解决。',
      '价格谈判': '你们的报价比A公司高了15%，这个差距太大了。',
      '异议处理': '我们之前用过类似的产品，效果不太好，有点担心。'
    };

    const content = openings[this.data.scenario] || '你好，我想了解一下你们的产品。';
    const msg = {
      id: 0,
      role: 'ai',
      content: content,
      senderName: '客户'
    };

    this.setData({
      messages: [msg],
      msgIdCounter: 1
    });
  },

  // 输入处理
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 发送消息
  async sendMessage() {
    const { inputText, isLoading, sessionId } = this.data;
    if (!inputText.trim() || isLoading) return;

    const userMsg = {
      id: this.data.msgIdCounter,
      role: 'user',
      content: inputText.trim(),
      senderName: '我'
    };

    const newMessages = [...this.data.messages, userMsg];
    const newCounter = this.data.msgIdCounter + 1;

    this.setData({
      messages: newMessages,
      inputText: '',
      isLoading: true,
      msgIdCounter: newCounter
    });

    this.scrollToBottom();

    // 显示 AI 正在输入
    const typingMsg = {
      id: newCounter,
      role: 'ai',
      content: '',
      senderName: '客户',
      isTyping: true
    };

    this.setData({
      messages: [...newMessages, typingMsg],
      msgIdCounter: newCounter + 1
    });

    try {
      const result = await app.call('trainChat', {
        sessionId: sessionId,
        message: userMsg.content
      });

      // 移除 typing，添加真实回复
      const msgsWithoutTyping = newMessages.filter(m => !m.isTyping);
      const aiMsg = {
        id: newCounter,
        role: 'ai',
        content: result.customerResponse || '（客户没有回应）',
        senderName: '客户'
      };

      this.setData({
        messages: [...msgsWithoutTyping, aiMsg],
        currentFeedback: result.feedback || null,
        isLoading: false
      });

      // 3秒后清除反馈
      if (result.feedback) {
        setTimeout(() => {
          this.setData({ currentFeedback: null });
        }, 8000);
      }

      this.scrollToBottom();
    } catch (err) {
      // 移除 typing
      const msgsWithoutTyping = newMessages.filter(m => !m.isTyping);
      this.setData({
        messages: msgsWithoutTyping,
        isLoading: false
      });
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    }
  },

  // 滚动到底部
  scrollToBottom() {
    this.setData({ scrollToId: 'chat-bottom' });
  },

  // 结束训练
  onEndTraining() {
    wx.showModal({
      title: '结束训练',
      content: '确定要结束本次训练吗？',
      confirmText: '结束',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          this.endTraining();
        }
      }
    });
  },

  // 调用结束训练
  async endTraining() {
    wx.showLoading({ title: '生成报告...' });

    try {
      const result = await app.call('endTrain', {
        sessionId: this.data.sessionId
      });

      wx.hideLoading();

      // 跳转到结果页
      wx.redirectTo({
        url: `/pages/train/result?sessionId=${this.data.sessionId}&score=${result.summary.totalScore}`
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '结束训练失败', icon: 'none' });
    }
  }
});
