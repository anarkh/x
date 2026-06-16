import config from '../../utils/config.js';
import { getCurrentUser, isAdmin } from '../../utils/auth.js';
import {
  buildPublishSpreadPlan,
  buildPublishSpreadSharePath
} from '../../utils/publish-spread.js';
import { buildCommentRelayPrompt } from '../../utils/comment-relay.js';
import { buildShareReceiverGuide } from '../../utils/share-receiver.js';
import {
  createPostComment,
  getPost,
  hasReactedToPost,
  listPostComments,
  reactToPost,
  resolvePost
} from '../../utils/store.js';
import { buildDetailShareMessage } from '../../utils/share-message.js';
import {
  categoryLabel,
  formatCreatedAt,
  formatTimeLeft,
  formatTrustInsight,
  intentLabel,
  resolveActionLabel,
  statusLabel
} from '../../utils/format.js';

const MAX_COMMENT_LENGTH = 120;

function publisherInitial(name) {
  return (String(name || '').trim().slice(0, 1) || '邻').toUpperCase();
}

function decorateDetailPost(raw) {
  const user = getCurrentUser();
  const canReact = raw.status === 'active' || raw.status === 'stale';
  const canResolve = canReact && (isAdmin(user) || raw.isMine || raw.publisherId === user.id);
  const canShowResolve = canResolve && raw.category !== 'check_in';
  const publisherName = String(raw.publisher || '附近用户').trim() || '附近用户';
  return {
    ...raw,
    imageUrls: Array.isArray(raw.imageUrls) ? raw.imageUrls : [],
    categoryText: categoryLabel(raw.category),
    intentText: intentLabel(raw.intent),
    statusText: statusLabel(raw.status),
    createdText: formatCreatedAt(raw.createdAt),
    expiryText: raw.status === 'resolved' ? '已关闭' : formatTimeLeft(raw.expiresAt),
    distanceText: `${raw.distance}m`,
    publisherName,
    publisherAvatarUrl: raw.publisherAvatarUrl || '',
    publisherInitial: publisherInitial(publisherName),
    resolveText: resolveActionLabel(raw.category),
    canReact,
    canComment: canReact,
    canResolve,
    canShowResolve,
    confirmedByMe: hasReactedToPost(raw.id, 'confirm'),
    staledByMe: hasReactedToPost(raw.id, 'stale'),
    reportedByMe: hasReactedToPost(raw.id, 'report')
  };
}

function decorateComment(raw) {
  return {
    ...raw,
    authorText: raw.author || '附近用户',
    createdText: formatCreatedAt(raw.createdAt),
    badgeText: raw.isMine ? '我' : (raw.authorRole === 'admin' ? '管理' : '')
  };
}

Page({
  data: {
    id: '',
    appInfo: config.appInfo,
    post: null,
    loading: true,
    showPublishSuccess: false,
    showShareReceiverGuide: false,
    isGuest: true,
    comments: [],
    commentsLoading: false,
    trustInsight: null,
    publishSpreadPlan: null,
    shareReceiverGuide: null,
    entryQuery: {},
    commentDraft: '',
    commentDraftLength: 0,
    commentSubmitting: false,
    showCommentDialog: false,
    maxCommentLength: MAX_COMMENT_LENGTH,
    commentRelayPrompt: null,
    shareMessage: null
  },

  onLoad(query) {
    this.setData({
      id: query.id || '',
      entryQuery: query || {},
      showPublishSuccess: query.from === 'publish',
      showShareReceiverGuide: query.from === 'share'
    });
    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage']
      });
    }
  },

  onShow() {
    this.loadPost();
  },

  onUnload() {
    if (this.data.showPublishSuccess) {
      wx.switchTab({ url: '/pages/map/map' });
    }
  },

  async loadPost() {
    this.setData({
      loading: true,
      isGuest: getCurrentUser().isGuest,
      commentRelayPrompt: null
    });
    let raw = null;
    try {
      raw = await getPost(this.data.id);
    } catch (error) {
      console.warn('[detail] failed to load post', error);
    }
    this.renderPost(raw);
    if (raw) {
      this.loadComments();
    } else {
      this.setData({
        comments: [],
        commentsLoading: false,
        trustInsight: null,
        publishSpreadPlan: null,
        shareReceiverGuide: null,
        commentRelayPrompt: null,
        shareMessage: null
      });
    }
  },

  renderPost(raw) {
    if (!raw) {
      this.setData({
        post: null,
        trustInsight: null,
        shareReceiverGuide: null,
        commentRelayPrompt: null,
        shareMessage: null,
        loading: false
      });
      return;
    }
    const post = decorateDetailPost(raw);
    this.setData({
      post,
      trustInsight: formatTrustInsight(post, this.data.comments.length),
      publishSpreadPlan: this.data.showPublishSuccess
        ? buildPublishSpreadPlan(post, this.data.comments.length)
        : null,
      shareReceiverGuide: this.buildShareReceiverGuide(post, this.data.comments.length),
      shareMessage: this.buildShareMessage(post, this.data.comments.length),
      loading: false
    });
  },

  buildShareMessage(post, commentCount = 0) {
    return buildDetailShareMessage(post, commentCount, {
      surface: this.data.showPublishSuccess ? 'publish' : 'detail'
    });
  },

  buildShareReceiverGuide(post, commentCount = 0) {
    if (!this.data.showShareReceiverGuide) {
      return null;
    }
    return buildShareReceiverGuide(post, commentCount, {
      entryFrom: this.data.entryQuery.from,
      source: this.data.entryQuery.source
    });
  },

  async loadComments() {
    if (!this.data.id) {
      return;
    }
    this.setData({ commentsLoading: true });
    try {
      const comments = await listPostComments(this.data.id);
      const nextComments = comments.map(decorateComment);
      this.setData({
        comments: nextComments,
        trustInsight: formatTrustInsight(this.data.post, nextComments.length),
        publishSpreadPlan: this.data.showPublishSuccess && this.data.post
          ? buildPublishSpreadPlan(this.data.post, nextComments.length)
          : null,
        shareReceiverGuide: this.buildShareReceiverGuide(this.data.post, nextComments.length),
        shareMessage: this.buildShareMessage(this.data.post, nextComments.length),
        commentsLoading: false
      });
    } catch (error) {
      console.warn('[detail] failed to load comments', error);
      this.setData({ commentsLoading: false });
    }
  },

  previewImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const urls = this.data.post && this.data.post.imageUrls ? this.data.post.imageUrls : [];
    if (!urls.length) {
      return;
    }
    wx.previewImage({
      current: urls[index],
      urls
    });
  },

  onCommentInput(event) {
    const value = event.detail.value || '';
    this.setData({
      commentDraft: value,
      commentDraftLength: value.length
    });
  },

  promptLogin() {
    wx.showModal({
      title: '登录后评论',
      content: '评论会显示你的昵称，方便发布者和附近的人继续补充线索。',
      confirmText: '去登录',
      cancelText: '稍后',
      success: (result) => {
        if (result.confirm) {
          wx.switchTab({ url: '/pages/me/me' });
        }
      }
    });
  },

  openCommentDialog() {
    if (!this.data.post || !this.data.post.canComment) {
      wx.showToast({ title: '当前任务暂不能评论', icon: 'none' });
      return;
    }
    if (getCurrentUser().isGuest) {
      this.setData({ isGuest: true });
      this.promptLogin();
      return;
    }
    this.setData({ showCommentDialog: true });
  },

  closeCommentDialog() {
    if (this.data.commentSubmitting) {
      return;
    }
    this.setData({ showCommentDialog: false });
  },

  stopDialogTap() {},

  async submitComment() {
    if (this.data.commentSubmitting) {
      return;
    }
    if (!this.data.post || !this.data.post.canComment) {
      wx.showToast({ title: '当前任务暂不能评论', icon: 'none' });
      return;
    }
    if (getCurrentUser().isGuest) {
      this.setData({ isGuest: true });
      this.promptLogin();
      return;
    }
    const body = this.data.commentDraft.trim();
    if (!body) {
      wx.showToast({ title: '先写一点内容', icon: 'none' });
      return;
    }
    if (body.length > MAX_COMMENT_LENGTH) {
      wx.showToast({ title: `最多${MAX_COMMENT_LENGTH}字`, icon: 'none' });
      return;
    }

    this.setData({ commentSubmitting: true });
    try {
      const comment = await createPostComment(this.data.id, body);
      const nextComments = [
        decorateComment(comment),
        ...this.data.comments.filter((item) => item.id !== comment.id)
      ];
      this.setData({
        comments: nextComments,
        trustInsight: formatTrustInsight(this.data.post, nextComments.length),
        publishSpreadPlan: this.data.showPublishSuccess
          ? buildPublishSpreadPlan(this.data.post, nextComments.length)
          : null,
        shareReceiverGuide: this.buildShareReceiverGuide(this.data.post, nextComments.length),
        shareMessage: this.buildShareMessage(this.data.post, nextComments.length),
        commentRelayPrompt: buildCommentRelayPrompt(this.data.post, comment, nextComments.length),
        commentDraft: '',
        commentDraftLength: 0,
        showCommentDialog: false
      });
      wx.showToast({ title: '已评论', icon: 'success' });
    } catch (error) {
      if (error && error.code === 'AUTH_REQUIRED') {
        this.setData({ isGuest: true });
        this.promptLogin();
        return;
      }
      console.warn('[detail] failed to submit comment', error);
      wx.showToast({
        title: error && error.code === 'POST_CLOSED' ? '当前任务暂不能评论' : '评论失败，请稍后再试',
        icon: 'none'
      });
    } finally {
      this.setData({ commentSubmitting: false });
    }
  },

  async react(event) {
    const action = event.currentTarget.dataset.action;
    if (hasReactedToPost(this.data.id, action)) {
      wx.showToast({
        title: '这条已记录过',
        icon: 'none'
      });
      return;
    }
    const post = await reactToPost(this.data.id, action);
    wx.showToast({
      title: action === 'report' ? '已收到举报' : '已记录',
      icon: 'success'
    });
    this.renderPost(post);
  },

  resolve() {
    if (!this.data.post || !this.data.post.canResolve) {
      wx.showToast({
        title: '只有发布者或管理员可关闭',
        icon: 'none'
      });
      return;
    }
    wx.showModal({
      title: this.data.post.resolveText,
      content: '关闭后仍会保留在列表里，方便附近用户知道这件事已经处理完。',
      confirmText: '关闭',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        const post = await resolvePost(this.data.id);
        wx.showToast({
          title: '已关闭',
          icon: 'success'
        });
        this.renderPost(post);
      }
    });
  },

  onShareAppMessage(event = {}) {
    const post = this.data.post;
    if (!post) {
      return {
        title: config.appInfo.shareTitle,
        path: '/pages/map/map?from=share'
      };
    }
    const shareContext = event.target && event.target.dataset && event.target.dataset.shareContext;
    if (
      shareContext === 'commentRelay' &&
      this.data.commentRelayPrompt &&
      this.data.commentRelayPrompt.shouldEncourageRelay
    ) {
      return {
        title: this.data.commentRelayPrompt.shareTitle,
        path: this.data.commentRelayPrompt.sharePath
      };
    }
    const shareMessage = this.data.shareMessage || this.buildShareMessage(post, this.data.comments.length);
    return {
      title: shareMessage.title,
      path: this.data.showPublishSuccess
        ? buildPublishSpreadSharePath(post.id, this.data.entryQuery)
        : shareMessage.path
    };
  },

  goHome() {
    wx.switchTab({ url: '/pages/map/map' });
  }
});
