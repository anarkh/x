import { listPosts } from '../../utils/store.js';
import { markerFromPost } from '../../utils/geo.js';
import {
  buildNearbyPreviewPosts,
  decorateMapPost,
  isOpenPost
} from '../../utils/post-presenter.js';
import config from '../../utils/config.js';
import { syncTabBar } from '../../utils/tab-bar.js';
import { addDiagnostic, listDiagnostics } from '../../utils/diagnostics.js';

const app = getApp();
const categoryOptions = [
  { value: 'all', label: '全部' },
  ...config.categories
];
const DOUBLE_TAP_REFRESH_MS = 320;
const DIAGNOSTIC_HIDE_MS = 700;

function isPostInRegion(post, region) {
  if (!region || !region.southwest || !region.northeast) {
    return true;
  }
  const { southwest, northeast } = region;
  return post.latitude >= southwest.latitude
    && post.latitude <= northeast.latitude
    && post.longitude >= southwest.longitude
    && post.longitude <= northeast.longitude;
}

function safeDecode(value) {
  if (!value) {
    return '';
  }
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function shouldOpenList(value) {
  return value === true || value === '1' || value === 'true';
}

Page({
  data: {
    center: app.globalData.center,
    categoryFilters: categoryOptions.map((item) => ({ ...item, count: 0 })),
    activeCategory: 'all',
    activeCategoryText: '全部',
    openPostCount: 0,
    viewportPostCount: 0,
    mapRegion: null,
    selectedPost: null,
    posts: [],
    visiblePosts: [],
    nearbyPreviewPosts: [],
    markers: [],
    showList: false,
    showLocation: false,
    diagnosticVisible: true,
    diagnosticTitle: '地图启动中',
    bootStatus: '正在准备定位和附近信息',
    diagnosticLines: listDiagnostics()
  },

  onLoad(options = {}) {
    addDiagnostic('map.onLoad', 'entered');
    this.mapPageActive = true;
    const focusPostId = safeDecode(options.focusPostId || options.postId || options.id);
    this.pendingLaunchFocus = focusPostId
      ? { id: focusPostId, showList: shouldOpenList(options.showList) }
      : null;
    this.initialLocationPending = false;
    this.skipNextOnShowRefresh = true;
    this.setBootStatus('地图页已加载，正在使用默认附近信息');
    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage']
      });
    }
    this.refresh();
  },

  onReady() {
    addDiagnostic('map.onReady', 'map context ready');
    this.mapContext = wx.createMapContext('taskMap', this);
  },

  onShow() {
    this.mapPageActive = true;
    try {
      syncTabBar(this, '/pages/map/map');
    } catch (error) {
      this.showDiagnostics('底部导航同步失败', '自定义 tabBar 初始化异常', error);
    }
    if (this.initialLocationPending) {
      return;
    }
    if (this.skipNextOnShowRefresh) {
      this.skipNextOnShowRefresh = false;
      return;
    }
    this.refresh();
  },

  onHide() {
    this.deactivateMapPage();
  },

  onUnload() {
    this.deactivateMapPage();
  },

  deactivateMapPage() {
    this.mapPageActive = false;
    this.initialLocationPending = false;
    this.postsRequestId = (this.postsRequestId || 0) + 1;
    this.locationRequestId = (this.locationRequestId || 0) + 1;
    this.discoveryRequestId = (this.discoveryRequestId || 0) + 1;
    this.clearDiagnosticHideTimer();
  },

  locateCurrent() {
    this.initialLocationPending = true;
    this.locationRequestId = (this.locationRequestId || 0) + 1;
    const locationRequestId = this.locationRequestId;
    this.setBootStatus('正在获取当前位置');
    wx.getLocation({
      type: 'gcj02',
      success: (location) => {
        if (!this.mapPageActive || locationRequestId !== this.locationRequestId) {
          this.initialLocationPending = false;
          return;
        }
        addDiagnostic('map.getLocation.success', 'location ready');
        const center = {
          latitude: Number(location.latitude.toFixed(6)),
          longitude: Number(location.longitude.toFixed(6)),
          name: 'current'
        };
        app.globalData.center = center;
        this.setData({ center, showLocation: true, mapRegion: null }, () => {
          if (!this.mapPageActive || locationRequestId !== this.locationRequestId) {
            return;
          }
          this.initialLocationPending = false;
          this.refresh();
        });
      },
      fail: (error) => {
        if (!this.mapPageActive || locationRequestId !== this.locationRequestId) {
          this.initialLocationPending = false;
          return;
        }
        addDiagnostic('map.getLocation.fail', error || 'using default center');
        this.setBootStatus('定位未授权或暂不可用，继续使用默认位置');
        this.initialLocationPending = false;
        this.refresh();
      }
    });
  },

  async refresh() {
    if (!this.mapPageActive) {
      return;
    }
    const requestId = this.nextPostsRequestId();
    this.setBootStatus('正在加载附近信息');
    try {
      const posts = await this.buildPosts(this.data.center);
      if (requestId !== this.postsRequestId) {
        return;
      }
      const launchFocus = this.consumeLaunchFocus(posts);
      if (launchFocus) {
        this.pendingSelectedPost = launchFocus.post;
        const center = {
          latitude: launchFocus.post.latitude,
          longitude: launchFocus.post.longitude,
          name: 'selected'
        };
        app.globalData.center = center;
        this.setData({
          center,
          activeCategory: 'all',
          showList: launchFocus.showList,
          mapRegion: null
        }, () => {
          if (!this.mapPageActive || requestId !== this.postsRequestId) {
            return;
          }
          this.applyPostFilters(posts, 'all', null);
          this.hideDiagnostics();
        });
        return;
      }
      this.applyPostFilters(posts, this.data.activeCategory, this.data.mapRegion);
      this.hideDiagnosticsSoon();
    } catch (error) {
      if (requestId === this.postsRequestId) {
        this.showDiagnostics('地图加载失败', '附近信息加载失败，已记录最近错误', error);
      }
    }
  },

  async buildPosts(center) {
    // Keep the map first paint independent from cloud/network startup timing.
    const posts = await listPosts(center, { localOnly: true });
    return posts.map((post) => decorateMapPost(post));
  },

  consumeLaunchFocus(posts) {
    const focus = this.pendingLaunchFocus;
    if (!focus || !focus.id) {
      return null;
    }
    this.pendingLaunchFocus = null;
    const post = posts.find((item) => item.id === focus.id);
    if (!post) {
      wx.showToast({
        title: '未找到这条任务',
        icon: 'none'
      });
      return null;
    }
    return {
      post,
      showList: focus.showList
    };
  },

  applyPostFilters(posts, activeCategory, mapRegion, options = {}) {
    if (!this.mapPageActive) {
      return;
    }
    const viewportPosts = posts.filter((post) => isPostInRegion(post, mapRegion));
    const baseVisiblePosts = activeCategory === 'all'
      ? viewportPosts
      : viewportPosts.filter((post) => post.category === activeCategory);
    const categoryCounts = {};
    viewportPosts.forEach((post) => {
      categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
    });
    const categoryFilters = categoryOptions.map((item) => ({
      ...item,
      count: item.value === 'all' ? viewportPosts.length : categoryCounts[item.value] || 0
    }));
    const activeFilter = categoryFilters.find((item) => item.value === activeCategory);
    const selectedPostCandidate = options.clearSelection
      ? null
      : this.pendingSelectedPost
      ? baseVisiblePosts.find((post) => post.id === this.pendingSelectedPost.id) || this.pendingSelectedPost
      : this.data.selectedPost
      ? baseVisiblePosts.find((post) => post.id === this.data.selectedPost.id) || null
      : null;
    this.pendingSelectedPost = null;
    const selectedPostId = selectedPostCandidate ? selectedPostCandidate.id : '';
    const visiblePosts = baseVisiblePosts.map((post) => decorateMapPost(post, selectedPostId));
    const selectedPost = selectedPostId
      ? visiblePosts.find((post) => post.id === selectedPostId) || decorateMapPost(selectedPostCandidate, selectedPostId)
      : null;
    const nextData = {
      visiblePosts,
      nearbyPreviewPosts: buildNearbyPreviewPosts(visiblePosts, selectedPostId),
      categoryFilters,
      activeCategory,
      activeCategoryText: activeFilter ? activeFilter.label : '全部',
      openPostCount: posts.filter(isOpenPost).length,
      viewportPostCount: viewportPosts.length,
      mapRegion,
      selectedPost,
      markers: visiblePosts.map(markerFromPost)
    };
    if (posts !== this.data.posts) {
      nextData.posts = posts;
    }
    this.setData(nextData);
  },

  changeCategory(event) {
    const category = event.currentTarget.dataset.category || 'all';
    this.applyPostFilters(this.data.posts, category, this.data.mapRegion);
  },

  setBootStatus(status) {
    if (!this.mapPageActive) {
      return;
    }
    if (!this.data.diagnosticVisible) {
      return;
    }
    this.setData({
      bootStatus: status,
      diagnosticLines: listDiagnostics()
    });
  },

  showDiagnostics(title, status, error) {
    if (error) {
      addDiagnostic('map.runtime', error);
    }
    this.clearDiagnosticHideTimer();
    this.setData({
      diagnosticVisible: true,
      diagnosticTitle: title || '运行诊断',
      bootStatus: status || '',
      diagnosticLines: listDiagnostics()
    });
  },

  hideDiagnosticsSoon() {
    if (!this.mapPageActive) {
      return;
    }
    this.clearDiagnosticHideTimer();
    this.diagnosticHideTimer = setTimeout(() => {
      if (!this.mapPageActive) {
        this.diagnosticHideTimer = null;
        return;
      }
      this.diagnosticHideTimer = null;
      this.setData({ diagnosticVisible: false });
    }, DIAGNOSTIC_HIDE_MS);
  },

  hideDiagnostics() {
    this.clearDiagnosticHideTimer();
    if (!this.mapPageActive) {
      return;
    }
    this.setData({ diagnosticVisible: false });
  },

  clearDiagnosticHideTimer() {
    if (!this.diagnosticHideTimer) {
      return;
    }
    clearTimeout(this.diagnosticHideTimer);
    this.diagnosticHideTimer = null;
  },

  retryFromDiagnostics() {
    this.setData({
      diagnosticVisible: true,
      diagnosticTitle: '正在重试',
      bootStatus: '重新加载附近信息',
      diagnosticLines: listDiagnostics()
    });
    this.initialLocationPending = false;
    this.refresh();
  },

  nextPostsRequestId() {
    this.postsRequestId = (this.postsRequestId || 0) + 1;
    return this.postsRequestId;
  },

  onRegionChange(event) {
    if (event.type !== 'end') {
      return;
    }
    if (event.detail && event.detail.causedBy === 'update') {
      return;
    }
    this.applyPostFilters(this.data.posts, this.data.activeCategory, null, {
      clearSelection: true
    });
  },

  onMapTap() {
    const now = Date.now();
    if (this.lastMapTapAt && now - this.lastMapTapAt <= DOUBLE_TAP_REFRESH_MS) {
      this.lastMapTapAt = 0;
      this.refresh();
      return;
    }
    this.lastMapTapAt = now;
  },

  onMarkerTap(event) {
    const marker = this.data.markers.find((item) => item.id === event.detail.markerId);
    if (marker) {
      const selectedPost = this.data.visiblePosts.find((post) => post.id === marker.postId);
      this.pendingSelectedPost = selectedPost || null;
      this.setData({ showList: false }, () => {
        this.applyPostFilters(this.data.posts, this.data.activeCategory, this.data.mapRegion);
      });
    }
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}` });
  },

  async discoveryCandidates(activeCategory) {
    const posts = this.data.posts.length ? this.data.posts : await this.buildPosts(this.data.center);
    const scopedPosts = activeCategory === 'all'
      ? posts
      : posts.filter((post) => post.category === activeCategory);
    const scopedOpenPosts = scopedPosts.filter(isOpenPost);
    if (scopedOpenPosts.length) {
      return { candidates: scopedOpenPosts, activeCategory };
    }
    if (scopedPosts.length) {
      return { candidates: scopedPosts, activeCategory };
    }
    const openPosts = posts.filter(isOpenPost);
    return {
      candidates: openPosts.length ? openPosts : posts,
      activeCategory: 'all'
    };
  },

  async discoverNearby() {
    this.discoveryRequestId = (this.discoveryRequestId || 0) + 1;
    const discoveryRequestId = this.discoveryRequestId;
    const { candidates, activeCategory } = await this.discoveryCandidates(this.data.activeCategory);
    if (!this.mapPageActive || discoveryRequestId !== this.discoveryRequestId) {
      return;
    }
    if (!candidates.length) {
      wx.showToast({
        title: '附近暂时没有内容',
        icon: 'none'
      });
      return;
    }
    const currentId = this.data.selectedPost ? this.data.selectedPost.id : '';
    const nextCandidates = candidates.length > 1
      ? candidates.filter((post) => post.id !== currentId)
      : candidates;
    const post = nextCandidates[Math.floor(Math.random() * nextCandidates.length)];
    const center = {
      latitude: post.latitude,
      longitude: post.longitude,
      name: 'discovery'
    };
    app.globalData.center = center;
    if (activeCategory !== this.data.activeCategory) {
      wx.showToast({
        title: '先带你看全部内容',
        icon: 'none'
      });
    }
    this.setData({
      center,
      activeCategory,
      showList: false,
      selectedPost: post,
      mapRegion: null
    }, () => this.refresh());
  },

  focusPost(event) {
    const post = this.data.visiblePosts.find((item) => item.id === event.currentTarget.dataset.id);
    if (!post) {
      return;
    }
    const center = {
      latitude: post.latitude,
      longitude: post.longitude,
      name: 'selected'
    };
    this.setData({
      center,
      showList: false,
      selectedPost: post,
      mapRegion: null
    }, () => this.refresh());
  },

  showList() {
    this.setData({ showList: true });
  },

  hideList() {
    this.setData({ showList: false });
  },

  clearSelectedPost() {
    this.setData({ selectedPost: null }, () => {
      this.applyPostFilters(this.data.posts, this.data.activeCategory, this.data.mapRegion, {
        clearSelection: true
      });
    });
  },

  onShareAppMessage() {
    return {
      title: config.appInfo.shareTitle,
      path: '/pages/map/map'
    };
  }
});
