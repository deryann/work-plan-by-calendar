# Data Model: 本地與 Google Drive 同步功能

**Updated**: 2026-02-19

---

## 後端 Pydantic 模型（新增至 `backend/models.py`）

### Enums

```python
class FileSyncStatus(str, Enum):
    """檔案同步狀態"""
    LOCAL_ONLY = "local_only"    # 僅存在本地 data/ 目錄
    CLOUD_ONLY = "cloud_only"    # 僅存在 Google Drive
    SAME = "same"                 # 兩邊 MD5 hash 完全相同
    DIFFERENT = "different"       # 兩邊都有，但 MD5 不同


class SyncAction(str, Enum):
    """同步操作方向"""
    UPLOAD = "upload"            # 將本地檔案上傳至 Google Drive（覆蓋）
    DOWNLOAD = "download"        # 將 Google Drive 檔案下載至本地（覆蓋）
    SKIP = "skip"                # 不執行同步，保持兩端不同
```

---

### FileDiffStats

```python
class FileDiffStats(BaseModel):
    """
    檔案行數差異統計
    僅在 FileSyncStatus.DIFFERENT 時填充
    以「本地為基準」計算差異方向
    """
    local_lines: int             # 本地檔案的行數
    cloud_lines: int             # Google Drive 檔案的行數
    added_lines: int             # 雲端比本地多的行數（cloud > local 時 = cloud - local，否則 0）
    removed_lines: int           # 本地比雲端多的行數（local > cloud 時 = local - cloud，否則 0）

    # 計算邏輯：
    # added_lines = max(0, cloud_lines - local_lines)
    # removed_lines = max(0, local_lines - cloud_lines)
    #
    # UI 顯示格式：
    # "+N" 行（綠色）= added_lines，表示雲端多了 N 行
    # "-M" 行（紅色）= removed_lines，表示本地多了 M 行
    # 若兩者都是 0 但 MD5 不同，表示同行數但內容修改
```

---

### FileSyncInfo

```python
class FileSyncInfo(BaseModel):
    """單一檔案的同步狀態資訊"""
    relative_path: str                        # 相對路徑，如 "Year/2025.md"
    status: FileSyncStatus                    # 同步狀態

    # 本地端資訊（若不存在則為 None）
    local_modified_at: Optional[datetime]     # 本地最後修改時間
    local_md5: Optional[str]                  # 本地 MD5 hash（32 位十六進位字串）

    # 雲端端資訊（若不存在則為 None）
    cloud_modified_at: Optional[datetime]     # Google Drive 最後修改時間
    cloud_md5: Optional[str]                  # Google Drive 的 md5Checksum 欄位

    # 行數差異（僅 DIFFERENT 狀態時有值）
    diff_stats: Optional[FileDiffStats]

    # 建議操作（系統根據狀態自動設定）
    suggested_action: SyncAction

    # 建議操作邏輯：
    # LOCAL_ONLY  → UPLOAD（本地有，雲端沒有，建議上傳）
    # CLOUD_ONLY  → DOWNLOAD（雲端有，本地沒有，建議下載）
    # DIFFERENT   → SKIP（兩邊都有但不同，讓使用者明確選擇）
    # SAME        → SKIP（相同，不需操作）
```

---

### SyncComparisonResult

```python
class SyncComparisonResult(BaseModel):
    """完整的比較結果"""
    files: List[FileSyncInfo]    # 所有比較的檔案（含 SAME 狀態）

    # 各狀態統計
    total_local_only: int        # 僅本地存在的檔案數
    total_cloud_only: int        # 僅雲端存在的檔案數
    total_same: int              # 兩端相同的檔案數
    total_different: int         # 兩端不同的檔案數

    compared_at: datetime        # 比較執行的時間（UTC）
```

---

### SyncOperationRequest（單筆）

```python
class SyncOperationRequest(BaseModel):
    """單筆同步操作請求"""
    file_path: str               # 相對路徑，如 "Year/2025.md"
    action: SyncAction           # 要執行的操作（upload/download）
    # 注意：SKIP 的檔案不應出現在此列表中
```

---

### SyncExecuteRequest（批次）

```python
class SyncExecuteRequest(BaseModel):
    """批次同步操作請求（POST /api/sync/execute 的 body）"""
    operations: List[SyncOperationRequest]   # 要執行的操作清單（不含 SKIP）

    @validator('operations')
    def operations_not_empty(cls, v):
        if len(v) == 0:
            raise ValueError("操作清單不可為空")
        return v
```

---

### SyncOperationResult（單筆結果）

```python
class SyncOperationResult(BaseModel):
    """單筆操作執行結果"""
    file_path: str               # 操作的檔案路徑
    action: SyncAction           # 執行的操作
    success: bool                # 是否成功
    error_message: Optional[str] # 失敗時的錯誤訊息
```

---

### SyncExecuteResult（批次結果）

```python
class SyncExecuteResult(BaseModel):
    """批次同步執行結果（POST /api/sync/execute 的 response）"""
    total: int                           # 總操作數
    success_count: int                   # 成功數
    failed_count: int                    # 失敗數
    results: List[SyncOperationResult]   # 每個操作的詳細結果
    executed_at: datetime                # 執行時間（UTC）
```

---

## 比較邏輯說明

### 比較範圍
```
data/
├── Year/       ← 納入比較
├── Month/      ← 納入比較
├── Week/       ← 納入比較
├── Day/        ← 納入比較
└── settings/   ← 排除（設定檔不同步）
```

### MD5 取得方式
| 端 | 取得方式 |
|----|---------|
| 本地 | `hashlib.md5(content.encode('utf-8')).hexdigest()` |
| Google Drive | Drive API 檔案 metadata 的 `md5Checksum` 欄位（`files.list` 查詢時指定 `fields`） |

> Google Drive 的 `md5Checksum` 是基於檔案內容（bytes）的 MD5，與本地計算方式可能有細微差異（BOM、換行符）。
> 若發現一致性問題，可改為比較 SHA256 或直接下載比較，但優先用 md5Checksum 避免額外的網路請求。

### FileDiffStats 計算（僅 DIFFERENT 狀態）
```python
local_content = local_provider.read_file(relative_path)
cloud_content = cloud_provider.read_file(relative_path)

local_lines = len(local_content.splitlines())
cloud_lines = len(cloud_content.splitlines())

diff_stats = FileDiffStats(
    local_lines=local_lines,
    cloud_lines=cloud_lines,
    added_lines=max(0, cloud_lines - local_lines),
    removed_lines=max(0, local_lines - cloud_lines),
)
```

---

## 前端資料結構（JavaScript）

### SyncComparisonResult 對應
```javascript
// 與後端 Pydantic 模型一一對應
{
    files: [
        {
            relative_path: "Year/2025.md",
            status: "different",          // local_only | cloud_only | same | different
            local_modified_at: "2026-02-19T10:00:00Z",
            cloud_modified_at: "2026-02-18T08:00:00Z",
            local_md5: "abc123...",
            cloud_md5: "def456...",
            diff_stats: {
                local_lines: 50,
                cloud_lines: 55,
                added_lines: 5,
                removed_lines: 0,
            },
            suggested_action: "skip",
        },
        // ...
    ],
    total_local_only: 3,
    total_cloud_only: 1,
    total_same: 12,
    total_different: 2,
    compared_at: "2026-02-19T10:05:00Z",
}
```

### SyncPanel 內部狀態
```javascript
// SyncPanel.state
{
    isVisible: false,
    isComparing: false,
    isSyncing: false,
    comparisonResult: null,          // SyncComparisonResult | null
    userSelections: new Map(),       // Map<filePath: string, action: SyncAction>
    filter: 'all',                   // 'all' | 'local_only' | 'cloud_only' | 'different' | 'same'
    syncProgress: null,              // { current: number, total: number } | null
    syncResult: null,                // SyncExecuteResult | null
}
```
