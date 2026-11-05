#!/usr/bin/env bash
# 在 VPS 上更新並重啟服務：
#   cd /opt/hookah-store/deploy && ./deploy.sh
# 可加 --no-pull 跳過 git pull（例如用 scp 上傳程式碼時）
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.prod.yml"

if [[ ! -f .env ]]; then
  echo "❌ 找不到 deploy/.env，請先 cp .env.example .env 並填入實際值"
  exit 1
fi

if [[ "${1:-}" != "--no-pull" ]]; then
  echo "⬇️  git pull ..."
  git -C .. pull --ff-only
fi

echo "🔨 build 映像 ..."
$COMPOSE build --pull

echo "🚀 重啟服務 ..."
$COMPOSE up -d --remove-orphans

echo "🧹 清理舊映像 ..."
docker image prune -f >/dev/null

echo "⏳ 等待 API 就緒 ..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T api curl -fs http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ API healthy"
    $COMPOSE ps
    exit 0
  fi
  sleep 2
done

echo "❌ API 30 秒內未就緒，最近日誌："
$COMPOSE logs --tail=50 api
exit 1
