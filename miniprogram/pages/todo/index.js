// pages/todo/index.js - 今日待办管理页
const app = getApp();

Page({
  data: {
    todos: [],
    newTodo: '',
    showAdd: false,
    todayStr: ''
  },

  onLoad() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ todayStr });
    this.loadTodos();
  },

  onShow() {
    this.loadTodos();
  },

  // 从本地存储加载待办
  loadTodos() {
    const todos = wx.getStorageSync('todo_list') || [];
    // 过滤掉已过期一天的自定义待办（默认待办不过期）
    const now = new Date();
    const validTodos = todos.filter(t => {
      if (t.type === 'default') return true; // 默认待办不过期
      if (!t.date) return true;
      const tDate = new Date(t.date);
      const diff = (now - tDate) / 86400000;
      return diff < 7; // 自定义待办保留7天
    });
    this.setData({
      todos: validTodos,
      completedCount: validTodos.filter(t => t.done).length
    });
    wx.setStorageSync('todo_list', validTodos);
  },

  // 切换待办完成状态
  toggleTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todos = this.data.todos.map(t => {
      if (t.id === id) {
        return { ...t, done: !t.done };
      }
      return t;
    });
    this.setData({ todos, completedCount: todos.filter(t => t.done).length });
    wx.setStorageSync('todo_list', todos);
  },

  // 显示添加输入框
  showAddInput() {
    this.setData({ showAdd: true });
  },

  // 隐藏添加输入框
  hideAddInput() {
    this.setData({ showAdd: false, newTodo: '' });
  },

  // 输入新待办
  onNewTodoInput(e) {
    this.setData({ newTodo: e.detail.value });
  },

  // 添加待办
  addTodo() {
    const text = this.data.newTodo.trim();
    if (!text) {
      wx.showToast({ title: '请输入待办内容', icon: 'none' });
      return;
    }
    const todos = [...this.data.todos];
    todos.push({
      id: 'custom_' + Date.now(),
      text,
      type: 'custom',
      done: false,
      date: this.data.todayStr,
      createTime: Date.now()
    });
    this.setData({ todos, showAdd: false, newTodo: '', completedCount: todos.filter(t => t.done).length });
    wx.setStorageSync('todo_list', todos);
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  // 删除待办
  deleteTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todos = this.data.todos.filter(t => t.id !== id);
    this.setData({ todos, completedCount: todos.filter(t => t.done).length });
    wx.setStorageSync('todo_list', todos);
  },

  // 长按删除提示
  onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(t => t.id === id);
    if (!todo) return;
    wx.showModal({
      title: '删除待办',
      content: `确定删除"${todo.text}"？`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          this.deleteTodo({ currentTarget: { dataset: { id } } });
        }
      }
    });
  }
});
