# Research: Google Drive 儲存整合

**Feature**: 002-google-drive-storage  
**Date**: 2025-11-30

## 研究摘要

本文件記錄 Google Drive 儲存整合功能的技術研究結果，包含 OAuth 2.0 流程、Google Drive API 使用模式、儲存架構設計，以及與現有系統整合的最佳實踐。

---

## 1. Google OAuth 2.0 整合方案

### Decision: 採用 Google Identity Services (GIS) + 後端 Token 管理

### Rationale

1. **安全性**: Access Token 和 Refresh Token 儲存在後端，避免前端暴露敏感資訊
2. **使用者體驗**: GIS 提供現代化的登入 UI，支援 One Tap 登入
3. **維護性**: Google 官方推薦的新一代認證解決方案，取代已棄用的 GAPI Auth2

### Alternatives Considered

| 方案 | 優點 | 缺點 | 結論 |
|-----|------|------|------|
| **GIS + 後端 Token (選用)** | 安全、現代化、官方推薦 | 需要後端儲存 Token | ✅ 採用 |
| 純前端 GAPI | 實作簡單 | Token 暴露於前端、已棄用 | ❌ 不安全 |
| Service Account | 無需使用者授權 | 無法存取使用者個人 Drive | ❌ 不適用 |

### 實作細節

**前端流程**:
```
1. 載入 GIS Library (accounts.google.com/gsi/client)
2. 使用者點擊「連結 Google 帳號」按鈕
3. GIS 開啟 OAuth 授權彈窗
4. 使用者同意後，前端收到 Authorization Code
5. 前端將 Code 傳送到後端 /api/auth/google/callback
6. 後端交換 Code 取得 Access Token + Refresh Token
7. 後端安全儲存 Token，回傳使用者資訊給前端
```

**所需 OAuth Scope**:
- `https://www.googleapis.com/auth/drive.file` - 僅存取應用程式建立的檔案
- `https://www.googleapis.com/auth/userinfo.email` - 取得使用者 email 用於顯示

**為何選擇 `drive.file` 而非 `drive`**:
- 最小權限原則：僅能存取本應用程式建立的檔案/資料夾
- 使用者信任：不會存取使用者其他 Drive 內容
- Google 驗證審核更容易通過

---

## 2. Google Drive API 使用模式

### Decision: 使用 Google Drive API v3 + google-api-python-client

### Rationale

1. **官方支援**: Google 官方維護的 Python SDK
2. **功能完整**: 支援所有 Drive 操作（建立資料夾、上傳、下載、搜尋）
3. **文件完善**: 豐富的範例和文件

### 檔案操作對應

| 本地操作 | Google Drive API 對應 |
|---------|----------------------|
| `Path.read_text()` | `files.get(fileId, media_body)` |
| `Path.write_text()` | `files.create()` / `files.update()` |
| `Path.mkdir()` | `files.create(mimeType='folder')` |
| `Path.exists()` | `files.list(q='name=...')` |
| `Path.unlink()` | `files.delete(fileId)` |

### 資料夾結構映射

```
本地結構:                    Google Drive 結構:
data/                        [root_folder]/
├── Year/                    ├── Year/
│   ├── 2024.md             │   ├── 2024.md
│   └── 2025.md             │   └── 2025.md
├── Month/                   ├── Month/
│   └── 202507.md           │   └── 202507.md
├── Week/                    ├── Week/
│   └── 20250629.md         │   └── 20250629.md
└── Day/                     └── Day/
    └── 20250701.md             └── 20250701.md
```

**[root_folder]** 為使用者在設定中指定的路徑，預設為 `WorkPlanByCalendar`

### 效能優化策略

1. **檔案 ID 快取**: 快取已知檔案/資料夾的 ID，避免重複搜尋
2. **批次操作**: 使用 `batch` API 合併多個請求
3. **增量同步**: 記錄上次同步時間，僅處理變更

---

## 3. 儲存架構設計

### Decision: 採用策略模式 (Strategy Pattern)

### Rationale

1. **遵循最小變更原則**: 不修改現有 `PlanService` 核心邏輯
2. **易於擴展**: 未來可輕鬆新增其他儲存後端（如 Dropbox、OneDrive）
3. **易於測試**: 可使用 Mock StorageProvider 進行單元測試

### Alternatives Considered

| 方案 | 優點 | 缺點 | 結論 |
|-----|------|------|------|
| **策略模式 (選用)** | 低耦合、可擴展、易測試 | 需新增抽象層 | ✅ 採用 |
| 在 PlanService 加 if/else | 快速實作 | 違反開閉原則、難維護 | ❌ 不採用 |
| 繼承 PlanService | 重用程式碼 | 緊耦合、難測試 | ❌ 不採用 |

### 介面設計

```python
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

class StorageProvider(ABC):
    """儲存提供者抽象基類"""
    
    @abstractmethod
    def read_file(self, relative_path: str) -> str:
        """讀取檔案內容"""
        pass
    
    @abstractmethod
    def write_file(self, relative_path: str, content: str) -> None:
        """寫入檔案內容"""
        pass
    
    @abstractmethod
    def file_exists(self, relative_path: str) -> bool:
        """檢查檔案是否存在"""
        pass
    
    @abstractmethod
    def delete_file(self, relative_path: str) -> bool:
        """刪除檔案"""
        pass
    
    @abstractmethod
    def ensure_directory(self, relative_path: str) -> None:
        """確保目錄存在"""
        pass
    
    @abstractmethod
    def get_file_stats(self, relative_path: str) -> dict:
        """取得檔案統計資訊（建立時間、修改時間）"""
        pass
```

### 整合方式

```python
# plan_service.py 整合範例（概念性）
class PlanService:
    def __init__(self, storage_provider: StorageProvider):
        self.storage = storage_provider
    
    def _read_file_content(self, relative_path: str) -> str:
        return self.storage.read_file(relative_path)
    
    def _write_file_content(self, relative_path: str, content: str) -> None:
        self.storage.write_file(relative_path, content)
```

---

## 4. Token 儲存與安全性

### Decision: 加密儲存於本地 JSON 檔案

### Rationale

1. **符合現有架構**: 系統已使用 JSON 檔案儲存設定
2. **簡單可靠**: 無需額外資料庫或服務
3. **安全性足夠**: 使用 Fernet 對稱加密保護敏感資料

### 加密方案

```python
from cryptography.fernet import Fernet
import os

# 金鑰管理
# - 開發環境: 使用環境變數 GOOGLE_TOKEN_ENCRYPTION_KEY
# - 生產環境: 使用環境變數或 secrets 管理系統

def get_encryption_key() -> bytes:
    key = os.getenv('GOOGLE_TOKEN_ENCRYPTION_KEY')
    if not key:
        # 首次執行時生成並提示使用者儲存
        key = Fernet.generate_key()
        print(f"請將以下金鑰設定為環境變數 GOOGLE_TOKEN_ENCRYPTION_KEY:")
        print(key.decode())
    return key.encode() if isinstance(key, str) else key
```

### Token 儲存結構

```json
// data/settings/google_auth.json (加密儲存)
{
  "access_token": "<encrypted>",
  "refresh_token": "<encrypted>",
  "token_expiry": "2025-11-30T12:00:00Z",
  "user_email": "user@example.com",
  "encrypted_at": "2025-11-30T10:00:00Z"
}
```

---

## 5. 錯誤處理與邊界情況

### Decision: 分層錯誤處理 + 使用者友善訊息

### 錯誤類型與處理

| 錯誤類型 | 技術錯誤 | 使用者訊息 | 處理方式 |
|---------|---------|-----------|---------|
| 網路中斷 | `ConnectionError` | 「網路連線中斷，請檢查網路後重試」| 顯示錯誤，建議切換本地模式 |
| 授權過期 | `RefreshError` | 「Google 授權已過期，請重新登入」| 自動嘗試刷新，失敗則導向登入 |
| 儲存空間不足 | `QuotaExceeded` | 「Google Drive 儲存空間不足」| 顯示錯誤，建議清理空間 |
| 檔案不存在 | `FileNotFound` | 空內容（與本地模式行為一致）| 返回空字串，不報錯 |
| API 限流 | `RateLimitError` | 「請求過於頻繁，請稍後重試」| 實作指數退避重試 |

### 重試策略

```python
import time
from functools import wraps

def with_retry(max_retries=3, initial_delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (ConnectionError, RateLimitError) as e:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay)
                    delay *= 2  # 指數退避
        return wrapper
    return decorator
```

---

## 6. 與現有系統整合

### Decision: 最小侵入式整合

### 變更範圍評估

| 檔案 | 變更類型 | 變更說明 |
|-----|---------|---------|
| `backend/plan_service.py` | 小型 | 注入 StorageProvider，修改檔案操作方法 |
| `backend/settings_service.py` | 小型 | 新增儲存模式設定讀寫 |
| `backend/models.py` | 小型 | 新增 StorageMode、GoogleAuth 模型 |
| `backend/main.py` | 小型 | 新增 Google Auth API 端點 |
| `backend/storage/` | 新增 | 全新模組 |
| `static/js/api.js` | 小型 | 新增 Google Auth 相關 API 方法 |
| `static/js/settings-modal.js` | 中型 | 新增 Google Drive 設定 UI |
| `static/js/google-auth.js` | 新增 | 全新模組 |

### 向後相容性

1. **預設本地模式**: 未設定 Google Drive 時，系統行為與現有完全相同
2. **設定結構擴展**: 在 settings.json 新增欄位，不影響現有設定
3. **API 相容**: 不修改現有 API 端點簽名

---

## 7. 依賴套件

### 後端新增依賴

```toml
# pyproject.toml 新增
dependencies = [
    # ... 現有依賴
    "google-api-python-client>=2.100.0",
    "google-auth-oauthlib>=1.1.0",
    "google-auth>=2.23.0",
    "cryptography>=41.0.0",  # Token 加密
]
```

### 前端依賴

```html
<!-- Google Identity Services (透過 CDN) -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

---

## 8. 未解決問題

1. **Google Cloud Console 設定**: 需要建立 OAuth 2.0 Client ID，需要有效的 Domain 進行驗證
2. **應用程式審核**: 使用 `drive.file` scope 可能需要 Google 審核（視使用規模而定）
3. **多裝置同步衝突**: 目前採用「最後儲存者勝出」策略，未來可考慮更複雜的衝突解決機制

---

## 參考資源

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google Drive API v3 Reference](https://developers.google.com/drive/api/v3/reference)
- [google-api-python-client GitHub](https://github.com/googleapis/google-api-python-client)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
