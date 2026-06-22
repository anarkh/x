import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const storePath = join(rootDir, 'utils/store.js');
const storeSource = readFileSync(storePath, 'utf8');

assert.match(
  storeSource,
  /function postsCacheSource\(options = \{\}, allowExplicitSource = false\) \{[\s\S]*?if \(allowExplicitSource && options\.source\) \{[\s\S]*?return options\.source;[\s\S]*?\}[\s\S]*?if \(options\.localOnly\) \{[\s\S]*?return 'local';[\s\S]*?\}[\s\S]*?return shouldUseCloud\(\) \? 'cloud' : 'local';[\s\S]*?\}/,
  'posts cache should track whether data came from local storage or cloud.'
);
assert.match(
  storeSource,
  /function rememberPosts\(posts, options = \{\}\) \{[\s\S]*?source: postsCacheSource\(options, true\)[\s\S]*?\}/,
  'Only internal cache writes should be allowed to pass an explicit source.'
);
assert.match(
  storeSource,
  /const source = postsCacheSource\(options\);[\s\S]*?postsLoadPromise = fetchPosts\(options\)[\s\S]*?return rememberPosts\(posts, \{[\s\S]*?includeHidden: Boolean\(options\.includeHidden\),[\s\S]*?source[\s\S]*?\}\);/,
  'Cloud/local fetch results should write cache with the derived source, not caller-provided options.'
);
assert.match(
  storeSource,
  /const sourcePosts = options\.includeHidden[\s\S]*?\? posts[\s\S]*?: posts\.filter\(\(post\) => post\.status !== 'hidden'\);[\s\S]*?return sourcePosts[\s\S]*?\.map\(\(post\) => derivePost\(post, now, center\)\)/,
  'Visible post lists should filter hidden raw posts before distance derivation and sorting.'
);
assert.doesNotMatch(
  storeSource,
  /export async function listPosts[\s\S]*?\.filter\(\(post\) => post\.status !== 'hidden'\)[\s\S]*?\.slice\(0, config\.maxVisiblePosts\)/,
  'listPosts should not filter hidden posts after deriving distance for them.'
);
assert.match(
  storeSource,
  /export async function listPosts\(center = config\.defaultCenter, options = \{\}\) \{[\s\S]*?sortedDerivedPosts\(center, \{ \.\.\.options, includeHidden: false \}\)/,
  'Normal listPosts callers should not be able to opt into hidden posts.'
);
assert.match(
  storeSource,
  /function cachedPosts\(options = \{\}\) \{[\s\S]*?const source = postsCacheSource\(options\);[\s\S]*?if \(postsCache\.source !== source\) \{[\s\S]*?return null;[\s\S]*?\}/,
  'cachedPosts should not serve localOnly data to cloud-backed reads.'
);
assert.match(
  storeSource,
  /function rememberCloudPost\(post\) \{[\s\S]*?if \(!post \|\| !postsCache\.data \|\| postsCache\.source !== 'cloud'\) \{[\s\S]*?return;[\s\S]*?\}/,
  'Cloud post updates should only mutate cloud-sourced cache entries.'
);
assert.match(
  storeSource,
  /function removeCachedPost\(id\) \{[\s\S]*?if \(!postsCache\.data \|\| postsCache\.source !== 'cloud'\) \{[\s\S]*?return;[\s\S]*?\}/,
  'Cloud post removals should only mutate cloud-sourced cache entries.'
);
assert.match(
  storeSource,
  /if \(options\.localOnly\) \{[\s\S]*?const cached = cachedPosts\(options\);[\s\S]*?if \(cached\) \{[\s\S]*?return cached;[\s\S]*?\}[\s\S]*?return rememberPosts\(seedPosts\(\), \{ includeHidden: true, source: 'local' \}\);[\s\S]*?\}/,
  'localOnly post loads should use the short-lived posts cache before reading storage.'
);
assert.match(
  storeSource,
  /if \(options\.localOnly\) \{[\s\S]*?return rememberPosts\(seedPosts\(\), \{ includeHidden: true, source: 'local' \}\);[\s\S]*?\}/,
  'localOnly cache misses should always be recorded as local data even when cloud is available.'
);
assert.doesNotMatch(
  storeSource,
  /if \(options\.localOnly\) \{\s*return seedPosts\(\);\s*\}/,
  'localOnly post loads should not always read wx storage.'
);

const now = Date.now();
const center = { latitude: 39.9, longitude: 116.3 };
const posts = [
  {
    id: 'perf_post_1',
    markerId: 1,
    title: '性能检查',
    body: '缓存读取',
    category: 'help_needed',
    placeName: '测试点',
    latitude: 39.9,
    longitude: 116.3,
    status: 'active',
    confirmations: 0,
    lastConfirmedAt: 0,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 1000,
    expiresAt: now + 3600000,
    publisherId: 'owner_user',
    publisher: '发布者'
  }
];

let postsStorageReads = 0;
let storage = {
  posts,
  user: {
    id: 'owner_user',
    role: 'user',
    isGuest: false
  }
};

let cloudCalls = 0;
globalThis.getApp = () => ({ globalData: { cloudReady: true } });
globalThis.wx = {
  getStorageSync(key) {
    if (key === 'posts') {
      postsStorageReads += 1;
    }
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  },
  cloud: {
    callFunction() {
      cloudCalls += 1;
      return Promise.resolve({
        result: {
          ok: true,
          data: {
            posts: [
              {
                ...posts[0],
                id: 'cloud_perf_post',
                title: '云端性能检查'
              }
            ]
          }
        }
      });
    }
  }
};

const storeModuleUrl = `${pathToFileURL(storePath).href}?performance=${Date.now()}`;
const { listPosts } = await import(storeModuleUrl);

const first = await listPosts(center, { localOnly: true });
const second = await listPosts(center, { localOnly: true });

assert.equal(first.length, 1);
assert.equal(second.length, 1);
assert.equal(postsStorageReads, 1, 'localOnly listPosts should reuse cache for repeated reads.');

const cloudPosts = await listPosts(center);

assert.equal(cloudCalls, 1, 'localOnly cache should not satisfy a later cloud-backed listPosts call.');
assert.equal(cloudPosts[0].id, 'cloud_perf_post');

postsStorageReads = 0;
const localDespiteConflictingSource = await listPosts(center, { localOnly: true, source: 'cloud' });
assert.equal(postsStorageReads, 1, 'localOnly should ignore a conflicting caller-provided source option.');
assert.equal(localDespiteConflictingSource[0].id, 'perf_post_1');

postsStorageReads = 0;
cloudCalls = 0;
storage = {
  posts,
  user: {
    id: 'owner_user',
    nickname: '附近用户',
    avatarUrl: '',
    role: 'user',
    isGuest: false,
    loggedInAt: now
  }
};

globalThis.wx.cloud = {
  callFunction({ data }) {
    cloudCalls += 1;
    if (data.action === 'create') {
      return Promise.resolve({
        result: {
          ok: true,
          data: {
            post: {
              ...posts[0],
              id: 'cloud_created_post',
              title: '云端新帖',
              publisherId: 'owner_user'
            }
          }
        }
      });
    }
    return Promise.resolve({
      result: {
        ok: true,
        data: { posts: [] }
      }
    });
  }
};

const secondStoreModuleUrl = `${pathToFileURL(storePath).href}?performance=${Date.now()}-cloud-write`;
const { createPost, listPosts: listPostsAfterCloudWrite } = await import(secondStoreModuleUrl);

await listPostsAfterCloudWrite(center, { localOnly: true });
await createPost({
  title: '云端新帖',
  body: '云端写入不应污染 localOnly cache',
  category: 'help_needed',
  latitude: center.latitude,
  longitude: center.longitude,
  expiryHours: 6,
  imageUrls: []
});
const localAfterCloudCreate = await listPostsAfterCloudWrite(center, { localOnly: true });

assert.equal(cloudCalls, 1, 'cloud create should call the posts cloud function once.');
assert.deepEqual(
  localAfterCloudCreate.map((post) => post.id),
  ['perf_post_1'],
  'cloud writes should not inject cloud-only posts into a localOnly cache.'
);

postsStorageReads = 0;
cloudCalls = 0;
storage = {
  posts,
  user: {
    id: 'owner_user',
    role: 'user',
    isGuest: false
  }
};
globalThis.wx.cloud = {
  callFunction() {
    cloudCalls += 1;
    return Promise.resolve({
      result: {
        ok: true,
        data: {
          posts: [
            {
              ...posts[0],
              id: 'cloud_after_conflict_post',
              title: '云端仍优先'
            }
          ]
        }
      }
    });
  }
};

const thirdStoreModuleUrl = `${pathToFileURL(storePath).href}?performance=${Date.now()}-source-conflict`;
const { listPosts: listPostsWithConflictingSource } = await import(thirdStoreModuleUrl);

await listPostsWithConflictingSource(center, { localOnly: true });
const cloudDespiteConflictingSource = await listPostsWithConflictingSource(center, { source: 'local' });

assert.equal(cloudCalls, 1, 'cloud-ready listPosts should ignore a caller-provided local source option.');
assert.equal(cloudDespiteConflictingSource[0].id, 'cloud_after_conflict_post');

postsStorageReads = 0;
const localAfterConflictingCloudRead = await listPostsWithConflictingSource(center, { localOnly: true });
assert.equal(
  postsStorageReads,
  1,
  'a cloud read with caller-provided source should not poison the later localOnly cache.'
);
assert.equal(localAfterConflictingCloudRead[0].id, 'perf_post_1');

storage = {
  posts: [
    posts[0],
    {
      ...posts[0],
      id: 'hidden_perf_post',
      status: 'hidden',
      title: '隐藏性能检查'
    }
  ],
  user: storage.user
};
globalThis.getApp = () => ({ globalData: { cloudReady: false } });

const fourthStoreModuleUrl = `${pathToFileURL(storePath).href}?performance=${Date.now()}-hidden-filter`;
const {
  listPosts: listVisiblePosts,
  listAllPosts
} = await import(fourthStoreModuleUrl);

const visibleOnly = await listVisiblePosts(center, { localOnly: true });
const visibleEvenWithHiddenOption = await listVisiblePosts(center, {
  localOnly: true,
  includeHidden: true
});
const includeHidden = await listAllPosts(center);

assert.deepEqual(
  visibleOnly.map((post) => post.id),
  ['perf_post_1'],
  'normal listPosts should still omit hidden posts after pre-filtering.'
);
assert.deepEqual(
  visibleEvenWithHiddenOption.map((post) => post.id),
  ['perf_post_1'],
  'normal listPosts should ignore includeHidden and keep hidden posts out of public lists.'
);
assert.ok(
  includeHidden.some((post) => post.id === 'hidden_perf_post'),
  'listAllPosts should still include hidden posts for admin-style surfaces.'
);

console.log('Performance guard checks passed.');
