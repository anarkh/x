import config from '../../utils/config.js';
import { createFeedback } from '../../utils/feedback.js';

Page({
  data: {
    typeOptions: config.feedbackTypes,
    typeIndex: 0,
    submitting: false,
    form: {
      type: config.feedbackTypes[0].value,
      body: '',
      contact: ''
    }
  },

  onTypeChange(event) {
    const index = Number(event.detail.value);
    const type = this.data.typeOptions[index].value;
    this.setData({
      typeIndex: index,
      'form.type': type
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  async submitFeedback() {
    const form = this.data.form;
    if (this.data.submitting) {
      return;
    }
    if (!form.body.trim()) {
      wx.showToast({ title: '请先写下反馈内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await createFeedback(form);
      wx.showToast({ title: '已收到反馈', icon: 'success' });

      setTimeout(() => {
        const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
        if (pages.length > 1) {
          wx.navigateBack();
          return;
        }
        this.setData({ submitting: false });
        wx.switchTab({ url: '/pages/me/me' });
      }, 450);
    } catch (error) {
      console.error('[feedback] submit failed', error);
      this.setData({ submitting: false });
      wx.showToast({ title: '反馈提交失败', icon: 'none' });
    }
  }
});
