#!/usr/bin/env bash
# 每日備份 PostgreSQL（含商品圖片，因為圖片存在 DB 內），保留 14 天
# crontab 範例（每天 04:00 台灣時間）：
#   0 4 * * * /opt/hookah-store/deploy/backup.sh >> /var/log/hookah-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"
set -a; source .env; set +a

KEEP_DAYS=14
BACKUP_DIR="$(pwd)/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="hookah_store-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "/backups/${FILE}"

find "$BACKUP_DIR" -name 'hookah_store-*.dump' -mtime +"$KEEP_DAYS" -delete

echo "[$(date '+%F %T')] ✅ backup -> backups/${FILE} ($(du -h "$BACKUP_DIR/$FILE" | cut -f1))"
