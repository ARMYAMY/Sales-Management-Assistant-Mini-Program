// pages/train/select-benchmark.js
const app = getApp();

Page({
  data: {
    benchmarks: [
      { slug: 'topsales.zhang-san', name: '张三', avatar: '👨', methodology: '大客户销售方法论', version: 3, recordCount: 156, score: 78, tags: ['制药/器械', '中等狼性'], isDefault: true, selected: true },
      { slug: 'topsales.li-si', name: '李四', avatar: '👩', methodology: '渠道拓展方法论', version: 2, recordCount: 98, score: 82, tags: ['耗材/流通', '高狼性'], isDefault: false, selected: false },
      { slug: 'topsales.wang-wu', name: '王五', avatar: '👨', methodology: 'SaaS AE 方法论', version: 1, recordCount: 56, score: 65, tags: ['软件/SaaS', '咨询型'], isDefault: false, selected: false }
    ],
    selectedSlug: 'topsales.zhang-san'
  },

  onLoad() {
    this.loadBenchmarks();
  },

  async loadBenchmarks() {
    try {
      const result = await app.call('getTrainData', { action: 'benchmarks' });
      if (result && result.list) {
        this.setData({ benchmarks: result.list });
      }
    } catch (err) {
      console.error('加载对标列表失败:', err);
    }
  },

  selectBenchmark(e) {
    const slug = e.currentTarget.dataset.slug;
    const benchmarks = this.data.benchmarks.map(b => ({
      ...b,
      selected: b.slug === slug
    }));
    this.setData({ benchmarks, selectedSlug: slug });
  },

  confirmSelection() {
    const selected = this.data.benchmarks.find(b => b.selected);
    if (!selected) {
      wx.showToast({ title: '请选择一个对标', icon: 'none' });
      return;
    }

    // 更新用户当前对标
    app.call('updateBenchmark', { benchmarkSlug: selected.slug }).catch(() => {});

    wx.navigateBack();
  }
});
