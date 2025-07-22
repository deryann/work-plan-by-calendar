# Work Plan Calendar - Docker 部署指南

## 概述

本文件說明如何使用 Docker 打包和部署 Work Plan Calendar 應用程式。應用程式支援外部 data 目錄掛載，確保使用者資料持久化保存。

## 系統需求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 512MB 可用記憶體
- 至少 100MB 可用磁碟空間

## 快速開始

### 1. 使用 Docker Compose (推薦)

```bash
# 克隆或下載專案
git clone <repository-url>
cd work-plan-by-calendar

# 啟動應用程式
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 2. 直接使用 Docker

```bash
# 建構映像檔
docker build -t work-plan-calendar .

# 執行容器
docker run -d \
  --name work-plan-calendar \
  -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  work-plan-calendar
```

## 存取應用程式

啟動成功後，您可以透過以下網址存取：

- **主要應用程式**: http://localhost:8000/
- **備用入口**: http://localhost:8000/app
- **靜態前端**: http://localhost:8000/frontend/
- **API 文件**: http://localhost:8000/docs
- **靜態檔案**: http://localhost:8000/static/

## 資料持久化

### Data 目錄結構

應用程式會將所有使用者資料儲存在 `data/` 目錄中：

```
data/
├── Year/           # 年度計畫 (YYYY.md)
├── Month/          # 月度計畫 (YYYYMM.md)
├── Week/           # 週計畫 (YYYYMMDD.md - 星期日日期)
└── Day/            # 日計畫 (YYYYMMDD.md)
```

### 資料備份

```bash
# 備份 data 目錄
cp -r data/ backup/data-$(date +%Y%m%d-%H%M%S)/

# 或使用 tar 壓縮
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz data/
```

### 資料還原

```bash
# 停止容器
docker-compose down

# 還原資料
cp -r backup/data-YYYYMMDD-HHMMSS/* data/

# 重新啟動
docker-compose up -d
```

## 進階配置

### 環境變數

在 `docker-compose.yml` 中可設定以下環境變數：

```yaml
environment:
  - PYTHONUNBUFFERED=1      # Python 輸出不緩衝
  - TZ=Asia/Taipei          # 時區設定
  - PORT=8000               # 服務埠號 (可選)
```

### 自訂埠號

修改 `docker-compose.yml` 中的埠號對應：

```yaml
ports:
  - "9000:8000"  # 將本機 9000 埠對應到容器 8000 埠
```

### 開發模式

若需要進行開發，可取消註解 `docker-compose.yml` 中的開發用 volume 設定：

```yaml
volumes:
  - ./data:/app/data
  - ./backend:/app/backend      # 開發模式：即時更新後端程式碼
  - ./frontend:/app/frontend    # 開發模式：即時更新前端程式碼
  - ./static:/app/static        # 開發模式：即時更新靜態檔案
```

## 維護操作

### 查看容器狀態

```bash
# 查看執行中的容器
docker-compose ps

# 查看容器詳細資訊
docker-compose logs work-plan-calendar

# 查看即時日誌
docker-compose logs -f work-plan-calendar
```

### 重啟服務

```bash
# 重啟服務
docker-compose restart

# 重新建構並啟動
docker-compose up --build -d
```

### 停止服務

```bash
# 停止服務 (保留容器)
docker-compose stop

# 完全停止並移除容器
docker-compose down

# 停止並移除容器、映像檔、volume
docker-compose down --rmi all --volumes
```

### 更新應用程式

```bash
# 拉取最新程式碼
git pull

# 重新建構並部署
docker-compose up --build -d

# 清理舊的映像檔
docker image prune
```

## 健康檢查

應用程式內建健康檢查機制：

- **檢查間隔**: 30 秒
- **超時時間**: 10 秒
- **重試次數**: 3 次
- **啟動等待**: 40 秒

可透過以下命令檢查健康狀態：

```bash
# 查看健康狀態
docker-compose ps

# 手動健康檢查
curl -f http://localhost:8000/api/health
```

## 故障排除

### 常見問題

1. **埠號衝突**
   ```bash
   # 檢查埠號使用情況
   netstat -tulpn | grep :8000
   
   # 修改 docker-compose.yml 中的埠號
   ```

2. **權限問題**
   ```bash
   # 確保 data 目錄權限正確
   chmod -R 755 data/
   chown -R $USER:$USER data/
   ```

3. **容器無法啟動**
   ```bash
   # 查看詳細錯誤訊息
   docker-compose logs work-plan-calendar
   
   # 重新建構映像檔
   docker-compose build --no-cache
   ```

4. **資料遺失**
   ```bash
   # 檢查 volume 掛載
   docker inspect work-plan-calendar | grep -A 10 Mounts
   
   # 確認 data 目錄存在
   ls -la data/
   ```

### 日誌收集

```bash
# 收集所有相關日誌
docker-compose logs > app-logs-$(date +%Y%m%d-%H%M%S).log

# 查看系統資源使用
docker stats work-plan-calendar
```

## 安全考量

1. **容器以非 root 使用者執行** (UID: 1000)
2. **僅暴露必要的埠號**
3. **資料目錄建議設定適當權限**
4. **定期更新基礎映像檔**

## 效能調優

### 記憶體設定

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### 建議的生產環境設定

```yaml
restart: unless-stopped
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 支援

如遇到問題，請檢查：

1. Docker 和 Docker Compose 版本
2. 系統資源是否充足
3. 埠號是否衝突
4. Data 目錄權限設定
5. 容器日誌訊息

如需協助，請提供完整的錯誤訊息和環境資訊。