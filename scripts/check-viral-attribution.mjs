import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const {
  appendViralRelayParams,
  appendViralRelayQuery,
  buildViralAttributionEvent,
  createViralAttributionSession,
  createViralRelaySession,
  isLowRiskRelayPost,
  normalizeConversionAction,
  normalizeEntrySource,
  normalizeShareChannel,
  viralAttributionTestExports
} = await import('../utils/viral-attribution.js');

const detailJs = readFileSync('pages/detail/detail.js', 'utf8');
const cloudFunctionJs = readFileSync('cloudfunctions/posts/index.js', 'utf8');
const helperJs = readFileSync('utils/viral-attribution.js', 'utf8');

const forbiddenEventFields = [
  'body',
  'comment_body',
  'comment_text',
  'contact',
  'phone',
  'wechat',
  'group',
  'latitude',
  'longitude',
  'openid',
  'session',
  'cookie',
  'token'
];

function assertNoForbiddenKeys(event, label) {
  for (const key of Object.keys(event)) {
    assert.ok(!forbiddenEventFields.includes(key), `${label} must not include sensitive field ${key}`);
  }
}

function assertNoForbiddenWhitelistFields() {
  const allowedFields = viralAttributionTestExports.ALLOWED_EVENT_FIELDS;
  assert.ok(Array.isArray(allowedFields), 'helper should export the event field whitelist for guards');
  for (const field of forbiddenEventFields) {
    assert.ok(!allowedFields.includes(field), `field whitelist must not include ${field}`);
  }
  for (const required of [
    'event_type',
    'attribution_session_id',
    'post_id',
    'entry_source',
    'share_channel',
    'conversion_action',
    'share_depth'
  ]) {
    assert.ok(allowedFields.includes(required), `field whitelist should include ${required}`);
  }
}

function assertSourceChannelActionNormalization() {
  assert.equal(normalizeEntrySource('timeline'), 'timeline');
  assert.equal(normalizeEntrySource('receiver'), 'receiver');
  assert.equal(normalizeEntrySource('comment'), 'comment');
  assert.equal(normalizeEntrySource('confirm'), 'confirm');
  assert.equal(normalizeEntrySource('unexpected-source'), 'share');
  assert.equal(normalizeShareChannel('timeline', 'share'), 'timeline');
  assert.equal(normalizeShareChannel('', 'timeline'), 'timeline');
  assert.equal(normalizeShareChannel('group-chat', 'receiver'), 'app_message');
  assert.equal(normalizeConversionAction('confirm'), 'confirm');
  assert.equal(normalizeConversionAction('comment'), 'comment');
  assert.equal(normalizeConversionAction('report'), '');
  assert.equal(normalizeConversionAction('stale'), '');
}

function assertEventShape() {
  const session = createViralAttributionSession({
    id: 'post_001',
    from: 'share',
    source: 'timeline',
    shareChannel: 'timeline',
    share_id: 'sh_parent',
    parent_share_id: 'sh_grandparent',
    share_depth: '2'
  });
  assert.ok(session, 'from=share should create an attribution session');
  assert.equal(session.entry_source, 'timeline');
  assert.equal(session.share_channel, 'timeline');
  assert.equal(session.share_depth, '2');

  const noSession = createViralAttributionSession({ from: 'map', source: 'timeline' });
  assert.equal(noSession, null, 'ordinary detail entry should not create viral attribution session');

  const event = buildViralAttributionEvent(session, 'share_confirm_success', {
    id: 'post_001',
    category: 'lost_found',
    status: 'active',
    isMine: false,
    distance: 760,
    latitude: 39.9,
    longitude: 116.3,
    body: 'should never be copied'
  }, {
    conversionAction: 'confirm',
    actionResult: 'success'
  });
  assertNoForbiddenKeys(event, 'viral event');
  assert.deepEqual(
    Object.keys(event).sort(),
    [
      'action_result',
      'attribution_session_id',
      'conversion_action',
      'distance_bucket',
      'entry_source',
      'event_time_ms',
      'event_type',
      'from',
      'is_publisher',
      'parent_share_id',
      'post_category',
      'post_id',
      'post_status',
      'share_channel',
      'share_depth',
      'share_id'
    ].sort(),
    'viral events should only contain whitelisted fields'
  );
  assert.equal(event.distance_bucket, '500m_1km');
  assert.equal(event.conversion_action, 'confirm');
}

function assertRiskRelayGuard() {
  const safePost = {
    id: 'post_safe',
    status: 'active',
    staleCount: 0,
    reportCount: 0
  };
  assert.equal(isLowRiskRelayPost(safePost), true, 'low-risk active post may record relay attribution');

  for (const post of [
    { ...safePost, status: 'resolved' },
    { ...safePost, status: 'expired' },
    { ...safePost, status: 'hidden' },
    { ...safePost, status: 'stale' },
    { ...safePost, staleCount: 1 },
    { ...safePost, reportCount: 1 }
  ]) {
    assert.equal(isLowRiskRelayPost(post), false, `${post.status || 'risk'} post must not record relay conversion`);
  }
}

function assertRelayPathAttribution() {
  const session = createViralAttributionSession({
    from: 'share',
    source: 'timeline',
    shareChannel: 'timeline',
    share_id: 'sh_timeline',
    share_depth: '1'
  });
  const relaySession = createViralRelaySession(session, {
    id: 'post_safe',
    status: 'active',
    staleCount: 0,
    reportCount: 0
  }, {
    shareId: 'sh_receiver'
  });
  assert.ok(relaySession, 'low-risk relay should create a next-hop attribution session');
  assert.equal(relaySession.parent_share_id, 'sh_timeline');
  assert.equal(relaySession.share_id, 'sh_receiver');
  assert.equal(relaySession.share_depth, '2');
  assert.equal(relaySession.share_channel, 'timeline');

  const path = appendViralRelayParams('/pages/detail/detail?id=post_safe&from=share&source=receiver', relaySession);
  assert.match(path, /share_id=sh_receiver/, 'relay share path should include the next share id');
  assert.match(path, /parent_share_id=sh_timeline/, 'relay share path should include the parent share id');
  assert.match(path, /share_depth=2/, 'relay share path should include the next depth bucket');
  assert.equal(
    appendViralRelayParams('/pages/detail/detail?id=post_safe&from=share', null),
    '/pages/detail/detail?id=post_safe&from=share',
    'ordinary paths should stay unchanged when no relay session is available'
  );

  const query = appendViralRelayQuery('id=post_safe&from=share&source=timeline&shareChannel=timeline', relaySession);
  assert.match(query, /share_id=sh_receiver/, 'timeline relay query should include the next share id');
  assert.match(query, /parent_share_id=sh_timeline/, 'timeline relay query should include the parent share id');
  assert.match(query, /share_depth=2/, 'timeline relay query should include the next depth bucket');
}

function assertDetailWiring() {
  assert.match(detailJs, /createViralAttributionSession/, 'detail should create attribution sessions from share query');
  assert.match(detailJs, /recordShareDetailLanding\(attributionSession\)/, 'detail should record share landing on load');
  assert.match(detailJs, /recordShareDetailLoaded\(this\.data\.attributionSession, post\)/, 'detail should record loaded after post data is available');
  assert.match(detailJs, /recordShareDetailBlocked\(this\.data\.attributionSession, blockedReason\)/, 'detail should record blocked detail loads');
  assert.match(detailJs, /recordShareConversion\(this\.data\.attributionSession, this\.data\.post, 'comment'\)/, 'comment success should record share conversion without comment body');
  assert.match(detailJs, /recordShareConversion\(this\.data\.attributionSession, post, action\)/, 'trust action success should record normalized share conversion');
  assert.match(detailJs, /createViralRelaySession\(this\.data\.attributionSession, post, options\)/, 'detail should create relay sessions before returning share paths');
  assert.match(detailJs, /appendViralRelayParams\(path, relaySession\)/, 'detail should append relay attribution params to actual share paths');
  assert.match(detailJs, /appendViralRelayQuery\(payload\.query, relaySession\)/, 'detail should append relay attribution params to timeline queries');
  assert.match(detailJs, /relaySession: relayShare\.relaySession/, 'detail should record the same relay session that it puts into the share path');
  assert.match(detailJs, /const conversionAction = receiverConversionAction\(this\.data\.receiverConversionPrompt\)/, 'receiver conversion relay should derive confirm/comment action from the share path');
  assert.match(detailJs, /conversionAction,\s*shareChannel: 'app_message',\s*relaySession: relayShare\.relaySession/s, 'receiver conversion relay events should include confirm/comment action and app message channel');
  assert.match(detailJs, /onShareTimeline\(\)[\s\S]*?createViralRelaySession\(this\.data\.attributionSession, post,[\s\S]*?shareChannel: 'timeline'[\s\S]*?recordShareRelay\(this\.data\.attributionSession, post,[\s\S]*?shareChannel: 'timeline'/, 'timeline re-share should create and record a timeline relay session');
  assert.match(detailJs, /recordShareRelay\(this\.data\.attributionSession, post/, 'detail share should record best-effort relay attribution');
  assert.doesNotMatch(
    detailJs.match(/recordShareConversion\(this\.data\.attributionSession, this\.data\.post, 'comment'\)[\s\S]{0,120}/)?.[0] || '',
    /body|commentDraft/,
    'comment conversion attribution must not pass comment text'
  );
}

function assertCloudFunctionWiring() {
  assert.match(cloudFunctionJs, /VIRAL_ATTRIBUTION_COLLECTION = 'viral_attribution_events'/, 'cloud function should define attribution collection');
  assert.match(cloudFunctionJs, /recordViralAttribution/, 'cloud function should expose a viral attribution action');
  assert.match(cloudFunctionJs, /cleanViralAttributionEvent/, 'cloud function should clean attribution payloads');
  const cleanBody = cloudFunctionJs.match(/function cleanViralAttributionEvent[\s\S]*?\n}\n/)?.[0] || '';
  for (const sensitive of ['body:', 'contact:', 'latitude:', 'longitude:', 'openid:']) {
    assert.doesNotMatch(cleanBody, new RegExp(sensitive), `cloud attribution cleaner must not store raw ${sensitive}`);
  }
  assert.match(cleanBody, /user_id_hash/, 'cloud attribution cleaner should hash the user id instead of storing raw identity');
  assert.match(cleanBody, /cleanEnum\(input\.entry_source, VIRAL_ENTRY_SOURCES/, 'cloud cleaner should normalize entry source through an enum');
  assert.match(cleanBody, /cleanEnum\(input\.share_channel, VIRAL_SHARE_CHANNELS/, 'cloud cleaner should normalize share channel through an enum');
  assert.match(cleanBody, /cleanEnum\(input\.conversion_action, VIRAL_CONVERSION_ACTIONS/, 'cloud cleaner should normalize conversion action through an enum');
}

assertNoForbiddenWhitelistFields();
assertSourceChannelActionNormalization();
assertEventShape();
assertRiskRelayGuard();
assertRelayPathAttribution();
assertDetailWiring();
assertCloudFunctionWiring();
assert.doesNotMatch(helperJs, /commentDraft|comment_body|latitude|longitude|contact|group/, 'helper source must not reference sensitive attribution fields');

console.log('Viral attribution checks passed.');
