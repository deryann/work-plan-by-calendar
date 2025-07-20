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

## 技術架構

### 後端 (Backend)
- **Python FastAPI**: REST API 服務
- **Pydantic**: 資料驗證與模型
- **檔案系統**: Markdown 檔案儲存

### 前端 (Frontend)  
- **HTML5 + JavaScript (ES6+)**: 純前端實作
- **TailwindCSS**: 美觀的 UI 設計
- **Marked.js**: Markdown 解析
- **Day.js**: 日期處理

## 快速開始

### 1. 安裝依賴
```bash
pip install -r requirements.txt
```

### 2. 啟動系統
```bash
python3 start_server.py
```

### 3. 訪問應用
- **主應用**: http://localhost:8000/frontend/
- **API 文檔**: http://localhost:8000/docs
- **健康檢查**: http://localhost:8000/api/health

## 檔案結構

```
project/
├── backend/                 # 後端 FastAPI 代碼
│   ├── main.py             # FastAPI 應用主檔
│   ├── models.py           # Pydantic 資料模型
│   ├── plan_service.py     # 業務邏輯服務
│   └── date_calculator.py  # 日期計算工具
├── frontend/               # 前端介面
│   └── index.html         # 主頁面
├── static/                # 靜態資源
│   ├── css/               # 樣式檔案
│   └── js/                # JavaScript 模組
├── data/                  # 計畫資料儲存
│   ├── Year/              # 年度計畫 (YYYY.md)
│   ├── Month/             # 月度計畫 (YYYYMM.md)
│   ├── Week/              # 週計畫 (YYYYMMDD.md, 周日日期)
│   └── Day/               # 日計畫 (YYYYMMDD.md)
├── generate_test_data.py  # 測試資料產生器
├── start_server.py        # 啟動腳本
└── requirements.txt       # Python 依賴
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
python3 generate_test_data.py
```

### 開發模式啟動
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
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