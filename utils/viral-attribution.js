import config from './config.js';

const STORAGE_KEY = 'viral_attribution_events';
const MAX_LOCAL_EVENTS = 100;
const EVENT_TYPES = [
  'share_detail_landing',
  'share_detail_loaded',
  'share_detail_blocked',
  'share_confirm_success',
  'share_comment_success',
  'share_relay_intent',
  'share_relay_success'
];
const ENTRY_SOURCES = ['share', 'timeline', 'receiver', 'comment', 'confirm'];
const SHARE_CHANNELS = ['app_message', 'timeline'];
const CONVERSION_ACTIONS = ['confirm', 'comment'];
const ACTION_RESULTS = ['success', 'blocked', 'failed'];
const BLOCKED_REASONS = [
  '',
  'not_found',
  'hidden',
  'closed_post',
  'risk_post',
  'load_failed',
  'duplicate_action'
];
const CLOSED_STATUSES = ['hidden', 'resolved', 'expired'];
const ALLOWED_EVENT_FIELDS = [
  'event_type',
  'event_time_ms',
  'attribution_session_id',
  'post_id',
  'post_category',
  'post_status',
  'from',
  'entry_source',
  'share_channel',
  'share_id',
  'parent_share_id',
  'share_depth',
  'conversion_action',
  'action_result',
  'blocked_reason',
  'is_publisher',
  'distance_bucket',
  'app_version'
];

function trimText(value, maxLength = 120) {
  return String(value || '').trim().slice(0, maxLength);
}

function nowId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function shouldUseCloud() {
  const hasWxCloud = typeof wx !== 'undefined' && wx.cloud;
  try {
    const app = getApp();
    const cloudReady = !app || !app.globalData || app.globalData.cloudReady !== false;
    return Boolean(config.cloud && config.cloud.enabled && config.cloud.envId && hasWxCloud && cloudReady);
  } catch (error) {
    return Boolean(config.cloud && config.cloud.enabled && config.cloud.envId && hasWxCloud);
  }
}

function loadLocalEvents() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function saveLocalEvent(event) {
  try {
    wx.setStorageSync(STORAGE_KEY, [event, ...loadLocalEvents()].slice(0, MAX_LOCAL_EVENTS));
  } catch (error) {
    // Attribution must never block the detail, comment, confirm, or share path.
  }
}

async function sendCloudEvent(event) {
  if (!shouldUseCloud()) {
    return;
  }
  try {
    await wx.cloud.callFunction({
      name: 'posts',
      data: {
        action: 'recordViralAttribution',
        event
      }
    });
  } catch (error) {
    // CloudBase is best-effort for this metric; local storage already captured the event.
  }
}

export function normalizeEntrySource(value) {
  const source = trimText(value, 24);
  return ENTRY_SOURCES.includes(source) ? source : 'share';
}

export function normalizeShareChannel(value, source = '') {
  const channel = trimText(value, 24);
  if (SHARE_CHANNELS.includes(channel)) {
    return channel;
  }
  return normalizeEntrySource(source) === 'timeline' ? 'timeline' : 'app_message';
}

export function normalizeConversionAction(value) {
  const action = trimText(value, 24);
  return CONVERSION_ACTIONS.includes(action) ? action : '';
}

function normalizeShareDepth(value) {
  if (value === '2_plus') {
    return '2_plus';
  }
  const depth = Number(value);
  if (!Number.isFinite(depth) || depth <= 1) {
    return '1';
  }
  return depth === 2 ? '2' : '2_plus';
}

function nextShareDepth(value) {
  return normalizeShareDepth(value) === '1' ? '2' : '2_plus';
}

function normalizeResult(value) {
  const result = trimText(value, 24);
  return ACTION_RESULTS.includes(result) ? result : 'success';
}

function normalizeBlockedReason(value) {
  const reason = trimText(value, 32);
  return BLOCKED_REASONS.includes(reason) ? reason : '';
}

function coarseDistanceBucket(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance < 0) {
    return '';
  }
  if (distance <= 500) {
    return '0_500m';
  }
  if (distance <= 1000) {
    return '500m_1km';
  }
  if (distance <= 3000) {
    return '1km_3km';
  }
  return '3km_plus';
}

function normalizeShareId(value, prefix) {
  return trimText(value, 80) || nowId(prefix);
}

function serializeQueryParams(params) {
  if (!params || !Object.keys(params).length) {
    return '';
  }
  return Object.keys(params)
    .filter((key) => params[key])
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

function appendQueryParams(path, params) {
  const text = trimText(path, 500);
  const query = serializeQueryParams(params);
  if (!text || !query) {
    return text;
  }
  const separator = text.includes('?') ? '&' : '?';
  return query ? `${text}${separator}${query}` : text;
}

function appendQueryStringParams(queryString, params) {
  const text = trimText(queryString, 500);
  const query = serializeQueryParams(params);
  if (!text || !query) {
    return text;
  }
  return `${text}&${query}`;
}

function cleanBaseEvent(event) {
  const cleaned = {};
  for (const field of ALLOWED_EVENT_FIELDS) {
    if (event[field] !== undefined && event[field] !== null && event[field] !== '') {
      cleaned[field] = event[field];
    }
  }
  return cleaned;
}

function postFields(post = {}) {
  return {
    post_id: trimText(post.id, 80),
    post_category: trimText(post.category, 32),
    post_status: trimText(post.status, 24),
    is_publisher: Boolean(post.isMine),
    distance_bucket: coarseDistanceBucket(post.distance)
  };
}

export function hasShareAttribution(query = {}) {
  return query.from === 'share';
}

export function createViralAttributionSession(query = {}) {
  if (!hasShareAttribution(query)) {
    return null;
  }
  const entrySource = normalizeEntrySource(query.source);
  const shareId = normalizeShareId(query.share_id || query.shareId, 'sh');
  return {
    attribution_session_id: nowId('attr'),
    from: 'share',
    entry_source: entrySource,
    share_channel: normalizeShareChannel(query.shareChannel || query.share_channel, entrySource),
    share_id: shareId,
    parent_share_id: trimText(query.parent_share_id || query.parentShareId, 80),
    share_depth: normalizeShareDepth(query.share_depth || query.shareDepth)
  };
}

export function isLowRiskRelayPost(post = {}) {
  return Boolean(
    post
    && post.id
    && post.status === 'active'
    && Number(post.staleCount || 0) === 0
    && Number(post.reportCount || 0) === 0
    && !CLOSED_STATUSES.includes(post.status)
  );
}

export function createViralRelaySession(session, post = {}, options = {}) {
  if (!session || !isLowRiskRelayPost(post)) {
    return null;
  }
  return {
    ...session,
    parent_share_id: session.share_id,
    share_id: normalizeShareId(options.shareId, 'sh'),
    share_channel: normalizeShareChannel(options.shareChannel || session.share_channel, session.entry_source),
    share_depth: nextShareDepth(session.share_depth)
  };
}

export function appendViralRelayParams(path, relaySession) {
  if (!relaySession) {
    return trimText(path, 500);
  }
  return appendQueryParams(path, {
    share_id: relaySession.share_id,
    parent_share_id: relaySession.parent_share_id,
    share_depth: relaySession.share_depth
  });
}

export function appendViralRelayQuery(query, relaySession) {
  if (!relaySession) {
    return trimText(query, 500);
  }
  return appendQueryStringParams(query, {
    share_id: relaySession.share_id,
    parent_share_id: relaySession.parent_share_id,
    share_depth: relaySession.share_depth
  });
}

export function buildViralAttributionEvent(session, type, post = null, options = {}) {
  if (!session || !EVENT_TYPES.includes(type)) {
    return null;
  }
  const action = normalizeConversionAction(options.conversionAction);
  const event = cleanBaseEvent({
    ...session,
    ...postFields(post || {}),
    event_type: type,
    event_time_ms: Number(options.eventTimeMs) || Date.now(),
    conversion_action: action,
    action_result: normalizeResult(options.actionResult),
    blocked_reason: normalizeBlockedReason(options.blockedReason),
    app_version: trimText(config.appInfo && config.appInfo.version, 24)
  });
  return event.event_type && event.attribution_session_id ? event : null;
}

export function trackViralAttributionEvent(session, type, post = null, options = {}) {
  const event = buildViralAttributionEvent(session, type, post, options);
  if (!event) {
    return Promise.resolve(null);
  }
  saveLocalEvent(event);
  return sendCloudEvent(event).then(() => event).catch(() => event);
}

export function recordShareDetailLanding(session) {
  return trackViralAttributionEvent(session, 'share_detail_landing');
}

export function recordShareDetailLoaded(session, post) {
  return trackViralAttributionEvent(session, 'share_detail_loaded', post);
}

export function recordShareDetailBlocked(session, blockedReason) {
  return trackViralAttributionEvent(session, 'share_detail_blocked', null, {
    actionResult: 'blocked',
    blockedReason
  });
}

export function recordShareConversion(session, post, action) {
  const normalizedAction = normalizeConversionAction(action);
  if (!normalizedAction || !session) {
    return Promise.resolve(null);
  }
  return trackViralAttributionEvent(session, `share_${normalizedAction}_success`, post, {
    conversionAction: normalizedAction
  });
}

export function recordShareRelay(session, post, options = {}) {
  const nextSession = options.relaySession || createViralRelaySession(session, post, options);
  if (!nextSession) {
    return Promise.resolve(null);
  }
  const intent = trackViralAttributionEvent(nextSession, 'share_relay_intent', post, options);
  const success = trackViralAttributionEvent(nextSession, 'share_relay_success', post, options);
  return Promise.allSettled([intent, success]).then(() => nextSession);
}

export const viralAttributionTestExports = {
  ALLOWED_EVENT_FIELDS,
  EVENT_TYPES,
  ENTRY_SOURCES,
  SHARE_CHANNELS,
  STORAGE_KEY,
  appendQueryParams
};
