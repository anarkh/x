import config from '../../utils/config.js';
import { getCurrentUser, isAdmin, loginAsAdmin, loginAsUser, logout } from '../../utils/auth.js';
import { listMyReactions, listPosts } from '../../utils/store.js';
import { syncTabBar } from '../../utils/tab-bar.js';
import { buildActivities, decoratePost, isOpenPost } from '../../utils/post-presenter.js';

const app = getApp();

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
    checkingAdmin: false,
    showAdminLogin: false,
    avatarText: '街',
    stats: [
      { label: '我发布', value: 0 },
      { label: '处理中', value: 0 },
      { label: '已关闭', value: 0 },
      { label: '参与', value: 0 }
    ],
    myPostCount: 0,
    activityCount: 0,
    myPostsText: '还没有发布过任务',
    activitiesText: '还没有参与记录'
  },

  onShow() {
    syncTabBar(this, '/pages/me/me');
    this.refresh();
  },

  async refresh() {
    const user = getCurrentUser();
    app.globalData.user = user;
    const posts = (await listPosts()).map(decoratePost);
    const myPosts = posts.filter((post) => post.publisherId === user.id);
    const reactions = listMyReactions();
    const activities = buildActivities(posts, reactions);
    const openMyPosts = myPosts.filter(isOpenPost);
    const isCurrentUserAdmin = isAdmin(user);

    this.setData({
      user,
      isAdmin: isCurrentUserAdmin,
      isGuest: user.isGuest,
      identityText: identityText(user),
      avatarText: avatarText(user),
      showAdminLogin: this.data.showAdminLogin && !isCurrentUserAdmin,
      myPostCount: myPosts.length,
      activityCount: activities.length,
      myPostsText: myPosts.length ? `${myPosts.length} 条本机身份发布的内容` : '还没有发布过任务',
      activitiesText: activities.length ? `${activities.length} 条确认、过时或举报记录` : '还没有参与记录',
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
        this.setData({ showAdminLogin: false });
        this.refresh();
        syncTabBar(this, '/pages/me/me');
      }
    });
  },

  async loginAdmin() {
    if (this.data.checkingAdmin) {
      return;
    }
    this.setData({ checkingAdmin: true });
    try {
      const result = await loginAsAdmin();
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

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  }
});
