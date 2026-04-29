import { hidePost, listPosts } from '../../utils/store.js';
import { categoryLabel, formatTimeLeft } from '../../utils/format.js';

Page({
  data: {
    posts: [],
    stats: {
      active: 0,
      stale: 0,
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
      expiryText: formatTimeLeft(post.expiresAt)
    }));
    this.setData({
      posts,
      stats: {
        active: posts.filter((post) => post.status === 'active').length,
        stale: posts.filter((post) => post.status === 'stale').length,
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
  }
});
