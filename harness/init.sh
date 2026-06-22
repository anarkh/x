#!/usr/bin/env bash
set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

cd "$ROOT_DIR"

VERIFY_CMDS=(
  "node scripts/check-json.mjs"
  "node harness/check-harness.mjs"
  "node scripts/check-map-list-blocked-summary-preflight.mjs"
)
START_NOTE="Open this repository in WeChat DevTools and use project.config.json with appid touristappid."

echo "==> 当前目录: $PWD"
echo "==> 同步依赖"
if command -v npm >/dev/null 2>&1; then
  npm ci --ignore-scripts
else
  if ! node -e "const lock = require('./package-lock.json'); const deps = Object.keys((lock.packages && lock.packages[''] && lock.packages[''].dependencies) || {}).length + Object.keys((lock.packages && lock.packages[''] && lock.packages[''].devDependencies) || {}).length; if (deps > 0) process.exit(1);"; then
    echo "npm not found and package-lock declares dependencies; install npm or run in WeChat DevTools environment" >&2
    exit 127
  fi
  echo "npm not found; package-lock has no external dependencies, skipping install"
fi

echo "==> 运行基础验证"
for cmd in "${VERIFY_CMDS[@]}"; do
  echo "+ $cmd"
  bash -lc "$cmd"
done

echo "==> 启动方式"
echo "$START_NOTE"

if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  echo "当前项目没有可无头启动的小程序 CLI。请在 WeChat DevTools 中打开仓库并执行编译/预览。"
fi

echo "Harness init complete."
