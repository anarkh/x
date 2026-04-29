import { getPost, reactToPost } from '../../utils/store.js';
import { markerFromPost } from '../../utils/geo.js';
import { categoryLabel, formatCreatedAt, formatTimeLeft } from '../../utils/format.js';

Page({
  data: {
    id: '',
    post: null,
    markers: []
  },

  onLoad(query) {
    this.setData({ id: query.id || '' });
  },

  onShow() {
    this.loadPost();
  },

  loadPost() {
    const raw = getPost(this.data.id);
    if (!raw) {
      this.setData({ post: null, markers: [] });
      return;
    }
    const post = {
      ...raw,
      categoryText: categoryLabel(raw.category),
      createdText: formatCreatedAt(raw.createdAt),
      expiryText: formatTimeLeft(raw.expiresAt),
      distanceText: `${raw.distance}m`
    };
    this.setData({
      post,
      markers: [markerFromPost(post)]
    });
  },

  react(event) {
    const action = event.currentTarget.dataset.action;
    reactToPost(this.data.id, action);
    wx.showToast({
      title: action === 'report' ? '已收到举报' : '已记录',
      icon: 'success'
    });
    this.loadPost();
  },

  goHome() {
    wx.switchTab({ url: '/pages/map/map' });
  }
});
