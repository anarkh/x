const now = Date.now();

const mockPosts = [
  {
    id: 'post_001',
    markerId: 1,
    title: '地铁口捡到蓝色门禁卡',
    body: 'A口外侧共享单车旁，卡套上有一只小熊贴纸。',
    category: 'lost_found',
    intent: 'found',
    placeName: '地铁站 A 口',
    latitude: 39.96636,
    longitude: 116.34543,
    status: 'active',
    confirmations: 5,
    lastConfirmedAt: now - 18 * 60 * 1000,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 42 * 60 * 1000,
    expiresAt: now + 22 * 60 * 60 * 1000,
    publisher: '附近店员'
  },
  {
    id: 'post_002',
    markerId: 2,
    title: '北三环辅路施工占道',
    body: '靠近中鼎大厦一侧，骑行需要提前并到外侧。',
    category: 'street_update',
    placeName: '中鼎大厦南侧',
    latitude: 39.96853,
    longitude: 116.34096,
    status: 'active',
    confirmations: 9,
    lastConfirmedAt: now - 35 * 60 * 1000,
    staleCount: 1,
    reportCount: 0,
    createdAt: now - 3 * 60 * 60 * 1000,
    expiresAt: now + 5 * 60 * 60 * 1000,
    publisher: '通勤用户'
  },
  {
    id: 'post_003',
    markerId: 3,
    title: '有人看到黑色电脑包吗',
    body: '下午在咖啡店到公交站之间遗失，内有一本灰色笔记本。',
    category: 'help_needed',
    placeName: '社区广场',
    latitude: 39.96495,
    longitude: 116.34234,
    status: 'active',
    confirmations: 1,
    lastConfirmedAt: now - 72 * 60 * 1000,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 95 * 60 * 1000,
    expiresAt: now + 70 * 60 * 60 * 1000,
    publisher: '匿名用户'
  },
  {
    id: 'post_004',
    markerId: 4,
    title: '银杏路口今天很适合拍照',
    body: '下午光线正好，人不多，靠近路口一侧更出片。',
    category: 'check_in',
    placeName: '社区广场东侧',
    latitude: 39.96583,
    longitude: 116.34418,
    status: 'active',
    confirmations: 3,
    lastConfirmedAt: now - 12 * 60 * 1000,
    staleCount: 0,
    reportCount: 0,
    createdAt: now - 28 * 60 * 1000,
    expiresAt: now + 23 * 60 * 60 * 1000,
    publisher: '附近用户'
  }
];

export default mockPosts;
