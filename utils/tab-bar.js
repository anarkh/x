export function syncTabBar(page, selectedPath) {
  if (!page || typeof page.getTabBar !== 'function') {
    return;
  }
  const tabBar = page.getTabBar();
  if (tabBar && typeof tabBar.sync === 'function') {
    tabBar.sync(selectedPath);
  }
}
