import { getCurrentUser } from '../../utils/auth.js';
import { listPosts } from '../../utils/store.js';
import { decoratePost, isOpenPost } from '../../utils/post-presenter.js';

Page({
  data: {
    posts: [],
    stats: [
      { label: '全部', value: 0 },
      { label: '处理中', value: 0 },
      { label: '已关闭', value: 0 }
    ]
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const user = getCurrentUser();
    const posts = (await listPosts())
      .map(decoratePost)
      .filter((post) => post.isMine || post.publisherId === user.id);
    this.setData({
      posts,
      stats: [
        { label: '全部', value: posts.length },
        { label: '处理中', value: posts.filter(isOpenPost).length },
        { label: '已关闭', value: posts.filter((post) => post.status === 'resolved').length }
      ]
    });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  }
});
