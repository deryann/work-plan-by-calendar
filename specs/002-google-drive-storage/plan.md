# Implementation Plan: Google Drive 儲存整合

**Branch**: `002-google-drive-storage` | **Date**: 2025-11-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-google-drive-storage/spec.md`

<!--
  LANGUAGE REQUIREMENT: This implementation plan MUST be written in Traditional Chinese (zh-TW)
  per Constitution Principle V. Technical terms may use English where appropriate.
-->

## Summary

本功能目標是在維持現有本地檔案儲存功能的基礎上，新增 Google Drive 雲端儲存選項。使用者可透過 Google OAuth 2.0 登入授權，設定 Google Drive 儲存路徑，並在本地模式與 Google Drive 模式之間自由切換。

技術方案採用 **策略模式（Strategy Pattern）** 將儲存後端抽象化，透過 `StorageProvider` 介面統一本地與 Google Drive 的檔案操作。前端使用 Google Identity Services (GIS) 處理 OAuth 流程，後端使用 Google Drive API v3 進行檔案操作。

## Technical Context

**Language/Version**: Python 3.11+ (後端), ES6+ JavaScript (前端)  
**Primary Dependencies**: FastAPI 0.104+, google-api-python-client, google-auth-oauthlib (後端); Google Identity Services (前端)  
**Storage**: 本地檔案系統 (現有) + Google Drive API v3  
**Testing**: pytest (後端), 手動測試 (前端)  
**Target Platform**: Linux/macOS/Windows (後端), 現代瀏覽器 (前端)  
**Project Type**: Web application (前後端分離)  
**Performance Goals**: 檔案讀取 <3s, 檔案儲存 <5s (一般網路環境)  
**Constraints**: 需處理網路異常、授權過期、儲存空間不足等邊界情況  
**Scale/Scope**: 單一使用者，個人工作計畫管理

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 狀態 | 說明 |
|-----|------|-----|
| **I. 程式碼品質** | ✅ 通過 | 將使用策略模式保持程式碼可維護性，所有新增程式碼遵循 PEP 8 和 ES6+ 標準 |
| **II. 測試標準** | ✅ 通過 | 將為 StorageProvider 介面、Google Drive 整合、OAuth 流程新增測試 |
| **III. 使用者體驗一致性** | ✅ 通過 | 提供即時視覺回饋、友善錯誤訊息、無縫模式切換 |
| **IV. 效能要求** | ✅ 通過 | 符合 spec 定義的效能目標 (<3s 讀取, <5s 儲存) |
| **V. 語言標準化** | ✅ 通過 | 所有使用者介面和文件使用繁體中文 |
| **VI. 最小變更原則** | ✅ 通過 | 透過擴展（新增 StorageProvider）而非修改現有 PlanService 核心邏輯 |

## Project Structure

### Documentation (this feature)

```text
specs/002-google-drive-storage/
├── plan.md              # 本文件
├── research.md          # Phase 0 研究結果
├── data-model.md        # 資料模型定義
├── quickstart.md        # 快速開始指南
├── contracts/           # API 合約
│   ├── README.md
│   ├── google-auth-api.yaml
│   └── storage-settings-api.yaml
├── checklists/
│   └── requirements.md  # 需求檢查清單
└── tasks.md             # Phase 2 任務分解 (由 /speckit.tasks 產生)
```

### Source Code (repository root)

```text
backend/
├── __init__.py
├── main.py              # FastAPI 應用 (新增 Google Auth 端點)
├── models.py            # Pydantic 模型 (新增 StorageMode, GoogleAuth)
├── plan_service.py      # 計畫服務 (整合 StorageProvider)
├── settings_service.py  # 設定服務 (新增儲存模式設定)
├── storage/             # [新增] 儲存後端模組
│   ├── __init__.py
│   ├── base.py          # StorageProvider 抽象基類
│   ├── local.py         # LocalStorageProvider 實作
│   └── google_drive.py  # GoogleDriveStorageProvider 實作
└── google_auth_service.py  # [新增] Google OAuth 服務

frontend/
└── index.html           # 主頁面 (整合 Google Sign-In 按鈕)

static/
├── css/
│   └── main.css         # 樣式 (新增 Google Drive 相關樣式)
└── js/
    ├── api.js           # API 客戶端 (新增 Google Auth 相關方法)
    ├── settings-manager.js  # 設定管理 (新增儲存模式管理)
    ├── settings-modal.js    # 設定彈窗 (新增 Google Drive 設定區塊)
    └── google-auth.js       # [新增] Google OAuth 前端處理

tests/
├── test_storage_provider.py  # [新增] 儲存提供者測試
├── test_google_drive.py      # [新增] Google Drive 整合測試 (mock)
└── test_google_auth.py       # [新增] OAuth 流程測試

data/
└── settings/
    └── settings.json    # 設定檔 (新增 storageMode, googleAuth 欄位)
```

**Structure Decision**: 採用現有的 Web application 結構（前後端分離），新增 `backend/storage/` 模組實作儲存策略模式，遵循最小變更原則透過擴展而非修改現有程式碼。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

本功能無需違反 Constitution 原則。透過以下設計決策確保符合所有原則：

| 設計決策 | 符合原則 | 說明 |
|---------|---------|------|
| 策略模式 (StorageProvider) | VI. 最小變更 | 新增介面而非修改 PlanService 核心邏輯 |
| 獨立 storage 模組 | I. 程式碼品質 | 單一職責，易於測試和維護 |
| Google OAuth 服務層 | I. 程式碼品質 | 將 OAuth 邏輯封裝，避免散落各處 |

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| 原則 | 狀態 | 設計驗證 |
|-----|------|---------|
| **I. 程式碼品質** | ✅ 通過 | StorageProvider 抽象化設計符合 SOLID 原則；函數分解確保複雜度 <15 |
| **II. 測試標準** | ✅ 通過 | data-model.md 定義清晰的驗證規則；contracts/ 定義 API 合約供測試 |
| **III. 使用者體驗一致性** | ✅ 通過 | API 合約定義友善錯誤訊息；UI 流程設計於 quickstart.md |
| **IV. 效能要求** | ✅ 通過 | research.md 定義快取策略；效能目標 <3s 讀取 / <5s 寫入 |
| **V. 語言標準化** | ✅ 通過 | 所有文件使用繁體中文；錯誤訊息已在合約中定義為中文 |
| **VI. 最小變更原則** | ✅ 通過 | 透過 StorageProvider 介面擴展，PlanService 僅需注入依賴 |

## Generated Artifacts

| 檔案 | 說明 | Phase |
|-----|------|-------|
| [plan.md](plan.md) | 實作計畫（本文件） | - |
| [research.md](research.md) | 技術研究結果 | Phase 0 |
| [data-model.md](data-model.md) | 資料模型定義 | Phase 1 |
| [quickstart.md](quickstart.md) | 快速開發指南 | Phase 1 |
| [contracts/README.md](contracts/README.md) | API 合約索引 | Phase 1 |
| [contracts/google-auth-api.yaml](contracts/google-auth-api.yaml) | Google Auth API 合約 | Phase 1 |
| [contracts/storage-settings-api.yaml](contracts/storage-settings-api.yaml) | Storage Settings API 合約 | Phase 1 |
