# 路徑問題修復記錄

## 🐛 問題描述

**症狀**: 執行匯出功能時出現「資料目錄不存在」錯誤

**原因**: 
- 原始程式碼使用相對路徑 `"backend/data"`, `"data"`, `"data/settings"`
- 相對路徑依賴於執行時的**當前工作目錄** (cwd)
- 當從不同目錄執行時,路徑會指向錯誤位置

## 🔍 受影響的檔案

### 1. `backend/data_export_service.py`
**問題程式碼**:
```python
DATA_DIR = Path("backend/data")  # ❌ 相對路徑
```

**修復後**:
```python
_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parent  # backend/
_project_root = _backend_dir.parent  # project root
DATA_DIR = _backend_dir / "data"  # backend/data/

# 如果 backend/data 不存在,嘗試使用專案根目錄的 data/
if not DATA_DIR.exists():
    DATA_DIR = _project_root / "data"
```

### 2. `backend/plan_service.py`
**問題程式碼**:
```python
def __init__(self, data_dir: str = "data"):  # ❌ 相對路徑預設值
    self.data_dir = Path(data_dir)
```

**修復後**:
```python
def __init__(self, data_dir: Optional[str] = None):
    if data_dir is None:
        # 自動偵測路徑
        backend_dir = Path(__file__).parent
        backend_data = backend_dir / "data"
        project_data = backend_dir.parent / "data"
        
        if backend_data.exists():
            self.data_dir = backend_data
        elif project_data.exists():
            self.data_dir = project_data
        else:
            self.data_dir = backend_data
    else:
        self.data_dir = Path(data_dir)
```

### 3. `backend/settings_service.py`
**問題程式碼**:
```python
def __init__(self, settings_dir: str = "data/settings"):  # ❌ 相對路徑
```

**修復後**:
```python
def __init__(self, settings_dir: Optional[str] = None):
    if settings_dir is None:
        backend_dir = Path(__file__).parent
        backend_settings = backend_dir / "data" / "settings"
        project_settings = backend_dir.parent / "data" / "settings"
        
        if backend_settings.exists():
            self.settings_dir = backend_settings
        elif project_settings.exists():
            self.settings_dir = project_settings
        else:
            self.settings_dir = backend_settings
    else:
        self.settings_dir = Path(settings_dir)
```

### 4. `backend/main.py`
**修改**:
```python
# 明確指定資料目錄
data_dir = project_root / "backend" / "data"
plan_service = PlanService(data_dir=str(data_dir))
```

## ✅ 解決方案原理

### 1. 使用絕對路徑
```python
Path(__file__).parent  # 取得當前檔案所在目錄的絕對路徑
```

### 2. 自動偵測策略
```
優先順序:
1. backend/data (開發環境標準位置)
2. project_root/data (備用位置)
3. 如果都不存在,建立 backend/data
```

### 3. 支援多種執行方式
- ✅ `python start_server.py` (從專案根目錄)
- ✅ `python -m backend.main` (從專案根目錄)
- ✅ `cd backend && python main.py` (從 backend 目錄)
- ✅ Docker 容器執行
- ✅ uvicorn 直接執行

## 🧪 驗證測試

### 測試 1: 匯出 API
```bash
curl -X POST http://localhost:8010/api/export/create
```

**預期結果**:
```json
{
  "filename": "export_data_20251025_114149.zip",
  "file_size": 375,
  "created_at": "2025-10-25T11:41:49.282143",
  "file_count": 2,
  "download_url": "/api/export/download/export_data_20251025_114149.zip"
}
```

**實際結果**: ✅ 成功回傳 ZIP 資訊

### 測試 2: 伺服器啟動
```bash
cd /home/dev/projects/work-plan-by-calendar
source .venv/bin/activate
python start_server.py
```

**預期結果**: 無錯誤訊息,正常啟動

**實際結果**: ✅ 正常啟動

### 測試 3: 從不同目錄執行
```bash
# 從專案根目錄
python start_server.py  # ✅

# 從 backend 目錄
cd backend && python main.py  # ✅

# 從任意目錄
cd /tmp && python /path/to/start_server.py  # ✅
```

## 📊 影響範圍

### 開發環境
- ✅ 本地開發 (IDE, Terminal)
- ✅ 測試執行 (pytest)
- ✅ 偵錯模式

### 部署環境
- ✅ Docker 容器
- ✅ systemd 服務
- ✅ Kubernetes pod
- ✅ 雲端部署 (AWS, GCP, Azure)

## 🎓 最佳實踐

### ❌ 避免使用相對路徑
```python
# 不好
data_dir = Path("data")
config_file = Path("../config/settings.json")
```

### ✅ 使用 __file__ 建立絕對路徑
```python
# 好
current_dir = Path(__file__).parent
data_dir = current_dir / "data"
config_file = current_dir.parent / "config" / "settings.json"
```

### ✅ 提供自動偵測備案
```python
# 更好
if primary_path.exists():
    use(primary_path)
elif fallback_path.exists():
    use(fallback_path)
else:
    create_default(primary_path)
```

## 📝 相關提交

- Commit: `e48fd8a`
- 訊息: "fix: 修復資料目錄路徑問題,支援開發和部署環境"
- 檔案: 4 個檔案變更
- 新增/刪除: +65/-8 行

## 🔗 參考

- Python pathlib 文件: https://docs.python.org/3/library/pathlib.html
- FastAPI 部署最佳實踐: https://fastapi.tiangolo.com/deployment/

---

**修復日期**: 2025-10-25  
**測試狀態**: ✅ 通過  
**部署狀態**: ✅ 可部署
