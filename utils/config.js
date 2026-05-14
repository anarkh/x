const config = {
  defaultCenter: {
    latitude: 39.96685,
    longitude: 116.34329,
    name: 'fallback'
  },
  appInfo: {
    name: '街区任务',
    shortName: '附近',
    description: '确认、更新、关闭身边短时信息',
    shareTitle: '附近任务'
  },
  admin: {
    displayName: '管理员'
  },
  cloud: {
    enabled: true,
    envId: 'cloud1-d4ga42hl16934fbdf',
    collections: {
      posts: 'posts',
      admins: 'admins'
    }
  },
  maxVisiblePosts: 100,
  categories: [
    { value: 'check_in', label: '打卡' },
    { value: 'lost_found', label: '失物招领' },
    { value: 'street_update', label: '地点动态' },
    { value: 'help_needed', label: '求助问答' }
  ],
  lostFoundIntents: [
    { value: 'lost', label: '我丢了' },
    { value: 'found', label: '我捡到' }
  ],
  feedbackTypes: [
    { value: 'suggestion', label: '功能建议' },
    { value: 'bug', label: '问题反馈' },
    { value: 'content', label: '内容体验' },
    { value: 'other', label: '其他' }
  ],
  publishGuides: {
    lost_found: {
      titlePlaceholder: '例如：蓝色门禁卡',
      bodyPlaceholder: '补充可识别特征，不要公开完整手机号、证件号等隐私',
      placePlaceholder: '例如：地铁站 A 口外侧'
    },
    street_update: {
      titlePlaceholder: '例如：小区门口施工占道',
      bodyPlaceholder: '说明影响范围、方向、是否需要绕行',
      placePlaceholder: '例如：商场南侧人行道'
    },
    help_needed: {
      titlePlaceholder: '例如：有人看到黑色电脑包吗',
      bodyPlaceholder: '说清你需要附近人确认或帮忙的具体信息',
      placePlaceholder: '例如：社区广场到公交站之间'
    },
    check_in: {
      titlePlaceholder: '例如：社区花园今天很适合拍照',
      bodyPlaceholder: '补充时间、角度、人流或其他附近状态',
      placePlaceholder: '例如：社区广场东侧'
    }
  },
  expiryOptions: [
    { value: 6, label: '6小时' },
    { value: 24, label: '1天' },
    { value: 72, label: '3天' }
  ]
};

export default config;
