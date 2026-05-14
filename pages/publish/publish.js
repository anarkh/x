import config from '../../utils/config.js';
import { getCurrentUser } from '../../utils/auth.js';
import { createPost, preparePostImageUpload } from '../../utils/store.js';
import { syncTabBar } from '../../utils/tab-bar.js';

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function defaultForm() {
  return {
    title: '',
    body: '',
    category: config.categories[0].value,
    intent: '',
    placeName: '',
    expiryHours: config.expiryOptions[1].value
  };
}

function shouldUseCloudStorage() {
  return Boolean(config.cloud && config.cloud.enabled && config.cloud.envId && wx.cloud);
}

function fileExtension(path) {
  const match = String(path || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

function isAllowedImage(path) {
  return ALLOWED_IMAGE_EXTENSIONS.indexOf(fileExtension(path)) >= 0;
}

function getFileInfo(path) {
  return new Promise((resolve) => {
    if (!wx.getFileInfo) {
      resolve({ size: 0 });
      return;
    }
    wx.getFileInfo({
      filePath: path,
      success: (result) => resolve({ size: Number(result.size) || 0 }),
      fail: () => resolve({ size: 0 })
    });
  });
}

function saveLocalFile(path) {
  return new Promise((resolve, reject) => {
    wx.saveFile({
      tempFilePath: path,
      success: (result) => resolve(result.savedFilePath),
      fail: reject
    });
  });
}

function uploadCloudFile(path, cloudPath) {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath: path,
      success: (result) => resolve(result.fileID),
      fail: reject
    });
  });
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: (location) => {
        resolve({
          latitude: Number(location.latitude.toFixed(6)),
          longitude: Number(location.longitude.toFixed(6))
        });
      },
      fail: reject
    });
  });
}

Page({
  data: {
    appInfo: config.appInfo,
    categories: config.categories,
    expiryOptions: config.expiryOptions,
    lostFoundIntents: config.lostFoundIntents,
    activeGuide: config.publishGuides[config.categories[0].value],
    categoryIndex: 0,
    expiryIndex: 1,
    intentIndex: -1,
    isGuest: true,
    submitting: false,
    maxImageCount: MAX_IMAGE_COUNT,
    canAddImage: true,
    imageItems: [],
    form: defaultForm()
  },

  onShow() {
    syncTabBar(this, '/pages/publish/publish');
    this.setData({
      isGuest: getCurrentUser().isGuest
    });
  },

  promptLogin() {
    wx.showModal({
      title: '登录后发布',
      content: '发布任务需要先登录，系统会记录发布者，方便你后续管理和关闭任务。',
      confirmText: '去登录',
      cancelText: '稍后',
      success: (result) => {
        if (result.confirm) {
          wx.switchTab({ url: '/pages/me/me' });
        }
      }
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  resetForm() {
    this.setData({
      activeGuide: config.publishGuides[config.categories[0].value],
      categoryIndex: 0,
      expiryIndex: 1,
      intentIndex: -1,
      imageItems: [],
      canAddImage: true,
      form: defaultForm()
    });
  },

  chooseImages() {
    const remaining = MAX_IMAGE_COUNT - this.data.imageItems.length;
    if (remaining <= 0) {
      wx.showToast({ title: `最多上传${MAX_IMAGE_COUNT}张`, icon: 'none' });
      return;
    }

    const success = async (files) => {
      const normalizedFiles = await Promise.all(files.slice(0, remaining).map(async (file) => {
        const path = typeof file === 'string' ? file : file.tempFilePath || file.path || '';
        const info = file.size ? { size: Number(file.size) || 0 } : await getFileInfo(path);
        return {
          path,
          size: info.size
        };
      }));
      const acceptedFiles = normalizedFiles.filter((file) => (
        file.path
        && isAllowedImage(file.path)
        && (!file.size || file.size <= MAX_IMAGE_SIZE_BYTES)
      ));
      if (acceptedFiles.length < normalizedFiles.length) {
        wx.showToast({ title: '仅支持5MB内图片', icon: 'none' });
      }
      const nextItems = acceptedFiles.map((file) => ({
        path: file.path,
        size: file.size,
        storedPath: '',
        status: 'local'
      }));
      const imageItems = [...this.data.imageItems, ...nextItems].slice(0, MAX_IMAGE_COUNT);
      this.setData({
        imageItems,
        canAddImage: imageItems.length < MAX_IMAGE_COUNT
      });
    };

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: (result) => {
          success(result.tempFiles || []);
        }
      });
      return;
    }

    wx.chooseImage({
      count: remaining,
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (result) => {
        success(result.tempFilePaths || []);
      }
    });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const imageItems = this.data.imageItems.filter((_, itemIndex) => itemIndex !== index);
    this.setData({
      imageItems,
      canAddImage: imageItems.length < MAX_IMAGE_COUNT
    });
  },

  previewImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const urls = this.data.imageItems.map((item) => item.storedPath || item.path);
    wx.previewImage({
      current: urls[index],
      urls
    });
  },

  async persistImages() {
    const useCloud = shouldUseCloudStorage();
    const imageItems = await Promise.all(this.data.imageItems.map(async (item, index) => {
      if (item.storedPath) {
        return item;
      }
      const ext = fileExtension(item.path);
      const cloudPath = useCloud ? await preparePostImageUpload(ext, index) : '';
      const storedPath = cloudPath
        ? await uploadCloudFile(item.path, cloudPath)
        : await saveLocalFile(item.path);
      return {
        ...item,
        storedPath,
        status: cloudPath ? 'cloud' : 'saved'
      };
    }));
    this.setData({
      imageItems,
      canAddImage: imageItems.length < MAX_IMAGE_COUNT
    });
    return imageItems.map((item) => item.storedPath || item.path);
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value);
    const category = this.data.categories[index].value;
    this.setData({
      categoryIndex: index,
      activeGuide: config.publishGuides[category],
      intentIndex: -1,
      'form.category': category,
      'form.intent': ''
    });
  },

  onIntentChange(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({
      intentIndex: index,
      'form.intent': this.data.lostFoundIntents[index].value
    });
  },

  onExpiryChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      expiryIndex: index,
      'form.expiryHours': this.data.expiryOptions[index].value
    });
  },

  async submit() {
    const form = this.data.form;
    if (this.data.submitting) {
      return;
    }
    if (getCurrentUser().isGuest) {
      this.setData({ isGuest: true });
      this.promptLogin();
      return;
    }
    if (!form.title.trim() || !form.body.trim()) {
      wx.showToast({ title: '请补全标题和详情', icon: 'none' });
      return;
    }
    if (form.category === 'lost_found' && !form.intent) {
      wx.showToast({ title: '请选择丢失或捡到', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const [currentLocation, imageUrls] = await Promise.all([
        getCurrentLocation(),
        this.persistImages()
      ]);
      const post = await createPost({
        ...form,
        imageUrls,
        ...currentLocation
      });
      wx.showToast({ title: '已发布', icon: 'success' });
      this.resetForm();
      setTimeout(() => {
        wx.navigateTo({ url: `/pages/detail/detail?id=${post.id}&from=publish` });
      }, 400);
    } catch (error) {
      if (error && error.code === 'AUTH_REQUIRED') {
        this.setData({ isGuest: true });
        this.promptLogin();
        return;
      }
      console.warn('[publish] failed to submit post', error);
      const message = error && (error.errMsg || error.message || '');
      const title = message.indexOf('getLocation') >= 0 ? '无法获取当前位置' : '发布失败，请稍后再试';
      wx.showToast({ title, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
