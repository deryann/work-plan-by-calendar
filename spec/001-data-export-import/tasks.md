# Tasks: 資料匯出匯入功能

**Input**: Design documents from `/specs/001-data-export-import/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

<!--
  LANGUAGE REQUIREMENT: Task descriptions use Traditional Chinese (zh-TW) for clarity
  per Constitution Principle V. Technical terms and file paths use English as needed.
-->

**Tests**: 本規格未明確要求 TDD,因此測試任務為選填,於實作後驗證功能正確性。

**Organization**: 任務按使用者故事分組,使每個故事都能獨立實作和測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行 (不同檔案,無相依性)
- **[Story]**: 此任務屬於哪個使用者故事 (例如 US1, US2, US3)
- 描述中包含確切的檔案路徑

## Path Conventions

本專案為 Web application,路徑結構:
- **後端**: `backend/` (main.py, models.py, data_export_service.py)
- **前端**: `static/js/`, `frontend/`
- **測試**: `tests/`

---

## Phase 1: Setup (共用基礎設施)

**目的**: 確認專案環境和依賴項已就緒

- [x] T001 確認 Python 3.11+ 和 FastAPI 0.104+ 環境已設置
- [x] T002 確認前端可存取 backend/data 目錄結構 (Day/Week/Month/Year)
- [x] T003 [P] 確認現有的 Utils.showLoading/showSuccess/showError 函數可用

**檢查點**: ✅ 環境就緒,可開始實作

---

## Phase 2: Foundational (阻塞性前置條件)

**目的**: 必須在任何使用者故事之前完成的核心基礎建設

**⚠️ 重要**: 在此階段完成前,任何使用者故事都無法開始

- [x] T004 在 backend/models.py 新增 ErrorType Enum (structure/filename/date/weekday/size)
- [x] T005 [P] 在 backend/models.py 新增 ValidationError 模型 (error_type, file_path, message, details)
- [x] T006 [P] 在 backend/models.py 新增 ImportValidation 模型 (is_valid, errors, warnings, file_count, validated_at)
- [x] T007 [P] 在 backend/models.py 新增 ExportResponse 模型 (filename, file_size, created_at, file_count, download_url)
- [x] T008 [P] 在 backend/models.py 新增 ImportSuccessResponse 模型 (success, message, file_count, overwritten_count, imported_at)
- [x] T009 建立 backend/data_export_service.py 檔案框架和基本匯入

**檢查點**: ✅ 基礎模型和服務檔案已建立 - 使用者故事實作現在可以開始

---

## Phase 3: User Story 1 - 匯出工作計畫資料 (Priority: P1) 🎯 MVP

**目標**: 使用者能在設定頁面點擊匯出按鈕,下載包含所有計畫資料的 ZIP 檔案

**獨立測試**: 點擊設定頁面的匯出按鈕 → 瀏覽器下載 export_data_{timestamp}.zip → 解壓縮驗證包含完整的 Day/Week/Month/Year 目錄結構

### 後端實作 (User Story 1)

- [ ] T010 [P] [US1] 在 backend/data_export_service.py 實作 create_export_zip() 函數
  - 使用 zipfile 遞迴壓縮 backend/data 目錄
  - 回傳 (zip_path, file_count) tuple
  - 檔名格式: export_data_{YYYYMMDD_HHMMSS}.zip
- [ ] T011 [P] [US1] 在 backend/data_export_service.py 實作 Zip Slip 防護邏輯
  - 使用 Path.resolve() 驗證解壓路徑
  - 確保所有檔案解壓到預期目錄內
- [ ] T012 [US1] 在 backend/main.py 新增 POST /api/export/create 端點
  - 呼叫 create_export_zip()
  - 建立 ExportResponse 並回傳
  - 處理錯誤情況 (目錄不存在、磁碟空間不足)
- [ ] T013 [US1] 在 backend/main.py 新增 GET /api/export/download/{filename} 端點
  - 驗證檔名格式 (防止路徑穿越)
  - 使用 FileResponse 回傳 ZIP 檔案
  - 設定 Content-Disposition header

### 前端整合 (User Story 1)

- [ ] T014 [P] [US1] 在 static/js/api.js 新增 exportData() 方法
  - POST /api/export/create
  - 回傳 ExportResponse JSON
- [ ] T015 [P] [US1] 在 static/js/api.js 新增 downloadExport(filename) 方法
  - 觸發瀏覽器下載 GET /api/export/download/{filename}
- [ ] T016 [US1] 在 static/js/settings-modal.js 新增 handleExport() 方法
  - 呼叫 Utils.showLoading('正在匯出資料...')
  - 呼叫 API.exportData()
  - 成功時呼叫 API.downloadExport() 觸發下載
  - 呼叫 Utils.showSuccess() 顯示檔案數量
  - 錯誤時呼叫 Utils.showError()
- [ ] T017 [US1] 在 static/js/settings-modal.js 新增 initExportUI() 方法
  - 在設定頁面新增「匯出資料」按鈕
  - 綁定 click 事件到 handleExport()
  - 確保按鈕樣式符合現有 UI 風格

### 驗證 (User Story 1)

- [ ] T018 [US1] 手動測試:空資料目錄的匯出行為
- [ ] T019 [US1] 手動測試:包含 100+ 檔案的匯出和下載
- [ ] T020 [US1] 手動測試:解壓縮 ZIP 驗證目錄結構完整性

**檢查點**: User Story 1 應完全可用且可獨立測試 - 使用者能成功匯出和下載資料

---

## Phase 4: User Story 2 - 匯入工作計畫資料前的格式驗證 (Priority: P1)

**目標**: 使用者上傳 ZIP 檔案後,系統驗證格式並顯示詳細的錯誤或警告訊息

**獨立測試**: 準備包含格式錯誤的測試 ZIP 檔案 (例如檔名 2025130.md, Week/20251020.md 非星期日) → 上傳 → 系統顯示具體錯誤訊息並阻止匯入

### 後端驗證邏輯 (User Story 2)

- [ ] T021 [P] [US2] 在 backend/data_export_service.py 實作 validate_zip_structure() 函數
  - 檢查 ZIP 是否包含 Day/Week/Month/Year 目錄
  - 回傳缺少的目錄清單
- [ ] T022 [P] [US2] 在 backend/data_export_service.py 實作 validate_filename() 函數
  - 使用正則表達式驗證 YYYYMMDD.md / YYYYMM.md / YYYY.md 格式
  - 驗證日期有效性 (使用 datetime)
  - 回傳 True/False 和錯誤訊息
- [ ] T023 [P] [US2] 在 backend/data_export_service.py 實作 validate_weekday() 函數
  - 檢查日期是否為星期日 (weekday() == 6)
  - 回傳 True/False 和錯誤訊息
- [ ] T024 [US2] 在 backend/data_export_service.py 實作 validate_zip_file() 函數
  - 整合 validate_zip_structure, validate_filename, validate_weekday
  - 遍歷 ZIP 中所有檔案進行驗證
  - 建立 ValidationError 清單
  - 回傳 ImportValidation 模型
  - 處理檔案大小限制 (100MB)
- [ ] T025 [US2] 在 backend/main.py 新增 POST /api/import/validate 端點
  - 接收 multipart/form-data (UploadFile)
  - 儲存到臨時目錄
  - 呼叫 validate_zip_file()
  - 回傳 ImportValidation JSON
  - 清理臨時檔案

### 前端驗證整合 (User Story 2)

- [ ] T026 [P] [US2] 在 static/js/api.js 新增 validateImport(file) 方法
  - 建立 FormData 包含檔案
  - POST /api/import/validate
  - 回傳 ImportValidation JSON
- [ ] T027 [US2] 在 static/js/settings-modal.js 新增 showValidationErrors(errors) 方法
  - 格式化 ValidationError 陣列為友善訊息
  - 使用 alert 或自訂 modal 顯示錯誤清單
- [ ] T028 [US2] 在 static/js/settings-modal.js 新增 handleImportValidation(file) 方法
  - 呼叫 Utils.showLoading('正在驗證檔案格式...')
  - 呼叫 API.validateImport(file)
  - 若 is_valid=false,呼叫 showValidationErrors()
  - 若 is_valid=true,回傳驗證結果供後續使用
- [ ] T029 [US2] 在 static/js/settings-modal.js 新增匯入檔案選擇 UI
  - 新增 <input type="file" accept=".zip"> 元素
  - 新增「匯入資料」按鈕觸發檔案選擇
  - 檔案選擇後呼叫 handleImportValidation()

### 驗證 (User Story 2)

- [ ] T030 [US2] 建立測試資料:invalid_filename.zip (包含 2025130.md)
- [ ] T031 [US2] 建立測試資料:invalid_weekday.zip (Week/20251020.md 非星期日)
- [ ] T032 [US2] 建立測試資料:invalid_date.zip (包含 20251301.md)
- [ ] T033 [US2] 建立測試資料:missing_structure.zip (缺少 Year 目錄)
- [ ] T034 [US2] 建立測試資料:valid.zip (完全符合格式)
- [ ] T035 [US2] 手動測試:上傳各種錯誤格式 ZIP,驗證錯誤訊息正確性
- [ ] T036 [US2] 手動測試:上傳正確格式 ZIP,驗證通過訊息

**檢查點**: User Story 1 和 2 應都能獨立工作 - 使用者能匯出資料並驗證匯入檔案格式

---

## Phase 5: User Story 3 - 確認並執行資料匯入 (Priority: P2)

**目標**: 驗證通過後,使用者確認匯入,系統將資料寫入 backend/data 並支援回滾

**獨立測試**: 準備正確格式的 ZIP → 上傳驗證通過 → 確認匯入 → 檢查 backend/data 目錄包含新資料 → 測試失敗回滾機制

### 後端匯入執行 (User Story 3)

- [ ] T037 [P] [US3] 在 backend/data_export_service.py 實作 backup_current_data() 函數
  - 建立 backend/data 的臨時備份
  - 回傳備份目錄路徑
- [ ] T038 [P] [US3] 在 backend/data_export_service.py 實作 restore_backup(backup_path) 函數
  - 從備份還原 backend/data
  - 清理失敗的部分匯入資料
- [ ] T039 [P] [US3] 在 backend/data_export_service.py 實作 safe_extract_member() 函數
  - 安全解壓單一檔案 (防止 Zip Slip)
  - 使用 Path.resolve() 驗證路徑
- [ ] T040 [US3] 在 backend/data_export_service.py 實作 execute_import() 函數
  - 先呼叫 validate_zip_file() 確認格式
  - 若驗證失敗,回傳 400 錯誤
  - 建立備份 (backup_current_data)
  - 解壓 ZIP 到臨時目錄
  - 逐一移動檔案到 backend/data (覆蓋同名檔案)
  - 計數覆蓋的檔案數量
  - 錯誤時呼叫 restore_backup() 回滾
  - 回傳 ImportSuccessResponse
- [ ] T041 [US3] 在 backend/main.py 新增 POST /api/import/execute 端點
  - 接收 multipart/form-data (UploadFile)
  - 呼叫 execute_import()
  - 處理例外並確保回滾
  - 回傳 ImportSuccessResponse 或錯誤訊息

### 前端匯入執行 (User Story 3)

- [ ] T042 [P] [US3] 在 static/js/api.js 新增 executeImport(file) 方法
  - 建立 FormData 包含檔案
  - POST /api/import/execute
  - 回傳 ImportSuccessResponse JSON
- [ ] T043 [US3] 在 static/js/settings-modal.js 修改 handleImportValidation() 方法
  - 驗證通過後顯示確認對話框
  - 提醒:「將匯入 X 個檔案,同名檔案將被覆蓋,建議先匯出備份」
  - 使用者確認後呼叫 executeImport()
- [ ] T044 [US3] 在 static/js/settings-modal.js 新增 handleImportComplete(result) 方法
  - 顯示成功訊息:「成功匯入 X 個檔案 (覆蓋 Y 個)」
  - 詢問是否重新整理頁面查看新資料
  - 使用者確認後執行 location.reload()

### 驗證 (User Story 3)

- [ ] T045 [US3] 手動測試:匯入正確格式的 ZIP,驗證資料寫入 backend/data
- [ ] T046 [US3] 手動測試:匯入包含同名檔案的 ZIP,驗證覆蓋行為
- [ ] T047 [US3] 手動測試:模擬匯入失敗 (如磁碟空間不足),驗證回滾機制
- [ ] T048 [US3] 手動測試:匯入後重新整理頁面,確認新資料正確顯示

**檢查點**: User Story 1, 2, 3 應都能獨立工作 - 完整的匯出/驗證/匯入流程可運作

---

## Phase 6: User Story 4 - 匯入後資料驗證 (Priority: P3)

**目標**: 匯入完成後,使用者能在應用程式中檢視新匯入的計畫

**獨立測試**: 匯入包含特定日期 (如 20251030.md) 的 ZIP → 在應用程式中導航到該日期 → 驗證計畫內容正確顯示

**注意**: 此故事主要依賴現有的計畫檢視功能,無需新增程式碼,僅需驗證整合

### 驗證 (User Story 4)

- [ ] T049 [US4] 建立測試資料:包含特定日期計畫的 ZIP (如 Day/20251030.md, Week/20251027.md, Month/202510.md)
- [ ] T050 [US4] 手動測試:匯入測試 ZIP 後導航到各個日期
- [ ] T051 [US4] 手動測試:驗證日/周/月/年計畫都能正確顯示
- [ ] T052 [US4] 手動測試:驗證匯入的 markdown 內容格式正確

**檢查點**: 所有使用者故事現在應完全可用且獨立可測試

---

## Phase 7: Polish & Cross-Cutting Concerns

**目的**: 影響多個使用者故事的改進和優化

- [ ] T053 [P] 在 backend/data_export_service.py 新增完整的型別提示和 docstrings
- [ ] T054 [P] 在 static/js/ 檔案新增 JSDoc 註解
- [ ] T055 為所有 API 端點新增操作日誌 (記錄到 backend logs)
- [ ] T056 [P] 程式碼審查:確認符合 PEP 8 (Python) 和 ES6+ (JavaScript) 標準
- [ ] T057 [P] 程式碼審查:確認函數複雜度 <15,長度 <50 行
- [ ] T058 效能測試:匯出 1000 個檔案 <3 秒
- [ ] T059 效能測試:驗證 1000 個檔案 <5 秒
- [ ] T060 [P] 安全審查:確認所有路徑穿越防護已實作
- [ ] T061 [P] 執行 quickstart.md 中的所有驗證場景
- [ ] T062 更新 README.md 或使用者文件說明匯出/匯入功能

### 選填:單元測試 (如需要更高測試覆蓋率)

- [ ] T063 [P] 建立 tests/test_data_export_service.py
  - 測試 validate_filename() 各種格式
  - 測試 validate_weekday() 日期判斷
  - 測試 validate_zip_structure()
- [ ] T064 [P] 建立 tests/test_export_import_api.py
  - 測試 /api/export/create 端點
  - 測試 /api/import/validate 端點
  - 測試 /api/import/execute 端點
- [ ] T065 執行 pytest 並確認測試覆蓋率 >80%

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻塞所有使用者故事**
- **User Stories (Phase 3-6)**: 都依賴 Foundational 階段完成
  - US1, US2 可平行開始 (都是 P1 優先級)
  - US3 建議在 US2 後執行 (需要驗證功能)
  - US4 依賴 US3 完成
- **Polish (Phase 7)**: 依賴所有所需的使用者故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 後可開始 - 無其他故事相依性 ✅ 獨立
- **User Story 2 (P1)**: Foundational 後可開始 - 無其他故事相依性 ✅ 獨立
- **User Story 3 (P2)**: 建議 US2 完成後開始 (使用驗證邏輯) - 技術上可獨立但整合更好
- **User Story 4 (P3)**: 依賴 US3 完成 - 驗證匯入後的資料顯示

### Within Each User Story

每個故事內部的執行順序:
1. 後端模型和服務函數 (可平行)
2. API 端點 (依賴服務函數)
3. 前端 API 呼叫方法 (可平行)
4. 前端 UI 和事件處理 (依賴 API 方法)
5. 手動測試和驗證

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 可平行
- **Phase 2**: T005-T008 (所有模型) 可平行
- **Phase 3 (US1)**: T010, T011, T014, T015 可平行
- **Phase 4 (US2)**: T021, T022, T023, T026, T030-T034 可平行
- **Phase 5 (US3)**: T037, T038, T039, T042 可平行
- **Phase 7**: T053, T054, T056, T057, T060, T061, T063, T064 可平行

**如有多位開發者**:
- Foundational 完成後:
  - 開發者 A: User Story 1 (匯出)
  - 開發者 B: User Story 2 (驗證)
  - 開發者 C: 準備測試資料和文件
- US1 和 US2 完成後:
  - 開發者 A 或 B: User Story 3 (匯入執行)

---

## Parallel Example: User Story 1

```bash
# 可同時啟動的任務 (不同檔案,無相依性):
Task T010: "實作 create_export_zip() in backend/data_export_service.py"
Task T011: "實作 Zip Slip 防護 in backend/data_export_service.py"
Task T014: "新增 exportData() in static/js/api.js"
Task T015: "新增 downloadExport() in static/js/api.js"

# 等待上述完成後:
Task T012: "新增 POST /api/export/create in backend/main.py"
Task T013: "新增 GET /api/export/download in backend/main.py"
Task T016: "新增 handleExport() in static/js/settings-modal.js"
Task T017: "新增 initExportUI() in static/js/settings-modal.js"
```

---

## Implementation Strategy

### MVP First (僅 User Story 1 和 2)

建議的 MVP 範圍:
1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (重要 - 阻塞所有故事)
3. 完成 Phase 3: User Story 1 (匯出)
4. 完成 Phase 4: User Story 2 (驗證)
5. **停止並驗證**: 測試匯出和驗證功能
6. 部署/展示 MVP

此時使用者已能:
- ✅ 匯出所有計畫資料
- ✅ 驗證匯入檔案格式
- ⏳ 實際匯入功能待 US3

### Incremental Delivery

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 → 獨立測試 → 部署 (使用者能匯出備份!)
3. 新增 User Story 2 → 獨立測試 → 部署 (使用者能驗證檔案!)
4. 新增 User Story 3 → 獨立測試 → 部署 (完整匯入功能!)
5. 新增 User Story 4 → 獨立測試 → 部署 (驗證整合!)
6. 每個故事都增加價值且不破壞先前故事

### Parallel Team Strategy

如有多位開發者:
1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後:
   - 開發者 A: User Story 1 (T010-T020)
   - 開發者 B: User Story 2 (T021-T036)
   - 開發者 C: 測試資料準備和文件
3. 故事獨立完成並整合

---

## Summary

- **總任務數**: 65 個任務
- **User Story 1**: 11 個任務 (T010-T020)
- **User Story 2**: 17 個任務 (T021-T036)
- **User Story 3**: 12 個任務 (T037-T048)
- **User Story 4**: 4 個任務 (T049-T052)
- **平行機會**: 約 30 個任務標記 [P],可平行執行
- **建議 MVP 範圍**: Phase 1-4 (Setup + Foundational + US1 + US2)

**格式驗證**: ✅ 所有任務遵循清單格式 (checkbox, ID, 標籤, 檔案路徑)

**獨立測試標準**:
- ✅ US1: 可獨立測試匯出功能
- ✅ US2: 可獨立測試驗證功能  
- ✅ US3: 可獨立測試匯入功能 (建基於 US2)
- ✅ US4: 可獨立測試資料顯示 (建基於 US3)

---

## Notes

- [P] 任務 = 不同檔案,無相依性,可平行執行
- [Story] 標籤將任務對應到特定使用者故事,便於追蹤
- 每個使用者故事都應可獨立完成和測試
- 在每個檢查點停下來驗證故事獨立性
- 在實作前先確認測試失敗 (如有編寫測試)
- 完成每個任務或邏輯群組後提交 commit
- 避免:模糊任務、同檔案衝突、破壞故事獨立性的跨故事相依性
