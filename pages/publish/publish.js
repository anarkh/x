import config from '../../utils/config.js';
import { createPost } from '../../utils/store.js';

Page({
  data: {
    pilotArea: config.pilotArea,
    categories: config.categories,
    expiryOptions: config.expiryOptions,
    lostFoundIntents: config.lostFoundIntents,
    activeGuide: config.publishGuides[config.categories[0].value],
    categoryIndex: 0,
    expiryIndex: 1,
    intentIndex: 1,
    submitting: false,
    form: {
      title: '',
      body: '',
      category: config.categories[0].value,
      intent: config.lostFoundIntents[1].value,
      placeName: '',
      expiryHours: config.expiryOptions[1].value
    }
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value);
    const category = this.data.categories[index].value;
    this.setData({
      categoryIndex: index,
      activeGuide: config.publishGuides[category],
      'form.category': category
    });
  },

  onIntentChange(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({
      intentIndex: index,
      'form.intent': this.data.lostFoundIntents[index].value
    });
  },

  onExpiryChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      expiryIndex: index,
      'form.expiryHours': this.data.expiryOptions[index].value
    });
  },

  submit() {
    const form = this.data.form;
    if (this.data.submitting) {
      return;
    }
    if (!form.title.trim() || !form.body.trim()) {
      wx.showToast({ title: '请补全标题和详情', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.getLocation({
      type: 'gcj02',
      success: (location) => {
        const currentLocation = {
          latitude: Number(location.latitude.toFixed(6)),
          longitude: Number(location.longitude.toFixed(6))
        };

        const post = createPost({
          ...form,
          ...currentLocation
        });
        wx.showToast({ title: '已发布', icon: 'success' });
        setTimeout(() => {
          wx.navigateTo({ url: `/pages/detail/detail?id=${post.id}&from=publish` });
        }, 400);
      },
      fail: () => {
        wx.showToast({ title: '无法获取当前位置', icon: 'none' });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  }
});
