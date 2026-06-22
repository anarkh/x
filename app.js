import config from './utils/config.js';
import { ensureUser } from './utils/auth.js';
import { addDiagnostic } from './utils/diagnostics.js';

function fallbackUser() {
  return {
    id: 'guest_fallback',
    nickname: '附近用户',
    avatarUrl: '',
    role: 'user',
    isGuest: true,
    profileCompleted: false,
    loggedInAt: 0
  };
}

App({
  globalData: {
    user: null,
    center: { ...config.defaultCenter },
    cloudReady: false
  },

  onLaunch() {
    if (config.cloud.enabled && config.cloud.envId && wx.cloud && wx.cloud.init) {
      try {
        wx.cloud.init({
          env: config.cloud.envId,
          traceUser: true
        });
        this.globalData.cloudReady = true;
      } catch (error) {
        this.globalData.cloudReady = false;
        addDiagnostic('app.cloud.init', error);
      }
    } else if (config.cloud.enabled) {
      addDiagnostic('app.cloud.skip', 'wx.cloud is unavailable or envId is empty');
    }

    try {
      this.globalData.user = ensureUser();
    } catch (error) {
      addDiagnostic('app.ensureUser', error);
      this.globalData.user = fallbackUser();
    }
  },

  onError(error) {
    addDiagnostic('app.onError', error);
    console.error(error);
  },

  onUnhandledRejection(event) {
    const reason = event && event.reason ? event.reason : event;
    addDiagnostic('app.unhandledRejection', reason);
    console.error(reason);
  },

  onPageNotFound(event) {
    addDiagnostic('app.pageNotFound', event && event.path ? event.path : event);
  }
});
