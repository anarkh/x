import { listPosts } from '../../utils/store.js';
import { formatDistance, markerFromPost } from '../../utils/geo.js';
import {
  categoryLabel,
  formatConfirmationText,
  formatCreatedAt,
  formatTimeLeft,
  intentLabel,
  statusLabel
} from '../../utils/format.js';
import config from '../../utils/config.js';
import { syncTabBar } from '../../utils/tab-bar.js';

const app = getApp();
const categoryOptions = [
  { value: 'all', label: '全部' },
  ...config.categories
];
const DOUBLE_TAP_REFRESH_MS = 320;
const REGION_UPDATE_DEBOUNCE_MS = 140;

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

function centerFromRegion(region) {
  if (!region || !region.southwest || !region.northeast) {
    return null;
  }
  return {
    latitude: Number(((region.southwest.latitude + region.northeast.latitude) / 2).toFixed(6)),
    longitude: Number(((region.southwest.longitude + region.northeast.longitude) / 2).toFixed(6)),
    name: 'viewport'
  };
}

function isOpenPost(post) {
  return post.status === 'active' || post.status === 'stale';
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
    markers: [],
    showList: false
  },

  onLoad() {
    this.initialLocationPending = true;
    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage']
      });
    }
    this.locateCurrent();
  },

  onReady() {
    this.mapContext = wx.createMapContext('taskMap', this);
    if (!this.initialLocationPending) {
      this.updateMapRegion();
    }
  },

  onShow() {
    syncTabBar(this, '/pages/map/map');
    if (this.initialLocationPending) {
      return;
    }
    this.refresh();
  },

  locateCurrent() {
    wx.getLocation({
      type: 'gcj02',
      success: (location) => {
        const center = {
          latitude: Number(location.latitude.toFixed(6)),
          longitude: Number(location.longitude.toFixed(6)),
          name: 'current'
        };
        app.globalData.center = center;
        this.setData({ center }, () => {
          this.initialLocationPending = false;
          this.refresh();
          setTimeout(() => {
            this.updateMapRegion();
          }, 180);
        });
      },
      fail: () => {
        this.initialLocationPending = false;
        this.refresh();
        setTimeout(() => {
          this.updateMapRegion();
        }, 180);
      }
    });
  },

  async refresh() {
    const requestId = this.nextPostsRequestId();
    const posts = await this.buildPosts(this.data.center);
    if (requestId !== this.postsRequestId) {
      return;
    }
    this.applyPostFilters(posts, this.data.activeCategory, this.data.mapRegion);
  },

  async buildPosts(center) {
    const posts = await listPosts(center);
    return posts.map((post) => ({
      ...post,
      imageUrls: Array.isArray(post.imageUrls) ? post.imageUrls : [],
      coverImage: Array.isArray(post.imageUrls) && post.imageUrls[0] ? post.imageUrls[0] : '',
      imageCount: Array.isArray(post.imageUrls) ? post.imageUrls.length : 0,
      categoryText: categoryLabel(post.category),
      intentText: intentLabel(post.intent),
      statusText: statusLabel(post.status),
      confirmationText: formatConfirmationText(post.confirmations, post.lastConfirmedAt),
      createdText: formatCreatedAt(post.createdAt),
      expiryText: post.status === 'resolved' ? '已关闭' : formatTimeLeft(post.expiresAt),
      distanceText: formatDistance(post.distance)
    }));
  },

  applyPostFilters(posts, activeCategory, mapRegion, options = {}) {
    const viewportPosts = posts.filter((post) => isPostInRegion(post, mapRegion));
    const visiblePosts = activeCategory === 'all'
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
    const selectedPost = options.clearSelection
      ? null
      : this.pendingSelectedPost
      ? visiblePosts.find((post) => post.id === this.pendingSelectedPost.id) || this.pendingSelectedPost
      : this.data.selectedPost
      ? visiblePosts.find((post) => post.id === this.data.selectedPost.id) || null
      : null;
    this.pendingSelectedPost = null;
    const nextData = {
      visiblePosts,
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

  updateMapRegion(options = {}) {
    const mapContext = this.mapContext || wx.createMapContext('taskMap', this);
    if (!mapContext || !mapContext.getRegion) {
      return;
    }
    this.mapContext = mapContext;
    const requestId = this.nextPostsRequestId();
    mapContext.getRegion({
      success: async (region) => {
        const center = centerFromRegion(region) || this.data.center;
        const posts = await this.buildPosts(center);
        if (requestId !== this.postsRequestId) {
          return;
        }
        if (options.selectPostId) {
          this.pendingSelectedPost = posts.find((post) => post.id === options.selectPostId) || null;
        }
        this.applyPostFilters(posts, this.data.activeCategory, region, {
          clearSelection: options.clearSelection
        });
      }
    });
  },

  nextPostsRequestId() {
    this.postsRequestId = (this.postsRequestId || 0) + 1;
    return this.postsRequestId;
  },

  scheduleMapRegionUpdate(options = {}) {
    clearTimeout(this.regionUpdateTimer);
    this.regionUpdateTimer = setTimeout(() => {
      this.updateMapRegion(options);
    }, REGION_UPDATE_DEBOUNCE_MS);
  },

  onRegionChange(event) {
    if (event.type !== 'end') {
      return;
    }
    if (event.detail && event.detail.causedBy === 'update') {
      return;
    }
    this.scheduleMapRegionUpdate({
      clearSelection: true
    });
  },

  onMapTap() {
    const now = Date.now();
    if (this.lastMapTapAt && now - this.lastMapTapAt <= DOUBLE_TAP_REFRESH_MS) {
      this.lastMapTapAt = 0;
      this.refresh();
      this.updateMapRegion();
      return;
    }
    this.lastMapTapAt = now;
  },

  onMarkerTap(event) {
    const marker = this.data.markers.find((item) => item.id === event.detail.markerId);
    if (marker) {
      const selectedPost = this.data.visiblePosts.find((post) => post.id === marker.postId);
      this.setData({
        selectedPost: selectedPost || null,
        showList: false
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
    const { candidates, activeCategory } = await this.discoveryCandidates(this.data.activeCategory);
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
      selectedPost: post
    }, () => {
      setTimeout(() => {
        this.updateMapRegion({ selectPostId: post.id });
      }, 180);
    });
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
      selectedPost: null
    }, () => {
      this.refresh();
      setTimeout(() => {
        this.updateMapRegion();
      }, 180);
    });
  },

  showList() {
    this.setData({ showList: true });
  },

  hideList() {
    this.setData({ showList: false });
  },

  clearSelectedPost() {
    this.setData({ selectedPost: null });
  },

  onShareAppMessage() {
    return {
      title: config.appInfo.shareTitle,
      path: '/pages/map/map'
    };
  }
});
