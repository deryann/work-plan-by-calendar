#!/bin/bash
# docker-backup.sh - 數據備份腳本
# 用法: ./docker-backup.sh [backup-name]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATA_DIR="$PROJECT_ROOT/data"

# 日誌函數
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 檢查數據目錄是否存在
if [ ! -d "$DATA_DIR" ]; then
    log "ERROR: Data directory not found: $DATA_DIR"
    exit 1
fi

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

# 生成備份文件名
if [ -n "$1" ]; then
    BACKUP_NAME="$1"
else
    BACKUP_NAME="data-backup-$(date +%Y%m%d_%H%M%S)"
fi

BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

log "Starting backup..."
log "Source: $DATA_DIR"
log "Target: $BACKUP_FILE"

# 創建備份
cd "$PROJECT_ROOT"
tar -czf "$BACKUP_FILE" data/

# 檢查備份是否成功
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✓ Backup completed successfully!"
    log "  File: $BACKUP_FILE"
    log "  Size: $BACKUP_SIZE"

    # 列出備份內容（前 20 個文件）
    log "Backup contents (first 20 files):"
    tar -tzf "$BACKUP_FILE" | head -20

    FILE_COUNT=$(tar -tzf "$BACKUP_FILE" | wc -l)
    log "Total files in backup: $FILE_COUNT"
else
    log "✗ Backup failed!"
    exit 1
fi

# 清理舊備份（保留最近 7 個）
log "Cleaning up old backups (keeping last 7)..."
cd "$BACKUP_DIR"
ls -t data-backup-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
REMAINING_BACKUPS=$(ls -1 data-backup-*.tar.gz 2>/dev/null | wc -l)
log "Remaining backups: $REMAINING_BACKUPS"

log "Backup completed!"
