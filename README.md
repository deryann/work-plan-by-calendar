# 工作計畫日曆系統 (Work Plan Calendar System)

一個基於日曆時間組織的個人工作計畫管理系統，支援年度、月度、週度、日度四個層級的計畫管理。

## 特色功能

- 📅 **階層式計畫管理**: 年/月/週/日四個時間層級
- 📝 **Markdown 編輯**: 支援語法高亮的 Markdown 編輯器
- 🔄 **即時預覽**: 編輯與預覽模式即時切換
- 💾 **自動儲存**: 3秒無操作自動儲存
- 📋 **內容複製**: 歷史計畫內容可複製到當期
- 🎨 **響應式設計**: 支援桌面和移動裝置
- ⌨️ **快捷鍵**: 豐富的鍵盤快捷鍵支援
- 🖥️ **面板最大化**: 雙擊面板標題可全螢幕專注編輯
- ☁️ **Google Drive 同步**: 可選擇將資料儲存至 Google Drive（v0.2.0 新增）
- 📦 **資料匯出/匯入**: 支援 ZIP 格式的資料備份與還原

## 技術架構

### 後端 (Backend)
- **Python FastAPI**: REST API 服務
- **Pydantic**: 資料驗證與模型
- **檔案系統 / Google Drive**: 雙重儲存模式
- **Google API**: Google Drive 整合 (可選)

### 前端 (Frontend)  
- **HTML5 + JavaScript (ES6+)**: 純前端實作
- **TailwindCSS**: 美觀的 UI 設計
- **Marked.js**: Markdown 解析
- **Day.js**: 日期處理
- **Google Identity Services**: Google 登入整合 (可選)

## 開發環境設置

### 前置需求
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python 套件管理工具)

### 安裝 uv
```bash
# 在 macOS 和 Linux 上使用 curl
curl -LsSf https://astral.sh/uv/install.sh | sh

# 或使用 pip 安裝
pip install uv
```

### 1. 建立虛擬環境並安裝依賴
```bash
# 同步依賴並建立虛擬環境
uv sync

# 或者手動建立虛擬環境並安裝依賴
uv venv
source .venv/bin/activate  # Linux/macOS
# 或 .venv\Scripts\activate  # Windows
uv pip install -e .
```

### 2. 啟動系統
```bash
# 使用 uv 執行
uv run python start_server.py

# 或在虛擬環境中執行
source .venv/bin/activate
python start_server.py
```

### 3. 訪問應用
- **主應用**: http://localhost:8000/frontend/
- **API 文檔**: http://localhost:8000/docs
- **健康檢查**: http://localhost:8000/api/health

## Google Drive 設定 (選擇性)

若要啟用 Google Drive 儲存功能，需要進行以下設定：

### 1. Google Cloud Console 設定
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google Drive API**
4. 建立 **OAuth 2.0 用戶端憑證** (網頁應用程式類型)
5. 設定已授權的 JavaScript 來源：`http://localhost:8000`
6. 設定已授權的重新導向 URI：`http://localhost:8000/frontend/`

### 2. 環境變數設定
```bash
# 複製環境變數範例檔
cp .env.example .env

# 編輯 .env 填入您的 Google OAuth 憑證
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# 選擇性：自訂 Token 加密金鑰（將自動生成）
# GOOGLE_TOKEN_ENCRYPTION_KEY=your-encryption-key
```

### 3. 在應用中連結 Google 帳號
1. 點擊右上角設定圖示 ⚙️
2. 在「儲存設定」區塊點擊「連結 Google 帳號」
3. 完成 Google 授權流程
4. 設定 Google Drive 儲存路徑（預設為 `WorkPlanCalendar`）
5. 將儲存模式切換為「Google Drive」
6. 點擊「測試連線」確認設定正確

詳細設定說明請參考 [docs/google-cloud-setup.md](docs/google-cloud-setup.md)。

## 檔案結構

```
project/
├── backend/                 # 後端 FastAPI 代碼
│   ├── main.py             # FastAPI 應用主檔
│   ├── models.py           # Pydantic 資料模型
│   ├── plan_service.py     # 業務邏輯服務
│   ├── settings_service.py # 設定管理服務
│   ├── google_auth_service.py # Google OAuth 服務
│   ├── date_calculator.py  # 日期計算工具
│   └── storage/            # 儲存抽象層
│       ├── base.py         # StorageProvider 介面
│       ├── local.py        # 本地檔案儲存實作
│       └── google_drive.py # Google Drive 儲存實作
├── frontend/               # 前端介面
│   └── index.html         # 主頁面
├── static/                # 靜態資源
│   ├── css/               # 樣式檔案
│   └── js/                # JavaScript 模組
├── data/                  # 計畫資料儲存
│   ├── Year/              # 年度計畫 (YYYY.md)
│   ├── Month/             # 月度計畫 (YYYYMM.md)
│   ├── Week/              # 週計畫 (YYYYMMDD.md, 周日日期)
│   ├── Day/               # 日計畫 (YYYYMMDD.md)
│   └── settings/          # 設定檔 (含加密的 Google 授權)
├── docs/                  # 文件
│   └── google-cloud-setup.md  # Google Cloud 設定指南
├── tests/                 # 測試檔案
├── generate_test_data.py  # 測試資料產生器
├── start_server.py        # 啟動腳本
├── pyproject.toml         # 專案設定與依賴
└── .env.example           # 環境變數範例
```

## API 端點

### 計畫 CRUD
- `GET /api/plans/{plan_type}/{date}` - 取得計畫
- `POST /api/plans/{plan_type}/{date}` - 建立計畫
- `PUT /api/plans/{plan_type}/{date}` - 更新計畫
- `DELETE /api/plans/{plan_type}/{date}` - 刪除計畫

### 導航功能
- `GET /api/plans/{plan_type}/{date}/previous` - 前一期計畫
- `GET /api/plans/{plan_type}/{date}/next` - 後一期計畫
- `GET /api/plans/all/{date}` - 指定日期所有計畫

### 其他功能
- `POST /api/plans/copy` - 複製計畫內容
- `GET /api/plans/{plan_type}/{date}/exists` - 檢查計畫存在
- `GET /api/health` - 健康檢查

### Google 帳號授權
- `GET /api/auth/google/status` - 取得 Google 授權狀態
- `GET /api/auth/google/authorize` - 取得 OAuth 授權 URL
- `POST /api/auth/google/callback` - 處理 OAuth 授權回調
- `POST /api/auth/google/logout` - 登出 Google 帳號
- `POST /api/auth/google/refresh` - 刷新 Token

### 儲存模式設定
- `GET /api/storage/status` - 取得儲存狀態
- `PUT /api/storage/mode` - 切換儲存模式
- `PUT /api/storage/google-drive-path` - 設定 Google Drive 路徑
- `POST /api/storage/test-connection` - 測試 Google Drive 連線

### 資料匯出/匯入
- `GET /api/export` - 匯出所有資料為 ZIP
- `POST /api/import` - 從 ZIP 匯入資料

## 使用說明

### 基本操作
1. **選擇日期**: 使用頂部日期選擇器切換目標日期
2. **編輯計畫**: 點擊任意面板進入編輯模式
3. **預覽內容**: 點擊預覽按鈕查看 Markdown 渲染結果
4. **儲存變更**: 系統自動儲存，或使用 Ctrl+S 手動儲存
5. **導航時期**: 使用左右箭頭按鈕切換不同時期

### 快捷鍵
- `Ctrl + S`: 儲存所有修改的面板
- `Ctrl + E`: 切換編輯/預覽模式
- `Ctrl + ]`: 摺疊/展開面板
- `Ctrl + ←/→`: 導航到前一期/後一期
- `Ctrl + \\`: 切換左側面板顯示/隱藏
- `Alt + ←/→`: 切換日期

### 面板功能
- **摺疊**: 點擊摺疊按鈕最小化面板
- **複製**: 歷史計畫可複製內容到當期計畫
- **導航**: 使用前後按鈕切換不同時期的計畫

## 資料格式

### 檔案命名規則
- **年度計畫**: `2025.md`
- **月度計畫**: `202507.md`
- **週計畫**: `20250629.md` (該週周日日期)
- **日計畫**: `20250702.md`

### Markdown 標題格式
- **年度**: `# 2025 年度計畫`
- **月度**: `# 2025-07 月度計畫`
- **週度**: `# 2025-06-29~2025-07-05 週計畫`
- **日度**: `# 2025-07-02 日計畫`

## 開發相關

### 產生測試資料
```bash
# 使用 uv 執行
uv run python generate_test_data.py

# 或在虛擬環境中執行
source .venv/bin/activate
python generate_test_data.py
```

### 開發模式啟動
```bash
# 使用 uv 執行開發模式
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# 或在虛擬環境中執行
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 常用 uv 指令
```bash
# 建立虛擬環境
uv venv

# 安裝套件
uv add <package_name>

# 安裝開發依賴
uv add --dev <package_name>

# 執行 Python 腳本
uv run python script.py

# 同步專案依賴
uv sync

# 檢查過時的套件
uv tree
```

### 專案規格
詳細的技術規格請參考 `detail_spec/` 目錄下的文件：
- `01_data_structure_design.md` - 資料結構設計
- `02_backend_api_design.md` - 後端 API 設計  
- `03_frontend_ui_design.md` - 前端 UI 設計
- `04_test_data_specification.md` - 測試資料規劃

## 授權

本專案採用 MIT 授權條款。

## 貢獻

歡迎提交 Issue 和 Pull Request 來改善這個專案！