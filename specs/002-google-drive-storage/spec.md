# Feature Specification: Google Drive 儲存整合

**Feature Branch**: `002-google-drive-storage`  
**Created**: 2025-11-30  
**Status**: Draft  
**Input**: User description: "維持現有的使用 {workfolder}/data/ 存取使用者資料的功能，另外做一個可以切換到儲存資料到 Google Drive 的功能"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 本地儲存模式 (Priority: P1)

使用者希望維持現有的本地檔案儲存功能，所有計畫資料繼續儲存在 `{workfolder}/data/` 目錄中，確保系統在沒有網路連線時仍能正常運作。

**Why this priority**: 這是基礎功能，必須確保現有功能不受影響，是系統的核心基礎。

**Independent Test**: 可以在完全離線的環境下測試，確認所有計畫的讀取、建立、修改、刪除功能正常運作。

**Acceptance Scenarios**:

1. **Given** 使用者選擇本地儲存模式, **When** 使用者建立或修改計畫, **Then** 資料儲存在本地 `data/` 目錄中的對應資料夾 (Year/Month/Week/Day)
2. **Given** 使用者在本地模式下, **When** 系統無網路連線, **Then** 所有功能正常運作，無任何錯誤訊息
3. **Given** 使用者使用本地模式, **When** 使用者重新啟動應用程式, **Then** 所有先前儲存的計畫資料都能正確載入

---

### User Story 2 - Google 帳號登入與授權 (Priority: P2)

使用者想要連結 Google 帳號，以便將計畫資料同步到 Google Drive。使用者需要透過 Google OAuth 登入，並授權應用程式存取其 Google Drive。

**Why this priority**: 這是使用 Google Drive 功能的前提條件，必須先完成授權才能進行檔案存取。

**Independent Test**: 可以獨立測試 Google 登入流程，確認能取得授權 token 並顯示登入狀態。

**Acceptance Scenarios**:

1. **Given** 使用者未登入 Google, **When** 使用者點擊「連結 Google 帳號」按鈕, **Then** 系統開啟 Google OAuth 授權頁面
2. **Given** 使用者在 Google 授權頁面, **When** 使用者同意授權, **Then** 系統取得存取 Google Drive 的權限，並顯示登入成功訊息
3. **Given** 使用者已登入 Google, **When** 使用者查看設定頁面, **Then** 顯示已連結的 Google 帳號資訊（如 email）
4. **Given** 使用者已登入 Google, **When** 使用者點擊「登出」按鈕, **Then** 系統清除授權資訊，恢復未登入狀態

---

### User Story 3 - 設定 Google Drive 儲存路徑 (Priority: P3)

使用者想要指定 Google Drive 中的資料儲存位置，透過文字輸入框設定起始路徑。

**Why this priority**: 使用者需要自訂儲存位置，以便整合到現有的 Google Drive 檔案結構中。

**Independent Test**: 可以獨立測試路徑設定功能，確認路徑儲存和顯示正確。

**Acceptance Scenarios**:

1. **Given** 使用者已登入 Google, **When** 使用者在路徑輸入框輸入 "WorkPlan/2025", **Then** 系統儲存此路徑為 Google Drive 資料根目錄
2. **Given** 使用者已設定路徑 "WorkPlan/2025", **When** 使用者重新開啟設定, **Then** 輸入框顯示先前設定的路徑
3. **Given** 使用者輸入空白路徑, **When** 使用者嘗試儲存, **Then** 系統使用預設根目錄 "WorkPlanByCalendar"
4. **Given** 使用者輸入包含特殊字元的路徑, **When** 使用者嘗試儲存, **Then** 系統驗證路徑格式並顯示適當的錯誤訊息

---

### User Story 4 - 切換儲存模式 (Priority: P4)

使用者想要在本地儲存和 Google Drive 儲存之間切換，選擇最適合當前情況的儲存方式。

**Why this priority**: 提供使用者彈性選擇，但需要先完成前三個 User Story 的功能。

**Independent Test**: 可以測試模式切換 UI，確認切換後系統正確反映新的儲存模式。

**Acceptance Scenarios**:

1. **Given** 使用者目前使用本地模式, **When** 使用者選擇切換至 Google Drive 模式, **Then** 系統確認切換並更新儲存目標
2. **Given** 使用者目前使用 Google Drive 模式, **When** 使用者選擇切換至本地模式, **Then** 系統確認切換並更新儲存目標
3. **Given** 使用者切換模式後, **When** 使用者建立新計畫, **Then** 資料儲存到新選擇的儲存位置

---

### User Story 5 - Google Drive 檔案讀寫操作 (Priority: P5)

使用者在 Google Drive 模式下進行計畫的讀取和儲存，所有檔案操作直接對 Google Drive 進行。

**Why this priority**: 這是 Google Drive 整合的核心功能，但需要前面的授權和路徑設定功能作為基礎。

**Independent Test**: 可以測試單一檔案的讀取和寫入操作，確認資料正確同步到 Google Drive。

**Acceptance Scenarios**:

1. **Given** 使用者在 Google Drive 模式下, **When** 使用者建立新的日計畫, **Then** 計畫檔案建立在 Google Drive 指定路徑的 Day/ 資料夾中
2. **Given** Google Drive 中已有計畫檔案, **When** 使用者開啟該日期的計畫, **Then** 系統從 Google Drive 讀取並顯示內容
3. **Given** 使用者修改計畫內容, **When** 使用者儲存, **Then** 更新後的內容同步到 Google Drive
4. **Given** 網路連線中斷, **When** 使用者嘗試在 Google Drive 模式下操作, **Then** 系統顯示友善的錯誤訊息，建議切換到本地模式

---

### Edge Cases

- 使用者 Google 授權過期時，如何處理？應自動重新導向授權頁面
- 網路不穩定導致檔案上傳失敗時，如何處理？應顯示錯誤訊息並保留本地副本
- Google Drive 儲存空間不足時，如何處理？應顯示明確的錯誤訊息
- 使用者在不同裝置同時編輯同一檔案時，如何處理？以最後儲存的版本為準（簡單覆蓋策略）
- 使用者指定的 Google Drive 路徑不存在時，如何處理？系統自動建立該路徑

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 維持現有本地檔案儲存功能，資料儲存在 `{workfolder}/data/` 目錄結構中
- **FR-002**: 系統 MUST 提供 Google OAuth 2.0 登入功能，取得使用者授權
- **FR-003**: 系統 MUST 要求 Google Drive 檔案讀取與寫入權限（drive.file scope）
- **FR-004**: 系統 MUST 提供文字輸入框讓使用者設定 Google Drive 資料儲存路徑
- **FR-005**: 系統 MUST 提供儲存模式切換功能（本地/Google Drive）
- **FR-006**: 系統 MUST 在 Google Drive 模式下，將計畫檔案儲存到指定路徑的對應子資料夾 (Year/Month/Week/Day)
- **FR-007**: 系統 MUST 顯示目前的儲存模式狀態
- **FR-008**: 系統 MUST 在 Google Drive 操作失敗時提供友善的錯誤訊息
- **FR-009**: 系統 MUST 安全地儲存 Google 授權 token（不暴露敏感資訊）
- **FR-010**: 系統 MUST 提供 Google 帳號登出功能
- **FR-011**: 系統 MUST 在 Google Drive 路徑不存在時自動建立資料夾結構

### Key Entities

- **儲存模式設定 (StorageMode)**: 代表使用者選擇的儲存方式，包含模式類型（local/google-drive）、Google Drive 路徑、授權狀態
- **Google 授權資訊 (GoogleAuth)**: 代表 Google OAuth 授權狀態，包含 access token、refresh token、過期時間、使用者 email
- **計畫檔案 (Plan)**: 現有的計畫資料實體，需支援不同的儲存後端

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者可在 30 秒內完成 Google 帳號連結流程
- **SC-002**: 使用者可在 10 秒內完成儲存模式切換
- **SC-003**: Google Drive 模式下，檔案讀取操作在 3 秒內完成（一般網路環境）
- **SC-004**: Google Drive 模式下，檔案儲存操作在 5 秒內完成（一般網路環境）
- **SC-005**: 本地模式的效能與現有系統相同，無任何退化
- **SC-006**: 90% 的使用者能夠在無額外說明下完成 Google Drive 設定
- **SC-007**: 網路異常時，100% 的錯誤情況都有對應的友善錯誤訊息

## Assumptions

- 使用者擁有有效的 Google 帳號
- 使用者的 Google Drive 有足夠的儲存空間
- 應用程式執行環境可存取 Google API 服務
- 使用者了解 Google Drive 的基本資料夾結構概念
- 前端在瀏覽器環境中執行，可使用 Google Identity Services
