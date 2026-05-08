import config from '../../utils/config.js';
import { hidePost, listPosts, resolvePost } from '../../utils/store.js';
import { categoryLabel, formatTimeLeft, intentLabel, statusLabel } from '../../utils/format.js';

Page({
  data: {
    pilotArea: config.pilotArea,
    posts: [],
    stats: {
      active: 0,
      stale: 0,
      resolved: 0,
      reported: 0
    }
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const posts = listPosts().map((post) => ({
      ...post,
      categoryText: categoryLabel(post.category),
      intentText: intentLabel(post.intent),
      statusText: statusLabel(post.status),
      expiryText: post.status === 'resolved' ? '已关闭' : formatTimeLeft(post.expiresAt)
    }));
    this.setData({
      posts,
      stats: {
        active: posts.filter((post) => post.status === 'active').length,
        stale: posts.filter((post) => post.status === 'stale').length,
        resolved: posts.filter((post) => post.status === 'resolved').length,
        reported: posts.filter((post) => post.reportCount > 0).length
      }
    });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  },

  hide(event) {
    wx.showModal({
      title: '隐藏任务',
      content: '隐藏后普通用户不会再看到这条任务。',
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        hidePost(event.currentTarget.dataset.id);
        this.refresh();
      }
    });
  },

  resolve(event) {
    wx.showModal({
      title: '关闭任务',
      content: '确认这条附近信息已经处理完？关闭后普通用户仍可看到结果状态。',
      confirmText: '关闭',
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        resolvePost(event.currentTarget.dataset.id);
        this.refresh();
      }
    });
  }
});
