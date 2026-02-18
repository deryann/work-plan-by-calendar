# Implementation Plan: 資料匯出匯入功能

**Branch**: `001-data-export-import` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-data-export-import/spec.md`

<!--
  LANGUAGE REQUIREMENT: This implementation plan MUST be written in Traditional Chinese (zh-TW)
  per Constitution Principle V. Technical terms may use English where appropriate.
-->

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

在應用程式設定頁面新增資料匯出/匯入功能,讓使用者能夠備份和還原所有工作計畫資料。匯出功能將 `backend/data` 目錄壓縮為 ZIP 檔案;匯入功能驗證 ZIP 檔案格式後將資料寫入系統。採用最小變更策略,在現有的 FastAPI 後端新增兩個端點,在前端 settings-modal.js 新增 UI 按鈕和處理邏輯。

## Technical Context

**Language/Version**: Python 3.11+ (後端), ES6+ JavaScript (前端)
**Primary Dependencies**: FastAPI 0.104+ (現有), zipfile (Python 標準庫), File API (瀏覽器標準)
**Storage**: 檔案系統 (backend/data 目錄,現有結構)
**Testing**: pytest (後端現有), 手動測試 (前端)
**Target Platform**: Linux server (Docker 容器), 現代瀏覽器 (Chrome/Firefox/Safari)
**Project Type**: Web application (前後端分離)
**Performance Goals**: 匯出 <3 秒(含 1000 檔案), 驗證 <5 秒(含 1000 檔案), 下載回應 <100ms
**Constraints**: ZIP 檔案大小上限 100MB, 匯入需完整性驗證, 失敗需回滾
**Scale/Scope**: 單使用者場景, 預期資料量 <1000 個計畫檔案, 總大小 <10MB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality First (Principle I)
- ✅ **PASS**: 新增程式碼將遵循 PEP 8 (Python) 和 ES6+ 標準 (JavaScript)
- ✅ **PASS**: 函數複雜度控制在 15 以下,長度 <50 行
- ✅ **PASS**: 使用有意義的函數/變數名稱 (如 `export_data`, `validate_zip_structure`)
- ✅ **PASS**: 新增 Python 類型提示和 JavaScript JSDoc 註解
- ✅ **PASS**: 無重複程式碼,ZIP 操作封裝為獨立服務

### Testing Standards (Principle II)
- ✅ **PASS**: API 端點將有契約測試 (request/response schema)
- ✅ **PASS**: 主要功能有整合測試 (匯出完整性、驗證準確性)
- ✅ **PASS**: 邊界案例測試 (空目錄、錯誤格式、大檔案)
- ✅ **PASS**: 測試覆蓋率目標:後端 >80%

### User Experience Consistency (Principle III)
- ✅ **PASS**: 匯出/匯入操作提供即時反饋 (進度、成功/失敗訊息)
- ✅ **PASS**: 錯誤訊息友善且可操作 (列出具體檔案格式問題)
- ✅ **PASS**: 在設定頁面增加按鈕,符合現有 UI 風格
- ✅ **PASS**: 所有操作 <200ms 顯示載入狀態
- ✅ **PASS**: 使用現有 Utils.showLoading/showSuccess/showError 機制

### Performance Requirements (Principle IV)
- ✅ **PASS**: API 回應時間目標:匯出 <3s, 驗證 <5s (1000 檔案)
- ✅ **PASS**: 使用串流方式處理 ZIP,避免記憶體溢位
- ✅ **PASS**: 檔案 I/O 使用非同步模式 (async/await)
- ✅ **PASS**: 前端使用 Blob API 高效處理下載

### Language Standardization (Principle V)
- ✅ **PASS**: 本計畫文件使用繁體中文撰寫
- ✅ **PASS**: 使用者介面文字使用繁體中文
- ✅ **PASS**: 錯誤訊息使用繁體中文
- ✅ **PASS**: 程式碼註解關鍵業務邏輯使用繁體中文
- ✅ **PASS**: 變數/函數名稱使用英文

**Result**: 所有原則檢查通過,無違規需要解釋。

## Project Structure

### Documentation (this feature)

```text
specs/001-data-export-import/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── export-api.yaml  # 匯出 API OpenAPI 規格
│   └── import-api.yaml  # 匯入 API OpenAPI 規格
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── data/                # 現有:計畫資料目錄
│   ├── Day/
│   ├── Week/
│   ├── Month/
│   └── Year/
├── main.py              # 修改:新增匯出/匯入端點
├── models.py            # 修改:新增 ExportResponse, ImportValidation, ImportRequest 模型
├── plan_service.py      # 現有:不需修改
├── settings_service.py  # 現有:不需修改
└── data_export_service.py  # 新增:ZIP 匯出/匯入/驗證邏輯

static/
└── js/
    ├── settings-modal.js   # 修改:新增匯出/匯入 UI 和處理邏輯
    ├── api.js              # 修改:新增匯出/匯入 API 呼叫方法
    └── utils.js            # 現有:使用現有的 showLoading/showSuccess/showError

frontend/
└── index.html          # 修改:設定頁面新增匯出/匯入按鈕

tests/
├── test_data_export_service.py  # 新增:單元測試
└── test_export_import_api.py    # 新增:整合測試
```

**Structure Decision**: 採用現有的 Web application 結構 (frontend/ + backend/)。新增最少檔案,主要修改現有的 settings-modal.js 和 backend/main.py,新增一個獨立的 data_export_service.py 服務層處理 ZIP 操作。這樣可以保持程式碼模組化,遵循單一職責原則,並且不影響現有的計畫管理功能。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**無違規項目需要記錄** - 所有 Constitution 原則檢查均通過。

## Phase 0: Research Complete ✅

**研究文件**: [research.md](./research.md)

**已解決的技術問題**:
1. ✅ Python zipfile 標準庫最佳實踐
2. ✅ Zip Slip 漏洞防護策略
3. ✅ 檔案格式驗證方法 (檔名、日期、星期)
4. ✅ 原子性操作與回滾機制
5. ✅ 記憶體效率處理 (串流模式)

**關鍵決策**:
- 使用 `zipfile` 標準庫,無需額外依賴
- 採用臨時目錄 + 原子性移動確保資料一致性
- 多層驗證機制:結構 → 檔名 → 日期 → 星期
- 串流處理避免記憶體問題

## Phase 1: Design Complete ✅

**設計文件**:
- [data-model.md](./data-model.md) - 資料模型定義
- [quickstart.md](./quickstart.md) - 快速開始指南
- [contracts/export-api.yaml](./contracts/export-api.yaml) - 匯出 API 規格
- [contracts/import-api.yaml](./contracts/import-api.yaml) - 匯入 API 規格

**核心資料模型**:
1. `ExportResponse` - 匯出操作回應
2. `ImportValidation` - 匯入驗證結果
3. `ImportSuccessResponse` - 匯入成功回應
4. `ValidationError` - 驗證錯誤詳情

**API 端點設計**:
1. `POST /api/export/create` - 建立匯出檔案
2. `GET /api/export/download/{filename}` - 下載匯出檔案
3. `POST /api/import/validate` - 驗證匯入檔案
4. `POST /api/import/execute` - 執行匯入操作

**Agent Context**: ✅ 已更新 `.github/copilot-instructions.md`

## Constitution Re-Check (Post-Design) ✅

重新評估設計階段後的 Constitution 符合性:

### Code Quality First (Principle I)
- ✅ **PASS**: 設計採用服務層分離 (data_export_service.py),遵循單一職責原則
- ✅ **PASS**: API 端點職責明確,每個端點處理單一操作
- ✅ **PASS**: 資料模型使用 Pydantic,提供自動驗證和型別安全

### Testing Standards (Principle II)
- ✅ **PASS**: API 契約已定義 (OpenAPI 規格),可自動生成測試
- ✅ **PASS**: 驗證邏輯獨立,易於單元測試
- ✅ **PASS**: 設計考慮各種邊界案例 (詳見 data-model.md 測試策略)

### User Experience Consistency (Principle III)
- ✅ **PASS**: 錯誤訊息結構化且友善 (ValidationError 模型)
- ✅ **PASS**: 操作流程清楚:驗證 → 確認 → 匯入
- ✅ **PASS**: 使用現有 UI 元件和樣式模式

### Performance Requirements (Principle IV)
- ✅ **PASS**: 設計使用串流處理,避免記憶體問題
- ✅ **PASS**: API 回應結構精簡,僅傳遞必要資訊
- ✅ **PASS**: 檔案大小限制明確 (100MB)

### Language Standardization (Principle V)
- ✅ **PASS**: 所有設計文件使用繁體中文
- ✅ **PASS**: API 錯誤訊息使用繁體中文
- ✅ **PASS**: 資料模型欄位說明使用繁體中文

**結果**: 設計階段所有原則檢查通過,無新增違規項目。

## Next Steps

Phase 2 (任務分解) 將由 `/speckit.tasks` 命令執行:
- 將設計轉換為可執行的任務清單
- 定義實作順序和依賴關係
- 設定驗收標準和測試計畫

執行命令: `/speckit.tasks`

````
