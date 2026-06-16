import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Static guard only: this catches WXML/WXSS regressions for the map list card
// layout, but it does not replace WeChat DevTools, screenshot, or real-device
// acceptance for the actual visual experience.
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const wxml = readFileSync(join(rootDir, 'pages/map/map.wxml'), 'utf8');
const wxss = readFileSync(join(rootDir, 'pages/map/map.wxss'), 'utf8');
const missing = [];

function expect(condition, message) {
  if (!condition) {
    missing.push(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWxml(pattern) {
  return pattern.test(wxml);
}

function ruleFor(selector) {
  const match = wxss.match(new RegExp(`(?:^|\\n)\\s*${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  return match ? match[1] : '';
}

function hasDecl(rule, pattern) {
  return pattern.test(rule);
}

function hasEveryDecl(rule, patterns) {
  return patterns.every((pattern) => hasDecl(rule, pattern));
}

function hasAnyDecl(rule, patterns) {
  return patterns.some((pattern) => hasDecl(rule, pattern));
}

const listDrawer = ruleFor('.list-drawer');
const mapToolRow = ruleFor('.map-tool-row');
const discoverToolButton = ruleFor('.discover-tool-button');
const listOpenTaskMap = ruleFor('.map-page.list-open .task-map');
const listFab = ruleFor('.list-fab');
const listFabLine = ruleFor('.list-fab-line');
const listOpenDrawer = ruleFor('.map-page.list-open .list-drawer');
const postList = ruleFor('.post-list');
const postCard = ruleFor('.post-card');
const postContent = ruleFor('.post-content');
const postMain = ruleFor('.post-main');
const postMainWithThumb = ruleFor('.post-main.with-thumb');
const postThumb = ruleFor('.post-thumb');
const postText = ruleFor('.post-text');
const postTitleRow = ruleFor('.post-title-row');
const postTitle = ruleFor('.post-title');
const postInlineTags = ruleFor('.post-inline-tags');
const postSummary = ruleFor('.post-summary');
const postFooter = ruleFor('.post-footer');
const postCounts = ruleFor('.post-counts');
const postFooterMeta = ruleFor('.post-footer-meta');
const markButton = ruleFor('.post-card .mark-button');

const wxmlChecks = [
  ['map page open state class', /<view[^>]+class="map-page \{\{showList \? 'list-open' : ''\}\}"/],
  ['cover-view map tool row', /<cover-view[^>]+wx:if="\{\{!showList\}\}"[^>]+class="map-tool-row"/],
  ['discover nearby tool button', /<cover-view[^>]+class="[^"]*\bdiscover-tool-button\b[^"]*"[^>]+bindtap="discoverNearby"[\s\S]*<cover-image[^>]+class="[^"]*\bsearch-icon\b[^"]*"/],
  ['cover-view top-right list entry', /<cover-view[^>]+wx:if="\{\{!showList\}\}"[^>]+class="list-fab"[^>]+bindtap="showList"/],
  ['single-line aligned list count', /<cover-view[^>]+class="[^"]*\blist-fab-line\b[^"]*"[^>]*>列表 \{\{visiblePosts\.length\}\}<\/cover-view>/],
  ['list drawer container', /<view[^>]+class="[^"]*\blist-drawer\b[^"]*\bopen\b[^"]*"/],
  ['task list scroll-view', /<scroll-view[^>]+class="[^"]*\bpost-list\b[^"]*"[^>]*scroll-y/],
  ['task card repeat container', /<view[^>]+wx:for="\{\{visiblePosts\}\}"[^>]+class="[^"]*\bpost-card\b[^"]*"/],
  ['task card content wrapper', /<view[^>]+class="[^"]*\bpost-content\b[^"]*"/],
  ['title row', /<view[^>]+class="[^"]*\bpost-title-row\b[^"]*"/],
  ['title text bound to item title', /<text[^>]+class="[^"]*\bpost-title\b[^"]*"[^>]*>\{\{item\.title\}\}<\/text>/],
  ['inline category/status tag group', /<view[^>]+class="[^"]*\bpost-inline-tags\b[^"]*"/],
  ['category tag text', /\bpost-inline-tag\b[\s\S]*\{\{item\.categoryText\}\}/],
  ['status tag text', /\bpost-inline-tag\b[\s\S]*\{\{item\.statusText\}\}/],
  ['summary/body text', /<view[^>]+class="[^"]*\bpost-summary\b[^"]*"[^>]*>\{\{item\.body\}\}<\/view>/],
  ['footer meta row', /<view[^>]+class="[^"]*\bpost-footer\b[^"]*"/],
  ['lightweight confirmation/stale counts', /<view[^>]+class="[^"]*\bpost-counts\b[^"]*"[\s\S]*确认：\{\{item\.confirmations\}\}[\s\S]*过时：\{\{item\.staleCount\}\}/],
  ['right-side created time and distance', /<view[^>]+class="[^"]*\bpost-footer-meta\b[^"]*"[^>]*>\{\{item\.createdText\}\} · \{\{item\.distanceText\}\}<\/view>/],
  ['lightweight detail entry', /<button[^>]+class="[^"]*\bmark-button\b[^"]*"[^>]+catchtap="openDetail"[\s\S]*<text[^>]+class="[^"]*\bmark-chevron\b[^"]*"[^>]*>›<\/text>/],
  ['cover image area', /<image[^>]+wx:if="\{\{item\.coverImage\}\}"[^>]+class="[^"]*\bpost-thumb\b[^"]*"[^>]+mode="aspectFill"/]
];

for (const [label, pattern] of wxmlChecks) {
  expect(hasWxml(pattern), `WXML missing ${label}`);
}

expect(
  hasWxml(/class="post-title-row"[\s\S]*class="post-title"[\s\S]*class="post-inline-tags"/),
  'WXML should keep category/status tags immediately after the title in the title row'
);

expect(listDrawer, 'WXSS missing .list-drawer rule');
expect(mapToolRow, 'WXSS missing .map-tool-row rule');
expect(
  hasEveryDecl(mapToolRow, [
    /bottom:\s*calc\(/,
    /z-index:\s*8;/,
    /display:\s*flex;/
  ]),
  'WXSS .map-tool-row should stay at the lower-right of the map above the tabBar'
);

expect(discoverToolButton, 'WXSS missing .discover-tool-button rule');
expect(
  hasEveryDecl(discoverToolButton, [
    /background:\s*#d7673f;/,
    /margin-left:\s*16rpx;/
  ]),
  'WXSS .discover-tool-button should stay visible beside the locate button with a solid cover-view-safe background'
);

expect(listOpenTaskMap, 'WXSS missing .map-page.list-open .task-map rule');
expect(hasDecl(listOpenTaskMap, /height:\s*38vh;/), 'WXSS should shrink native map while the task drawer is open');

expect(listFab, 'WXSS missing .list-fab rule');
expect(
  hasEveryDecl(listFab, [
    /position:\s*absolute;/,
    /top:\s*24rpx;/,
    /right:\s*24rpx;/,
    /width:\s*146rpx;/,
    /height:\s*70rpx;/,
    /background:\s*rgba\(255,\s*254,\s*250,\s*0\.96\);/,
    /z-index:\s*9;/
  ]),
  'WXSS .list-fab should be a compact top-right cover-view list button above the native map'
);

expect(listFabLine, 'WXSS missing .list-fab-line rule');
expect(
  hasEveryDecl(listFabLine, [
    /height:\s*70rpx;/,
    /line-height:\s*70rpx;/,
    /text-align:\s*center;/
  ]),
  'WXSS .list-fab-line should center the label and count on one aligned text line'
);

expect(listOpenDrawer, 'WXSS missing .map-page.list-open .list-drawer rule');
expect(
  hasEveryDecl(listOpenDrawer, [
    /top:\s*38vh;/,
    /height:\s*auto;/
  ]),
  'WXSS should place the open drawer below the shrunken native map'
);
expect(
  hasEveryDecl(listDrawer, [
    /position:\s*absolute;/,
    /bottom:\s*calc\(/,
    /display:\s*flex;/,
    /flex-direction:\s*column;/,
    /height:\s*calc\(100vh/
  ]),
  'WXSS .list-drawer should fill the space above tabBar with vertical flex constraints'
);

expect(postList, 'WXSS missing .post-list rule');
expect(
  hasEveryDecl(postList, [
    /flex:\s*1;/,
    /height:\s*0;/,
    /min-height:\s*0;/
  ]),
  'WXSS .post-list should be flex-fillable without exceeding the drawer'
);

expect(postCard, 'WXSS missing .post-card rule');
expect(hasDecl(postCard, /overflow:\s*hidden;/), 'WXSS .post-card should hide overflowing content');
expect(postContent, 'WXSS missing .post-content rule');
expect(hasDecl(postContent, /min-width:\s*0;/), 'WXSS .post-content should allow text to shrink instead of squeezing adjacent controls');

expect(postMain, 'WXSS missing .post-main rule');
expect(
  hasEveryDecl(postMain, [
    /display:\s*grid;/,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+48rpx;/,
    /gap:\s*16rpx;/
  ]),
  'WXSS .post-main should reserve a fixed lightweight detail column without squeezing text'
);

expect(postMainWithThumb, 'WXSS missing .post-main.with-thumb rule');
expect(
  hasDecl(postMainWithThumb, /grid-template-columns:\s*104rpx\s+minmax\(0,\s*1fr\)\s+48rpx;/),
  'WXSS .post-main.with-thumb should reserve stable thumbnail, text, and detail columns'
);

expect(postThumb, 'WXSS missing .post-thumb rule');
expect(
  hasEveryDecl(postThumb, [
    /width:\s*104rpx;/,
    /height:\s*104rpx;/
  ]),
  'WXSS .post-thumb should keep a stable image width and height'
);

expect(postText, 'WXSS missing .post-text rule');
expect(hasDecl(postText, /min-width:\s*0;/), 'WXSS .post-text should allow title/body truncation inside the grid');

expect(postTitleRow, 'WXSS missing .post-title-row rule');
expect(
  hasEveryDecl(postTitleRow, [
    /display:\s*flex;/,
    /flex-wrap:\s*wrap;/,
    /gap:\s*10rpx;/,
    /min-width:\s*0;/
  ]),
  'WXSS .post-title-row should wrap title and tags without horizontal overflow'
);

expect(postTitle, 'WXSS missing .post-title rule');
expect(
  hasDecl(postTitle, /line-height:\s*1\.28;/)
    && hasAnyDecl(postTitle, [/word-break:\s*break-all;/, /overflow:\s*hidden;/, /text-overflow:\s*ellipsis;/, /-webkit-line-clamp:/])
    && hasDecl(postTitle, /max-width:\s*100%;/),
  'WXSS .post-title should have line-height and long-text constraints'
);

expect(postInlineTags, 'WXSS missing .post-inline-tags rule');
expect(
  hasEveryDecl(postInlineTags, [
    /display:\s*inline-flex;/,
    /flex-wrap:\s*wrap;/,
    /gap:\s*8rpx;/,
    /min-width:\s*0;/
  ]),
  'WXSS .post-inline-tags should wrap next to the title without forcing overflow'
);

expect(postSummary, 'WXSS missing .post-summary rule');
expect(
  hasEveryDecl(postSummary, [
    /line-height:\s*1\.45;/,
    /display:\s*-webkit-box;/,
    /overflow:\s*hidden;/,
    /text-overflow:\s*ellipsis;/,
    /-webkit-box-orient:\s*vertical;/,
    /-webkit-line-clamp:\s*2;/
  ]),
  'WXSS .post-summary should be line-clamped with overflow protection'
);

expect(postFooter, 'WXSS missing .post-footer rule');
expect(
  hasEveryDecl(postFooter, [
    /display:\s*flex;/,
    /align-items:\s*center;/,
    /justify-content:\s*space-between;/,
    /gap:\s*20rpx;/,
    /line-height:\s*1\.35;/
  ]),
  'WXSS .post-footer should keep left stats and right meta in a constrained two-sided layout'
);

expect(postCounts, 'WXSS missing .post-counts rule');
expect(
  hasEveryDecl(postCounts, [
    /display:\s*flex;/,
    /flex-wrap:\s*wrap;/,
    /gap:\s*16rpx;/,
    /min-width:\s*0;/
  ]),
  'WXSS .post-counts should wrap lightweight stats without blocking the right meta'
);

expect(postFooterMeta, 'WXSS missing .post-footer-meta rule');
expect(
  hasEveryDecl(postFooterMeta, [
    /flex:\s*1;/,
    /min-width:\s*0;/,
    /overflow:\s*hidden;/,
    /text-align:\s*right;/,
    /text-overflow:\s*ellipsis;/,
    /white-space:\s*nowrap;/
  ]),
  'WXSS .post-footer-meta should keep time/distance on the right with ellipsis protection'
);

expect(markButton, 'WXSS missing .post-card .mark-button rule');
expect(
  hasEveryDecl(markButton, [
    /width:\s*48rpx;/,
    /min-width:\s*48rpx;/,
    /max-width:\s*48rpx;/,
    /height:\s*48rpx;/,
    /padding:\s*0;/
  ]),
  'WXSS .mark-button should stay a fixed lightweight detail affordance'
);

if (missing.length) {
  console.error('Map list resilience checks failed:');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  console.error('This is a static guard only; DevTools or real-device visual acceptance is still required.');
  process.exit(1);
}

console.log('Map list resilience checks passed.');
