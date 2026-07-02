import { getCurrentUser, isAdmin, refreshAdminRole } from '../../utils/auth.js';
import { feedbackTypeLabel, listFeedback } from '../../utils/feedback.js';
import { hidePost, listAllPosts, resolvePost } from '../../utils/store.js';
import { syncTabBar } from '../../utils/tab-bar.js';
import { formatCreatedAt } from '../../utils/format.js';
import { buildAdminReviewState, adminFilterOptions } from './admin-review.js';

const app = getApp();

function decorateFeedback(item) {
  return {
    ...item,
    typeText: feedbackTypeLabel(item.type),
    createdText: formatCreatedAt(item.createdAt),
    contactText: item.contact || '未留联系方式',
    nickname: item.nickname || '匿名用户'
  };
}

function briefPostTitle(post, fallbackId) {
  const title = String(post && post.title ? post.title : fallbackId || '这条任务').trim();
  return title.length > 18 ? `${title.slice(0, 18)}...` : title;
}

Page({
  data: {
    authorized: false,
    query: '',
    activeFilter: 'needs_review',
    busyPostId: '',
    filterOptions: adminFilterOptions.map((item) => ({ ...item, count: 0 })),
    posts: [],
    visiblePosts: [],
    feedbacks: [],
    feedbackError: '',
    stats: {
      total: 0,
      needsReview: 0,
      active: 0,
      stale: 0,
      resolved: 0,
      reported: 0,
      hidden: 0
    }
  },

  async onShow() {
    syncTabBar(this, '/pages/admin/admin');
    await refreshAdminRole().catch(() => null);
    const user = getCurrentUser();
    app.globalData.user = user;
    if (!isAdmin(user)) {
      this.setData({ authorized: false });
      wx.showToast({ title: '请先登录管理员', icon: 'none' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/me/me' });
      }, 600);
      return;
    }
    this.setData({ authorized: true });
    this.refresh();
  },

  async refresh() {
    const posts = await listAllPosts();
    let feedbacks = [];
    let feedbackError = '';
    try {
      feedbacks = (await listFeedback()).map(decorateFeedback);
    } catch (error) {
      console.error('[admin] feedback list failed', error);
      feedbackError = '反馈通道异常，请检查云函数和 feedback_items 集合';
    }
    const reviewState = buildAdminReviewState(posts, {
      activeFilter: this.data.activeFilter,
      query: this.data.query,
      busyPostId: this.data.busyPostId
    });
    this.setData({
      posts: reviewState.posts,
      visiblePosts: reviewState.visiblePosts,
      feedbacks,
      feedbackError,
      stats: reviewState.stats,
      filterOptions: reviewState.filterOptions
    });
  },

  applyFilters() {
    const reviewState = buildAdminReviewState(this.data.posts, {
      activeFilter: this.data.activeFilter,
      query: this.data.query,
      busyPostId: this.data.busyPostId
    });
    this.setData({
      posts: reviewState.posts,
      visiblePosts: reviewState.visiblePosts,
      filterOptions: reviewState.filterOptions,
      stats: reviewState.stats
    });
  },

  onSearchInput(event) {
    this.setData({
      query: event.detail.value
    }, () => {
      this.applyFilters();
    });
  },

  clearSearch() {
    this.setData({
      query: ''
    }, () => {
      this.applyFilters();
    });
  },

  changeFilter(event) {
    this.setData({
      activeFilter: event.currentTarget.dataset.filter || 'needs_review'
    }, () => {
      this.applyFilters();
    });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  },

  async runPostAction(postId, action, successTitle) {
    if (this.data.busyPostId) {
      return;
    }
    this.setData({ busyPostId: postId }, () => {
      this.applyFilters();
    });
    try {
      await action();
      await this.refresh();
      if (successTitle) {
        wx.showToast({ title: successTitle, icon: 'success' });
      }
    } catch (error) {
      console.error('[admin] post action failed', error);
      wx.showToast({ title: '处理失败，请稍后再试', icon: 'none' });
    } finally {
      this.setData({ busyPostId: '' }, () => {
        this.applyFilters();
      });
    }
  },

  hide(event) {
    const postId = event.currentTarget.dataset.id;
    const post = this.data.posts.find((item) => item.id === postId);
    wx.showModal({
      title: '隐藏任务',
      content: `隐藏「${briefPostTitle(post, postId)}」\nID：${postId}\n普通用户不会再看到这条任务。`,
      confirmText: '隐藏',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        await this.runPostAction(postId, () => hidePost(postId), '已隐藏');
      }
    });
  },

  resolve(event) {
    const postId = event.currentTarget.dataset.id;
    const post = this.data.posts.find((item) => item.id === postId);
    wx.showModal({
      title: '关闭任务',
      content: `关闭「${briefPostTitle(post, postId)}」\nID：${postId}\n普通用户仍可看到已解决状态。`,
      confirmText: '关闭',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        await this.runPostAction(postId, () => resolvePost(postId), '已关闭');
      }
    });
  }
});
