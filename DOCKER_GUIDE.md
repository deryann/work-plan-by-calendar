# Docker Compose 使用指南

本指南說明如何使用 Docker Compose 部署和管理 Work Plan Calendar 系統，包含完整的自動重啟機制。

## 目錄

- [快速開始](#快速開始)
- [自動重啟機制](#自動重啟機制)
- [健康檢查](#健康檢查)
- [資源限制](#資源限制)
- [日誌管理](#日誌管理)
- [常用命令](#常用命令)
- [監控與維護](#監控與維護)
- [故障排除](#故障排除)

## 快速開始

### 1. 環境準備

確保已安裝以下工具：
- Docker (版本 20.10+)
- Docker Compose (版本 1.29+)

檢查版本：
```bash
docker --version
docker-compose --version
```

### 2. 構建和啟動服務

```bash
# 構建 Docker 映像
docker-compose build

# 啟動服務（後台運行）
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 3. 訪問服務

服務啟動後，可以通過以下地址訪問：
- 主應用：http://localhost:8000
- API 文檔：http://localhost:8000/docs
- 健康檢查：http://localhost:8000/api/health

## 自動重啟機制

### 重啟策略說明

當前配置使用 `restart: unless-stopped` 策略，這是最推薦的配置：

| 策略 | 說明 | 適用場景 |
|-----|------|---------|
| `no` | 不自動重啟 | 開發測試環境 |
| `always` | 總是重啟（包括手動停止後） | 需要持續運行的服務 |
| `on-failure` | 只在非正常退出時重啟 | 需要區分錯誤類型的服務 |
| `unless-stopped` | 總是重啟，除非手動停止 | **生產環境推薦** ✅ |

### 自動重啟觸發條件

容器會在以下情況自動重啟：
1. 應用程序崩潰或異常退出
2. 健康檢查失敗（連續失敗 3 次）
3. 系統重啟後
4. Docker 守護進程重啟後

### 修改重啟策略

編輯 `docker-compose.yml` 中的 `restart` 選項：

```yaml
services:
  work-plan-calendar:
    restart: unless-stopped  # 修改此處
```

然後重新啟動服務：
```bash
docker-compose up -d
```

## 健康檢查

### 健康檢查配置

系統配置了完整的健康檢查機制：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
  interval: 30s        # 每 30 秒檢查一次
  timeout: 10s         # 檢查超時時間
  retries: 3           # 連續失敗 3 次才認定為不健康
  start_period: 40s    # 容器啟動後等待 40 秒才開始檢查
```

### 查看健康狀態

```bash
# 查看容器健康狀態
docker-compose ps

# 查看詳細健康檢查日誌
docker inspect --format='{{json .State.Health}}' work-plan-calendar | jq

# 手動測試健康檢查端點
curl http://localhost:8000/api/health
```

### 健康檢查流程

```
容器啟動 → 等待 40s (start_period)
    ↓
每 30s 執行一次健康檢查 (interval)
    ↓
檢查超時 10s (timeout)
    ↓
連續失敗 3 次 (retries) → 標記為 unhealthy → 觸發重啟
```

## 資源限制

### 當前配置

為防止容器佔用過多系統資源，已配置以下限制：

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # 最多使用 1 個 CPU 核心
      memory: 512M     # 最多使用 512MB 記憶體
    reservations:
      cpus: '0.25'     # 保證至少 0.25 個 CPU 核心
      memory: 128M     # 保證至少 128MB 記憶體
```

### 調整資源限制

根據實際需求修改 `docker-compose.yml`：

```yaml
# 高負載環境
limits:
  cpus: '2.0'
  memory: 1G

# 低資源環境
limits:
  cpus: '0.5'
  memory: 256M
```

### 監控資源使用

```bash
# 查看容器資源使用情況
docker stats work-plan-calendar

# 持續監控
docker stats --no-stream work-plan-calendar
```

## 日誌管理

### 日誌配置

系統配置了日誌輪轉機制，防止日誌檔案無限增長：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # 單個日誌檔案最大 10MB
    max-file: "3"      # 最多保留 3 個日誌檔案
```

這意味著最多保留 30MB 的日誌數據。

### 查看日誌

```bash
# 查看實時日誌
docker-compose logs -f

# 查看最近 100 行日誌
docker-compose logs --tail=100

# 查看特定時間範圍的日誌
docker-compose logs --since 1h

# 只查看錯誤日誌
docker-compose logs | grep -i error
```

### 日誌位置

Docker 日誌預設存儲位置：
- Linux: `/var/lib/docker/containers/<container-id>/<container-id>-json.log`
- Mac: `~/Library/Containers/com.docker.docker/Data/vms/0/`

應用內部日誌：
- 容器內部：`/app/logs/` (如果有配置)

## 常用命令

### 基本操作

```bash
# 啟動服務
docker-compose up -d

# 停止服務
docker-compose stop

# 重啟服務
docker-compose restart

# 停止並移除容器
docker-compose down

# 停止並移除容器、網絡、映像
docker-compose down --rmi all -v
```

### 構建相關

```bash
# 重新構建映像
docker-compose build --no-cache

# 構建並啟動
docker-compose up -d --build

# 使用特定標籤構建
IMAGE_TAG=v1.0.0 docker-compose build
```

### 容器管理

```bash
# 進入容器
docker-compose exec work-plan-calendar bash

# 查看容器進程
docker-compose top

# 查看容器配置
docker-compose config

# 驗證配置文件
docker-compose config --quiet
```

### 數據管理

```bash
# 備份數據目錄
tar -czf data-backup-$(date +%Y%m%d).tar.gz ./data/

# 恢復數據
tar -xzf data-backup-20231128.tar.gz

# 清理未使用的資源
docker system prune -a
```

## 監控與維護

### 1. 健康監控腳本

創建 `monitor.sh` 用於定期檢查：

```bash
#!/bin/bash
# monitor.sh - 容器健康監控腳本

CONTAINER_NAME="work-plan-calendar"
HEALTH_URL="http://localhost:8000/api/health"

# 檢查容器運行狀態
if [ "$(docker inspect -f '{{.State.Running}}' $CONTAINER_NAME)" != "true" ]; then
    echo "$(date): Container is not running!" | tee -a /var/log/docker-monitor.log
    exit 1
fi

# 檢查健康狀態
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME)
if [ "$HEALTH_STATUS" != "healthy" ]; then
    echo "$(date): Container is unhealthy! Status: $HEALTH_STATUS" | tee -a /var/log/docker-monitor.log
    exit 1
fi

# 檢查 API 響應
if ! curl -sf $HEALTH_URL > /dev/null; then
    echo "$(date): API health check failed!" | tee -a /var/log/docker-monitor.log
    exit 1
fi

echo "$(date): All checks passed" | tee -a /var/log/docker-monitor.log
```

使用 cron 定期執行：
```bash
# 每 5 分鐘檢查一次
*/5 * * * * /path/to/monitor.sh
```

### 2. 自動更新腳本

創建 `update.sh` 用於更新服務：

```bash
#!/bin/bash
# update.sh - 自動更新部署腳本

echo "Pulling latest code..."
git pull origin main

echo "Building new image..."
docker-compose build --no-cache

echo "Stopping old container..."
docker-compose down

echo "Starting new container..."
docker-compose up -d

echo "Waiting for health check..."
sleep 45

# 檢查健康狀態
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' work-plan-calendar)
if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "Update successful! Service is healthy."
    # 清理舊映像
    docker image prune -f
else
    echo "Warning: Service may not be healthy. Status: $HEALTH_STATUS"
    docker-compose logs --tail=50
fi
```

### 3. 性能監控

```bash
# 實時監控資源使用
watch -n 1 'docker stats --no-stream work-plan-calendar'

# 檢查容器重啟次數
docker inspect --format='{{.RestartCount}}' work-plan-calendar

# 查看容器啟動時間
docker inspect --format='{{.State.StartedAt}}' work-plan-calendar
```

## 故障排除

### 問題 1：容器無法啟動

```bash
# 查看詳細錯誤信息
docker-compose logs

# 檢查端口是否被占用
netstat -tuln | grep 8000
# 或
lsof -i :8000

# 檢查 Docker 守護進程狀態
sudo systemctl status docker
```

### 問題 2：健康檢查一直失敗

```bash
# 進入容器手動測試
docker-compose exec work-plan-calendar bash
curl -v http://localhost:8000/api/health

# 檢查應用日誌
docker-compose logs -f

# 增加 start_period 時間
# 編輯 docker-compose.yml，將 start_period 改為 60s
```

### 問題 3：容器頻繁重啟

```bash
# 查看重啟次數和原因
docker inspect work-plan-calendar | grep -A 10 State

# 查看最近的日誌
docker-compose logs --tail=200

# 檢查資源使用情況
docker stats work-plan-calendar

# 可能需要增加資源限制
```

### 問題 4：數據丟失

```bash
# 檢查數據卷掛載
docker inspect work-plan-calendar | grep -A 10 Mounts

# 確認數據目錄權限
ls -la ./data/

# 檢查容器內部數據目錄
docker-compose exec work-plan-calendar ls -la /app/data/
```

### 問題 5：無法訪問服務

```bash
# 檢查容器端口映射
docker-compose ps
docker port work-plan-calendar

# 檢查防火牆設置
sudo ufw status
sudo iptables -L

# 測試容器內部網絡
docker-compose exec work-plan-calendar curl http://localhost:8000/api/health
```

## 環境變數配置

可以創建 `.env` 文件來配置環境變數：

```bash
# .env
IMAGE_TAG=v1.0.0
GIT_COMMIT_HASH=abc123
TZ=Asia/Taipei
LOG_LEVEL=info
```

## 生產環境建議

### 安全加固

1. 使用非 root 用戶運行（已配置）
2. 限制容器資源（已配置）
3. 使用 HTTPS（需要配置反向代理）
4. 定期更新基礎映像

### 備份策略

```bash
# 每日備份腳本
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf $BACKUP_DIR/data-backup-$DATE.tar.gz ./data/
# 保留最近 7 天的備份
find $BACKUP_DIR -name "data-backup-*.tar.gz" -mtime +7 -delete
```

### 監控集成

考慮集成以下監控工具：
- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- New Relic

## 高可用部署

對於生產環境，建議使用 Docker Swarm 或 Kubernetes 進行高可用部署：

### Docker Swarm 示例

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  work-plan-calendar:
    image: work-plan-calendar:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

部署命令：
```bash
docker stack deploy -c docker-compose.prod.yml work-plan-stack
```

## 參考資料

- [Docker Compose 官方文檔](https://docs.docker.com/compose/)
- [Docker 健康檢查](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Docker 重啟策略](https://docs.docker.com/config/containers/start-containers-automatically/)
- [Docker 日誌驅動](https://docs.docker.com/config/containers/logging/configure/)

## 聯繫支持

如有問題，請通過以下方式聯繫：
- 提交 GitHub Issue
- 查看項目 README.md
- 查閱 DEPLOYMENT.md

---

**最後更新：2024-11-29**
