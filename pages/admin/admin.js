import { getCurrentUser, isAdmin, refreshAdminRole } from '../../utils/auth.js';
import { feedbackTypeLabel, listFeedback } from '../../utils/feedback.js';
import { hidePost, listAllPosts, resolvePost } from '../../utils/store.js';
import { syncTabBar } from '../../utils/tab-bar.js';
import {
  categoryLabel,
  formatConfirmationText,
  formatCreatedAt,
  formatTimeLeft,
  intentLabel,
  statusLabel
} from '../../utils/format.js';

const app = getApp();
const filterOptions = [
  { value: 'needs_review', label: '待处理' },
  { value: 'all', label: '全部' },
  { value: 'reported', label: '有举报' },
  { value: 'stale', label: '过时' },
  { value: 'active', label: '有效' },
  { value: 'closed', label: '已关闭' },
  { value: 'hidden', label: '已隐藏' }
];

function isClosed(post) {
  return post.status === 'resolved' || post.status === 'expired' || post.status === 'hidden';
}

function needsReview(post) {
  return post.reportCount > 0 || post.staleCount > 0 || post.status === 'stale' || post.status === 'expired';
}

function riskScore(post) {
  if (post.reportCount >= 2 || post.status === 'hidden') {
    return 4;
  }
  if (post.reportCount > 0) {
    return 3;
  }
  if (post.status === 'stale' || post.staleCount >= 2) {
    return 2;
  }
  if (post.status === 'expired') {
    return 1;
  }
  return 0;
}

function riskMeta(post) {
  const score = riskScore(post);
  if (score >= 4) {
    return { riskText: '高优先级', riskTone: 'danger' };
  }
  if (score === 3) {
    return { riskText: '需复核', riskTone: 'danger' };
  }
  if (score === 2) {
    return { riskText: '可能过时', riskTone: 'warn' };
  }
  if (score === 1) {
    return { riskText: '已过期', riskTone: 'neutral' };
  }
  return { riskText: '正常', riskTone: 'done' };
}

function statusTone(status) {
  if (status === 'stale') {
    return 'warn';
  }
  if (status === 'resolved') {
    return 'done';
  }
  if (status === 'expired' || status === 'hidden') {
    return 'neutral';
  }
  return '';
}

function decoratePost(post) {
  const categoryText = categoryLabel(post.category);
  const intentText = intentLabel(post.intent);
  const statusText = statusLabel(post.status);
  const publisher = post.publisher || '匿名用户';
  return {
    ...post,
    ...riskMeta(post),
    categoryText,
    intentText,
    statusText,
    statusTone: statusTone(post.status),
    publisher,
    createdText: formatCreatedAt(post.createdAt),
    expiryText: post.status === 'resolved' ? '已关闭' : formatTimeLeft(post.expiresAt),
    confirmationText: formatConfirmationText(post.confirmations, post.lastConfirmedAt),
    canResolve: post.status === 'active' || post.status === 'stale',
    canHide: post.status !== 'hidden',
    searchText: [
      post.id,
      post.title,
      post.body,
      post.placeName,
      publisher,
      categoryText,
      intentText,
      statusText
    ].join(' ').toLowerCase()
  };
}

function filterPost(post, filter) {
  if (filter === 'needs_review') {
    return needsReview(post);
  }
  if (filter === 'reported') {
    return post.reportCount > 0;
  }
  if (filter === 'stale') {
    return post.staleCount > 0 || post.status === 'stale';
  }
  if (filter === 'active') {
    return post.status === 'active';
  }
  if (filter === 'closed') {
    return isClosed(post);
  }
  if (filter === 'hidden') {
    return post.status === 'hidden';
  }
  return true;
}

function countForFilter(posts, filter) {
  return posts.filter((post) => filterPost(post, filter)).length;
}

function decorateFeedback(item) {
  return {
    ...item,
    typeText: feedbackTypeLabel(item.type),
    createdText: formatCreatedAt(item.createdAt),
    contactText: item.contact || '未留联系方式',
    nickname: item.nickname || '匿名用户'
  };
}

Page({
  data: {
    authorized: false,
    query: '',
    activeFilter: 'needs_review',
    filterOptions: filterOptions.map((item) => ({ ...item, count: 0 })),
    posts: [],
    visiblePosts: [],
    feedbacks: [],
    stats: {
      total: 0,
      needsReview: 0,
      active: 0,
      stale: 0,
      resolved: 0,
      reported: 0,
      hidden: 0,
      feedback: 0
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
    const posts = (await listAllPosts())
      .map(decoratePost)
      .sort((a, b) => riskScore(b) - riskScore(a) || b.createdAt - a.createdAt);
    const feedbacks = listFeedback().map(decorateFeedback);
    this.setData({
      posts,
      feedbacks,
      stats: {
        total: posts.length,
        needsReview: posts.filter(needsReview).length,
        active: posts.filter((post) => post.status === 'active').length,
        stale: posts.filter((post) => post.status === 'stale').length,
        resolved: posts.filter((post) => post.status === 'resolved').length,
        reported: posts.filter((post) => post.reportCount > 0).length,
        hidden: posts.filter((post) => post.status === 'hidden').length,
        feedback: feedbacks.length
      },
      filterOptions: filterOptions.map((item) => ({
        ...item,
        count: countForFilter(posts, item.value)
      }))
    }, () => {
      this.applyFilters();
    });
  },

  applyFilters() {
    const query = this.data.query.trim().toLowerCase();
    const visiblePosts = this.data.posts
      .filter((post) => filterPost(post, this.data.activeFilter))
      .filter((post) => !query || post.searchText.indexOf(query) >= 0);
    this.setData({
      visiblePosts
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

  hide(event) {
    wx.showModal({
      title: '隐藏任务',
      content: '隐藏后普通用户不会再看到这条任务。',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        await hidePost(event.currentTarget.dataset.id);
        this.refresh();
      }
    });
  },

  resolve(event) {
    wx.showModal({
      title: '关闭任务',
      content: '确认这条附近信息已经处理完？关闭后普通用户仍可看到结果状态。',
      confirmText: '关闭',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        await resolvePost(event.currentTarget.dataset.id);
        this.refresh();
      }
    });
  }
});
