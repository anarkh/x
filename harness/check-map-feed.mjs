import assert from 'node:assert/strict';

import { markerFromPost } from '../utils/geo.js';
import { buildNearbyPreviewPosts } from '../utils/post-presenter.js';

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
    title: '中距离待复核任务',
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

const selectedMarker = markerFromPost(previewPosts[0]);
assert.equal(selectedMarker.callout.bgColor, '#1F6658');
assert.equal(selectedMarker.callout.color, '#FFFFFF');
assert.equal(selectedMarker.callout.borderWidth, 2);

console.log('Map feed checks passed.');
