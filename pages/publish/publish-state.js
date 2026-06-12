function present(value) {
  return Boolean(String(value || '').trim());
}

function locationValue(locationStatus, hasLocation) {
  if (locationStatus === 'locating') {
    return '确认中';
  }
  if (locationStatus === 'failed') {
    return '需重试';
  }
  return hasLocation ? '已确认' : '待确认';
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
  const actionDisabled = submitting || (!isGuest && missing.length > 0);
  const completionText = `${doneCount}/${items.length}`;
  const locationActionText = locationStatus === 'ready' ? '重新确认' : '确认位置';

  if (submitting) {
    return {
      items,
      missing,
      ready: false,
      actionDisabled: true,
      buttonText: '发布中',
      title: '正在发布',
      note: '正在保存图片和任务信息',
      completionText,
      locationActionText
    };
  }

  if (isGuest) {
    return {
      items,
      missing,
      ready: false,
      actionDisabled: false,
      buttonText: '去登录',
      title: '登录后可发布',
      note: '登录后会记录发布者，方便管理自己的任务',
      completionText,
      locationActionText
    };
  }

  if (!ready) {
    return {
      items,
      missing,
      ready: false,
      actionDisabled,
      buttonText: '继续填写',
      title: `还差${missing[0]}`,
      note: `补全${missing.join('、')}后再发布`,
      completionText,
      locationActionText
    };
  }

  return {
    items,
    missing,
    ready: true,
    actionDisabled: false,
    buttonText: '发布',
    title: '可以发布到附近',
    note: imageCount > 0
      ? `当前位置已确认，含${imageCount}张图片`
      : '当前位置已确认，可直接发布',
    completionText,
    locationActionText
  };
}
