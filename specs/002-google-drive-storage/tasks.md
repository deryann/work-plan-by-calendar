# Tasks: Google Drive 儲存整合

**Input**: Design documents from `/specs/002-google-drive-storage/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

<!--
  LANGUAGE REQUIREMENT: Task descriptions use Traditional Chinese (zh-TW) for clarity.
  Technical terms and file paths use English as needed.
-->

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無依賴）
- **[Story]**: 所屬的 User Story（例：US1, US2, US3, US4, US5）
- 所有描述包含確切的檔案路徑

## User Stories 對照

| 標籤 | User Story | Priority |
|-----|-----------|----------|
| US1 | 本地儲存模式 | P1 🎯 MVP |
| US2 | Google 帳號登入與授權 | P2 |
| US3 | 設定 Google Drive 儲存路徑 | P3 |
| US4 | 切換儲存模式 | P4 |
| US5 | Google Drive 檔案讀寫操作 | P5 |

---

## Phase 1: Setup (專案設定)

**Purpose**: 安裝依賴、建立專案結構

- [x] T001 新增 Google API 相關依賴至 pyproject.toml (google-api-python-client, google-auth-oauthlib, google-auth, cryptography)
- [x] T002 [P] 建立 backend/storage/ 目錄結構
- [x] T003 [P] 建立 backend/storage/__init__.py 模組初始化檔案
- [x] T004 [P] 新增環境變數範例至 .env.example (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_ENCRYPTION_KEY)

---

## Phase 2: Foundational (基礎建設)

**Purpose**: 共用模型和抽象介面，所有 User Story 的前提

**⚠️ CRITICAL**: 此階段必須完成後才能開始任何 User Story

### 資料模型

- [x] T005 [P] 新增 StorageModeType 列舉至 backend/models.py
- [x] T006 [P] 新增 StorageMode 模型至 backend/models.py
- [x] T007 [P] 新增 GoogleAuthStatus 列舉至 backend/models.py
- [x] T008 [P] 新增 GoogleAuthInfo 模型至 backend/models.py
- [x] T009 [P] 新增 GoogleAuthToken 模型至 backend/models.py (內部使用)
- [x] T010 [P] 新增 StorageModeUpdateRequest 請求模型至 backend/models.py
- [x] T011 [P] 新增 StorageStatusResponse 回應模型至 backend/models.py
- [x] T012 [P] 新增 GoogleAuthCallbackRequest 請求模型至 backend/models.py

### 儲存抽象層

- [x] T013 建立 StorageProvider 抽象基類於 backend/storage/base.py (定義 read_file, write_file, file_exists, delete_file, ensure_directory, get_file_stats 介面)

**Checkpoint**: 基礎模型和抽象介面完成 - 可開始 User Story 實作 ✅

---

## Phase 3: User Story 1 - 本地儲存模式 (Priority: P1) 🎯 MVP

**Goal**: 將現有本地檔案操作重構為 StorageProvider 實作，確保現有功能不受影響

**Independent Test**: 在完全離線環境測試所有計畫 CRUD 操作正常運作

### Implementation for User Story 1

- [x] T014 [US1] 實作 LocalStorageProvider 於 backend/storage/local.py
- [x] T015 [US1] 在 LocalStorageProvider 實作 read_file 方法
- [x] T016 [US1] 在 LocalStorageProvider 實作 write_file 方法
- [x] T017 [US1] 在 LocalStorageProvider 實作 file_exists 方法
- [x] T018 [US1] 在 LocalStorageProvider 實作 delete_file 方法
- [x] T019 [US1] 在 LocalStorageProvider 實作 ensure_directory 方法
- [x] T020 [US1] 在 LocalStorageProvider 實作 get_file_stats 方法
- [x] T021 [US1] 重構 PlanService 使用 StorageProvider 依賴注入於 backend/plan_service.py
- [x] T022 [US1] 更新 backend/main.py 初始化 PlanService 使用 LocalStorageProvider
- [x] T023 [US1] 新增 LocalStorageProvider 單元測試於 tests/test_storage_provider.py
- [x] T024 [US1] 驗證現有功能（所有 API 端點）運作正常

**Checkpoint**: User Story 1 完成 - 現有本地儲存功能透過 StorageProvider 運作，無功能退化 ✅

---

## Phase 4: User Story 2 - Google 帳號登入與授權 (Priority: P2)

**Goal**: 使用者可透過 Google OAuth 連結帳號，系統安全儲存授權 Token

**Independent Test**: 獨立測試 Google 登入流程，確認能取得授權 token 並顯示登入狀態

### 後端實作

- [x] T025 [P] [US2] 建立 Token 加密工具函數於 backend/google_auth_service.py (encrypt_token, decrypt_token)
- [x] T026 [P] [US2] 實作 GoogleAuthService 類別於 backend/google_auth_service.py
- [x] T027 [US2] 實作 get_auth_url 方法產生 OAuth 授權 URL 於 backend/google_auth_service.py
- [x] T028 [US2] 實作 handle_callback 方法處理授權回調於 backend/google_auth_service.py
- [x] T029 [US2] 實作 get_auth_status 方法查詢授權狀態於 backend/google_auth_service.py
- [x] T030 [US2] 實作 logout 方法清除授權資訊於 backend/google_auth_service.py
- [x] T031 [US2] 實作 refresh_token 方法刷新 Token 於 backend/google_auth_service.py
- [x] T032 [US2] 實作 save_token 和 load_token 方法（加密儲存於 data/settings/google_auth.json）
- [x] T033 [US2] 新增 GET /api/auth/google/status 端點於 backend/main.py
- [x] T034 [US2] 新增 GET /api/auth/google/authorize 端點於 backend/main.py
- [x] T035 [US2] 新增 POST /api/auth/google/callback 端點於 backend/main.py
- [x] T036 [US2] 新增 POST /api/auth/google/logout 端點於 backend/main.py
- [x] T037 [US2] 新增 POST /api/auth/google/refresh 端點於 backend/main.py

### 前端實作

- [x] T038 [P] [US2] 建立 GoogleAuthManager 類別於 static/js/google-auth.js
- [x] T039 [US2] 實作 init 方法載入 Google Identity Services 於 static/js/google-auth.js
- [x] T040 [US2] 實作 handleAuthCallback 方法處理授權回調於 static/js/google-auth.js
- [x] T041 [US2] 實作 logout 方法於 static/js/google-auth.js
- [x] T042 [US2] 實作 getAuthStatus 方法查詢授權狀態於 static/js/google-auth.js
- [x] T043 [US2] 新增 Google Auth API 方法至 static/js/api.js (getGoogleAuthStatus, getGoogleAuthUrl, googleAuthCallback, googleLogout)
- [x] T044 [US2] 在 frontend/index.html 載入 Google Identity Services SDK
- [x] T045 [US2] 在設定彈窗新增「連結 Google 帳號」按鈕於 static/js/settings-modal.js
- [x] T046 [US2] 在設定彈窗顯示已連結的 Google 帳號資訊於 static/js/settings-modal.js
- [x] T047 [US2] 在設定彈窗新增「登出」按鈕於 static/js/settings-modal.js
- [x] T048 [P] [US2] 新增 Google Auth 相關 CSS 樣式於 static/css/main.css

### 測試

- [x] T049 [US2] 新增 GoogleAuthService 單元測試於 tests/test_google_auth.py (使用 mock)

**Checkpoint**: User Story 2 完成 - 使用者可連結/登出 Google 帳號，授權狀態正確顯示 ✅

---

## Phase 5: User Story 3 - 設定 Google Drive 儲存路徑 (Priority: P3)

**Goal**: 使用者可設定 Google Drive 資料儲存的根目錄路徑

**Independent Test**: 獨立測試路徑設定功能，確認路徑儲存和顯示正確

### 後端實作

- [x] T050 [US3] 更新 Settings 模型新增 storage 欄位於 backend/models.py
- [x] T051 [US3] 更新 SettingsService 支援 StorageMode 讀寫於 backend/settings_service.py
- [x] T052 [US3] 新增路徑驗證邏輯（不可包含 ..，不可以 / 開頭，長度 1-255）於 backend/settings_service.py
- [x] T053 [US3] 新增 GET /api/storage/status 端點於 backend/main.py
- [x] T054 [US3] 新增 PUT /api/storage/google-drive-path 端點於 backend/main.py

### 前端實作

- [x] T055 [US3] 新增 Storage Settings API 方法至 static/js/api.js (getStorageStatus, updateGoogleDrivePath)
- [x] T056 [US3] 在設定彈窗新增 Google Drive 路徑輸入框於 static/js/settings-modal.js
- [x] T057 [US3] 實作路徑輸入驗證和錯誤顯示於 static/js/settings-modal.js
- [x] T058 [US3] 更新 SettingsManager 支援儲存模式設定於 static/js/settings-manager.js

**Checkpoint**: User Story 3 完成 - 使用者可設定並儲存 Google Drive 路徑 ✅

---

## Phase 6: User Story 4 - 切換儲存模式 (Priority: P4)

**Goal**: 使用者可在本地模式和 Google Drive 模式之間切換

**Independent Test**: 測試模式切換 UI，確認切換後系統正確反映新的儲存模式

### 後端實作

- [ ] T059 [US4] 新增 PUT /api/storage/mode 端點於 backend/main.py
- [ ] T060 [US4] 實作儲存模式切換邏輯（驗證 Google 授權狀態）於 backend/settings_service.py
- [ ] T061 [US4] 更新 PlanService 支援動態切換 StorageProvider 於 backend/plan_service.py

### 前端實作

- [ ] T062 [US4] 新增儲存模式切換 API 方法至 static/js/api.js (updateStorageMode)
- [ ] T063 [US4] 在設定彈窗新增儲存模式切換 UI（單選按鈕或下拉選單）於 static/js/settings-modal.js
- [ ] T064 [US4] 實作切換確認對話框於 static/js/settings-modal.js
- [ ] T065 [US4] 在主介面顯示當前儲存模式狀態指示器於 static/js/app.js
- [ ] T066 [P] [US4] 新增儲存模式狀態指示器 CSS 樣式於 static/css/main.css

**Checkpoint**: User Story 4 完成 - 使用者可切換儲存模式，UI 正確反映當前模式

---

## Phase 7: User Story 5 - Google Drive 檔案讀寫操作 (Priority: P5)

**Goal**: 在 Google Drive 模式下進行計畫的讀取和儲存

**Independent Test**: 測試單一檔案的讀取和寫入操作，確認資料正確同步到 Google Drive

### 後端實作

- [ ] T067 [US5] 建立 GoogleDriveStorageProvider 類別於 backend/storage/google_drive.py
- [ ] T068 [US5] 實作 _get_or_create_folder 輔助方法（建立/取得資料夾 ID）於 backend/storage/google_drive.py
- [ ] T069 [US5] 實作 _find_file 輔助方法（搜尋檔案）於 backend/storage/google_drive.py
- [ ] T070 [US5] 實作 _build_folder_path 輔助方法（解析路徑建立資料夾結構）於 backend/storage/google_drive.py
- [ ] T071 [US5] 實作 read_file 方法於 backend/storage/google_drive.py
- [ ] T072 [US5] 實作 write_file 方法（支援建立和更新）於 backend/storage/google_drive.py
- [ ] T073 [US5] 實作 file_exists 方法於 backend/storage/google_drive.py
- [ ] T074 [US5] 實作 delete_file 方法於 backend/storage/google_drive.py
- [ ] T075 [US5] 實作 ensure_directory 方法（遞迴建立資料夾）於 backend/storage/google_drive.py
- [ ] T076 [US5] 實作 get_file_stats 方法於 backend/storage/google_drive.py
- [ ] T077 [US5] 實作檔案 ID 快取機制於 backend/storage/google_drive.py
- [ ] T078 [US5] 實作指數退避重試機制於 backend/storage/google_drive.py
- [ ] T079 [US5] 更新 PlanService 根據儲存模式建立對應的 StorageProvider 於 backend/plan_service.py
- [ ] T080 [US5] 更新 backend/main.py 支援根據設定初始化正確的 StorageProvider
- [ ] T081 [US5] 新增 POST /api/storage/test-connection 端點（測試 Google Drive 連線）於 backend/main.py

### 錯誤處理

- [ ] T082 [US5] 實作 Google Drive 專用錯誤類別於 backend/storage/google_drive.py (NetworkError, AuthExpiredError, QuotaExceededError)
- [ ] T083 [US5] 實作友善錯誤訊息轉換於 backend/storage/google_drive.py

### 前端實作

- [ ] T084 [US5] 新增 testGoogleDriveConnection API 方法至 static/js/api.js
- [ ] T085 [US5] 在設定彈窗新增「測試連線」按鈕於 static/js/settings-modal.js
- [ ] T086 [US5] 實作 Google Drive 操作錯誤提示 UI 於 static/js/app.js
- [ ] T087 [US5] 實作網路異常時的友善錯誤訊息顯示於 static/js/app.js

### 測試

- [ ] T088 [US5] 新增 GoogleDriveStorageProvider 單元測試於 tests/test_google_drive.py (使用 mock)

**Checkpoint**: User Story 5 完成 - Google Drive 模式下可進行完整的計畫 CRUD 操作

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 品質提升、文件更新、邊界情況處理

- [ ] T089 [P] 更新 README.md 新增 Google Drive 功能說明
- [ ] T090 [P] 新增 Google Cloud Console 設定說明文件於 docs/google-cloud-setup.md
- [ ] T091 程式碼審查和重構（確保符合 Constitution 原則）
- [ ] T092 驗證所有錯誤訊息使用繁體中文
- [ ] T093 執行 quickstart.md 驗證流程
- [ ] T094 效能測試（確認 <3s 讀取, <5s 寫入）
- [ ] T095 執行完整端對端測試（本地模式 → Google 授權 → 路徑設定 → 模式切換 → Google Drive 操作）

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ──── BLOCKS ALL USER STORIES
    │
    ├─────────────────────────────────────────────┐
    │                                             │
    ▼                                             │
Phase 3 (US1 - 本地儲存) 🎯 MVP                    │
    │                                             │
    ▼                                             │
Phase 4 (US2 - Google 登入) ◄─────────────────────┤
    │                                             │
    ▼                                             │
Phase 5 (US3 - 路徑設定) ◄────────────────────────┤
    │                                             │
    ▼                                             │
Phase 6 (US4 - 模式切換) ◄────────────────────────┤
    │                                             │
    ▼                                             │
Phase 7 (US5 - Google Drive 讀寫) ◄───────────────┘
    │
    ▼
Phase 8 (Polish)
```

### User Story Dependencies

| User Story | 依賴 | 說明 |
|-----------|------|------|
| **US1** (本地儲存) | Phase 2 | 基礎抽象層完成後可開始 |
| **US2** (Google 登入) | US1 | 需要 StorageProvider 架構 |
| **US3** (路徑設定) | US2 | 需要 Google 授權功能 |
| **US4** (模式切換) | US3 | 需要路徑設定功能 |
| **US5** (Google Drive 讀寫) | US4 | 需要模式切換功能 |

### Parallel Opportunities

**Phase 2 內部可平行**:
```bash
# 以下任務可同時執行（不同檔案）
T005 [P] 新增 StorageModeType 列舉
T006 [P] 新增 StorageMode 模型
T007 [P] 新增 GoogleAuthStatus 列舉
T008 [P] 新增 GoogleAuthInfo 模型
T009 [P] 新增 GoogleAuthToken 模型
T010 [P] 新增 StorageModeUpdateRequest 請求模型
T011 [P] 新增 StorageStatusResponse 回應模型
T012 [P] 新增 GoogleAuthCallbackRequest 請求模型
```

**US2 內部可平行**:
```bash
# 後端 Service 和前端 Manager 可同時開發
T025 [P] [US2] 建立 Token 加密工具函數
T026 [P] [US2] 實作 GoogleAuthService 類別
T038 [P] [US2] 建立 GoogleAuthManager 類別
T048 [P] [US2] 新增 Google Auth 相關 CSS 樣式
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational
3. 完成 Phase 3: User Story 1 (本地儲存模式)
4. **STOP and VALIDATE**: 確認現有功能無退化
5. 可選擇部署 MVP

### Incremental Delivery

| 里程碑 | 包含 | 可交付價值 |
|--------|------|-----------|
| **MVP** | US1 | 現有功能重構完成，為擴展做好準備 |
| **Alpha** | US1 + US2 | 可連結 Google 帳號 |
| **Beta** | US1 + US2 + US3 + US4 | 可切換儲存模式 |
| **Release** | 全部 | 完整 Google Drive 整合 |

---

## Summary

| 項目 | 數量 |
|-----|------|
| **總任務數** | 95 |
| **Setup 任務** | 4 |
| **Foundational 任務** | 9 |
| **US1 任務** | 11 |
| **US2 任務** | 25 |
| **US3 任務** | 9 |
| **US4 任務** | 8 |
| **US5 任務** | 22 |
| **Polish 任務** | 7 |
| **可平行任務** | 20 |

---

## Notes

- `[P]` 標記的任務可與其他 `[P]` 任務平行執行（不同檔案、無依賴）
- `[Story]` 標籤對應 spec.md 中的 User Story
- 每個 User Story 應可獨立完成並測試
- 每個任務或邏輯群組完成後應 commit
- 遇到 Checkpoint 時停下來驗證該 Story 功能
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨 Story 依賴
