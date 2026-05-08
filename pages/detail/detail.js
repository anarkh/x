import config from '../../utils/config.js';
import { getCurrentUser, isAdmin } from '../../utils/auth.js';
import { getPost, hasReactedToPost, reactToPost, resolvePost } from '../../utils/store.js';
import { markerFromPost } from '../../utils/geo.js';
import {
  categoryLabel,
  formatConfirmationText,
  formatCreatedAt,
  formatTimeLeft,
  intentLabel,
  resolveActionLabel,
  statusLabel
} from '../../utils/format.js';

Page({
  data: {
    id: '',
    appInfo: config.appInfo,
    post: null,
    markers: [],
    showPublishSuccess: false
  },

  onLoad(query) {
    this.setData({
      id: query.id || '',
      showPublishSuccess: query.from === 'publish'
    });
    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage']
      });
    }
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
    const user = getCurrentUser();
    const canReact = raw.status === 'active' || raw.status === 'stale';
    const canResolve = canReact && (isAdmin(user) || raw.publisherId === user.id);
    const post = {
      ...raw,
      categoryText: categoryLabel(raw.category),
      intentText: intentLabel(raw.intent),
      statusText: statusLabel(raw.status),
      confirmationText: formatConfirmationText(raw.confirmations, raw.lastConfirmedAt),
      confirmationHint: raw.lastConfirmedAt ? `${formatCreatedAt(raw.lastConfirmedAt)}确认` : '确认',
      createdText: formatCreatedAt(raw.createdAt),
      expiryText: raw.status === 'resolved' ? '已关闭' : formatTimeLeft(raw.expiresAt),
      distanceText: `${raw.distance}m`,
      resolveText: resolveActionLabel(raw.category),
      canReact,
      canResolve,
      confirmedByMe: hasReactedToPost(raw.id, 'confirm'),
      staledByMe: hasReactedToPost(raw.id, 'stale'),
      reportedByMe: hasReactedToPost(raw.id, 'report')
    };
    this.setData({
      post,
      markers: [markerFromPost(post)]
    });
  },

  react(event) {
    const action = event.currentTarget.dataset.action;
    if (hasReactedToPost(this.data.id, action)) {
      wx.showToast({
        title: '这条已记录过',
        icon: 'none'
      });
      return;
    }
    reactToPost(this.data.id, action);
    wx.showToast({
      title: action === 'report' ? '已收到举报' : '已记录',
      icon: 'success'
    });
    this.loadPost();
  },

  resolve() {
    if (!this.data.post || !this.data.post.canResolve) {
      wx.showToast({
        title: '只有发布者或管理员可关闭',
        icon: 'none'
      });
      return;
    }
    wx.showModal({
      title: this.data.post.resolveText,
      content: '关闭后仍会保留在列表里，方便附近用户知道这件事已经处理完。',
      confirmText: '关闭',
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        resolvePost(this.data.id);
        wx.showToast({
          title: '已关闭',
          icon: 'success'
        });
        this.loadPost();
      }
    });
  },

  dismissSharePrompt() {
    this.setData({ showPublishSuccess: false });
  },

  onShareAppMessage() {
    const post = this.data.post;
    if (!post) {
      return {
        title: config.appInfo.shareTitle,
        path: '/pages/map/map'
      };
    }
    return {
      title: `${post.title} · ${post.placeName}`,
      path: `/pages/detail/detail?id=${post.id}`
    };
  },

  goHome() {
    wx.switchTab({ url: '/pages/map/map' });
  }
});
