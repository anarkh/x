function present(value) {
  return Boolean(String(value || '').trim());
}

function locationValue(locationStatus, hasLocation) {
  if (locationStatus === 'locating') {
    return '确认中';
  }
  if (locationStatus === 'failed') {
    return '待重试';
  }
  return hasLocation ? '已确认' : '待确认';
}

function locationActionText(locationStatus) {
  if (locationStatus === 'ready') {
    return '重新确认';
  }
  if (locationStatus === 'locating') {
    return '确认中';
  }
  if (locationStatus === 'failed') {
    return '重试定位';
  }
  return '确认位置';
}

function missingActionText(missingItem, locationStatus) {
  const actionMap = {
    登录: '去登录',
    标题: '补标题',
    详情: '补详情',
    分类: '选分类',
    失物方向: '选失物方向'
  };
  if (missingItem === '当前位置') {
    if (locationStatus === 'locating') {
      return '确认位置中';
    }
    if (locationStatus === 'failed') {
      return '重试定位';
    }
    return '确认位置';
  }
  return actionMap[missingItem] || '继续填写';
}

function missingLocationCopy(locationStatus) {
  if (locationStatus === 'locating') {
    return {
      title: '正在确认位置',
      note: '请停留在当前页面，确认成功后即可发布'
    };
  }
  if (locationStatus === 'failed') {
    return {
      title: '位置未确认',
      note: '请检查微信定位授权，或点重试定位再试一次'
    };
  }
  return {
    title: '确认当前位置',
    note: '发布前确认当前位置，附近的人会按这里看到任务'
  };
}

function primaryActionForState({ submitting, isGuest, ready, onlyNeedsLocation, locationStatus }) {
  if (submitting) {
    return 'submitting';
  }
  if (isGuest) {
    return 'login';
  }
  if (ready) {
    return 'publish';
  }
  if (onlyNeedsLocation) {
    return locationStatus === 'locating' ? 'waitLocation' : 'confirmLocation';
  }
  return 'fill';
}

export function buildPublishState(options = {}) {
  const form = options.form || {};
  const isGuest = Boolean(options.isGuest);
  const hasLocation = Boolean(options.hasLocation);
  const locationStatus = options.locationStatus || 'idle';
  const imageCount = Number(options.imageCount) || 0;
  const submitting = Boolean(options.submitting);
  const titleDone = present(form.title);
  const bodyDone = present(form.body);
  const contentDone = titleDone && bodyDone;
  const categoryDone = present(form.category)
    && (form.category !== 'lost_found' || present(form.intent));
  const locationDone = hasLocation && locationStatus === 'ready';

  const items = [
    {
      key: 'account',
      label: '身份',
      value: isGuest ? '未登录' : '已登录',
      done: !isGuest
    },
    {
      key: 'content',
      label: '内容',
      value: contentDone ? '已补全' : '待填写',
      done: contentDone
    },
    {
      key: 'category',
      label: '分类',
      value: categoryDone ? '已选择' : '待选择',
      done: categoryDone
    },
    {
      key: 'location',
      label: '位置',
      value: locationValue(locationStatus, hasLocation),
      done: locationDone
    }
  ];

  const missing = [];
  if (isGuest) {
    missing.push('登录');
  }
  if (!titleDone) {
    missing.push('标题');
  }
  if (!bodyDone) {
    missing.push('详情');
  }
  if (!categoryDone) {
    missing.push(form.category === 'lost_found' ? '失物方向' : '分类');
  }
  if (!locationDone) {
    missing.push('当前位置');
  }

  const doneCount = items.filter((item) => item.done).length;
  const ready = missing.length === 0 && !submitting;
  const onlyNeedsLocation = missing.length === 1 && missing[0] === '当前位置';
  const canConfirmLocation = onlyNeedsLocation && locationStatus !== 'locating';
  const actionDisabled = submitting || (!isGuest && missing.length > 0 && !canConfirmLocation);
  const completionText = `${doneCount}/${items.length}`;
  const nextLocationActionText = locationActionText(locationStatus);
  const primaryAction = primaryActionForState({
    submitting,
    isGuest,
    ready,
    onlyNeedsLocation,
    locationStatus
  });

  if (submitting) {
    return {
      items,
      missing,
      ready: false,
      actionDisabled: true,
      primaryAction,
      buttonText: '发布中',
      title: '正在发布',
      note: '正在保存图片和任务信息',
      completionText,
      locationActionText: nextLocationActionText
    };
  }

  if (isGuest) {
    return {
      items,
      missing,
      ready: false,
      actionDisabled: false,
      primaryAction,
      buttonText: '去登录',
      title: '登录后可发布',
      note: '登录后会记录发布者，方便管理自己的任务',
      completionText,
      locationActionText: nextLocationActionText
    };
  }

  if (!ready) {
    const locationCopy = onlyNeedsLocation ? missingLocationCopy(locationStatus) : null;
    return {
      items,
      missing,
      ready: false,
      actionDisabled,
      primaryAction,
      buttonText: missingActionText(missing[0], locationStatus),
      title: locationCopy ? locationCopy.title : `还差${missing[0]}`,
      note: locationCopy ? locationCopy.note : `补全${missing.join('、')}后再发布`,
      completionText,
      locationActionText: nextLocationActionText
    };
  }

  return {
    items,
    missing,
    ready: true,
    actionDisabled: false,
    primaryAction,
    buttonText: '发布',
    title: '可以发布到附近',
    note: imageCount > 0
      ? `当前位置已确认，含${imageCount}张图片`
      : '当前位置已确认，可直接发布',
    completionText,
    locationActionText: nextLocationActionText
  };
}
