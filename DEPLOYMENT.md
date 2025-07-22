# 工作計畫日曆系統 - 部署指南

## 📋 概述

此文檔說明如何部署工作計畫日曆系統，包括新增的截圖展示功能。

## 🐳 Docker 部署 (推薦)

### 快速開始

```bash
# 1. 複製專案
git clone <repository-url>
cd work-plan-by-calendar

# 2. 建置 Docker 映像
docker build -t work-plan-calendar:latest .

# 3. 運行容器
docker run -p 8000:8000 -v $(pwd)/data:/app/data work-plan-calendar:latest
```

### 使用 Docker Compose

```bash
# 1. 設定環境變數 (選用)
export IMAGE_TAG=latest
export GIT_COMMIT_HASH=$(git rev-parse HEAD)

# 2. 啟動服務
docker-compose up -d
```

## 🌐 應用程式訪問點

### 主要功能
- **主應用程式：** http://localhost:8000/
- **API 文檔：** http://localhost:8000/docs

### 新增功能 (v2.0+)
- **📸 截圖展示頁面：** http://localhost:8000/snapshot/
- **⚙️ 設定測試工具：** http://localhost:8000/snapshot/settings_test.html

### 開發者工具
- **健康檢查：** http://localhost:8000/api/health
- **設定 API：** http://localhost:8000/api/settings/ui

## 📁 目錄結構

```
work-plan-calendar/
├── backend/           # FastAPI 後端
├── frontend/          # HTML/JS 前端
├── static/            # 靜態資源
├── snapshot/          # 截圖展示 (新增)
│   ├── index.html     # 截圖展示頁面
│   └── *.png         # 應用程式截圖
├── data/             # 資料儲存
└── Dockerfile        # Docker 建置檔案
```

## 💾 資料持久化

系統會自動將 `./data` 目錄掛載到容器內，包含計畫檔案和使用者設定。

## 🔍 故障排除

### 常見問題

1. **無法訪問截圖頁面** - 確認 Docker 映像包含 snapshot 目錄
2. **設定無法儲存** - 檢查 data 目錄權限

### 除錯命令

```bash
# 檢查應用程式日誌
docker-compose logs -f work-plan-calendar

# 測試 API 連線
curl http://localhost:8000/api/health
```