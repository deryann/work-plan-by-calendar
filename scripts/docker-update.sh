#!/bin/bash
# docker-update.sh - 自動更新部署腳本
# 用法: ./docker-update.sh [--no-backup]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
CONTAINER_NAME="work-plan-calendar"
NO_BACKUP=false

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--no-backup]"
            exit 1
            ;;
    esac
done

# 日誌函數
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting update process..."

# 切換到項目根目錄
cd "$PROJECT_ROOT"

# 1. 備份數據（除非指定 --no-backup）
if [ "$NO_BACKUP" = false ]; then
    log "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/data-backup-$(date +%Y%m%d_%H%M%S).tar.gz"

    if [ -d "./data" ]; then
        tar -czf "$BACKUP_FILE" ./data/
        log "Backup created: $BACKUP_FILE"
    else
        log "WARNING: Data directory not found, skipping backup"
    fi
else
    log "Skipping backup (--no-backup specified)"
fi

# 2. 拉取最新代碼
log "Pulling latest code..."
if [ -d ".git" ]; then
    git pull origin main || {
        log "WARNING: Git pull failed, continuing with local code"
    }
else
    log "Not a git repository, skipping git pull"
fi

# 3. 停止舊容器
log "Stopping old container..."
docker-compose down

# 4. 構建新映像
log "Building new image..."
docker-compose build --no-cache

# 5. 啟動新容器
log "Starting new container..."
docker-compose up -d

# 6. 等待健康檢查
log "Waiting for health check..."
MAX_WAIT=120
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        log "✓ Service is healthy!"
        break
    elif [ "$HEALTH_STATUS" = "unhealthy" ]; then
        log "✗ Service is unhealthy!"
        docker-compose logs --tail=50
        exit 1
    fi

    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
    echo -n "."
done

echo ""

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    log "WARNING: Health check timeout. Checking service status..."
    docker-compose ps
    docker-compose logs --tail=30
fi

# 7. 清理舊映像
log "Cleaning up old images..."
docker image prune -f

# 8. 顯示狀態
log "Current status:"
docker-compose ps

log "Update completed successfully!"
log "Service available at: http://localhost:8000"
