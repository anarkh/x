import { getCurrentUser, isAdmin } from '../utils/auth.js';

const allTabs = [
  {
    pagePath: '/pages/map/map',
    key: 'map',
    text: '地图',
    iconPath: '/assets/icons/tab-map.png',
    selectedIconPath: '/assets/icons/tab-map-active.png'
  },
  {
    pagePath: '/pages/publish/publish',
    key: 'publish',
    text: '发布',
    iconPath: '/assets/icons/tab-publish.png',
    selectedIconPath: '/assets/icons/tab-publish-active.png'
  },
  {
    pagePath: '/pages/admin/admin',
    key: 'admin',
    text: '管理',
    adminOnly: true,
    iconPath: '/assets/icons/tab-admin.png',
    selectedIconPath: '/assets/icons/tab-admin-active.png'
  },
  {
    pagePath: '/pages/me/me',
    key: 'me',
    text: '我的',
    iconPath: '/assets/icons/tab-me.png',
    selectedIconPath: '/assets/icons/tab-me-active.png'
  }
];

function visibleTabs(user) {
  return allTabs.filter((tab) => !tab.adminOnly || isAdmin(user));
}

Component({
  data: {
    selectedPath: '/pages/map/map',
    tabs: visibleTabs(getCurrentUser())
  },

  methods: {
    sync(selectedPath) {
      const user = getCurrentUser();
      this.setData({
        selectedPath,
        tabs: visibleTabs(user)
      });
    },

    switchTab(event) {
      const path = event.currentTarget.dataset.path;
      if (!path || path === this.data.selectedPath) {
        return;
      }
      wx.switchTab({ url: path });
    }
  }
});
