import config from '../../utils/config.js';
import { getCurrentUser } from '../../utils/auth.js';
import { createPost, preparePostImageUpload } from '../../utils/store.js';
import { syncTabBar } from '../../utils/tab-bar.js';
import { buildPublishState } from './publish-state.js';

const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_SIZE_BYTES = 1536 * 1024;
const MAX_IMAGE_SIZE_TEXT = '1.5MB';
const IMAGE_COMPRESS_QUALITY = 70;
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const CLOUD_FILE_ID_PREFIX = 'cloud://';
const LOCATION_IDLE_SUMMARY = '发布前确认一次当前位置，附近的人会按这个位置看到任务。';
const LOCATION_READY_SUMMARY = '已确认当前位置，发布时会使用这里。';
const LOCATION_FAILED_SUMMARY = '无法获取当前位置，请检查定位权限后重试。';

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

function publishError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function fileExtension(path) {
  const match = String(path || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

function isAllowedImageExtension(ext) {
  return ALLOWED_IMAGE_EXTENSIONS.indexOf(String(ext || '').toLowerCase()) >= 0;
}

function isCloudFileId(path) {
  return String(path || '').indexOf(CLOUD_FILE_ID_PREFIX) === 0;
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

function compressImage(path) {
  return new Promise((resolve) => {
    if (!wx.compressImage) {
      resolve(path);
      return;
    }
    wx.compressImage({
      src: path,
      quality: IMAGE_COMPRESS_QUALITY,
      success: (result) => resolve(result.tempFilePath || path),
      fail: () => resolve(path)
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

function deleteCloudFiles(fileList) {
  return new Promise((resolve) => {
    if (!fileList.length || !wx.cloud || !wx.cloud.deleteFile) {
      resolve();
      return;
    }
    wx.cloud.deleteFile({
      fileList,
      complete: () => resolve()
    });
  });
}

async function cleanupCloudFiles(fileList) {
  try {
    await deleteCloudFiles(fileList.filter(isCloudFileId));
  } catch (error) {
    console.warn('[publish] failed to clean uploaded images', error);
  }
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
    maxImageSizeText: MAX_IMAGE_SIZE_TEXT,
    canAddImage: true,
    imageItems: [],
    locationStatus: 'idle',
    locationSummary: LOCATION_IDLE_SUMMARY,
    draftLocation: null,
    form: defaultForm(),
    readiness: buildPublishState({
      form: defaultForm(),
      isGuest: true,
      hasLocation: false,
      locationStatus: 'idle'
    })
  },

  onShow() {
    syncTabBar(this, '/pages/publish/publish');
    const isGuest = getCurrentUser().isGuest;
    this.setData({
      isGuest,
      readiness: this.buildReadiness({ isGuest })
    });
  },

  buildReadiness(overrides = {}) {
    const has = (key) => Object.prototype.hasOwnProperty.call(overrides, key);
    const form = has('form') ? overrides.form : this.data.form;
    const imageItems = has('imageItems') ? overrides.imageItems : this.data.imageItems;
    const draftLocation = has('draftLocation') ? overrides.draftLocation : this.data.draftLocation;
    const locationStatus = has('locationStatus') ? overrides.locationStatus : this.data.locationStatus;
    const isGuest = has('isGuest') ? overrides.isGuest : this.data.isGuest;
    const submitting = has('submitting') ? overrides.submitting : this.data.submitting;
    return buildPublishState({
      form,
      isGuest,
      hasLocation: Boolean(draftLocation),
      locationStatus,
      imageCount: imageItems.length,
      submitting
    });
  },

  setPublishData(patch = {}) {
    this.setData({
      ...patch,
      readiness: this.buildReadiness(patch)
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
    const form = {
      ...this.data.form,
      [field]: event.detail.value
    };
    this.setPublishData({ form });
  },

  resetForm() {
    const form = defaultForm();
    this.setPublishData({
      activeGuide: config.publishGuides[config.categories[0].value],
      categoryIndex: 0,
      expiryIndex: 1,
      intentIndex: -1,
      imageItems: [],
      canAddImage: true,
      locationStatus: 'idle',
      locationSummary: LOCATION_IDLE_SUMMARY,
      draftLocation: null,
      form
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
        const sourcePath = typeof file === 'string' ? file : file.tempFilePath || file.path || '';
        const ext = fileExtension(sourcePath);
        const path = isAllowedImageExtension(ext) ? await compressImage(sourcePath) : sourcePath;
        const info = await getFileInfo(path);
        const fallbackSize = typeof file === 'string' ? 0 : Number(file.size) || 0;
        return {
          path,
          ext,
          size: info.size || fallbackSize
        };
      }));
      const acceptedFiles = normalizedFiles.filter((file) => (
        file.path
        && isAllowedImageExtension(file.ext)
        && (!file.size || file.size <= MAX_IMAGE_SIZE_BYTES)
      ));
      if (acceptedFiles.length < normalizedFiles.length) {
        wx.showToast({ title: `图片需小于${MAX_IMAGE_SIZE_TEXT}`, icon: 'none' });
      }
      const nextItems = acceptedFiles.map((file) => ({
        path: file.path,
        ext: file.ext,
        size: file.size,
        storedPath: '',
        status: 'local'
      }));
      const imageItems = [...this.data.imageItems, ...nextItems].slice(0, MAX_IMAGE_COUNT);
      this.setPublishData({
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
    this.setPublishData({
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

  resetUploadedImages(fileList) {
    if (!fileList.length) {
      return;
    }
    const imageItems = this.data.imageItems.map((item) => (
      fileList.indexOf(item.storedPath) >= 0
        ? { ...item, storedPath: '', status: 'local' }
        : item
    ));
    this.setPublishData({ imageItems });
  },

  async persistImages() {
    if (!this.data.imageItems.length) {
      return [];
    }
    if (!shouldUseCloudStorage()) {
      throw publishError('CLOUD_STORAGE_REQUIRED', '图片需要云端存储');
    }

    const imageItems = [];
    const uploadedFileIds = [];
    try {
      for (let index = 0; index < this.data.imageItems.length; index += 1) {
        const item = this.data.imageItems[index];
        if (isCloudFileId(item.storedPath)) {
          imageItems.push(item);
          continue;
        }
        if (item.size && item.size > MAX_IMAGE_SIZE_BYTES) {
          throw publishError('IMAGE_TOO_LARGE', `图片需小于${MAX_IMAGE_SIZE_TEXT}`);
        }
        const ext = item.ext || fileExtension(item.path);
        if (!isAllowedImageExtension(ext)) {
          throw publishError('IMAGE_TYPE_UNSUPPORTED', '仅支持 jpg、png、webp 图片');
        }
        const cloudPath = await preparePostImageUpload(ext, index);
        if (!cloudPath) {
          throw publishError('CLOUD_STORAGE_REQUIRED', '图片需要云端存储');
        }
        let storedPath = '';
        try {
          storedPath = await uploadCloudFile(item.path, cloudPath);
        } catch {
          throw publishError('IMAGE_UPLOAD_FAILED', '图片上传失败，请稍后再试');
        }
        if (!isCloudFileId(storedPath)) {
          throw publishError('IMAGE_UPLOAD_FAILED', '图片上传失败');
        }
        uploadedFileIds.push(storedPath);
        imageItems.push({
          ...item,
          storedPath,
          status: 'cloud'
        });
      }
    } catch (error) {
      await cleanupCloudFiles(uploadedFileIds);
      throw error;
    }
    this.setPublishData({
      imageItems,
      canAddImage: imageItems.length < MAX_IMAGE_COUNT
    });
    return imageItems.map((item) => item.storedPath);
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value);
    this.applyCategoryIndex(index);
  },

  onCategoryTap(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.applyCategoryIndex(index);
  },

  applyCategoryIndex(index) {
    const category = this.data.categories[index].value;
    const form = {
      ...this.data.form,
      category,
      intent: ''
    };
    this.setPublishData({
      categoryIndex: index,
      activeGuide: config.publishGuides[category],
      intentIndex: -1,
      form
    });
  },

  onIntentChange(event) {
    const index = Number(event.currentTarget.dataset.index);
    const form = {
      ...this.data.form,
      intent: this.data.lostFoundIntents[index].value
    };
    this.setPublishData({
      intentIndex: index,
      form
    });
  },

  onExpiryChange(event) {
    const index = Number(event.detail.value);
    this.applyExpiryIndex(index);
  },

  onExpiryTap(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.applyExpiryIndex(index);
  },

  applyExpiryIndex(index) {
    const form = {
      ...this.data.form,
      expiryHours: this.data.expiryOptions[index].value
    };
    this.setPublishData({
      expiryIndex: index,
      form
    });
  },

  async confirmLocation() {
    if (this.data.locationStatus === 'locating') {
      return null;
    }
    this.setPublishData({
      locationStatus: 'locating',
      locationSummary: '正在确认微信定位...'
    });
    try {
      const location = await getCurrentLocation();
      this.setPublishData({
        locationStatus: 'ready',
        locationSummary: LOCATION_READY_SUMMARY,
        draftLocation: location
      });
      wx.showToast({ title: '位置已确认', icon: 'success' });
      return location;
    } catch (error) {
      console.warn('[publish] failed to confirm location', error);
      this.setPublishData({
        locationStatus: 'failed',
        locationSummary: LOCATION_FAILED_SUMMARY,
        draftLocation: null
      });
      wx.showToast({ title: '无法获取当前位置', icon: 'none' });
      return null;
    }
  },

  async submit() {
    const form = this.data.form;
    if (this.data.submitting) {
      return;
    }
    if (getCurrentUser().isGuest) {
      this.setPublishData({ isGuest: true });
      this.promptLogin();
      return;
    }
    if (this.data.readiness.actionDisabled) {
      wx.showToast({ title: this.data.readiness.title, icon: 'none' });
      return;
    }
    if (!this.data.draftLocation) {
      wx.showToast({ title: '请先确认当前位置', icon: 'none' });
      return;
    }

    this.setPublishData({ submitting: true });
    let imageUrls = [];
    let postCreated = false;
    try {
      imageUrls = await this.persistImages();
      const post = await createPost({
        ...form,
        imageUrls,
        requireCloud: imageUrls.length > 0,
        ...this.data.draftLocation
      });
      postCreated = true;
      wx.showToast({ title: '已发布', icon: 'success' });
      this.resetForm();
      setTimeout(() => {
        wx.navigateTo({ url: `/pages/detail/detail?id=${post.id}&from=publish` });
      }, 400);
    } catch (error) {
      if (imageUrls.length && !postCreated) {
        await cleanupCloudFiles(imageUrls);
        this.resetUploadedImages(imageUrls);
      }
      if (error && error.code === 'AUTH_REQUIRED') {
        this.setPublishData({ isGuest: true });
        this.promptLogin();
        return;
      }
      console.warn('[publish] failed to submit post', error);
      const message = error && (error.errMsg || error.message || '');
      const imageErrorCodes = ['CLOUD_STORAGE_REQUIRED', 'IMAGE_TOO_LARGE', 'IMAGE_TYPE_UNSUPPORTED', 'IMAGE_UPLOAD_FAILED', 'CLOUD_REQUIRED'];
      const title = imageErrorCodes.indexOf(error && error.code) >= 0
        ? (message || '图片上传失败，请稍后再试')
        : (message.indexOf('getLocation') >= 0 ? '无法获取当前位置' : '发布失败，请稍后再试');
      wx.showToast({ title, icon: 'none' });
    } finally {
      this.setPublishData({ submitting: false });
    }
  }
});
