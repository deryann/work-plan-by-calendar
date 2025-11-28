#!/bin/bash
# docker-restore.sh - 數據恢復腳本
# 用法: ./docker-restore.sh <backup-file>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="work-plan-calendar"

# 日誌函數
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 確認函數
confirm() {
    read -p "$1 (yes/no): " response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# 檢查參數
if [ -z "$1" ]; then
    log "ERROR: Backup file not specified!"
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh "$PROJECT_ROOT/backups/"*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# 檢查備份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    # 嘗試在 backups 目錄中查找
    BACKUP_FILE="$PROJECT_ROOT/backups/$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        log "ERROR: Backup file not found: $1"
        exit 1
    fi
fi

log "Backup file: $BACKUP_FILE"
log "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# 顯示備份內容
log "Backup contents (first 10 files):"
tar -tzf "$BACKUP_FILE" | head -10

# 確認恢復操作
echo ""
log "WARNING: This will replace all current data!"
if ! confirm "Are you sure you want to restore from this backup?"; then
    log "Restore cancelled"
    exit 0
fi

# 停止容器
log "Stopping container..."
docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down

# 備份當前數據（以防萬一）
CURRENT_DATA="$PROJECT_ROOT/data"
if [ -d "$CURRENT_DATA" ]; then
    PRE_RESTORE_BACKUP="$PROJECT_ROOT/backups/pre-restore-$(date +%Y%m%d_%H%M%S).tar.gz"
    log "Creating safety backup of current data..."
    cd "$PROJECT_ROOT"
    tar -czf "$PRE_RESTORE_BACKUP" data/
    log "Safety backup created: $PRE_RESTORE_BACKUP"
fi

# 清空現有數據
log "Removing current data..."
rm -rf "$CURRENT_DATA"

# 恢復數據
log "Restoring data from backup..."
cd "$PROJECT_ROOT"
tar -xzf "$BACKUP_FILE"

if [ -d "$CURRENT_DATA" ]; then
    log "✓ Data restored successfully!"
    log "Restored directory: $CURRENT_DATA"
    log "File count: $(find "$CURRENT_DATA" -type f | wc -l)"
else
    log "✗ Restore failed! Data directory not created."
    log "Attempting to restore from safety backup..."
    tar -xzf "$PRE_RESTORE_BACKUP"
    exit 1
fi

# 重啟容器
log "Starting container..."
docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d

# 等待健康檢查
log "Waiting for service to be healthy..."
sleep 10

HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
log "Container health status: $HEALTH_STATUS"

log "Restore completed!"
log "Service available at: http://localhost:8000"
