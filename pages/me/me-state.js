import { buildActivities, isOpenPost } from '../../utils/post-presenter.js';

const DEFAULT_STATS = [
  { label: '我发布', value: 0 },
  { label: '处理中', value: 0 },
  { label: '已关闭', value: 0 },
  { label: '参与', value: 0 }
];

function countActions(activities, action) {
  return activities.filter((item) => item.action === action).length;
}

function buildNextAction({ user, myPosts, openMyPosts, activities, profileNeedsSetup }) {
  if (user.isGuest) {
    return {
      title: '登录后管理你的附近动态',
      note: '发布、确认和反馈都会记录在这里。',
      buttonText: '去登录',
      action: 'login'
    };
  }
  if (profileNeedsSetup) {
    return {
      title: '补全头像和名称',
      note: '让邻居更容易识别你的发布和评论。',
      buttonText: '去完善',
      action: 'profile'
    };
  }
  if (openMyPosts.length) {
    return {
      title: `${openMyPosts.length} 条发布正在处理中`,
      note: '看看有没有新的确认、过时或关闭机会。',
      buttonText: '去查看',
      action: 'myPosts'
    };
  }
  if (!myPosts.length && !activities.length) {
    return {
      title: '还没有附近动态',
      note: '可以先发布一条小事，或去地图看看邻里信息。',
      buttonText: '去发布',
      action: 'publish'
    };
  }
  if (activities.length) {
    return {
      title: '你参与过的任务有新线索',
      note: '回看确认、过时和举报记录，继续补充判断。',
      buttonText: '看记录',
      action: 'activities'
    };
  }
  return {
    title: '继续关注附近任务',
    note: '地图里会展示身边最新的短时信息。',
    buttonText: '看地图',
    action: 'map'
  };
}

function buildLinkSummaries(myPosts, openMyPosts, activities) {
  const resolvedCount = myPosts.filter((post) => post.status === 'resolved').length;
  const confirmCount = countActions(activities, 'confirm');
  const reportCount = countActions(activities, 'report');
  return {
    myPostsText: myPosts.length
      ? `${openMyPosts.length} 条处理中，${resolvedCount} 条已关闭`
      : '还没有发布过任务',
    activitiesText: activities.length
      ? `确认 ${confirmCount} 次，举报 ${reportCount} 次`
      : '还没有参与记录'
  };
}

export function buildMeState({ user, posts = [], reactions = [], profileNeedsSetup = false }) {
  const myPosts = posts.filter((post) => post.isMine || post.publisherId === user.id);
  const activities = buildActivities(posts, reactions);
  const openMyPosts = myPosts.filter(isOpenPost);
  const stats = myPosts.length || activities.length
    ? [
      { label: '我发布', value: myPosts.length },
      { label: '处理中', value: openMyPosts.length },
      { label: '已关闭', value: myPosts.filter((post) => post.status === 'resolved').length },
      { label: '参与', value: reactions.length }
    ]
    : DEFAULT_STATS;
  const linkSummaries = buildLinkSummaries(myPosts, openMyPosts, activities);
  return {
    stats,
    myPostCount: myPosts.length,
    activityCount: activities.length,
    myPostsText: linkSummaries.myPostsText,
    activitiesText: linkSummaries.activitiesText,
    nextAction: buildNextAction({ user, myPosts, openMyPosts, activities, profileNeedsSetup }),
    recentActivities: activities.slice(0, 2)
  };
}
