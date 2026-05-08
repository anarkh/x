import config from './utils/config.js';
import { ensureUser } from './utils/auth.js';

App({
  globalData: {
    user: null,
    center: { ...config.defaultCenter }
  },

  onLaunch() {
    this.globalData.user = ensureUser();
  }
});
