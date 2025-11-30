# Backend Code Review & Refactor 建議

> 審查日期：2025-11-30
> 專案：work-plan-by-calendar

---

## 📋 整體評估

後端程式碼整體架構良好，採用分層設計（API 層、Service 層、Storage 層），並使用策略模式實現儲存抽象。以下針對各模組提出改善建議。

---

## 🔴 高優先度問題

### 1. `main.py` - 例外處理器回傳錯誤

**問題位置：** Line 67-88

```python
@app.exception_handler(IOError)
async def io_error_handler(request, exc):
    return HTTPException(...)  # ❌ 錯誤：應回傳 Response，非 HTTPException

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return HTTPException(...)  # ❌ 同上
```

**問題說明：** FastAPI 的 exception handler 應回傳 `Response` 物件，而非拋出或回傳 `HTTPException`。

**建議修改：**
```python
from fastapi.responses import JSONResponse

@app.exception_handler(IOError)
async def io_error_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="FILE_OPERATION_ERROR",
            message=str(exc),
            details={"request_url": str(request.url)}
        ).dict()
    )
```

---

### 2. `main.py` - 重複的錯誤處理邏輯

**問題位置：** 幾乎所有 endpoint (Line 110-945)

**問題說明：** 每個 endpoint 都有近乎相同的 try-except 結構，導致大量重複程式碼。

**建議重構：** 使用裝飾器或依賴注入統一處理

```python
# 方案 1: 自訂裝飾器
def handle_service_errors(error_code: str, error_message: str):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=ErrorResponse(
                        error=error_code,
                        message=f"{error_message}: {str(e)}",
                        details=kwargs
                    ).dict()
                )
        return wrapper
    return decorator

# 使用方式
@app.get("/api/plans/{plan_type}/{plan_date}")
@handle_service_errors("PLAN_READ_ERROR", "Failed to read plan")
async def get_plan(plan_type: PlanType, plan_date: date):
    return plan_service.get_plan(plan_type, plan_date)
```

---

### 3. `main.py` - import 語句位置不當

**問題位置：** Line 473, 576, 723-724, 278

```python
# Line 473 - 函數內部 import
import re

# Line 576, 723-724 - 函數內部 import
from backend.models import GoogleAuthStatus
from backend.storage import GoogleDriveStorageProvider

# Line 278 - 函數內 import
from datetime import timedelta
```

**建議：** 將所有 import 移至檔案頂部，提升可讀性和效能。

---

### 4. `data_export_service.py` - 模組載入時的副作用

**問題位置：** Line 26-35

```python
_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parent
_project_root = _backend_dir.parent
DATA_DIR = _project_root / "data"

# 如果 data 不存在,建立預設目錄結構
if not DATA_DIR.exists():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for dir_name in ["Day", "Week", "Month", "Year"]:
        (DATA_DIR / dir_name).mkdir(exist_ok=True)
```

**問題說明：** 模組在 import 時就會建立目錄，這種副作用不利於測試和部署靈活性。

**建議重構：**
```python
def get_data_dir() -> Path:
    """取得資料目錄，若不存在則建立"""
    data_dir = Path(__file__).resolve().parent.parent / "data"
    if not data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        for dir_name in ["Day", "Week", "Month", "Year"]:
            (data_dir / dir_name).mkdir(exist_ok=True)
    return data_dir

# 延遲初始化
DATA_DIR: Optional[Path] = None

def _ensure_data_dir() -> Path:
    global DATA_DIR
    if DATA_DIR is None:
        DATA_DIR = get_data_dir()
    return DATA_DIR
```

---

## 🟡 中優先度問題

### 5. `plan_service.py` - 重複程式碼

**問題位置：** `create_plan` (Line 116-143) 與 `update_plan` (Line 145-172)

**問題說明：** 兩個方法有大量重複邏輯（標題處理、檔案寫入、回傳 Plan 物件）

**建議重構：**
```python
def _save_plan(self, plan_type: PlanType, target_date: date, content: str) -> Plan:
    """內部方法：儲存計畫並回傳 Plan 物件"""
    canonical_date = DateCalculator.get_canonical_date(plan_type, target_date)
    relative_path = self._get_relative_path(plan_type, canonical_date)
    file_path_str = str(self.data_dir / relative_path)
    
    # 確保內容有標題
    if not content.strip().startswith('#'):
        title = DateCalculator.format_title(plan_type, canonical_date)
        content = f"{title}\n\n{content}".strip() + "\n"
    
    self._write_file_content(relative_path, content)
    created_at, updated_at = self._get_file_stats(relative_path)
    
    lines = content.strip().split('\n')
    title = lines[0] if lines and lines[0].startswith('#') else DateCalculator.format_title(plan_type, canonical_date)
    
    return Plan(
        type=plan_type,
        date=canonical_date,
        title=title,
        content=content,
        created_at=created_at,
        updated_at=updated_at,
        file_path=file_path_str
    )

def create_plan(self, plan_type: PlanType, target_date: date, content: str) -> Plan:
    return self._save_plan(plan_type, target_date, content)

def update_plan(self, plan_type: PlanType, target_date: date, content: str) -> Plan:
    return self._save_plan(plan_type, target_date, content)
```

---

### 6. `plan_service.py` - `get_plans_existence` 效能問題

**問題位置：** Line 241-281

```python
while current_date <= end_date:
    # 每天迴圈內都 import
    from datetime import timedelta  # ❌ 重複 import
    current_date = current_date + timedelta(days=1)
```

**問題說明：** 
1. 在迴圈內 import 造成不必要開銷
2. 日期範圍大時，可能產生大量 I/O 操作

**建議重構：**
```python
from datetime import timedelta  # 移至檔案頂部

def get_plans_existence(self, start_date: date, end_date: date) -> dict:
    """取得日期範圍內的計畫存在狀態"""
    result = {}
    delta = timedelta(days=1)
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        plan_dates = DateCalculator.get_all_plan_dates_for_date(current_date)
        
        existence_status = {
            plan_type_str: self.plan_exists(PlanType(plan_type_str), plan_dates[plan_type_str])
            for plan_type_str in ["year", "month", "week", "day"]
        }
        
        result[date_str] = existence_status
        current_date += delta
    
    return result
```

---

### 7. `settings_service.py` - 無效的錯誤處理

**問題位置：** Line 61-64

```python
except Exception as e:
    print(f"Error loading settings: {e}")  # ❌ 使用 print 而非 logging
    return self.get_default_settings()
```

**建議改用 logging：**
```python
import logging
logger = logging.getLogger(__name__)

# ...
except Exception as e:
    logger.warning(f"載入設定失敗，使用預設值: {e}")
    return self.get_default_settings()
```

---

### 8. `google_auth_service.py` - 金鑰管理安全性

**問題位置：** Line 55-86 `get_encryption_key()`

```python
if not key:
    # 開發環境：生成新金鑰並提示
    new_key = Fernet.generate_key()
    print("=" * 60)
    print("警告: 未設定 GOOGLE_TOKEN_ENCRYPTION_KEY 環境變數")
    # ...
    return new_key  # ❌ 每次呼叫都可能產生不同金鑰
```

**問題說明：** 若未設定環境變數，每次重啟服務都會產生新金鑰，導致無法解密之前儲存的 token。

**建議重構：**
```python
_cached_key: Optional[bytes] = None

def get_encryption_key() -> bytes:
    global _cached_key
    
    if _cached_key is not None:
        return _cached_key
    
    key = os.getenv('GOOGLE_TOKEN_ENCRYPTION_KEY')
    
    if not key:
        # 嘗試從檔案讀取或生成並儲存
        key_file = Path(__file__).parent.parent / "data" / "settings" / ".encryption_key"
        if key_file.exists():
            key = key_file.read_text().strip()
        else:
            new_key = Fernet.generate_key()
            key_file.parent.mkdir(parents=True, exist_ok=True)
            key_file.write_text(new_key.decode())
            logger.warning(
                "已自動生成加密金鑰。建議設定環境變數 GOOGLE_TOKEN_ENCRYPTION_KEY"
            )
            key = new_key.decode()
    
    _cached_key = key.encode() if isinstance(key, str) else key
    return _cached_key
```

---

### 9. `google_drive.py` - 未使用的 import

**問題位置：** Line 14

```python
from functools import lru_cache  # ❌ 未使用
```

**建議：** 移除未使用的 import。

---

### 10. `models.py` - Pydantic v2 相容性

**問題位置：** 整個檔案

**問題說明：** 使用 `validator` 裝飾器和 `.dict()` 方法，這些在 Pydantic v2 已被取代。

**建議：** 檢查 Pydantic 版本，若使用 v2，應更新為：
- `@validator` → `@field_validator`
- `.dict()` → `.model_dump()`
- `class Config` → `model_config`

---

## 🟢 低優先度建議

### 11. 型別標註改善

**多處問題：** 部分函數缺少回傳型別標註

```python
# plan_service.py Line 45
def _ensure_directories_exist(self):  # 缺少 -> None

# settings_service.py Line 30
def ensure_settings_directory(self):  # 缺少 -> None
```

---

### 12. `main.py` - 硬編碼值

**問題位置：** Line 319

```python
if delta > 60:  # ❌ 魔術數字
    raise ValueError("Date range cannot exceed 60 days")
```

**建議：**
```python
MAX_DATE_RANGE_DAYS = 60

if delta > MAX_DATE_RANGE_DAYS:
    raise ValueError(f"Date range cannot exceed {MAX_DATE_RANGE_DAYS} days")
```

---

### 13. `google_drive.py` - 日誌級別不一致

**問題位置：** Line 318, 441, 458, 482

**建議：** 統一日誌策略
- 成功操作：`DEBUG` 或 `INFO`
- 警告：`WARNING`
- 錯誤：`ERROR`

```python
# 建議分級
logger.debug(f"已讀取檔案: {relative_path}")      # DEBUG for routine ops
logger.info(f"已建立資料夾: {name}")              # INFO for creation
logger.warning(f"取得檔案統計資訊失敗: ...")     # WARNING for recoverable errors
```

---

### 14. 文件字串改善

**問題位置：** `date_calculator.py`

**建議：** 為公開方法添加更詳細的 docstring，包含 Args、Returns、Examples

```python
@staticmethod
def get_week_start(target_date: date) -> date:
    """取得該週的周日日期 (Sunday-based week)
    
    Args:
        target_date: 任意日期
        
    Returns:
        該週的周日日期
        
    Example:
        >>> DateCalculator.get_week_start(date(2025, 11, 26))  # 星期三
        date(2025, 11, 23)  # 該週日
    """
```

---

### 15. 常數定義集中化

**建議：** 建立 `constants.py` 統一管理

```python
# backend/constants.py

# 計畫類型目錄對應
PLAN_TYPE_DIRS = {
    "year": "Year",
    "month": "Month",
    "week": "Week",
    "day": "Day"
}

# 匯出/匯入設定
MAX_ZIP_SIZE = 100 * 1024 * 1024  # 100MB
REQUIRED_DATA_DIRS = ["Day", "Week", "Month", "Year"]

# API 設定
MAX_DATE_RANGE_DAYS = 60
DEFAULT_GOOGLE_DRIVE_PATH = "WorkPlanByCalendar"
```

---

## 📁 建議的專案結構優化

```
backend/
├── __init__.py
├── constants.py          # 新增：常數定義
├── exceptions.py         # 新增：自訂例外類別
├── middleware.py         # 新增：錯誤處理中介軟體
├── main.py
├── models.py
├── services/             # 建議：將服務移入子目錄
│   ├── __init__.py
│   ├── plan_service.py
│   ├── settings_service.py
│   ├── data_export_service.py
│   └── google_auth_service.py
├── storage/
│   ├── __init__.py
│   ├── base.py
│   ├── local.py
│   └── google_drive.py
└── utils/                # 新增：工具函數
    ├── __init__.py
    └── date_calculator.py
```

---

## ✅ 優點與良好實踐

1. **策略模式應用得當** - `StorageProvider` 抽象層設計良好，易於擴展
2. **型別安全** - 大量使用 Pydantic 模型和型別標註
3. **安全性考量** - Zip Slip 防護、路徑穿越檢查、Token 加密
4. **重試機制** - Google Drive API 的指數退避重試實作完整
5. **快取策略** - Google Drive 檔案 ID 快取減少 API 呼叫

---

## 📊 重構優先序

| 優先度 | 項目 | 影響範圍 | 工作量 |
|--------|------|----------|--------|
| 🔴 高 | 例外處理器修正 | 全域錯誤處理 | 小 |
| 🔴 高 | 重複錯誤處理抽取 | main.py | 中 |
| 🔴 高 | 模組載入副作用 | 測試/部署 | 小 |
| 🟡 中 | Service 重複程式碼 | plan_service | 小 |
| 🟡 中 | 效能優化 | 批次查詢 | 小 |
| 🟡 中 | 日誌改善 | 全域 | 小 |
| 🟡 中 | 金鑰管理 | 安全性 | 中 |
| 🟢 低 | 型別標註 | 程式碼品質 | 小 |
| 🟢 低 | 常數集中化 | 維護性 | 小 |

---

## 🔧 快速修復清單

以下是可以立即執行的小型修復：

1. [ ] 修正 `main.py` exception handler 回傳型別
2. [ ] 移動所有函數內 import 至檔案頂部
3. [ ] 移除 `google_drive.py` 未使用的 `lru_cache` import
4. [ ] 將 `settings_service.py` 的 `print` 改為 `logging`
5. [ ] 為 `plan_service.py` 的 `_ensure_directories_exist` 添加 `-> None`
6. [ ] 提取 `MAX_DATE_RANGE_DAYS = 60` 常數
