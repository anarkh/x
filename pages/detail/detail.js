import config from '../../utils/config.js';
import { getCurrentUser, isAdmin } from '../../utils/auth.js';
import {
  buildPublishSpreadPlan,
  buildPublishSpreadSharePath
} from '../../utils/publish-spread.js';
import { buildActionRelayPrompt } from '../../utils/action-relay.js';
import { buildCommentRelayPrompt } from '../../utils/comment-relay.js';
import { buildReceiverConversionPrompt } from '../../utils/receiver-conversion.js';
import { buildShareReceiverGuide } from '../../utils/share-receiver.js';
import { buildShareReceiverActionStrip } from '../../utils/share-receiver-actions.js';
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
  buildDetailTimelineShare,
  shouldShowDetailTimelineShare
} from '../../utils/timeline-share.js';
import {
  appendViralRelayQuery,
  appendViralRelayParams,
  createViralRelaySession,
  createViralAttributionSession,
  recordShareConversion,
  recordShareDetailBlocked,
  recordShareDetailLanding,
  recordShareDetailLoaded,
  recordShareRelay
} from '../../utils/viral-attribution.js';
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

function receiverConversionAction(prompt) {
  const path = String(prompt && prompt.sharePath || '');
  if (path.indexOf('receiverAction=comment') >= 0) {
    return 'comment';
  }
  if (path.indexOf('receiverAction=confirm') >= 0) {
    return 'confirm';
  }
  return '';
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
    shareReceiverActionStrip: null,
    receiverConversionPrompt: null,
    entryQuery: {},
    commentDraft: '',
    commentDraftLength: 0,
    commentSubmitting: false,
    showCommentDialog: false,
    maxCommentLength: MAX_COMMENT_LENGTH,
    actionRelayPrompt: null,
    commentRelayPrompt: null,
    shareMessage: null,
    attributionSession: null,
    attributionLoadedRecorded: false,
    attributionBlockedRecorded: false
  },

  onLoad(query = {}) {
    const entryQuery = {
      ...query,
      receiverAction: query.receiverAction || ''
    };
    const attributionSession = createViralAttributionSession(entryQuery);
    this.setData({
      id: entryQuery.id || '',
      entryQuery,
      showPublishSuccess: entryQuery.from === 'publish',
      showShareReceiverGuide: entryQuery.from === 'share',
      shareReceiverActionStrip: null,
      receiverConversionPrompt: null,
      attributionSession,
      attributionLoadedRecorded: false,
      attributionBlockedRecorded: false
    });
    recordShareDetailLanding(attributionSession);
    this.configureShareMenu(null);
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
      shareReceiverActionStrip: null,
      actionRelayPrompt: null,
      commentRelayPrompt: null,
      receiverConversionPrompt: null
    });
    let raw = null;
    let blockedReason = 'not_found';
    try {
      raw = await getPost(this.data.id);
    } catch (error) {
      blockedReason = 'load_failed';
      console.warn('[detail] failed to load post', error);
    }
    this.renderPost(raw, blockedReason);
    if (raw) {
      this.loadComments();
    } else {
      this.setData({
        comments: [],
        commentsLoading: false,
        trustInsight: null,
        publishSpreadPlan: null,
        shareReceiverGuide: null,
        shareReceiverActionStrip: null,
        actionRelayPrompt: null,
        commentRelayPrompt: null,
        receiverConversionPrompt: null,
        shareMessage: null
      });
    }
  },

  renderPost(raw, blockedReason = 'not_found') {
    if (!raw) {
      if (!this.data.attributionBlockedRecorded) {
        recordShareDetailBlocked(this.data.attributionSession, blockedReason);
      }
      this.configureShareMenu(null);
      this.setData({
        post: null,
        trustInsight: null,
        shareReceiverGuide: null,
        shareReceiverActionStrip: null,
        actionRelayPrompt: null,
        commentRelayPrompt: null,
        receiverConversionPrompt: null,
        shareMessage: null,
        attributionBlockedRecorded: true,
        loading: false
      });
      return;
    }
    const post = decorateDetailPost(raw);
    if (!this.data.attributionLoadedRecorded) {
      recordShareDetailLoaded(this.data.attributionSession, post);
    }
    this.configureShareMenu(post);
    this.setData({
      post,
      trustInsight: formatTrustInsight(post, this.data.comments.length),
      publishSpreadPlan: this.data.showPublishSuccess
        ? buildPublishSpreadPlan(post, this.data.comments.length)
        : null,
      shareReceiverGuide: this.buildShareReceiverGuide(post, this.data.comments.length),
      shareReceiverActionStrip: this.buildShareReceiverActionStrip(post),
      actionRelayPrompt: null,
      receiverConversionPrompt: null,
      shareMessage: this.buildShareMessage(post, this.data.comments.length),
      attributionLoadedRecorded: true,
      loading: false
    });
  },

  buildShareMessage(post, commentCount = 0) {
    return buildDetailShareMessage(post, commentCount, {
      surface: this.data.showPublishSuccess ? 'publish' : 'detail'
    });
  },

  configureShareMenu(post) {
    if (!wx.showShareMenu) {
      return;
    }
    const menus = shouldShowDetailTimelineShare(post)
      ? ['shareAppMessage', 'shareTimeline']
      : ['shareAppMessage'];
    try {
      wx.showShareMenu({
        withShareTicket: true,
        menus
      });
    } catch (error) {
      console.warn('[detail] failed to show share menu', error);
    }
  },

  buildShareReceiverGuide(post, commentCount = 0) {
    if (!this.data.showShareReceiverGuide) {
      return null;
    }
    return buildShareReceiverGuide(post, commentCount, {
      entryFrom: this.data.entryQuery.from,
      source: this.data.entryQuery.source,
      receiverAction: this.data.entryQuery.receiverAction
    });
  },

  buildShareReceiverActionStrip(post) {
    return buildShareReceiverActionStrip(post, {
      entryFrom: this.data.entryQuery.from
    });
  },

  buildAttributedRelayShare(post, path, options = {}) {
    const relaySession = createViralRelaySession(this.data.attributionSession, post, options);
    return {
      path: appendViralRelayParams(path, relaySession),
      relaySession
    };
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
        shareReceiverActionStrip: this.buildShareReceiverActionStrip(this.data.post),
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
      const receiverConversionPrompt = buildReceiverConversionPrompt(this.data.post, 'comment', {
        entryFrom: this.data.entryQuery.from
      });
      recordShareConversion(this.data.attributionSession, this.data.post, 'comment');
      this.setData({
        comments: nextComments,
        trustInsight: formatTrustInsight(this.data.post, nextComments.length),
        publishSpreadPlan: this.data.showPublishSuccess
          ? buildPublishSpreadPlan(this.data.post, nextComments.length)
          : null,
        shareReceiverGuide: this.buildShareReceiverGuide(this.data.post, nextComments.length),
        shareReceiverActionStrip: this.buildShareReceiverActionStrip(this.data.post),
        shareMessage: this.buildShareMessage(this.data.post, nextComments.length),
        actionRelayPrompt: null,
        commentRelayPrompt: receiverConversionPrompt
          ? null
          : buildCommentRelayPrompt(this.data.post, comment, nextComments.length),
        receiverConversionPrompt,
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
    const receiverConversionPrompt = buildReceiverConversionPrompt(post, action, {
      entryFrom: this.data.entryQuery.from
    });
    recordShareConversion(this.data.attributionSession, post, action);
    this.setData({
      actionRelayPrompt: receiverConversionPrompt ? null : buildActionRelayPrompt(post, action),
      commentRelayPrompt: null,
      receiverConversionPrompt
    });
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
      const relayShare = this.buildAttributedRelayShare(post, this.data.commentRelayPrompt.sharePath, {
        conversionAction: 'comment',
        shareChannel: 'app_message'
      });
      recordShareRelay(this.data.attributionSession, post, {
        conversionAction: 'comment',
        shareChannel: 'app_message',
        relaySession: relayShare.relaySession
      });
      return {
        title: this.data.commentRelayPrompt.shareTitle,
        path: relayShare.path
      };
    }
    if (
      shareContext === 'actionRelay' &&
      this.data.actionRelayPrompt &&
      this.data.actionRelayPrompt.shouldEncourageRelay
    ) {
      const relayShare = this.buildAttributedRelayShare(post, this.data.actionRelayPrompt.sharePath, {
        conversionAction: 'confirm',
        shareChannel: 'app_message'
      });
      recordShareRelay(this.data.attributionSession, post, {
        conversionAction: 'confirm',
        shareChannel: 'app_message',
        relaySession: relayShare.relaySession
      });
      return {
        title: this.data.actionRelayPrompt.shareTitle,
        path: relayShare.path
      };
    }
    if (
      shareContext === 'receiverConversion' &&
      this.data.receiverConversionPrompt &&
      this.data.receiverConversionPrompt.shouldRelay
    ) {
      const conversionAction = receiverConversionAction(this.data.receiverConversionPrompt);
      const relayShare = this.buildAttributedRelayShare(post, this.data.receiverConversionPrompt.sharePath, {
        conversionAction,
        shareChannel: 'app_message'
      });
      recordShareRelay(this.data.attributionSession, post, {
        conversionAction,
        shareChannel: 'app_message',
        relaySession: relayShare.relaySession
      });
      return {
        title: this.data.receiverConversionPrompt.shareTitle,
        path: relayShare.path
      };
    }
    const shareMessage = this.data.shareMessage || this.buildShareMessage(post, this.data.comments.length);
    const ordinarySharePath = this.data.showPublishSuccess
      ? buildPublishSpreadSharePath(post.id, this.data.entryQuery)
      : shareMessage.path;
    const relayShare = this.buildAttributedRelayShare(post, ordinarySharePath, {
      shareChannel: 'app_message'
    });
    recordShareRelay(this.data.attributionSession, post, {
      shareChannel: 'app_message',
      relaySession: relayShare.relaySession
    });
    return {
      title: shareMessage.title,
      path: relayShare.path
    };
  },

  onShareTimeline() {
    const post = this.data.post;
    const payload = buildDetailTimelineShare(post);
    const relaySession = createViralRelaySession(this.data.attributionSession, post, {
      shareChannel: 'timeline'
    });
    recordShareRelay(this.data.attributionSession, post, {
      shareChannel: 'timeline',
      relaySession
    });
    return {
      ...payload,
      query: appendViralRelayQuery(payload.query, relaySession)
    };
  },

  goHome() {
    wx.switchTab({ url: '/pages/map/map' });
  }
});
