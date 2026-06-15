import config from '../../utils/config.js';
import { getCurrentUser, isAdmin, loginAsAdmin, loginAsUser, updateUserProfile } from '../../utils/auth.js';
import { listMyReactions, listPosts } from '../../utils/store.js';
import { syncTabBar } from '../../utils/tab-bar.js';
import { decoratePost } from '../../utils/post-presenter.js';
import { buildMeState } from './me-state.js';

const app = getApp();
const BEIDOU_NAMES = ['天枢', '天璇', '天玑', '天权', '玉衡', '开阳', '摇光'];

function avatarText(user) {
  if (user.isGuest) {
    return '';
  }
  return (user.nickname || '').slice(0, 1);
}

function randomGuestName() {
  return BEIDOU_NAMES[Math.floor(Math.random() * BEIDOU_NAMES.length)];
}

function isDefaultProfileNickname(nickname) {
  return !nickname || nickname === '微信用户' || BEIDOU_NAMES.indexOf(nickname) >= 0;
}

Page({
  data: {
    appInfo: config.appInfo,
    user: getCurrentUser(),
    isAdmin: false,
    isGuest: true,
    loggingIn: false,
    checkingAdmin: false,
    showAdminLogin: false,
    profileNeedsSetup: false,
    profileNicknameValue: '',
    avatarText: '',
    displayName: randomGuestName(),
    stats: [
      { label: '我发布', value: 0 },
      { label: '处理中', value: 0 },
      { label: '已关闭', value: 0 },
      { label: '参与', value: 0 }
    ],
    myPostCount: 0,
    activityCount: 0,
    myPostsText: '还没有发布过任务',
    activitiesText: '还没有参与记录',
    nextAction: {
      title: '登录后管理你的附近动态',
      note: '发布、确认和反馈都会记录在这里。',
      buttonText: '去登录',
      action: 'login'
    },
    recentActivities: [],
    adminCheckText: ''
  },

  onShow() {
    syncTabBar(this, '/pages/me/me');
    this.refresh();
  },

  async refresh() {
    const user = getCurrentUser();
    app.globalData.user = user;
    const posts = (await listPosts()).map(decoratePost);
    const reactions = listMyReactions();
    const isCurrentUserAdmin = isAdmin(user);
    const profileNeedsSetup = !user.isGuest && !user.profileCompleted;
    const meState = buildMeState({ user, posts, reactions, profileNeedsSetup });

    this.setData({
      user,
      isAdmin: isCurrentUserAdmin,
      isGuest: user.isGuest,
      profileNeedsSetup,
      profileNicknameValue: profileNeedsSetup && isDefaultProfileNickname(user.nickname) ? '' : user.nickname,
      avatarText: avatarText(user),
      displayName: user.isGuest ? this.data.displayName : user.nickname,
      showAdminLogin: this.data.showAdminLogin && !isCurrentUserAdmin,
      ...meState
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
    wx.showModal({
      title: '完善头像和名称',
      content: '登录后可以点击头像和名称添加微信资料，用于在个人页展示。',
      confirmText: '继续登录',
      cancelText: '取消',
      success: (modalResult) => {
        if (!modalResult.confirm) {
          this.setData({ loggingIn: false });
          return;
        }
        finish();
      },
      fail: () => {
        this.setData({ loggingIn: false });
      }
    });
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl;
    if (!avatarUrl) {
      return;
    }
    const user = updateUserProfile({ avatarUrl });
    app.globalData.user = user;
    this.refresh();
  },

  onNicknameBlur(event) {
    const nickname = String(event.detail.value || '').trim();
    if (!nickname) {
      return;
    }
    const user = updateUserProfile({ nickname });
    app.globalData.user = user;
    this.refresh();
  },

  async loginAdmin() {
    if (this.data.checkingAdmin) {
      return;
    }
    this.setData({ checkingAdmin: true });
    try {
      const result = await loginAsAdmin();
      const check = result.check || {};
      const detail = [
        check.reason ? `状态: ${check.reason}` : '',
        check.missingCollection ? '请先配置管理员集合' : ''
      ].filter(Boolean).join('\n');
      this.setData({ adminCheckText: detail });
      if (!result.ok) {
        wx.showToast({ title: result.message, icon: 'none' });
        return;
      }
      app.globalData.user = result.user;
      this.setData({ showAdminLogin: false });
      wx.showToast({ title: '管理员已登录', icon: 'success' });
      this.refresh();
      syncTabBar(this, '/pages/me/me');
    } catch (error) {
      console.error('[admin-check] failed', error);
      this.setData({ adminCheckText: error.errMsg || error.message || '管理员校验失败' });
      wx.showToast({ title: '管理员校验失败', icon: 'none' });
    } finally {
      this.setData({ checkingAdmin: false });
    }
  },

  goAdmin() {
    wx.switchTab({ url: '/pages/admin/admin' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },

  goMyPosts() {
    wx.navigateTo({ url: '/pages/my-posts/my-posts' });
  },

  goActivities() {
    wx.navigateTo({ url: '/pages/activities/activities' });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  goMap() {
    wx.switchTab({ url: '/pages/map/map' });
  },

  handleNextAction() {
    const action = this.data.nextAction.action;
    if (action === 'login') {
      this.loginUser();
    } else if (action === 'profile') {
      wx.showToast({ title: '点击头像或名称完善', icon: 'none' });
    } else if (action === 'myPosts') {
      this.goMyPosts();
    } else if (action === 'activities') {
      this.goActivities();
    } else if (action === 'publish') {
      this.goPublish();
    } else {
      this.goMap();
    }
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  }
});
