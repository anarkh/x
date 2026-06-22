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

console.log('Map feed checks passed.');
