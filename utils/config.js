const config = {
  pilotCenter: {
    latitude: 39.96685,
    longitude: 116.34329
  },
  pilotArea: {
    name: '中关村东路试点区',
    shortName: '中关村东路',
    description: '确认、更新、关闭附近短时信息',
    shareTitle: '中关村东路附近任务'
  },
  maxVisiblePosts: 100,
  categories: [
    { value: 'lost_found', label: '失物招领' },
    { value: 'street_update', label: '地点动态' },
    { value: 'help_needed', label: '求助问答' },
    { value: 'check_in', label: '打卡' }
  ],
  lostFoundIntents: [
    { value: 'lost', label: '我丢了' },
    { value: 'found', label: '我捡到' }
  ],
  publishGuides: {
    lost_found: {
      titlePlaceholder: '例如：蓝色门禁卡',
      bodyPlaceholder: '补充可识别特征，不要公开完整手机号、证件号等隐私',
      placePlaceholder: '例如：地铁站 A 口外侧'
    },
    street_update: {
      titlePlaceholder: '例如：北三环辅路施工占道',
      bodyPlaceholder: '说明影响范围、方向、是否需要绕行',
      placePlaceholder: '例如：中鼎大厦南侧'
    },
    help_needed: {
      titlePlaceholder: '例如：有人看到黑色电脑包吗',
      bodyPlaceholder: '说清你需要附近人确认或帮忙的具体信息',
      placePlaceholder: '例如：社区广场到公交站之间'
    },
    check_in: {
      titlePlaceholder: '例如：银杏路口今天很适合拍照',
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
