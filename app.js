App({
  globalData: {
    user: null,
    center: {
      latitude: 39.96685,
      longitude: 116.34329,
      name: 'Current Area'
    }
  },

  onLaunch() {
    const user = wx.getStorageSync('user');
    if (user) {
      this.globalData.user = user;
      return;
    }

    const guest = {
      id: `guest_${Date.now()}`,
      nickname: '街区用户',
      role: 'user'
    };
    wx.setStorageSync('user', guest);
    this.globalData.user = guest;
  }
});
