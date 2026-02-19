# API Contracts: 本地與 Google Drive 同步功能

**Updated**: 2026-02-19

---

## 端點總覽

| 端點 | 方法 | 說明 | 需要 Google 登入 |
|------|------|------|:-:|
| `/api/sync/compare` | GET | 比較本地與 Google Drive 的所有計畫檔案 | ✅ |
| `/api/sync/execute` | POST | 執行選定的同步操作 | ✅ |

---

## GET /api/sync/compare

### 說明
比較本地 `data/` 目錄（Year/Month/Week/Day）與 Google Drive 對應路徑的所有計畫檔案，使用 MD5 hash 判斷差異。

### 前提條件
- Google 帳號已連線（`GoogleAuthStatus == CONNECTED`）
- Google Drive 路徑已設定

### 請求
```
GET /api/sync/compare
```
無任何請求參數。

### 成功回應（200 OK）

```json
{
    "files": [
        {
            "relative_path": "Year/2025.md",
            "status": "same",
            "local_modified_at": "2026-01-01T10:00:00Z",
            "cloud_modified_at": "2026-01-01T10:00:00Z",
            "local_md5": "d41d8cd98f00b204e9800998ecf8427e",
            "cloud_md5": "d41d8cd98f00b204e9800998ecf8427e",
            "diff_stats": null,
            "suggested_action": "skip"
        },
        {
            "relative_path": "Month/202602.md",
            "status": "different",
            "local_modified_at": "2026-02-19T09:00:00Z",
            "cloud_modified_at": "2026-02-18T08:00:00Z",
            "local_md5": "abc123def456abc123def456abc123de",
            "cloud_md5": "789xyz000789xyz000789xyz000789xy",
            "diff_stats": {
                "local_lines": 42,
                "cloud_lines": 38,
                "added_lines": 0,
                "removed_lines": 4
            },
            "suggested_action": "skip"
        },
        {
            "relative_path": "Day/20260219.md",
            "status": "local_only",
            "local_modified_at": "2026-02-19T09:30:00Z",
            "cloud_modified_at": null,
            "local_md5": "111222333444555666777888999000aa",
            "cloud_md5": null,
            "diff_stats": null,
            "suggested_action": "upload"
        }
    ],
    "total_local_only": 1,
    "total_cloud_only": 0,
    "total_same": 1,
    "total_different": 1,
    "compared_at": "2026-02-19T10:05:30Z"
}
```

### 錯誤回應

| 狀態碼 | 原因 | 回應範例 |
|--------|------|---------|
| 400 | Google Drive 模式未設定或路徑無效 | `{"detail": "Google Drive 路徑未設定"}` |
| 401 | Google 授權未連線或已過期 | `{"detail": "Google 授權已過期，請重新登入"}` |
| 503 | Google Drive API 連線失敗 | `{"detail": "無法連線至 Google Drive，請檢查網路"}` |

---

## POST /api/sync/execute

### 說明
依據使用者選擇的操作，批次執行同步（上傳至 Google Drive 或下載至本地）。跳過（skip）的檔案不應出現在請求中。

### 前提條件
- Google 帳號已連線
- `operations` 清單不可為空

### 請求

```
POST /api/sync/execute
Content-Type: application/json
```

```json
{
    "operations": [
        {
            "file_path": "Day/20260219.md",
            "action": "upload"
        },
        {
            "file_path": "Month/202601.md",
            "action": "download"
        }
    ]
}
```

### 欄位說明
| 欄位 | 類型 | 說明 |
|------|------|------|
| `operations` | `Array` | 要執行的操作清單（最少 1 筆） |
| `operations[].file_path` | `string` | 相對路徑，如 `"Year/2025.md"` |
| `operations[].action` | `"upload" \| "download"` | 操作方向（不接受 `"skip"`） |

### 成功回應（200 OK）

```json
{
    "total": 2,
    "success_count": 2,
    "failed_count": 0,
    "results": [
        {
            "file_path": "Day/20260219.md",
            "action": "upload",
            "success": true,
            "error_message": null
        },
        {
            "file_path": "Month/202601.md",
            "action": "download",
            "success": true,
            "error_message": null
        }
    ],
    "executed_at": "2026-02-19T10:10:00Z"
}
```

### 部分失敗回應（200 OK，仍回傳 200 但 failed_count > 0）

```json
{
    "total": 2,
    "success_count": 1,
    "failed_count": 1,
    "results": [
        {
            "file_path": "Day/20260219.md",
            "action": "upload",
            "success": true,
            "error_message": null
        },
        {
            "file_path": "Month/202601.md",
            "action": "download",
            "success": false,
            "error_message": "Google Drive 上找不到此檔案"
        }
    ],
    "executed_at": "2026-02-19T10:10:00Z"
}
```

> **設計決策**: 部分失敗時仍回傳 HTTP 200（而非 207），以簡化前端錯誤處理。前端應檢查 `failed_count > 0` 來顯示警告。

### 錯誤回應（整體失敗）

| 狀態碼 | 原因 | 回應範例 |
|--------|------|---------|
| 400 | 請求格式錯誤（如 operations 為空，或 action = skip） | `{"detail": "操作清單不可為空"}` |
| 401 | Google 授權未連線或已過期 | `{"detail": "Google 授權已過期，請重新登入"}` |
| 503 | Google Drive API 連線失敗 | `{"detail": "無法連線至 Google Drive"}` |

---

## 依賴關係

本功能的 API 依賴以下現有服務：

| 依賴 | 位置 | 用途 |
|------|------|------|
| `LocalStorageProvider` | `backend/storage/local.py` | 列舉與讀寫本地檔案 |
| `GoogleDriveStorageProvider` | `backend/storage/google_drive.py` | 列舉與讀寫 Google Drive 檔案，取得 md5Checksum |
| `GoogleAuthService` | `backend/google_auth_service.py` | 取得授權狀態和 token |
| `SettingsService` | `backend/settings_service.py` | 取得 Google Drive 路徑設定 |

---

## 後端路由實作注意事項

```python
# backend/routers/sync.py

router = APIRouter(prefix="/api/sync", tags=["sync"])

@router.get("/compare", response_model=SyncComparisonResult)
async def compare_files(
    settings_service: SettingsService = Depends(get_settings_service),
    auth_service: GoogleAuthService = Depends(get_auth_service),
):
    # 1. 驗證 Google 授權
    # 2. 取得 Google Drive 路徑
    # 3. 實例化兩個 StorageProvider
    # 4. 呼叫 SyncService.compare()
    ...

@router.post("/execute", response_model=SyncExecuteResult)
async def execute_sync(
    request: SyncExecuteRequest,
    settings_service: SettingsService = Depends(get_settings_service),
    auth_service: GoogleAuthService = Depends(get_auth_service),
):
    # 1. 驗證 Google 授權
    # 2. 實例化兩個 StorageProvider
    # 3. 呼叫 SyncService.execute(request.operations)
    ...
```
