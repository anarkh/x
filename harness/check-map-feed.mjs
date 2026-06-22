import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { markerFromPost } from '../utils/geo.js';
import { buildNearbyPreviewPosts } from '../utils/post-presenter.js';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const mapJs = readFileSync(join(rootDir, 'pages/map/map.js'), 'utf8');
const mapWxml = readFileSync(join(rootDir, 'pages/map/map.wxml'), 'utf8');
const mapWxss = readFileSync(join(rootDir, 'pages/map/map.wxss'), 'utf8');
const discoverNearbyStart = mapJs.indexOf('async discoverNearby()');
const focusPostStart = mapJs.indexOf('\n\n  focusPost(', discoverNearbyStart);
assert.notEqual(discoverNearbyStart, -1, 'Map page should define discoverNearby.');
assert.notEqual(focusPostStart, -1, 'Map page should define focusPost after discoverNearby.');
const discoverNearbyBody = mapJs.slice(discoverNearbyStart, focusPostStart);
const now = Date.now();
const posts = [
  {
    id: 'far_active',
    markerId: 101,
    title: '远一点的有效任务',
    status: 'active',
    category: 'check_in',
    latitude: 39.93,
    longitude: 116.35,
    distance: 620,
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 60000,
    expiresAt: now + 3600000
  },
  {
    id: 'expired_near',
    markerId: 102,
    title: '最近但已经过期',
    status: 'expired',
    category: 'street_update',
    latitude: 39.931,
    longitude: 116.351,
    distance: 60,
    confirmations: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 30000,
    expiresAt: now - 1000
  },
  {
    id: 'near_active',
    markerId: 103,
    title: '最近的有效任务',
    status: 'active',
    category: 'help_needed',
    latitude: 39.932,
    longitude: 116.352,
    distance: 120,
    confirmations: 2,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 90000,
    expiresAt: now + 7200000
  },
  {
    id: 'stale_middle',
    markerId: 104,
    title: '中距离待复核任务标题非常非常长需要被预览卡片截短',
    status: 'stale',
    category: 'lost_found',
    intent: 'lost',
    latitude: 39.933,
    longitude: 116.353,
    distance: 300,
    confirmations: 1,
    staleCount: 3,
    reportCount: 0,
    createdAt: now - 120000,
    expiresAt: now + 5400000
  }
];

const previewPosts = buildNearbyPreviewPosts(posts, 'near_active', 3);

assert.deepEqual(
  previewPosts.map((post) => post.id),
  ['near_active', 'stale_middle', 'far_active']
);
assert.equal(previewPosts[0].isSelected, true);
assert.equal(previewPosts[0].browseRank, 1);
assert.equal(previewPosts[0].browseHint, '最近');
assert.equal(previewPosts[1].browseHint, '待复核');
assert.equal(previewPosts[1].previewTitle, '中距离待复核任务标题非常非常...');
assert(previewPosts[1].previewTitle.length <= 18);

const selectedMarker = markerFromPost(previewPosts[0]);
assert.equal(selectedMarker.callout.bgColor, '#1F6658');
assert.equal(selectedMarker.callout.color, '#FFFFFF');
assert.equal(selectedMarker.callout.borderWidth, 2);

assert.match(
  mapWxml,
  /<cover-view[^>]+wx:if="\{\{!showList\}\}"[^>]+class="list-fab"[^>]+bindtap="showList"/,
  'The map list entry should be a top-right cover-view so it is visible above the native map.'
);
assert.match(
  mapWxml,
  /<cover-view[^>]+class="[^"]*\bdiscover-tool-button\b[^"]*"[^>]+bindtap="discoverNearby"[\s\S]*<cover-image[^>]+class="[^"]*\bsearch-icon\b[^"]*"/,
  'The discover nearby button should remain visible beside the locate button.'
);
assert.match(
  mapWxss,
  /\.map-tool-row\s*\{[\s\S]*?bottom:\s*calc\([\s\S]*?\}/,
  'Map tool buttons should sit at the lower-right of the map above the tabBar.'
);
assert.match(mapWxml, /<cover-view class="list-fab-line">列表 \{\{visiblePosts\.length\}\}<\/cover-view>/);
assert.match(
  mapWxss,
  /\.list-fab-line\s*\{[\s\S]*?height:\s*70rpx;[\s\S]*?line-height:\s*70rpx;[\s\S]*?text-align:\s*center;[\s\S]*?\}/,
  'The top-right list entry should keep the label and count centered on one aligned text line.'
);
assert.doesNotMatch(mapWxml, /附近优先|附近任务|点开看任务卡/);
assert.match(
  mapWxml,
  /class="map-page \{\{showList \? 'list-open' : ''\}\}"/,
  'The map page should expose list-open state so CSS can reserve space for the drawer.'
);
assert.match(
  mapWxss,
  /\.map-page\.list-open \.task-map\s*\{[\s\S]*?height:\s*38vh;[\s\S]*?\}/,
  'Opening the list should shrink the native map instead of placing the drawer over it.'
);
assert.match(
  mapWxml,
  /<cover-view[^>]+wx:if="\{\{diagnosticVisible && !showList\}\}"[^>]+class="diagnostic-panel"/,
  'The startup diagnostics panel should not cover the map after the focused return opens the list.'
);
assert.match(
  mapJs,
  /launchFocus[\s\S]*?this\.setData\(\{[\s\S]*?showList:\s*launchFocus\.showList[\s\S]*?\},\s*\(\)\s*=>\s*\{[\s\S]*?this\.applyPostFilters\(posts,\s*'all',\s*null\);[\s\S]*?this\.hideDiagnostics\(\);[\s\S]*?\}\)/,
  'Focused map launches should hide startup diagnostics immediately after the list and selected task are ready.'
);
assert.match(
  discoverNearbyBody,
  /async discoverNearby\(\) \{[\s\S]*?const post = nextCandidates\[Math\.floor\(Math\.random\(\) \* nextCandidates\.length\)\];[\s\S]*?selectedPost:\s*decorateMapPost\(post,\s*post\.id\),[\s\S]*?\}, \(\) => this\.refresh\(\)\);/,
  'Discovery should decorate only the selected post before showing the selected card.'
);
assert.doesNotMatch(
  discoverNearbyBody,
  /selectedPost:\s*post\s*[,}]/,
  'Discovery should not write a raw post into selectedPost while refresh is pending.'
);
assert.match(
  mapJs,
  /async buildPosts\(center\) \{[\s\S]*?return listPosts\(center,\s*\{ localOnly: true \}\);[\s\S]*?\}/,
  'buildPosts should keep raw derived posts and leave map decoration to list/preview builders.'
);
assert.doesNotMatch(
  mapJs,
  /buildPosts\(center\)[\s\S]*?\.map\(\(post\) => decorateMapPost\(post\)\)/,
  'buildPosts should not pre-decorate every post before filtering and preview building.'
);
assert.match(
  mapJs,
  /const viewportPosts = \[\];[\s\S]*?const categoryCounts = \{\};[\s\S]*?let openPostCount = 0;[\s\S]*?posts\.forEach\(\(post\) => \{[\s\S]*?if \(isOpenPost\(post\)\) \{[\s\S]*?openPostCount \+= 1;[\s\S]*?\}[\s\S]*?if \(!isPostInRegion\(post, mapRegion\)\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?viewportPosts\.push\(post\);[\s\S]*?categoryCounts\[post\.category\]/,
  'Map filtering should collect viewport posts, category counts, and open-post count in a single pass.'
);
assert.doesNotMatch(
  mapJs,
  /openPostCount:\s*posts\.filter\(isOpenPost\)\.length/,
  'Map filtering should not rescan all posts just to compute openPostCount.'
);
assert.match(
  mapJs,
  /nearbyPreviewPosts:\s*buildNearbyPreviewPosts\(baseVisiblePosts,\s*selectedPostId\)/,
  'NearbyPreview should be built from raw filtered posts so map cards are not decorated twice.'
);
assert.doesNotMatch(
  mapJs,
  /nearbyPreviewPosts:\s*buildNearbyPreviewPosts\(visiblePosts,\s*selectedPostId\)/,
  'NearbyPreview should not re-decorate visiblePosts that were already prepared for the list.'
);
assert.match(
  mapJs,
  /this\.skipNextOnShowRefresh = true;[\s\S]*?this\.refresh\(\);[\s\S]*?onShow\(\)[\s\S]*?if \(this\.skipNextOnShowRefresh\) \{[\s\S]*?this\.skipNextOnShowRefresh = false;[\s\S]*?return;[\s\S]*?\}[\s\S]*?this\.refresh\(\);/,
  'The first onShow should skip the refresh already started by onLoad.'
);
assert.match(
  mapJs,
  /onHide\(\) \{[\s\S]*?this\.deactivateMapPage\(\);[\s\S]*?\}[\s\S]*?onUnload\(\) \{[\s\S]*?this\.deactivateMapPage\(\);[\s\S]*?\}[\s\S]*?deactivateMapPage\(\) \{[\s\S]*?this\.mapPageActive = false;[\s\S]*?this\.initialLocationPending = false;[\s\S]*?this\.postsRequestId = \(this\.postsRequestId \|\| 0\) \+ 1;[\s\S]*?this\.locationRequestId = \(this\.locationRequestId \|\| 0\) \+ 1;[\s\S]*?this\.discoveryRequestId = \(this\.discoveryRequestId \|\| 0\) \+ 1;[\s\S]*?this\.clearDiagnosticHideTimer\(\);[\s\S]*?\}/,
  'Map page should invalidate in-flight refreshes when hidden or unloaded.'
);
assert.match(
  mapJs,
  /hideDiagnosticsSoon\(\) \{[\s\S]*?if \(!this\.mapPageActive\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?if \(!this\.mapPageActive\) \{[\s\S]*?this\.diagnosticHideTimer = null;[\s\S]*?return;[\s\S]*?\}/,
  'Map diagnostics should not schedule or run delayed setData while the page is inactive.'
);
assert.match(
  mapJs,
  /async refresh\(\) \{[\s\S]*?if \(!this\.mapPageActive\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?const requestId = this\.nextPostsRequestId\(\);/,
  'Map refresh should not start while the page is inactive.'
);
assert.match(
  mapJs,
  /const posts = await this\.buildPosts\(this\.data\.center\);[\s\S]*?if \(requestId !== this\.postsRequestId\) \{[\s\S]*?return;[\s\S]*?\}/,
  'Map refresh should drop stale post results after awaiting buildPosts.'
);
assert.match(
  mapJs,
  /this\.locationRequestId = \(this\.locationRequestId \|\| 0\) \+ 1;[\s\S]*?const locationRequestId = this\.locationRequestId;[\s\S]*?this\.setData\(\{ center, showLocation: true, mapRegion: null \}, \(\) => \{[\s\S]*?if \(!this\.mapPageActive \|\| locationRequestId !== this\.locationRequestId\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?this\.initialLocationPending = false;[\s\S]*?this\.refresh\(\);/,
  'Location setData callback should re-check page activity before refreshing.'
);
assert.match(
  mapJs,
  /showList: launchFocus\.showList,[\s\S]*?mapRegion: null[\s\S]*?\}, \(\) => \{[\s\S]*?if \(!this\.mapPageActive \|\| requestId !== this\.postsRequestId\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?this\.applyPostFilters\(posts, 'all', null\);[\s\S]*?this\.hideDiagnostics\(\);/,
  'Focused launch setData callback should re-check page activity and request generation before applying filters.'
);
assert.match(
  mapJs,
  /applyPostFilters\(posts, activeCategory, mapRegion, options = \{\}\) \{[\s\S]*?if \(!this\.mapPageActive\) \{[\s\S]*?return;[\s\S]*?\}/,
  'Map filter application should not setData while inactive.'
);
assert.match(
  mapJs,
  /setBootStatus\(status\) \{[\s\S]*?if \(!this\.mapPageActive\) \{[\s\S]*?return;[\s\S]*?\}/,
  'Map boot status should not setData while inactive.'
);
assert.match(
  mapJs,
  /hideDiagnostics\(\) \{[\s\S]*?this\.clearDiagnosticHideTimer\(\);[\s\S]*?if \(!this\.mapPageActive\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?this\.setData\(\{ diagnosticVisible: false \}\);/,
  'hideDiagnostics should not setData while inactive.'
);
assert.match(
  mapJs,
  /success: \(location\) => \{[\s\S]*?if \(!this\.mapPageActive \|\| locationRequestId !== this\.locationRequestId\) \{[\s\S]*?this\.initialLocationPending = false;[\s\S]*?return;[\s\S]*?\}[\s\S]*?this\.setData\(\{ center, showLocation: true, mapRegion: null \}/,
  'Location success should not update map data after the page becomes inactive.'
);
assert.match(
  mapJs,
  /fail: \(error\) => \{[\s\S]*?if \(!this\.mapPageActive \|\| locationRequestId !== this\.locationRequestId\) \{[\s\S]*?this\.initialLocationPending = false;[\s\S]*?return;[\s\S]*?\}[\s\S]*?addDiagnostic\('map\.getLocation\.fail'/,
  'Location failure should not update map diagnostics after the page becomes inactive.'
);
assert.match(
  mapJs,
  /async discoverNearby\(\) \{[\s\S]*?this\.discoveryRequestId = \(this\.discoveryRequestId \|\| 0\) \+ 1;[\s\S]*?const discoveryRequestId = this\.discoveryRequestId;[\s\S]*?await this\.discoveryCandidates\(this\.data\.activeCategory\);[\s\S]*?if \(!this\.mapPageActive \|\| discoveryRequestId !== this\.discoveryRequestId\) \{[\s\S]*?return;[\s\S]*?\}/,
  'Discovery should not update map state after the page becomes inactive or a newer discovery starts.'
);
assert.match(
  mapJs,
  /clearDiagnosticHideTimer\(\) \{[\s\S]*?clearTimeout\(this\.diagnosticHideTimer\);[\s\S]*?this\.diagnosticHideTimer = null;[\s\S]*?\}/,
  'Map diagnostic timer cleanup should cancel and reset the stored timer id.'
);

console.log('Map feed checks passed.');
