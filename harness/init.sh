#!/usr/bin/env bash
set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

cd "$ROOT_DIR"

INSTALL_CMD=(npm ci --ignore-scripts)
VERIFY_CMDS=(
  "npm run check:json"
  "node harness/check-harness.mjs"
)
START_NOTE="Open this repository in WeChat DevTools and use project.config.json with appid touristappid."

echo "==> 当前目录: $PWD"
echo "==> 同步依赖"
"${INSTALL_CMD[@]}"

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
