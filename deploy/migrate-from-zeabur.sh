#!/usr/bin/env bash
# 從 Zeabur 的 PostgreSQL 匯出最新資料並還原到本機容器（會覆蓋現有資料）。
# 正式切換時使用；執行中會提示輸入 Zeabur 的 PostgreSQL 密碼。
#   ./migrate-from-zeabur.sh
set -euo pipefail

cd "$(dirname "$0")"
set -a; source .env; set +a

SRC_HOST="${SRC_HOST:-tpe1.clusters.zeabur.com}"
SRC_PORT="${SRC_PORT:-23611}"
SRC_USER="${SRC_USER:-root}"
SRC_DB="${SRC_DB:-zeabur}"

C="docker compose -f docker-compose.prod.yml"
q() { $C exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "$1" </dev/null; }
FILE="zeabur-$(date +%Y%m%d-%H%M%S).dump"

echo "① 匯出 Zeabur 資料庫（請輸入 Zeabur PostgreSQL 密碼）"
docker run --rm -it -v "$(pwd)/backups:/backups" "postgres:${POSTGRES_VERSION:-18}" \
  pg_dump -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -d "$SRC_DB" -Fc -f "/backups/${FILE}"

if [[ ! -s "backups/${FILE}" ]]; then
  echo "❌ 匯出失敗（檔案不存在或是空的），本機資料未變動"
  exit 1
fi
echo "   ✅ backups/${FILE} ($(du -h "backups/${FILE}" | cut -f1))"

echo "② 停止 API"
$C stop api >/dev/null 2>&1

echo "③ 還原到本機資料庫"
$C exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-privileges "/backups/${FILE}" </dev/null

echo "④ 啟動 API"
$C up -d api >/dev/null 2>&1
for _ in $(seq 1 45); do
  if $C exec -T api curl -fs http://localhost:8000/health </dev/null >/dev/null 2>&1; then
    echo
    echo "✅ 完成。訂單 $(q 'select count(*) from orders') 筆、使用者 $(q 'select count(*) from users') 位、圖片 $(q 'select count(*) from images') 張"
    echo "   最新訂單時間：$(q 'select max(created_at) from orders')"
    exit 0
  fi
  sleep 2
done

echo "❌ API 90 秒內未就緒，最近日誌："
$C logs --tail=40 api </dev/null
exit 1
