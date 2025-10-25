# Quickstart Guide: 資料匯出匯入功能

**Feature**: 001-data-export-import  
**目的**: 快速了解如何實作和測試資料匯出/匯入功能  
**預計閱讀時間**: 10 分鐘

## 概述

本功能讓使用者能夠:
1. **匯出**: 將所有工作計畫資料打包成 ZIP 檔案下載
2. **驗證**: 上傳 ZIP 檔案並檢查格式是否正確
3. **匯入**: 將驗證通過的資料寫入系統

## 架構總覽

```text
前端 (settings-modal.js)
    ↓ POST /api/export/create
後端 (data_export_service.py)
    ↓ 建立 ZIP
    ↓ 回傳 ExportResponse
前端
    ↓ GET /api/export/download/{filename}
下載 ZIP 檔案

---

前端 (settings-modal.js)
    ↓ POST /api/import/validate (multipart/form-data)
後端 (data_export_service.py)
    ↓ 驗證格式
    ↓ 回傳 ImportValidation
前端顯示驗證結果
    ↓ (若通過) 使用者點擊「確認匯入」
    ↓ POST /api/import/execute
後端
    ↓ 執行匯入 (原子性操作)
    ↓ 回傳 ImportSuccessResponse
前端顯示成功訊息
```

## 最小變更策略

### 後端變更 (3 個檔案)

1. **新增**: `backend/data_export_service.py` (核心邏輯)
2. **修改**: `backend/models.py` (新增 3 個 Pydantic 模型)
3. **修改**: `backend/main.py` (新增 4 個端點)

### 前端變更 (3 個檔案)

1. **修改**: `static/js/settings-modal.js` (新增 UI 和處理邏輯)
2. **修改**: `static/js/api.js` (新增 API 呼叫方法)
3. **修改**: `frontend/index.html` (設定頁面新增按鈕,可選)

### 測試檔案 (2 個新增)

1. **新增**: `tests/test_data_export_service.py` (單元測試)
2. **新增**: `tests/test_export_import_api.py` (整合測試)

## 實作步驟 (建議順序)

### Phase 1: 後端核心功能 (2-3 小時)

**Step 1.1: 定義資料模型**

編輯 `backend/models.py`:

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class ErrorType(str, Enum):
    STRUCTURE = "structure"
    FILENAME = "filename"
    DATE = "date"
    WEEKDAY = "weekday"
    SIZE = "size"

class ValidationError(BaseModel):
    error_type: ErrorType
    file_path: str
    message: str
    details: Optional[str] = None

class ImportValidation(BaseModel):
    is_valid: bool
    errors: List[ValidationError] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    file_count: int = Field(ge=0)
    validated_at: str

class ExportResponse(BaseModel):
    filename: str
    file_size: int = Field(ge=0)
    created_at: str
    file_count: int = Field(ge=0)
    download_url: str

class ImportSuccessResponse(BaseModel):
    success: bool
    message: str
    file_count: int = Field(ge=0)
    overwritten_count: int = Field(ge=0)
    imported_at: str
```

**Step 1.2: 實作匯出服務**

建立 `backend/data_export_service.py` (參考 `research.md` 的程式碼範例):

```python
from pathlib import Path
from datetime import datetime
import zipfile
import tempfile
import shutil
from typing import Tuple

DATA_DIR = Path("backend/data")
TEMP_DIR = Path("/tmp")

def create_export_zip() -> Tuple[Path, int]:
    """建立匯出 ZIP 檔案,回傳 (檔案路徑, 檔案數量)"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"export_data_{timestamp}.zip"
    zip_path = TEMP_DIR / filename
    
    file_count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for item in DATA_DIR.rglob("*"):
            if item.is_file():
                arcname = item.relative_to(DATA_DIR.parent)
                zipf.write(item, arcname)
                file_count += 1
    
    return zip_path, file_count

# 更多函數見 research.md...
```

**Step 1.3: 新增 API 端點**

編輯 `backend/main.py`:

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from backend.data_export_service import (
    create_export_zip, validate_zip_file, execute_import
)
from backend.models import (
    ExportResponse, ImportValidation, ImportSuccessResponse
)

@app.post("/api/export/create", response_model=ExportResponse)
async def export_data():
    zip_path, file_count = create_export_zip()
    file_size = zip_path.stat().st_size
    created_at = datetime.now().isoformat()
    
    return ExportResponse(
        filename=zip_path.name,
        file_size=file_size,
        created_at=created_at,
        file_count=file_count,
        download_url=f"/api/export/download/{zip_path.name}"
    )

@app.get("/api/export/download/{filename}")
async def download_export(filename: str):
    file_path = Path("/tmp") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="檔案不存在")
    return FileResponse(file_path, filename=filename)

@app.post("/api/import/validate", response_model=ImportValidation)
async def validate_import(file: UploadFile = File(...)):
    return await validate_zip_file(file)

@app.post("/api/import/execute", response_model=ImportSuccessResponse)
async def import_data(file: UploadFile = File(...)):
    validation = await validate_zip_file(file)
    if not validation.is_valid:
        raise HTTPException(status_code=400, detail=validation)
    
    return await execute_import(file)
```

### Phase 2: 前端整合 (1-2 小時)

**Step 2.1: 新增 API 呼叫方法**

編輯 `static/js/api.js`:

```javascript
const API = {
    // 現有方法...
    
    async exportData() {
        const response = await fetch('/api/export/create', {
            method: 'POST'
        });
        if (!response.ok) throw new Error('匯出失敗');
        return await response.json();
    },
    
    async downloadExport(filename) {
        window.location.href = `/api/export/download/${filename}`;
    },
    
    async validateImport(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/import/validate', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('驗證失敗');
        return await response.json();
    },
    
    async executeImport(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/import/execute', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('匯入失敗');
        return await response.json();
    }
};
```

**Step 2.2: 新增 UI 和處理邏輯**

編輯 `static/js/settings-modal.js`:

```javascript
class SettingsManager {
    // 現有方法...
    
    async handleExport() {
        try {
            Utils.showLoading('正在匯出資料...');
            const result = await API.exportData();
            Utils.showSuccess(`成功匯出 ${result.file_count} 個檔案`);
            
            // 觸發下載
            await API.downloadExport(result.filename);
        } catch (error) {
            Utils.showError('匯出失敗: ' + error.message);
        }
    }
    
    async handleImport(file) {
        try {
            // 先驗證
            Utils.showLoading('正在驗證檔案格式...');
            const validation = await API.validateImport(file);
            
            if (!validation.is_valid) {
                this.showValidationErrors(validation.errors);
                return;
            }
            
            // 確認匯入
            if (!confirm(`驗證通過!\n將匯入 ${validation.file_count} 個檔案。\n同名檔案將被覆蓋,是否繼續?`)) {
                return;
            }
            
            // 執行匯入
            Utils.showLoading('正在匯入資料...');
            const result = await API.executeImport(file);
            Utils.showSuccess(result.message);
            
            // 提示重新整理
            if (confirm('匯入成功!是否重新整理頁面查看新資料?')) {
                location.reload();
            }
        } catch (error) {
            Utils.showError('匯入失敗: ' + error.message);
        }
    }
    
    showValidationErrors(errors) {
        const message = errors.map(e => `${e.file_path}: ${e.message}`).join('\n');
        alert(`格式驗證失敗:\n\n${message}`);
    }
    
    initExportImportUI() {
        // 在設定頁面新增按鈕
        const container = document.querySelector('.settings-data-section');
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '匯出資料';
        exportBtn.onclick = () => this.handleExport();
        
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.zip';
        importInput.onchange = (e) => this.handleImport(e.target.files[0]);
        
        const importBtn = document.createElement('button');
        importBtn.textContent = '匯入資料';
        importBtn.onclick = () => importInput.click();
        
        container.append(exportBtn, importBtn, importInput);
    }
}

// 初始化時呼叫
document.addEventListener('DOMContentLoaded', () => {
    const settings = new SettingsManager();
    settings.initExportImportUI();
});
```

### Phase 3: 測試 (1 小時)

**Step 3.1: 單元測試**

建立 `tests/test_data_export_service.py`:

```python
import pytest
from backend.data_export_service import validate_filename, is_sunday

def test_validate_filename_day():
    assert validate_filename("20251025.md", "Day") == True
    assert validate_filename("2025130.md", "Day") == False  # 7 位數
    assert validate_filename("20251301.md", "Day") == False  # 無效日期

def test_validate_filename_week():
    assert validate_filename("20251019.md", "Week") == True  # 星期日
    assert validate_filename("20251020.md", "Week") == False  # 星期一

# 更多測試...
```

**Step 3.2: 手動測試清單**

1. ✅ 匯出空資料目錄
2. ✅ 匯出包含 100 個檔案的資料
3. ✅ 上傳正確格式的 ZIP 檔案
4. ✅ 上傳包含格式錯誤的 ZIP 檔案
5. ✅ 驗證錯誤訊息是否清楚
6. ✅ 匯入後檢查資料完整性
7. ✅ 測試同名檔案覆蓋行為

## 常見問題

### Q1: ZIP 檔案儲存在哪裡?

A: 暫時儲存在 `/tmp` 目錄,下載後可選擇性清理。建議定期清理舊檔案。

### Q2: 如何處理大檔案上傳?

A: FastAPI 預設上傳大小無限制,但應在 Nginx/reverse proxy 設定限制。本功能限制 100MB。

### Q3: 如果匯入過程中斷電怎麼辦?

A: 使用臨時目錄 + 原子性移動策略,中斷時原始資料不受影響。

### Q4: 可以匯入部分資料嗎?

A: 不行,驗證失敗會完全阻止匯入,確保資料完整性。

## 效能指標

| 操作 | 資料量 | 目標時間 | 實際測試 |
|------|--------|----------|----------|
| 匯出 | 1000 檔案 | <3s | TBD |
| 驗證 | 1000 檔案 | <5s | TBD |
| 匯入 | 1000 檔案 | <10s | TBD |
| 下載 | 10MB ZIP | <1s | TBD |

## 下一步

完成實作後:
1. 執行 `/speckit.tasks` 生成詳細的任務清單
2. 開始逐一實作和測試
3. 更新本文件的「實際測試」欄位

## 參考文件

- [spec.md](./spec.md) - 功能規格
- [research.md](./research.md) - 技術研究
- [data-model.md](./data-model.md) - 資料模型
- [contracts/export-api.yaml](./contracts/export-api.yaml) - 匯出 API 規格
- [contracts/import-api.yaml](./contracts/import-api.yaml) - 匯入 API 規格
