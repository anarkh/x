import { listMyReactions, listPosts } from '../../utils/store.js';
import { buildActivities, decoratePost } from '../../utils/post-presenter.js';

Page({
  data: {
    activities: [],
    stats: [
      { label: '全部', value: 0 },
      { label: '确认', value: 0 },
      { label: '举报', value: 0 }
    ]
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const posts = (await listPosts()).map(decoratePost);
    const reactions = listMyReactions();
    const activities = buildActivities(posts, reactions);
    this.setData({
      activities,
      stats: [
        { label: '全部', value: activities.length },
        { label: '确认', value: activities.filter((item) => item.action === 'confirm').length },
        { label: '举报', value: activities.filter((item) => item.action === 'report').length }
      ]
    });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  },

  goHome() {
    wx.switchTab({ url: '/pages/map/map' });
  }
});
