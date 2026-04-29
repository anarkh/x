const config = {
  pilotCenter: {
    latitude: 39.96685,
    longitude: 116.34329
  },
  maxVisiblePosts: 100,
  categories: [
    { value: 'lost_found', label: '失物招领' },
    { value: 'street_update', label: '地点动态' },
    { value: 'help_needed', label: '求助问答' },
    { value: 'check_in', label: '打卡' }
  ],
  expiryOptions: [
    { value: 6, label: '6小时' },
    { value: 24, label: '1天' },
    { value: 72, label: '3天' }
  ]
};

export default config;
