# Feature Specification: 本地與 Google Drive 差異比較與同步

**Feature Branch**: `sync-files`
**Created**: 2026-02-19
**Status**: Draft
**Input**: GitHub Issue #19 - 使用雲端登入後，可以有一個檢查地端雲端相異檔案的按鈕

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 開啟同步管理面板 (Priority: P1)

使用者已登入 Google 帳號，在設定頁面找到「同步管理」功能入口，點擊後開啟獨立的同步管理 Overlay 面板。

**Why this priority**: 這是所有同步功能的入口，必須在登入狀態下才可見，確保功能可及性。

**Independent Test**: 可獨立測試按鈕的顯示邏輯：登入時出現、未登入時隱藏。

**Acceptance Scenarios**:

1. **Given** 使用者已登入 Google 且在設定頁面, **When** 使用者查看 Google Drive 區塊, **Then** 顯示「同步管理」按鈕
2. **Given** 使用者未登入 Google, **When** 使用者開啟設定頁面, **Then** 不顯示「同步管理」按鈕
3. **Given** 使用者點擊「同步管理」按鈕, **When** 按鈕被點擊, **Then** 同步管理 Overlay 面板開啟，覆蓋在現有頁面上
4. **Given** 同步管理面板已開啟, **When** 使用者點擊 ✕ 或按 Escape, **Then** 面板關閉，回到設定頁面

---

### User Story 2 - 切換至 Google Drive 模式時自動比較 (Priority: P2)

使用者在設定頁面將儲存模式從本地切換至 Google Drive 時，系統自動開啟同步管理面板並觸發比較，幫助使用者意識到本地與雲端的差異。

**Why this priority**: 「再登入的時候」是最關鍵的同步時機，自動引導能提升使用者體驗。

**Independent Test**: 可獨立測試模式切換的回調鏈：切換成功 → 開啟面板 → 自動比較。

**Acceptance Scenarios**:

1. **Given** 使用者切換儲存模式到 Google Drive, **When** 切換成功, **Then** 同步管理面板自動開啟
2. **Given** 同步管理面板自動開啟, **When** 面板載入完成, **Then** 自動執行檔案比較（顯示載入中狀態）
3. **Given** 自動比較中, **When** 比較完成, **Then** 顯示差異清單（若沒有差異，顯示「所有檔案已同步」）

---

### User Story 3 - 手動比較本地與雲端檔案 (Priority: P3)

使用者在同步管理面板內手動觸發比較，系統列出所有計畫檔案（Year/Month/Week/Day）的同步狀態，包含差異行數資訊。

**Why this priority**: 手動比較是主要操作流程，使用者需要完整的差異資訊做決策。

**Independent Test**: 可獨立測試比較 API，確認回傳格式正確，包含所有必要欄位。

**Acceptance Scenarios**:

1. **Given** 同步管理面板已開啟, **When** 使用者點擊「比較檔案」, **Then** 顯示載入動畫，按鈕禁用
2. **Given** 比較完成, **When** 結果回傳, **Then** 顯示統計摘要（僅本地 N｜僅雲端 M｜不同 P｜相同 Q）
3. **Given** 結果中有差異檔案, **When** 顯示 DIFFERENT 狀態的檔案, **Then** 同時顯示本地行數與雲端行數，以及 `+N` / `-M` 行數差異（綠色/紅色）
4. **Given** 檔案僅存在本地, **When** 顯示 LOCAL_ONLY 狀態, **Then** 顯示本地行數，雲端欄位為空
5. **Given** 檔案僅存在雲端, **When** 顯示 CLOUD_ONLY 狀態, **Then** 顯示雲端行數，本地欄位為空
6. **Given** 使用者想篩選結果, **When** 點擊 Filter Tab（全部/僅本地/僅雲端/不同/相同）, **Then** 表格只顯示對應狀態的檔案

---

### User Story 4 - 選擇同步操作 (Priority: P4)

使用者對每個差異檔案獨立選擇同步動作：上傳至雲端、下載至本地、或跳過。系統提供合理的預設建議。

**Why this priority**: 這是同步功能的核心決策流程，讓使用者掌控每個檔案的命運。

**Independent Test**: 可獨立測試操作選擇 UI：每列的 toggle 按鈕、批次操作、Footer 統計。

**Acceptance Scenarios**:

1. **Given** 差異清單已顯示, **When** 使用者查看 LOCAL_ONLY 檔案, **Then** 預設操作為「上傳至雲端」
2. **Given** 差異清單已顯示, **When** 使用者查看 CLOUD_ONLY 檔案, **Then** 預設操作為「下載至本地」
3. **Given** 差異清單已顯示, **When** 使用者查看 DIFFERENT 檔案, **Then** 預設操作為「跳過」（由使用者明確選擇方向）
4. **Given** 使用者選擇某行的操作, **When** Toggle 切換, **Then** Footer 摘要即時更新（N 個上傳，M 個下載，P 個跳過）
5. **Given** 狀態為 SAME 的檔案, **When** 顯示在清單中, **Then** 操作欄位顯示「已同步」（不可修改）

---

### User Story 5 - 執行同步 (Priority: P5)

使用者確認所有操作後，點擊「執行同步」，系統依序執行上傳/下載操作，顯示進度，完成後顯示結果。

**Why this priority**: 這是整個功能的終點，執行品質決定功能的可信度。

**Independent Test**: 可獨立測試 execute API，確認上傳/下載各自正確執行，錯誤時有對應回報。

**Acceptance Scenarios**:

1. **Given** 使用者點擊「執行同步」, **When** 執行中, **Then** 按鈕禁用並顯示進度（目前/總計）
2. **Given** 執行成功完成, **When** 所有操作完成, **Then** 顯示結果摘要（成功 N 個，失敗 M 個）
3. **Given** 部分操作失敗, **When** 有錯誤發生, **Then** 顯示失敗的檔案列表和錯誤原因，成功的操作不受影響
4. **Given** 執行完成, **When** 使用者關閉結果, **Then** 表格更新以反映新的同步狀態（可選擇自動重新比較）

---

### Edge Cases

- Google 授權在比較過程中過期 → 顯示「授權已過期，請重新登入」錯誤，不執行同步
- 比較過程中網路中斷 → 顯示「連線失敗」，提供重試按鈕
- Google Drive 路徑不存在任何計畫檔案 → 顯示「Google Drive 尚無計畫檔案」
- 本地 data/ 目錄完全空白 → 所有檔案標示為 CLOUD_ONLY
- 同步執行中使用者關閉面板 → 提示「同步執行中，確認要離開嗎？」

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 在 Google 已登入時，於設定頁面的 Google Drive 區塊顯示「同步管理」按鈕
- **FR-002**: 系統 MUST 在切換至 Google Drive 儲存模式時，自動開啟同步管理面板並觸發比較
- **FR-003**: 系統 MUST 比較 `Year/`, `Month/`, `Week/`, `Day/` 四個子目錄（排除 `settings/`）
- **FR-004**: 系統 MUST 使用 MD5 hash 作為檔案相同性比對標準（本地計算，Google Drive 使用 API 的 md5Checksum）
- **FR-005**: 系統 MUST 對 DIFFERENT 狀態的檔案計算並顯示行數差異（+N / -M 格式）
- **FR-006**: 系統 MUST 對每個差異檔案提供三種操作選擇：上傳至雲端、下載至本地、跳過
- **FR-007**: 系統 MUST 為不同狀態的檔案提供合理的預設操作（LOCAL_ONLY → 上傳，CLOUD_ONLY → 下載，DIFFERENT → 跳過）
- **FR-008**: 系統 MUST 提供 Filter Tabs 讓使用者篩選檢視特定狀態的檔案
- **FR-009**: 系統 MUST 在執行同步時顯示進度，並在完成後顯示結果摘要
- **FR-010**: 系統 MUST 在任何操作失敗時提供明確的錯誤訊息，且不中斷其他操作的執行

### Key Entities

- **FileSyncInfo**: 單一檔案的同步狀態資訊（路徑、狀態、MD5、時間戳、行數差異、建議操作）
- **FileDiffStats**: 檔案行數差異統計（本地行數、雲端行數、新增行數、刪除行數）
- **SyncComparisonResult**: 完整比較結果（所有 FileSyncInfo + 各狀態統計）
- **SyncOperation**: 使用者對某檔案選擇的同步操作（upload/download/skip）

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在一般網路環境下，20 個計畫檔案的比較操作在 10 秒內完成
- **SC-002**: 同步執行時每個檔案操作在 5 秒內完成
- **SC-003**: 比較結果的 MD5 準確率 100%（相同檔案不被標記為不同）
- **SC-004**: 執行同步後，兩端檔案的 MD5 hash 一致
- **SC-005**: 所有錯誤情況都有對應的使用者友善訊息（錯誤率 0% 無訊息顯示）

---

## Assumptions

- 使用者已完成 Google OAuth 授權，且授權未過期
- Google Drive 的 `md5Checksum` 欄位在一般 API 查詢中可用（不需額外參數）
- 計畫檔案均為 UTF-8 編碼的 Markdown 文字檔
- 不需要版本歷史或衝突合併，以使用者明確選擇為準
- 設定目錄（`settings/`）不納入同步範圍
