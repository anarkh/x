import config from './utils/config.js';
import { ensureUser } from './utils/auth.js';

App({
  globalData: {
    user: null,
    center: { ...config.defaultCenter }
  },

  onLaunch() {
    if (config.cloud.enabled && config.cloud.envId && wx.cloud) {
      wx.cloud.init({
        env: config.cloud.envId,
        traceUser: true
      });
    }
    this.globalData.user = ensureUser();
  }
});
