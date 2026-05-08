import config from '../../utils/config.js';
import { getCurrentUser, isAdmin, loginAsAdmin, loginAsUser, logout } from '../../utils/auth.js';
import { listMyReactions, listPosts } from '../../utils/store.js';
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

const actionMeta = {
  confirm: {
    label: '确认有效',
    tone: 'done'
  },
  stale: {
    label: '标记过时',
    tone: 'warn'
  },
  report: {
    label: '举报',
    tone: 'danger'
  }
};

function isOpenPost(post) {
  return post.status === 'active' || post.status === 'stale';
}

function decoratePost(post) {
  return {
    ...post,
    categoryText: categoryLabel(post.category),
    intentText: intentLabel(post.intent),
    statusText: statusLabel(post.status),
    confirmationText: formatConfirmationText(post.confirmations, post.lastConfirmedAt),
    createdText: formatCreatedAt(post.createdAt),
    expiryText: post.status === 'resolved' ? '已关闭' : formatTimeLeft(post.expiresAt)
  };
}

function avatarText(user) {
  return (user.nickname || '街区用户').slice(0, 1);
}

function identityText(user) {
  if (isAdmin(user)) {
    return '管理员';
  }
  return user.isGuest ? '游客模式' : '已登录';
}

Page({
  data: {
    appInfo: config.appInfo,
    user: getCurrentUser(),
    isAdmin: false,
    isGuest: true,
    identityText: '游客模式',
    loggingIn: false,
    adminCode: '',
    showAdminLogin: false,
    avatarText: '街',
    stats: [],
    myPosts: [],
    activities: []
  },

  onShow() {
    syncTabBar(this, '/pages/me/me');
    this.refresh();
  },

  refresh() {
    const user = getCurrentUser();
    app.globalData.user = user;
    const posts = listPosts().map(decoratePost);
    const myPosts = posts.filter((post) => post.publisherId === user.id);
    const reactions = listMyReactions();
    const postById = posts.reduce((map, post) => ({
      ...map,
      [post.id]: post
    }), {});
    const activities = reactions
      .map((item) => {
        const post = postById[item.id];
        const meta = actionMeta[item.action] || { label: '参与', tone: 'neutral' };
        return post
          ? {
            ...item,
            ...meta,
            activityKey: `${item.id}:${item.action}`,
            reactedText: formatCreatedAt(item.reactedAt),
            post
          }
          : null;
      })
      .filter(Boolean)
      .slice(0, 5);
    const openMyPosts = myPosts.filter(isOpenPost);
    const isCurrentUserAdmin = isAdmin(user);

    this.setData({
      user,
      isAdmin: isCurrentUserAdmin,
      isGuest: user.isGuest,
      identityText: identityText(user),
      avatarText: avatarText(user),
      showAdminLogin: this.data.showAdminLogin && !isCurrentUserAdmin,
      myPosts: myPosts.slice(0, 5),
      activities,
      stats: [
        { label: '我发布', value: myPosts.length },
        { label: '处理中', value: openMyPosts.length },
        { label: '已关闭', value: myPosts.filter((post) => post.status === 'resolved').length },
        { label: '参与', value: reactions.length }
      ]
    });
  },

  revealAdminLogin() {
    if (this.data.isAdmin || this.data.showAdminLogin) {
      return;
    }
    this.adminTapCount = (this.adminTapCount || 0) + 1;
    if (this.adminTapCount >= 5) {
      this.setData({ showAdminLogin: true });
      wx.showToast({ title: '管理员入口已开启', icon: 'none' });
      this.adminTapCount = 0;
    }
  },

  completeLogin(profile = {}) {
    const user = loginAsUser(profile);
    app.globalData.user = user;
    this.setData({ loggingIn: false });
    wx.showToast({ title: '已登录', icon: 'success' });
    this.refresh();
    syncTabBar(this, '/pages/me/me');
  },

  loginUser() {
    if (this.data.loggingIn) {
      return;
    }
    this.setData({ loggingIn: true });
    const finish = (profile = {}) => {
      if (!wx.login) {
        this.completeLogin(profile);
        return;
      }
      wx.login({
        complete: () => {
          this.completeLogin(profile);
        }
      });
    };
    if (!wx.getUserProfile) {
      finish();
      return;
    }
    wx.getUserProfile({
      desc: '用于展示你的昵称和头像',
      success: (result) => {
        finish(result.userInfo || {});
      },
      fail: () => {
        this.setData({ loggingIn: false });
        wx.showToast({ title: '已取消登录', icon: 'none' });
      }
    });
  },

  logoutUser() {
    wx.showModal({
      title: '退出登录',
      content: '退出后会回到游客身份，本机发布和参与记录仍保留在本机数据里。',
      confirmText: '退出',
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        const user = logout();
        app.globalData.user = user;
        this.setData({ adminCode: '', showAdminLogin: false });
        this.refresh();
        syncTabBar(this, '/pages/me/me');
      }
    });
  },

  onAdminCodeInput(event) {
    this.setData({
      adminCode: event.detail.value
    });
  },

  loginAdmin() {
    const result = loginAsAdmin(this.data.adminCode);
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' });
      return;
    }
    app.globalData.user = result.user;
    this.setData({ adminCode: '', showAdminLogin: false });
    wx.showToast({ title: '管理员已登录', icon: 'success' });
    this.refresh();
    syncTabBar(this, '/pages/me/me');
  },

  goAdmin() {
    wx.switchTab({ url: '/pages/admin/admin' });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  }
});
