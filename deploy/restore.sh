#!/usr/bin/env bash
# 把 pg_dump -Fc 的檔案還原到容器內的 PostgreSQL（會清空現有資料！）
#   ./restore.sh backups/hookah_store-20261104-040000.dump
set -euo pipefail

cd "$(dirname "$0")"
set -a; source .env; set +a

DUMP="${1:?用法: ./restore.sh <dump 檔路徑>}"
[[ -f "$DUMP" ]] || { echo "❌ 找不到 $DUMP"; exit 1; }

COMPOSE="docker compose -f docker-compose.prod.yml"

read -r -p "⚠️  這會覆蓋 ${POSTGRES_DB} 現有資料，確定？(yes/no) " ans
[[ "$ans" == "yes" ]] || { echo "已取消"; exit 0; }

echo "⏸  停止 API，避免還原期間有寫入 ..."
$COMPOSE stop api

echo "📥 還原 $DUMP ..."
$COMPOSE exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-privileges < "$DUMP"

echo "▶️  啟動 API（會自動跑 migration）..."
$COMPOSE up -d api
echo "✅ 完成"
