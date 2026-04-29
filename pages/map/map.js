import { listPosts } from '../../utils/store.js';
import { formatDistance, markerFromPost } from '../../utils/geo.js';
import { categoryLabel, formatCreatedAt, formatTimeLeft } from '../../utils/format.js';

const app = getApp();

Page({
  data: {
    center: app.globalData.center,
    posts: [],
    markers: [],
    showList: false
  },

  onLoad() {
    this.locateCurrent();
  },

  onShow() {
    this.refresh();
  },

  locateCurrent() {
    wx.getLocation({
      type: 'gcj02',
      success: (location) => {
        const center = {
          latitude: Number(location.latitude.toFixed(6)),
          longitude: Number(location.longitude.toFixed(6)),
          name: 'current'
        };
        app.globalData.center = center;
        this.setData({ center }, () => {
          this.refresh();
        });
      },
      fail: () => {
        this.refresh();
      }
    });
  },

  refresh() {
    const posts = listPosts(this.data.center).map((post) => ({
      ...post,
      categoryText: categoryLabel(post.category),
      createdText: formatCreatedAt(post.createdAt),
      expiryText: formatTimeLeft(post.expiresAt),
      distanceText: formatDistance(post.distance)
    }));
    this.setData({
      posts,
      markers: posts.map(markerFromPost)
    });
  },

  onMarkerTap(event) {
    const marker = this.data.markers.find((item) => item.id === event.detail.markerId);
    if (marker) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${marker.postId}` });
    }
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  },

  focusPost(event) {
    const post = this.data.posts.find((item) => item.id === event.currentTarget.dataset.id);
    if (!post) {
      return;
    }
    const center = {
      latitude: post.latitude,
      longitude: post.longitude,
      name: 'selected'
    };
    this.setData({
      center,
      showList: false
    }, () => {
      this.refresh();
    });
  },

  showList() {
    this.setData({ showList: true });
  },

  hideList() {
    this.setData({ showList: false });
  }
});
