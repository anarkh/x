const crypto = require('crypto');
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const POSTS_COLLECTION = 'posts';
const ADMINS_COLLECTION = 'admins';
const REACTIONS_COLLECTION = 'post_reactions';
const COMMENTS_COLLECTION = 'post_comments';
const FEEDBACK_COLLECTION = 'feedback_items';
const MAX_VISIBLE_POSTS = 100;
const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_URL_LENGTH = 500;
const MAX_COMMENTS_PER_POST = 50;
const MAX_COMMENT_LENGTH = 120;
const MAX_FEEDBACKS = 100;
const MAX_FEEDBACK_BODY_LENGTH = 500;
const MAX_FEEDBACK_CONTACT_LENGTH = 80;
const CLOSED_STATUSES = ['hidden', 'resolved'];
const CATEGORIES = ['check_in', 'lost_found', 'street_update', 'help_needed'];
const LOST_FOUND_INTENTS = ['lost', 'found'];
const FEEDBACK_TYPES = ['suggestion', 'bug', 'content', 'other'];
const EXPIRY_HOURS = [6, 24, 72];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function ok(data = {}) {
  return { ok: true, data };
}

function fail(code, message) {
  return { ok: false, code, message };
}

function isMissingCollectionError(error) {
  return error
    && (error.errCode === -502005 || String(error.errMsg || error.message || '').includes('ResourceNotFound'));
}

function isDuplicateError(error) {
  const message = String(error && (error.errMsg || error.message || ''));
  return message.includes('duplicate') || message.includes('Duplicate') || message.includes('already exists');
}

function normalizePost(post) {
  return post ? { ...post, id: post.id || post._id } : null;
}

function normalizeComment(comment) {
  return comment ? { ...comment, id: comment.id || comment._id } : null;
}

function normalizeFeedback(feedback) {
  return feedback ? { ...feedback, id: feedback.id || feedback._id } : null;
}

function cleanString(value, maxLength, fieldName, required = false) {
  const text = String(value || '').trim();
  if (required && !text) {
    const error = new Error(`${fieldName} is required`);
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  if (text.length > maxLength) {
    const error = new Error(`${fieldName} is too long`);
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return text;
}

function cleanCategory(value) {
  if (!CATEGORIES.includes(value)) {
    const error = new Error('Invalid category');
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return value;
}

function cleanIntent(category, value) {
  if (category !== 'lost_found') {
    return '';
  }
  if (!LOST_FOUND_INTENTS.includes(value)) {
    const error = new Error('Invalid lost/found intent');
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return value;
}

function cleanFeedbackType(value) {
  const type = String(value || FEEDBACK_TYPES[0]).trim();
  if (!FEEDBACK_TYPES.includes(type)) {
    const error = new Error('Invalid feedback type');
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return type;
}

function cleanExpiryHours(value) {
  const hours = Number(value);
  if (!EXPIRY_HOURS.includes(hours)) {
    const error = new Error('Invalid expiry');
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return hours;
}

function cleanCoordinate(value, min, max, fieldName) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    const error = new Error(`Invalid ${fieldName}`);
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return Number(numberValue.toFixed(6));
}

function cleanImageUrls(value) {
  const urls = Array.isArray(value) ? value : [];
  if (urls.length > MAX_IMAGE_COUNT) {
    const error = new Error('Too many images');
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return urls
    .map((url) => String(url || '').trim())
    .filter((url) => url.startsWith('cloud://') && url.length <= MAX_IMAGE_URL_LENGTH);
}

function canTrustReact(post, now) {
  return post && !CLOSED_STATUSES.includes(post.status) && post.expiresAt > now;
}

function canComment(post, now) {
  return post && !CLOSED_STATUSES.includes(post.status) && post.expiresAt > now;
}

function isViewable(post, isAdmin) {
  return post && (isAdmin || post.status !== 'hidden');
}

function decorateForUser(post, openid) {
  const normalized = normalizePost(post);
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    isMine: normalized.publisherId === openid
  };
}

function decorateCommentForUser(comment, openid) {
  const normalized = normalizeComment(comment);
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    isMine: normalized.authorId === openid
  };
}

function hashId(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function safeDocId(parts) {
  return `reaction_${hashId(parts.join(':'))}`;
}

function cleanUploadExtension(value) {
  const ext = String(value || '').toLowerCase().replace(/^\./, '');
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    const error = new Error('Invalid image extension');
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  return ext;
}

async function isAdminOpenid(openid) {
  if (!openid) {
    return false;
  }
  try {
    const result = await db.collection(ADMINS_COLLECTION)
      .where({
        openid,
        role: 'admin',
        enabled: true
      })
      .limit(1)
      .get();
    return Boolean(result.data && result.data[0]);
  } catch (error) {
    if (isMissingCollectionError(error)) {
      return false;
    }
    throw error;
  }
}

async function findPostById(id) {
  const postId = cleanString(id, 80, 'id', true);
  const result = await db.collection(POSTS_COLLECTION)
    .where({ id: postId })
    .limit(1)
    .get();
  return normalizePost(result.data && result.data[0]);
}

async function nextMarkerId() {
  const result = await db.collection(POSTS_COLLECTION)
    .orderBy('markerId', 'desc')
    .limit(1)
    .get();
  const currentMax = result.data && result.data[0] ? Number(result.data[0].markerId) || 0 : 0;
  return currentMax + 1;
}

async function listPosts(event, openid, isAdmin) {
  const limit = Math.min(Math.max(Number(event.limit) || MAX_VISIBLE_POSTS, 1), MAX_VISIBLE_POSTS);
  const includeHidden = Boolean(event.includeHidden && isAdmin);
  const result = await db.collection(POSTS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  const posts = (result.data || [])
    .map(normalizePost)
    .filter((post) => includeHidden || post.status !== 'hidden')
    .map((post) => decorateForUser(post, openid));
  return ok({ posts, isAdmin });
}

async function getPost(event, openid, isAdmin) {
  const post = await findPostById(event.id);
  return ok({
    post: isViewable(post, isAdmin) ? decorateForUser(post, openid) : null,
    isAdmin
  });
}

async function createPost(event, openid, isAdmin) {
  const input = event.input || {};
  const now = Date.now();
  const category = cleanCategory(input.category);
  const expiryHours = cleanExpiryHours(input.expiryHours);
  const post = {
    id: `post_${now}_${hashId(`${openid}:${now}:${Math.random()}`).slice(0, 8)}`,
    markerId: await nextMarkerId(),
    title: cleanString(input.title, 32, 'title', true),
    body: cleanString(input.body, 180, 'body', true),
    imageUrls: cleanImageUrls(input.imageUrls),
    category,
    intent: cleanIntent(category, input.intent),
    placeName: cleanString(input.placeName, 40, 'placeName') || '当前位置',
    latitude: cleanCoordinate(input.latitude, -90, 90, 'latitude'),
    longitude: cleanCoordinate(input.longitude, -180, 180, 'longitude'),
    status: 'active',
    confirmations: 0,
    lastConfirmedAt: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now,
    expiresAt: now + expiryHours * 60 * 60 * 1000,
    publisherId: openid,
    publisher: cleanString(input.publisher, 32, 'publisher') || '匿名用户',
    publisherAvatarUrl: cleanString(input.publisherAvatarUrl, 500, 'publisherAvatarUrl'),
    publisherRole: isAdmin ? 'admin' : 'user',
    publisherLoggedInAt: Number(input.publisherLoggedInAt) || 0
  };
  await db.collection(POSTS_COLLECTION).add({ data: post });
  return ok({ post: decorateForUser(post, openid) });
}

async function rememberReaction(openid, postId, action, now) {
  const reactionId = safeDocId([openid, postId, action]);
  try {
    await db.collection(REACTIONS_COLLECTION).add({
      data: {
        _id: reactionId,
        openid,
        postId,
        action,
        createdAt: now
      }
    });
    return true;
  } catch (error) {
    if (isDuplicateError(error)) {
      return false;
    }
    throw error;
  }
}

async function applyReactionPatch(post, action, now) {
  if (action === 'confirm') {
    await db.collection(POSTS_COLLECTION)
      .where({ id: post.id })
      .update({
        data: {
          confirmations: _.inc(1),
          lastConfirmedAt: now
        }
      });
    return;
  }
  if (action === 'stale') {
    await db.collection(POSTS_COLLECTION)
      .where({ id: post.id })
      .update({ data: { staleCount: _.inc(1) } });
    const updated = await findPostById(post.id);
    if (updated && updated.staleCount >= 3 && !CLOSED_STATUSES.includes(updated.status)) {
      await db.collection(POSTS_COLLECTION)
        .where({ id: post.id })
        .update({ data: { status: 'stale' } });
    }
    return;
  }
  if (action === 'report') {
    await db.collection(POSTS_COLLECTION)
      .where({ id: post.id })
      .update({ data: { reportCount: _.inc(1) } });
    const updated = await findPostById(post.id);
    if (updated && updated.reportCount >= 2 && updated.status !== 'hidden') {
      await db.collection(POSTS_COLLECTION)
        .where({ id: post.id })
        .update({ data: { status: 'hidden' } });
    }
  }
}

async function reactToPost(event, openid, isAdmin) {
  const post = await findPostById(event.id);
  const action = cleanString(event.reaction, 16, 'reaction', true);
  if (!['confirm', 'stale', 'report'].includes(action)) {
    return fail('VALIDATION_FAILED', 'Invalid reaction');
  }
  const now = Date.now();
  if (!canTrustReact(post, now)) {
    return ok({
      post: isViewable(post, isAdmin) ? decorateForUser(post, openid) : null,
      duplicate: false
    });
  }
  const firstReaction = await rememberReaction(openid, post.id, action, now);
  if (firstReaction) {
    await applyReactionPatch(post, action, now);
  }
  const updated = await findPostById(post.id);
  return ok({
    post: isViewable(updated, isAdmin) ? decorateForUser(updated, openid) : null,
    duplicate: !firstReaction,
    reactedAt: firstReaction ? now : 0
  });
}

async function resolvePost(event, openid, isAdmin) {
  const now = Date.now();
  const post = await findPostById(event.id);
  if (!post) {
    return ok({ post: null });
  }
  if (!isAdmin && post.publisherId !== openid) {
    return fail('FORBIDDEN', 'Only the publisher or an admin can close this post');
  }
  if (canTrustReact(post, now)) {
    await db.collection(POSTS_COLLECTION)
      .where({ id: post.id })
      .update({ data: { status: 'resolved' } });
  }
  const updated = await findPostById(post.id);
  return ok({
    post: isViewable(updated, isAdmin) ? decorateForUser(updated, openid) : null
  });
}

async function hidePost(event, openid, isAdmin) {
  if (!isAdmin) {
    return fail('FORBIDDEN', 'Only admins can hide posts');
  }
  const post = await findPostById(event.id);
  if (!post) {
    return ok({ post: null });
  }
  await db.collection(POSTS_COLLECTION)
    .where({ id: post.id })
    .update({ data: { status: 'hidden' } });
  const updated = await findPostById(post.id);
  return ok({ post: decorateForUser(updated, openid) });
}

async function listComments(event, openid, isAdmin) {
  const post = await findPostById(event.id);
  if (!isViewable(post, isAdmin)) {
    return ok({ comments: [], isAdmin });
  }
  const result = await db.collection(COMMENTS_COLLECTION)
    .where({
      postId: post.id,
      status: 'visible'
    })
    .limit(MAX_COMMENTS_PER_POST)
    .get();
  const comments = (result.data || [])
    .map((comment) => decorateCommentForUser(comment, openid))
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);
  return ok({ comments, isAdmin });
}

async function createComment(event, openid, isAdmin) {
  const now = Date.now();
  const post = await findPostById(event.id);
  if (!isViewable(post, isAdmin)) {
    return fail('NOT_FOUND', 'Post not found');
  }
  if (!canComment(post, now)) {
    return fail('POST_CLOSED', 'This post no longer accepts comments');
  }
  const comment = {
    id: `comment_${now}_${hashId(`${openid}:${post.id}:${now}:${Math.random()}`).slice(0, 8)}`,
    postId: post.id,
    body: cleanString(event.body, MAX_COMMENT_LENGTH, 'body', true),
    status: 'visible',
    authorId: openid,
    author: cleanString(event.author, 32, 'author') || '附近用户',
    authorAvatarUrl: cleanString(event.authorAvatarUrl, 500, 'authorAvatarUrl'),
    authorRole: isAdmin ? 'admin' : 'user',
    authorLoggedInAt: Number(event.authorLoggedInAt) || 0,
    createdAt: now
  };
  await db.collection(COMMENTS_COLLECTION).add({ data: comment });
  return ok({ comment: decorateCommentForUser(comment, openid) });
}

async function createFeedback(event, openid, isAdmin) {
  const input = event.input || {};
  const now = Date.now();
  const feedback = {
    id: `feedback_${now}_${hashId(`${openid}:${now}:${Math.random()}`).slice(0, 8)}`,
    type: cleanFeedbackType(input.type),
    body: cleanString(input.body, MAX_FEEDBACK_BODY_LENGTH, 'body', true),
    contact: cleanString(input.contact, MAX_FEEDBACK_CONTACT_LENGTH, 'contact'),
    userId: openid,
    nickname: cleanString(input.nickname, 32, 'nickname') || '街区用户',
    role: isAdmin ? 'admin' : 'user',
    status: 'open',
    createdAt: now
  };
  await db.collection(FEEDBACK_COLLECTION).add({ data: feedback });
  return ok({ feedback: normalizeFeedback(feedback) });
}

async function listFeedback(event, openid, isAdmin) {
  if (!isAdmin) {
    return fail('FORBIDDEN', 'Only admins can list feedback');
  }
  const limit = Math.min(Math.max(Number(event.limit) || MAX_FEEDBACKS, 1), MAX_FEEDBACKS);
  const result = await db.collection(FEEDBACK_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  const feedbacks = (result.data || [])
    .map(normalizeFeedback)
    .filter(Boolean);
  return ok({ feedbacks, isAdmin });
}

function prepareUpload(event, openid) {
  const ext = cleanUploadExtension(event.ext);
  const index = Math.max(0, Math.min(Number(event.index) || 0, MAX_IMAGE_COUNT - 1));
  const ownerHash = hashId(openid).slice(0, 16);
  const nonce = hashId(`${openid}:${Date.now()}:${Math.random()}`).slice(0, 10);
  return ok({
    cloudPath: `posts/${ownerHash}/${Date.now()}_${index}_${nonce}.${ext}`,
    maxImageCount: MAX_IMAGE_COUNT,
    allowedExtensions: IMAGE_EXTENSIONS
  });
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return fail('UNAUTHENTICATED', 'Missing user identity');
  }
  try {
    const admin = await isAdminOpenid(OPENID);
    if (event.action === 'list') {
      return listPosts(event, OPENID, admin);
    }
    if (event.action === 'get') {
      return getPost(event, OPENID, admin);
    }
    if (event.action === 'create') {
      return createPost(event, OPENID, admin);
    }
    if (event.action === 'react') {
      return reactToPost(event, OPENID, admin);
    }
    if (event.action === 'resolve') {
      return resolvePost(event, OPENID, admin);
    }
    if (event.action === 'hide') {
      return hidePost(event, OPENID, admin);
    }
    if (event.action === 'listComments') {
      return listComments(event, OPENID, admin);
    }
    if (event.action === 'createComment') {
      return createComment(event, OPENID, admin);
    }
    if (event.action === 'createFeedback') {
      return createFeedback(event, OPENID, admin);
    }
    if (event.action === 'listFeedback') {
      return listFeedback(event, OPENID, admin);
    }
    if (event.action === 'prepareUpload') {
      return prepareUpload(event, OPENID);
    }
    return fail('UNKNOWN_ACTION', 'Unknown action');
  } catch (error) {
    if (isMissingCollectionError(error)) {
      return fail('MISSING_COLLECTION', 'Required CloudBase collection is missing');
    }
    if (error && error.code === 'VALIDATION_FAILED') {
      return fail('VALIDATION_FAILED', 'Invalid post data');
    }
    console.error('[posts] failed', {
      action: event.action,
      message: error && (error.message || error.errMsg),
      code: error && error.errCode
    });
    return fail('INTERNAL_ERROR', 'Post operation failed');
  }
};
