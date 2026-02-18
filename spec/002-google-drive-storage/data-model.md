# Data Model: Google Drive 儲存整合

**Feature**: 002-google-drive-storage  
**Date**: 2025-11-30

## 概述

本文件定義 Google Drive 儲存整合功能所需的資料模型，包含儲存模式設定、Google 授權資訊，以及與現有計畫資料的關係。

---

## 實體定義

### 1. StorageModeType (列舉)

儲存模式類型

```python
class StorageModeType(str, Enum):
    LOCAL = "local"           # 本地檔案系統
    GOOGLE_DRIVE = "google_drive"  # Google Drive
```

| 值 | 說明 |
|----|------|
| `local` | 本地檔案儲存模式，資料存於 `{workfolder}/data/` |
| `google_drive` | Google Drive 儲存模式，資料存於使用者指定的 Drive 路徑 |

---

### 2. StorageMode (設定實體)

儲存模式設定

```python
class StorageMode(BaseModel):
    mode: StorageModeType = StorageModeType.LOCAL
    google_drive_path: Optional[str] = "WorkPlanByCalendar"
    last_sync_at: Optional[datetime] = None
```

| 欄位 | 類型 | 必填 | 預設值 | 說明 |
|-----|------|-----|--------|------|
| `mode` | `StorageModeType` | 是 | `local` | 當前儲存模式 |
| `google_drive_path` | `str` | 否 | `"WorkPlanByCalendar"` | Google Drive 根目錄路徑 |
| `last_sync_at` | `datetime` | 否 | `null` | 上次同步時間（供未來使用） |

**驗證規則**:
- `google_drive_path` 不可包含 `..`（防止路徑穿越）
- `google_drive_path` 不可以 `/` 開頭（相對路徑）
- `google_drive_path` 長度限制 1-255 字元

---

### 3. GoogleAuthStatus (列舉)

Google 授權狀態

```python
class GoogleAuthStatus(str, Enum):
    NOT_CONNECTED = "not_connected"   # 未連結
    CONNECTED = "connected"           # 已連結
    EXPIRED = "expired"               # 授權過期
    ERROR = "error"                   # 授權錯誤
```

---

### 4. GoogleAuthInfo (授權實體)

Google 授權資訊（用於 API 回應，不含敏感資料）

```python
class GoogleAuthInfo(BaseModel):
    status: GoogleAuthStatus = GoogleAuthStatus.NOT_CONNECTED
    user_email: Optional[str] = None
    connected_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
```

| 欄位 | 類型 | 必填 | 說明 |
|-----|------|-----|------|
| `status` | `GoogleAuthStatus` | 是 | 授權狀態 |
| `user_email` | `str` | 否 | 已連結的 Google 帳號 email |
| `connected_at` | `datetime` | 否 | 連結時間 |
| `expires_at` | `datetime` | 否 | Token 過期時間 |

---

### 5. GoogleAuthToken (內部實體)

Google 授權 Token（僅後端使用，加密儲存）

```python
class GoogleAuthToken(BaseModel):
    access_token: str
    refresh_token: str
    token_expiry: datetime
    user_email: str
    scopes: List[str]
    created_at: datetime
    updated_at: datetime
```

| 欄位 | 類型 | 必填 | 說明 |
|-----|------|-----|------|
| `access_token` | `str` | 是 | Google API 存取 Token |
| `refresh_token` | `str` | 是 | 用於刷新的 Token |
| `token_expiry` | `datetime` | 是 | Access Token 過期時間 |
| `user_email` | `str` | 是 | 使用者 email |
| `scopes` | `List[str]` | 是 | 授權範圍 |
| `created_at` | `datetime` | 是 | 首次授權時間 |
| `updated_at` | `datetime` | 是 | 最後更新時間 |

**安全性**:
- 此實體儲存於 `data/settings/google_auth.json`
- 敏感欄位（`access_token`, `refresh_token`）使用 Fernet 加密
- 不透過 API 直接回傳此實體，僅回傳 `GoogleAuthInfo`

---

### 6. 擴展現有 Settings 模型

在現有 `Settings` 模型中新增儲存相關設定：

```python
class Settings(BaseModel):
    ui: UISettings = UISettings()
    storage: StorageMode = StorageMode()  # [新增]
```

---

## 實體關係

```
┌─────────────────────────────────────────────────────────────┐
│                        Settings                              │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │   UISettings    │    │        StorageMode               │ │
│  │  (panels,       │    │  - mode: StorageModeType         │ │
│  │   theme, etc.)  │    │  - google_drive_path: str        │ │
│  └─────────────────┘    │  - last_sync_at: datetime        │ │
│                         └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    │ 若 mode = google_drive
                                    ▼
                    ┌───────────────────────────────┐
                    │      GoogleAuthToken          │
                    │   (加密儲存於獨立檔案)          │
                    │  - access_token (encrypted)   │
                    │  - refresh_token (encrypted)  │
                    │  - user_email                 │
                    └───────────────────────────────┘
```

---

## 狀態轉換

### StorageMode 狀態轉換

```
                    ┌─────────────────┐
                    │     local       │
                    │   (預設狀態)     │
                    └────────┬────────┘
                             │
                             │ [使用者選擇 Google Drive 模式]
                             │ [且已完成 Google 授權]
                             ▼
                    ┌─────────────────┐
                    │  google_drive   │
                    └────────┬────────┘
                             │
                             │ [使用者切換回本地]
                             │ [或授權失效]
                             ▼
                    ┌─────────────────┐
                    │     local       │
                    └─────────────────┘
```

### GoogleAuthStatus 狀態轉換

```
    ┌──────────────────┐
    │  not_connected   │ ◄────────────────────────────────┐
    │    (初始狀態)     │                                   │
    └────────┬─────────┘                                   │
             │                                             │
             │ [使用者完成 OAuth 授權]                       │
             ▼                                             │
    ┌──────────────────┐                                   │
    │    connected     │                                   │
    └────────┬─────────┘                                   │
             │                                             │
             ├──────────────────────┐                      │
             │                      │                      │
             │ [Token 過期]         │ [使用者登出]          │
             ▼                      │                      │
    ┌──────────────────┐            │                      │
    │     expired      │────────────┼──────────────────────┘
    └────────┬─────────┘            │
             │                      │
             │ [自動刷新成功]        │
             ▼                      │
    ┌──────────────────┐            │
    │    connected     │◄───────────┘
    └──────────────────┘
```

---

## 檔案儲存結構

### settings.json 結構更新

```json
{
  "ui": {
    "panels": { ... },
    "theme": { ... }
  },
  "storage": {
    "mode": "local",
    "google_drive_path": "WorkPlanByCalendar",
    "last_sync_at": null
  }
}
```

### google_auth.json 結構（加密）

```json
{
  "access_token": "<ENCRYPTED_VALUE>",
  "refresh_token": "<ENCRYPTED_VALUE>",
  "token_expiry": "2025-11-30T12:00:00Z",
  "user_email": "user@example.com",
  "scopes": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "created_at": "2025-11-30T10:00:00Z",
  "updated_at": "2025-11-30T10:00:00Z",
  "_encrypted_fields": ["access_token", "refresh_token"]
}
```

---

## 驗證規則彙整

| 欄位 | 規則 | 錯誤訊息 |
|-----|------|---------|
| `storage.mode` | 必須為 `local` 或 `google_drive` | 無效的儲存模式 |
| `storage.google_drive_path` | 長度 1-255 字元 | 路徑長度必須在 1-255 字元之間 |
| `storage.google_drive_path` | 不可包含 `..` | 路徑不可包含 ".." |
| `storage.google_drive_path` | 不可以 `/` 開頭 | 路徑必須為相對路徑 |
| `storage.mode = google_drive` | GoogleAuth 狀態必須為 `connected` | 請先連結 Google 帳號 |

---

## API 請求/回應模型

### GoogleAuthCallbackRequest

OAuth 回調請求

```python
class GoogleAuthCallbackRequest(BaseModel):
    code: str  # Authorization Code
    redirect_uri: str
```

### StorageModeUpdateRequest

儲存模式更新請求

```python
class StorageModeUpdateRequest(BaseModel):
    mode: StorageModeType
    google_drive_path: Optional[str] = None
```

### StorageStatusResponse

儲存狀態回應

```python
class StorageStatusResponse(BaseModel):
    mode: StorageModeType
    google_drive_path: Optional[str]
    google_auth: GoogleAuthInfo
    is_ready: bool  # 當前模式是否可用
```
