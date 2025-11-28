# Docker 管理腳本

此目錄包含用於管理 Work Plan Calendar Docker 容器的實用腳本。

## 腳本清單

### 1. docker-monitor.sh
**功能**：監控容器健康狀態

**用法**：
```bash
./scripts/docker-monitor.sh
```

**功能說明**：
- 檢查 Docker 守護進程是否運行
- 檢查容器是否存在和運行
- 檢查容器健康狀態
- 檢查 API 端點響應
- 記錄資源使用情況

**設置定期監控**：
```bash
# 編輯 crontab
crontab -e

# 添加以下行（每 5 分鐘檢查一次）
*/5 * * * * /path/to/scripts/docker-monitor.sh

# 或者每分鐘檢查一次
* * * * * /path/to/scripts/docker-monitor.sh
```

**日誌位置**：
- 如果有權限：`/var/log/docker-monitor.log`
- 否則：`./docker-monitor.log`

### 2. docker-update.sh
**功能**：自動更新和部署服務

**用法**：
```bash
# 標準更新（包含備份）
./scripts/docker-update.sh

# 跳過備份的快速更新
./scripts/docker-update.sh --no-backup
```

**執行步驟**：
1. 創建數據備份（可選）
2. 拉取最新代碼
3. 停止舊容器
4. 構建新映像
5. 啟動新容器
6. 等待健康檢查
7. 清理舊映像
8. 顯示服務狀態

**注意事項**：
- 更新過程會短暫中斷服務（通常 1-2 分鐘）
- 建議在低流量時段執行
- 備份文件保存在 `backups/` 目錄

### 3. docker-backup.sh
**功能**：創建數據備份

**用法**：
```bash
# 使用自動生成的文件名
./scripts/docker-backup.sh

# 使用自定義文件名
./scripts/docker-backup.sh my-backup-name
```

**備份內容**：
- 整個 `data/` 目錄及其所有子目錄和文件

**備份位置**：
- `backups/data-backup-YYYYMMDD_HHMMSS.tar.gz`

**自動清理**：
- 腳本會自動保留最近 7 個備份
- 舊備份會被自動刪除

**設置定期備份**：
```bash
# 每天凌晨 2 點備份
0 2 * * * /path/to/scripts/docker-backup.sh

# 每週日凌晨 3 點備份
0 3 * * 0 /path/to/scripts/docker-backup.sh weekly-backup
```

### 4. docker-restore.sh
**功能**：從備份恢復數據

**用法**：
```bash
# 恢復指定備份
./scripts/docker-restore.sh backups/data-backup-20241128_140000.tar.gz

# 或者只提供文件名（會在 backups/ 目錄查找）
./scripts/docker-restore.sh data-backup-20241128_140000.tar.gz

# 查看可用備份
./scripts/docker-restore.sh
```

**執行步驟**：
1. 顯示備份信息
2. 要求確認操作
3. 停止容器
4. 創建安全備份（當前數據）
5. 清空現有數據
6. 恢復備份數據
7. 重啟容器
8. 檢查健康狀態

**安全特性**：
- 恢復前需要手動確認
- 自動創建當前數據的安全備份
- 如果恢復失敗，會嘗試回滾到安全備份

## 使用場景

### 場景 1：日常監控
```bash
# 設置 cron 定期監控
*/5 * * * * /path/to/scripts/docker-monitor.sh
```

### 場景 2：定期備份
```bash
# 每天自動備份
0 2 * * * /path/to/scripts/docker-backup.sh
```

### 場景 3：版本更新
```bash
# 更新到最新版本
./scripts/docker-update.sh
```

### 場景 4：災難恢復
```bash
# 1. 查看可用備份
ls -lh backups/

# 2. 恢復特定備份
./scripts/docker-restore.sh backups/data-backup-20241128_140000.tar.gz
```

### 場景 5：遷移到新服務器
```bash
# 在舊服務器上
./scripts/docker-backup.sh migration-backup
scp backups/migration-backup.tar.gz user@new-server:/path/

# 在新服務器上
./scripts/docker-restore.sh migration-backup.tar.gz
```

## 故障排除

### 問題：腳本沒有執行權限
```bash
chmod +x scripts/*.sh
```

### 問題：找不到 docker-compose 命令
```bash
# 檢查 docker-compose 是否已安裝
docker-compose --version

# 或使用 docker compose（新版本）
docker compose --version
```

### 問題：權限不足
```bash
# 方式 1：使用 sudo
sudo ./scripts/docker-monitor.sh

# 方式 2：將當前用戶添加到 docker 組
sudo usermod -aG docker $USER
# 然後登出並重新登入
```

### 問題：備份失敗
```bash
# 檢查磁盤空間
df -h

# 檢查目錄權限
ls -la backups/
```

## 腳本依賴

所有腳本需要以下工具：
- `bash`
- `docker`
- `docker-compose`
- `tar`
- `gzip`

監控腳本額外需要：
- `curl` (用於 API 健康檢查)

檢查依賴：
```bash
which bash docker docker-compose tar gzip curl
```

## 最佳實踐

1. **定期備份**
   - 設置每日自動備份
   - 在重要操作前手動備份
   - 定期測試恢復流程

2. **監控設置**
   - 使用 cron 定期執行監控腳本
   - 將監控日誌集成到現有監控系統
   - 設置告警通知

3. **更新策略**
   - 在低流量時段更新
   - 更新前先備份
   - 更新後驗證服務狀態

4. **安全考慮**
   - 限制腳本執行權限
   - 保護備份文件
   - 使用加密存儲敏感數據

## 進階用法

### 集成到 CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Deploy to server
        run: |
          ssh user@server "cd /app && ./scripts/docker-update.sh"
```

### 添加通知

修改 `docker-monitor.sh`，添加郵件或 Slack 通知：

```bash
# 添加到監控腳本末尾
if [ $EXIT_CODE -ne 0 ]; then
    # 發送郵件通知
    echo "Health check failed" | mail -s "Alert: Service Down" admin@example.com

    # 或發送 Slack 通知
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"Service health check failed!"}' \
        YOUR_SLACK_WEBHOOK_URL
fi
```

### 自定義監控指標

```bash
# 添加自定義檢查
CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" work-plan-calendar | sed 's/%//')
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log "WARNING: High CPU usage: ${CPU_USAGE}%"
fi
```

## 相關文檔

- [DOCKER_GUIDE.md](../DOCKER_GUIDE.md) - 完整的 Docker 使用指南
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 部署文檔
- [README.md](../README.md) - 項目說明

## 支持

如有問題或建議，請：
- 提交 GitHub Issue
- 查閱相關文檔
- 檢查腳本日誌輸出

---

**最後更新：2024-11-29**
