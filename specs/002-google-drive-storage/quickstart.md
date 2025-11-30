# Quickstart: Google Drive 儲存整合

本文件提供 Google Drive 儲存整合功能的快速開發指南。

## 前置需求

### 1. Google Cloud Console 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 Google Drive API：
   - 前往「API 和服務」>「已啟用的 API 和服務」
   - 點擊「+ 啟用 API 和服務」
   - 搜尋「Google Drive API」並啟用
4. 建立 OAuth 2.0 憑證：
   - 前往「API 和服務」>「憑證」
   - 點擊「建立憑證」>「OAuth 用戶端 ID」
   - 選擇「網路應用程式」
   - 設定授權的 JavaScript 來源：`http://localhost:8000`
   - 設定授權的重新導向 URI：`http://localhost:8000/auth/callback`
   - 記下 Client ID 和 Client Secret

### 2. 環境變數設定

建立 `.env` 檔案（不要 commit 到版本控制）：

```bash
# Google OAuth 設定
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Token 加密金鑰（首次執行會自動產生）
GOOGLE_TOKEN_ENCRYPTION_KEY=your-encryption-key
```

### 3. 安裝依賴

```bash
# 安裝後端依賴
pip install google-api-python-client google-auth-oauthlib google-auth cryptography
```

## 開發指南

### 後端開發流程

#### Step 1: 實作 StorageProvider 基類

```python
# backend/storage/base.py
from abc import ABC, abstractmethod
from typing import Dict, Optional

class StorageProvider(ABC):
    """儲存提供者抽象基類"""
    
    @abstractmethod
    def read_file(self, relative_path: str) -> str:
        """讀取檔案內容，不存在則返回空字串"""
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
        """刪除檔案，返回是否成功"""
        pass
    
    @abstractmethod
    def ensure_directory(self, relative_path: str) -> None:
        """確保目錄存在"""
        pass
    
    @abstractmethod
    def get_file_stats(self, relative_path: str) -> Dict:
        """取得檔案統計資訊"""
        pass
```

#### Step 2: 實作 LocalStorageProvider

```python
# backend/storage/local.py
from pathlib import Path
from datetime import datetime
from .base import StorageProvider

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
    
    def read_file(self, relative_path: str) -> str:
        file_path = self.base_dir / relative_path
        if file_path.exists():
            return file_path.read_text(encoding='utf-8')
        return ""
    
    def write_file(self, relative_path: str, content: str) -> None:
        file_path = self.base_dir / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding='utf-8')
    
    def file_exists(self, relative_path: str) -> bool:
        return (self.base_dir / relative_path).exists()
    
    def delete_file(self, relative_path: str) -> bool:
        file_path = self.base_dir / relative_path
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    def ensure_directory(self, relative_path: str) -> None:
        (self.base_dir / relative_path).mkdir(parents=True, exist_ok=True)
    
    def get_file_stats(self, relative_path: str) -> dict:
        file_path = self.base_dir / relative_path
        if file_path.exists():
            stat = file_path.stat()
            return {
                'created_at': datetime.fromtimestamp(stat.st_ctime),
                'updated_at': datetime.fromtimestamp(stat.st_mtime)
            }
        return {
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
```

#### Step 3: 實作 GoogleDriveStorageProvider

```python
# backend/storage/google_drive.py
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from .base import StorageProvider
import io

class GoogleDriveStorageProvider(StorageProvider):
    def __init__(self, credentials, root_folder_path: str):
        self.service = build('drive', 'v3', credentials=credentials)
        self.root_folder_path = root_folder_path
        self._folder_cache = {}  # 快取資料夾 ID
    
    def read_file(self, relative_path: str) -> str:
        file_id = self._find_file(relative_path)
        if not file_id:
            return ""
        
        request = self.service.files().get_media(fileId=file_id)
        content = io.BytesIO()
        downloader = MediaIoBaseDownload(content, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return content.getvalue().decode('utf-8')
    
    def write_file(self, relative_path: str, content: str) -> None:
        # 實作檔案寫入邏輯
        pass
    
    # ... 其他方法實作
```

### 前端開發流程

#### Step 1: 載入 Google Identity Services

```html
<!-- frontend/index.html -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

#### Step 2: 實作 GoogleAuthManager

```javascript
// static/js/google-auth.js
class GoogleAuthManager {
    constructor() {
        this.clientId = null;
        this.isInitialized = false;
    }
    
    async init() {
        // 從後端取得 Client ID
        const response = await fetch('/api/auth/google/config');
        const config = await response.json();
        this.clientId = config.client_id;
        
        google.accounts.id.initialize({
            client_id: this.clientId,
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
        });
        
        this.isInitialized = true;
    }
    
    async handleCredentialResponse(response) {
        // 將 credential 傳送到後端處理
        const result = await fetch('/api/auth/google/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                credential: response.credential 
            })
        });
        
        if (result.ok) {
            const authInfo = await result.json();
            this.onAuthSuccess(authInfo);
        }
    }
    
    showLoginButton(containerId) {
        google.accounts.id.renderButton(
            document.getElementById(containerId),
            { 
                theme: 'outline', 
                size: 'large',
                text: 'signin_with',
                locale: 'zh_TW'
            }
        );
    }
    
    onAuthSuccess(authInfo) {
        // 通知應用程式授權成功
        window.dispatchEvent(new CustomEvent('google-auth-success', {
            detail: authInfo
        }));
    }
}

window.googleAuthManager = new GoogleAuthManager();
```

## 測試指南

### 單元測試

```python
# tests/test_storage_provider.py
import pytest
from backend.storage.local import LocalStorageProvider

def test_local_read_write(tmp_path):
    provider = LocalStorageProvider(tmp_path)
    
    # 測試寫入
    provider.write_file("test.md", "# Test")
    
    # 測試讀取
    content = provider.read_file("test.md")
    assert content == "# Test"

def test_local_file_not_exists(tmp_path):
    provider = LocalStorageProvider(tmp_path)
    content = provider.read_file("nonexistent.md")
    assert content == ""
```

### 整合測試（使用 Mock）

```python
# tests/test_google_drive.py
import pytest
from unittest.mock import Mock, patch
from backend.storage.google_drive import GoogleDriveStorageProvider

@pytest.fixture
def mock_credentials():
    return Mock()

def test_google_drive_read_file(mock_credentials):
    with patch('backend.storage.google_drive.build') as mock_build:
        # 設定 mock 行為
        mock_service = Mock()
        mock_build.return_value = mock_service
        
        provider = GoogleDriveStorageProvider(
            mock_credentials, 
            "WorkPlanByCalendar"
        )
        
        # 測試讀取邏輯
        # ...
```

## 常見問題

### Q: 如何處理 Token 過期？

A: 系統會自動使用 Refresh Token 更新 Access Token。如果 Refresh Token 也過期，會自動導向重新授權。

### Q: 本地模式和 Google Drive 模式可以同時使用嗎？

A: 目前設計為單一模式，使用者需明確選擇其中一種。未來可考慮新增同步功能。

### Q: 資料會加密嗎？

A: Token 會使用 Fernet 加密儲存。計畫內容本身不加密（與本地模式行為一致）。
