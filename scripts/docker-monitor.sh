#!/bin/bash
# docker-monitor.sh - 容器健康監控腳本
# 用法: ./docker-monitor.sh

CONTAINER_NAME="work-plan-calendar"
HEALTH_URL="http://localhost:8000/api/health"
LOG_FILE="/var/log/docker-monitor.log"

# 如果沒有權限寫入 /var/log，使用當前目錄
if [ ! -w "/var/log" ]; then
    LOG_FILE="./docker-monitor.log"
fi

# 日誌函數
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    log "ERROR: Docker daemon is not running!"
    exit 1
fi

# 檢查容器是否存在
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: Container '$CONTAINER_NAME' does not exist!"
    exit 1
fi

# 檢查容器運行狀態
RUNNING=$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null)
if [ "$RUNNING" != "true" ]; then
    log "WARNING: Container is not running! (Running: $RUNNING)"
    exit 1
fi

# 檢查健康狀態
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)
if [ -z "$HEALTH_STATUS" ]; then
    log "INFO: Container has no health check configured"
elif [ "$HEALTH_STATUS" != "healthy" ]; then
    log "WARNING: Container is unhealthy! Status: $HEALTH_STATUS"
    # 獲取最近的健康檢查日誌
    HEALTH_LOG=$(docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' "$CONTAINER_NAME" 2>/dev/null)
    log "Health check output: $HEALTH_LOG"
    exit 1
fi

# 檢查 API 響應
if command -v curl > /dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
    if [ "$HTTP_CODE" != "200" ]; then
        log "WARNING: API health check failed! HTTP code: $HTTP_CODE"
        exit 1
    fi
else
    log "INFO: curl not installed, skipping API check"
fi

# 檢查資源使用
STATS=$(docker stats --no-stream --format "CPU: {{.CPUPerc}}, Memory: {{.MemPerc}}" "$CONTAINER_NAME" 2>/dev/null)
log "OK: All checks passed. $STATS"

exit 0
