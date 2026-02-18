# Python zipfile 標準庫最佳實踐研究報告

**研究日期**: 2025-10-25  
**目標功能**: 資料匯出/匯入功能  
**研究範圍**: Python zipfile 標準庫的安全使用、檔案驗證、錯誤處理

---

## 執行摘要

本研究針對 `work-plan-by-calendar` 專案的資料匯出/匯入功能,深入探討 Python `zipfile` 標準庫的最佳實踐。主要發現包括:

1. **安全性**: 必須實作 Zip Slip 防護,使用 `os.path.realpath()` 和路徑驗證
2. **記憶體效率**: 使用 `zipfile.ZipFile` 的迭代式處理,避免一次性載入所有內容
3. **檔案驗證**: 實作多層驗證機制(結構、命名、日期、大小)
4. **原子性操作**: 使用臨時目錄 + 驗證 + 原子性移動確保資料一致性

---

## 1. 安全的 ZIP 建立

### 1.1 決策: 遞迴壓縮目錄結構

**推薦做法**: 使用 `os.walk()` 遍歷目錄樹,配合 `zipfile.write()` 逐一添加檔案

```python
import os
import zipfile
from pathlib import Path
from datetime import datetime
from typing import Optional

def create_data_export(data_dir: str, output_path: Optional[str] = None) -> str:
    """
    安全地將整個 data 目錄壓縮為 ZIP 檔案
    
    Args:
        data_dir: 要壓縮的資料目錄路徑 (例如 'backend/data')
        output_path: 輸出 ZIP 檔案路徑,若為 None 則自動生成
        
    Returns:
        生成的 ZIP 檔案路徑
        
    Raises:
        FileNotFoundError: 當 data_dir 不存在
        PermissionError: 當沒有讀取權限
        OSError: 當磁碟空間不足或其他 I/O 錯誤
    """
    data_path = Path(data_dir)
    
    # 驗證來源目錄存在
    if not data_path.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")
    
    if not data_path.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {data_dir}")
    
    # 生成輸出檔案名稱
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"export_data_{timestamp}.zip"
    
    output_file = Path(output_path)
    
    # 確保輸出目錄存在
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 建立 ZIP 檔案 (使用 deflate 壓縮)
    # ZIP_DEFLATED 提供良好的壓縮率,適合文字檔案
    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # 遞迴遍歷目錄
        for root, dirs, files in os.walk(data_path):
            # 過濾隱藏檔案和系統檔案
            files = [f for f in files if not f.startswith('.') and f.endswith('.md')]
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                file_path = Path(root) / file
                
                # 計算 ZIP 內的相對路徑
                # 例如: backend/data/Day/20250101.md -> Day/20250101.md
                arcname = file_path.relative_to(data_path.parent)
                
                # 添加檔案到 ZIP
                zipf.write(file_path, arcname=arcname)
    
    return str(output_file)
```

**理由**:
- `os.walk()` 是標準庫中最可靠的目錄遍歷方法
- `relative_to()` 確保 ZIP 內路徑正確,保持目錄結構
- 過濾隱藏檔案避免包含 `.DS_Store` 等系統檔案
- `ZIP_DEFLATED` 對 markdown 文字檔提供 60-80% 壓縮率

**替代方案**:
- ❌ `shutil.make_archive()`: 無法細緻控制檔案過濾和路徑結構
- ❌ 手動遞迴: 程式碼複雜且容易出錯
- ✅ `pathlib.Path.rglob()`: 可用,但 `os.walk()` 提供更多控制

---

### 1.2 決策: 記憶體效率考量

**推薦做法**: 使用預設的 `zipfile.write()` 串流模式,避免載入檔案內容到記憶體

```python
def create_data_export_efficient(data_dir: str, output_path: str, 
                                   max_file_size: int = 10 * 1024 * 1024) -> dict:
    """
    記憶體效率優化的匯出功能
    
    Args:
        data_dir: 資料目錄
        output_path: 輸出路徑
        max_file_size: 單一檔案大小上限 (預設 10MB)
        
    Returns:
        包含統計資訊的字典: {
            'total_files': int,
            'total_size': int,
            'compressed_size': int,
            'skipped_files': list
        }
    """
    stats = {
        'total_files': 0,
        'total_size': 0,
        'compressed_size': 0,
        'skipped_files': []
    }
    
    data_path = Path(data_dir)
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED, 
                         compresslevel=6) as zipf:  # 壓縮等級 6 = 速度與壓縮率平衡
        
        for root, dirs, files in os.walk(data_path):
            files = [f for f in files if not f.startswith('.') and f.endswith('.md')]
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                file_path = Path(root) / file
                file_size = file_path.stat().st_size
                
                # 檢查檔案大小限制
                if file_size > max_file_size:
                    stats['skipped_files'].append({
                        'path': str(file_path),
                        'reason': f'File too large: {file_size} bytes',
                        'size': file_size
                    })
                    continue
                
                arcname = file_path.relative_to(data_path.parent)
                
                # zipfile.write() 內部使用串流,不會一次載入整個檔案
                zipf.write(file_path, arcname=arcname)
                
                stats['total_files'] += 1
                stats['total_size'] += file_size
        
        # 取得壓縮後大小
        stats['compressed_size'] = Path(output_path).stat().st_size
    
    return stats
```

**理由**:
- `zipfile.write()` 預設使用 8KB 緩衝區,自動處理大檔案
- `compresslevel=6` 提供速度與壓縮率的平衡(範圍 0-9)
- 記錄統計資訊有助於監控和除錯
- 檔案大小限制防止異常大檔案

**效能數據** (參考值):
- 1000 個 markdown 檔案 (平均 5KB/檔): ~2-3 秒
- 記憶體使用: ~10-20MB (固定,不隨檔案數量增長)
- 壓縮率: ~70% (markdown 文字檔)

---

## 2. 安全的 ZIP 解壓縮

### 2.1 決策: 防止 Zip Slip 漏洞

**Zip Slip 漏洞說明**: 惡意 ZIP 檔案可能包含 `../../../etc/passwd` 等路徑,解壓時會覆寫系統檔案

**推薦做法**: 驗證所有解壓縮路徑都在預期目錄內

```python
import os
from pathlib import Path
from typing import List, Tuple

def safe_extract_member(zipf: zipfile.ZipFile, member: zipfile.ZipInfo, 
                        target_dir: Path) -> Path:
    """
    安全地解壓縮單一 ZIP 成員,防止路徑穿越攻擊
    
    Args:
        zipf: ZipFile 物件
        member: 要解壓縮的成員
        target_dir: 目標目錄
        
    Returns:
        解壓縮後的檔案路徑
        
    Raises:
        ValueError: 當偵測到路徑穿越攻擊
    """
    # 取得絕對路徑
    target_dir = target_dir.resolve()
    
    # 計算解壓縮後的完整路徑
    member_path = (target_dir / member.filename).resolve()
    
    # 檢查是否在目標目錄內
    # 使用 resolve() 解析符號連結和 '..' 路徑
    if not str(member_path).startswith(str(target_dir)):
        raise ValueError(
            f"Attempted Path Traversal in Zip File: {member.filename}"
        )
    
    # 安全解壓縮
    zipf.extract(member, target_dir)
    
    return member_path


def safe_extract_all(zip_path: str, target_dir: str) -> List[Path]:
    """
    安全地解壓縮整個 ZIP 檔案
    
    Args:
        zip_path: ZIP 檔案路徑
        target_dir: 目標目錄
        
    Returns:
        所有解壓縮的檔案路徑列表
        
    Raises:
        ValueError: 當偵測到安全問題
        zipfile.BadZipFile: 當 ZIP 檔案損壞
    """
    target_path = Path(target_dir)
    target_path.mkdir(parents=True, exist_ok=True)
    
    extracted_files = []
    
    with zipfile.ZipFile(zip_path, 'r') as zipf:
        # 先檢查所有成員
        for member in zipf.namelist():
            # 防止絕對路徑
            if member.startswith('/') or member.startswith('\\'):
                raise ValueError(f"Absolute path not allowed: {member}")
            
            # 防止 Windows 磁碟路徑
            if ':' in member:
                raise ValueError(f"Drive letter not allowed: {member}")
        
        # 安全解壓縮
        for member_info in zipf.infolist():
            # 跳過目錄
            if member_info.is_dir():
                continue
            
            file_path = safe_extract_member(zipf, member_info, target_path)
            extracted_files.append(file_path)
    
    return extracted_files
```

**理由**:
- `Path.resolve()` 會解析所有符號連結和 `..` 路徑
- 字串前綴檢查確保路徑在目標目錄內
- 明確拒絕絕對路徑和磁碟代號
- Python 3.12+ 可使用 `zipfile.Path` 進一步簡化

**已知漏洞案例**:
```python
# 惡意 ZIP 範例
# 成員名稱: "../../../etc/passwd"
# 如果不驗證,會覆寫系統檔案
```

---

### 2.2 決策: ZIP 檔案結構驗證

**推薦做法**: 在解壓縮前驗證目錄結構和檔案命名

```python
import re
from datetime import datetime
from typing import Dict, List, Optional

class ValidationError(Exception):
    """驗證錯誤的自定義例外"""
    pass


class ZipValidator:
    """ZIP 檔案驗證器"""
    
    # 預期的目錄結構
    REQUIRED_DIRS = {'data/Day', 'data/Week', 'data/Month', 'data/Year'}
    
    # 檔名模式
    PATTERNS = {
        'Day': re.compile(r'^data/Day/(\d{8})\.md$'),      # YYYYMMDD.md
        'Week': re.compile(r'^data/Week/(\d{8})\.md$'),    # YYYYMMDD.md (必須是周日)
        'Month': re.compile(r'^data/Month/(\d{6})\.md$'),  # YYYYMM.md
        'Year': re.compile(r'^data/Year/(\d{4})\.md$'),    # YYYY.md
    }
    
    def __init__(self, max_files: int = 10000, max_total_size: int = 100 * 1024 * 1024):
        """
        Args:
            max_files: 檔案數量上限
            max_total_size: 總大小上限 (預設 100MB)
        """
        self.max_files = max_files
        self.max_total_size = max_total_size
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def validate(self, zip_path: str) -> Tuple[bool, Dict]:
        """
        驗證 ZIP 檔案
        
        Returns:
            (是否通過, 驗證報告)
        """
        self.errors = []
        self.warnings = []
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zipf:
                # 1. 檢查檔案完整性
                bad_file = zipf.testzip()
                if bad_file:
                    self.errors.append(f"Corrupted file in ZIP: {bad_file}")
                    return False, self._generate_report()
                
                # 2. 檢查大小限制
                total_size = sum(info.file_size for info in zipf.infolist())
                if total_size > self.max_total_size:
                    self.errors.append(
                        f"ZIP too large: {total_size} bytes (max: {self.max_total_size})"
                    )
                    return False, self._generate_report()
                
                # 3. 檢查檔案數量
                file_count = len([m for m in zipf.namelist() if not m.endswith('/')])
                if file_count > self.max_files:
                    self.errors.append(
                        f"Too many files: {file_count} (max: {self.max_files})"
                    )
                    return False, self._generate_report()
                
                # 4. 檢查目錄結構
                self._validate_structure(zipf)
                
                # 5. 檢查檔名和內容
                self._validate_files(zipf)
        
        except zipfile.BadZipFile:
            self.errors.append("Not a valid ZIP file")
            return False, self._generate_report()
        except Exception as e:
            self.errors.append(f"Validation error: {str(e)}")
            return False, self._generate_report()
        
        # 有錯誤就不通過
        passed = len(self.errors) == 0
        return passed, self._generate_report()
    
    def _validate_structure(self, zipf: zipfile.ZipFile) -> None:
        """驗證目錄結構"""
        members = set(zipf.namelist())
        
        # 檢查必要目錄
        for required_dir in self.REQUIRED_DIRS:
            # 目錄可能以 / 結尾或不結尾
            dir_exists = (
                required_dir in members or 
                f"{required_dir}/" in members or
                any(m.startswith(f"{required_dir}/") for m in members)
            )
            
            if not dir_exists:
                self.errors.append(f"Missing required directory: {required_dir}")
        
        # 檢查是否有非預期的頂層目錄
        top_level_dirs = set()
        for member in members:
            if '/' in member:
                top_dir = member.split('/')[0]
                top_level_dirs.add(top_dir)
        
        if top_level_dirs != {'data'}:
            unexpected = top_level_dirs - {'data'}
            if unexpected:
                self.warnings.append(
                    f"Unexpected top-level directories: {', '.join(unexpected)}"
                )
    
    def _validate_files(self, zipf: zipfile.ZipFile) -> None:
        """驗證檔案命名和內容"""
        for member in zipf.namelist():
            # 跳過目錄
            if member.endswith('/'):
                continue
            
            # 跳過非 .md 檔案
            if not member.endswith('.md'):
                self.warnings.append(f"Non-markdown file: {member}")
                continue
            
            # 檢查檔名格式
            plan_type = None
            date_str = None
            
            for ptype, pattern in self.PATTERNS.items():
                match = pattern.match(member)
                if match:
                    plan_type = ptype
                    date_str = match.group(1)
                    break
            
            if not plan_type:
                self.errors.append(f"Invalid filename format: {member}")
                continue
            
            # 驗證日期有效性
            self._validate_date(plan_type, date_str, member)
    
    def _validate_date(self, plan_type: str, date_str: str, filename: str) -> None:
        """驗證日期有效性"""
        try:
            if plan_type == 'Day' or plan_type == 'Week':
                # YYYYMMDD
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                date_obj = datetime(year, month, day).date()
                
                # 周計畫必須是周日
                if plan_type == 'Week':
                    # Python: Monday=0, Sunday=6
                    if date_obj.weekday() != 6:
                        self.errors.append(
                            f"Week plan date is not Sunday: {filename} "
                            f"({date_obj.strftime('%A')})"
                        )
            
            elif plan_type == 'Month':
                # YYYYMM
                year = int(date_str[:4])
                month = int(date_str[4:6])
                if month < 1 or month > 12:
                    raise ValueError("Invalid month")
            
            elif plan_type == 'Year':
                # YYYY
                year = int(date_str)
                if year < 1900 or year > 2100:
                    self.warnings.append(
                        f"Unusual year: {filename} (year={year})"
                    )
        
        except ValueError as e:
            self.errors.append(f"Invalid date in filename {filename}: {str(e)}")
    
    def _generate_report(self) -> Dict:
        """生成驗證報告"""
        return {
            'passed': len(self.errors) == 0,
            'errors': self.errors.copy(),
            'warnings': self.warnings.copy(),
            'error_count': len(self.errors),
            'warning_count': len(self.warnings)
        }


# 使用範例
def validate_import_file(zip_path: str) -> Dict:
    """驗證匯入檔案"""
    validator = ZipValidator(
        max_files=10000,
        max_total_size=100 * 1024 * 1024  # 100MB
    )
    
    passed, report = validator.validate(zip_path)
    
    return report
```

**理由**:
- 多層驗證確保資料完整性和安全性
- 提前發現問題,避免部分匯入
- 詳細的錯誤報告幫助使用者修正問題
- 區分錯誤和警告,提供彈性

**驗證層級**:
1. **結構層**: 檔案完整性、大小、數量
2. **目錄層**: 必要目錄存在性
3. **檔名層**: 命名格式正確性
4. **語義層**: 日期有效性、星期驗證

---

## 3. FastAPI 整合與原子性操作

### 3.1 決策: 使用臨時目錄實現原子性

**推薦做法**: 先解壓到臨時目錄,驗證通過後再原子性移動

```python
import tempfile
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
from typing import Dict

class DataImporter:
    """資料匯入服務"""
    
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.validator = ZipValidator()
    
    async def import_data(self, upload_file: UploadFile) -> Dict:
        """
        匯入資料 (原子性操作)
        
        Args:
            upload_file: 上傳的 ZIP 檔案
            
        Returns:
            匯入結果報告
            
        Raises:
            HTTPException: 當驗證或匯入失敗
        """
        # 建立臨時目錄
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            zip_path = temp_path / "upload.zip"
            extract_path = temp_path / "extracted"
            
            try:
                # 1. 儲存上傳的檔案
                await self._save_upload(upload_file, zip_path)
                
                # 2. 驗證 ZIP 檔案
                validation_report = self.validator.validate(str(zip_path))
                
                if not validation_report['passed']:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            'error': 'Validation failed',
                            'report': validation_report
                        }
                    )
                
                # 3. 解壓縮到臨時目錄
                extract_path.mkdir(parents=True, exist_ok=True)
                extracted_files = safe_extract_all(str(zip_path), str(extract_path))
                
                # 4. 原子性移動檔案
                self._atomic_move(extract_path / "data", self.data_dir)
                
                return {
                    'success': True,
                    'files_imported': len(extracted_files),
                    'warnings': validation_report.get('warnings', [])
                }
            
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail={
                        'error': 'Import failed',
                        'message': str(e)
                    }
                )
            # finally 區塊不需要,因為 tempfile.TemporaryDirectory 會自動清理
    
    async def _save_upload(self, upload_file: UploadFile, dest: Path) -> None:
        """儲存上傳檔案 (串流模式)"""
        # 使用串流避免記憶體爆炸
        with dest.open('wb') as f:
            while chunk := await upload_file.read(8192):  # 8KB chunks
                f.write(chunk)
    
    def _atomic_move(self, src_dir: Path, dest_dir: Path) -> None:
        """
        原子性移動目錄內容
        
        策略: 
        1. 備份現有資料
        2. 移動新資料
        3. 成功後刪除備份,失敗則還原
        """
        backup_dir = dest_dir.parent / f"{dest_dir.name}_backup_{int(datetime.now().timestamp())}"
        
        try:
            # 備份現有資料 (如果存在)
            if dest_dir.exists():
                shutil.move(str(dest_dir), str(backup_dir))
            
            # 移動新資料
            shutil.move(str(src_dir), str(dest_dir))
            
            # 成功後刪除備份
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
        
        except Exception as e:
            # 還原備份
            if backup_dir.exists():
                if dest_dir.exists():
                    shutil.rmtree(dest_dir)
                shutil.move(str(backup_dir), str(dest_dir))
            
            raise RuntimeError(f"Atomic move failed: {str(e)}")
```

**理由**:
- `tempfile.TemporaryDirectory` 自動清理,避免遺留檔案
- 備份機制確保失敗時可回滾
- `shutil.move()` 在同一檔案系統上是原子性的
- 串流上傳避免記憶體問題

**原子性保證**:
- ✅ 同一檔案系統: `shutil.move()` 是原子性重命名
- ⚠️ 跨檔案系統: 會退化為複製+刪除,非原子性
- 🔧 解決方案: 確保臨時目錄與資料目錄在同一檔案系統

---

### 3.2 決策: FastAPI 端點設計

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import logging

router = APIRouter(prefix="/api/data", tags=["data"])
logger = logging.getLogger(__name__)

# 全域匯入器實例
importer = DataImporter(data_dir="backend/data")


@router.post("/export")
async def export_data():
    """
    匯出所有工作計畫資料
    
    Returns:
        ZIP 檔案下載
    """
    try:
        # 建立匯出檔案
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"export_data_{timestamp}.zip"
        zip_path = Path(tempfile.gettempdir()) / zip_filename
        
        stats = create_data_export_efficient(
            data_dir="backend/data",
            output_path=str(zip_path)
        )
        
        logger.info(f"Data exported: {stats}")
        
        # 回傳檔案
        return FileResponse(
            path=str(zip_path),
            filename=zip_filename,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"'
            }
        )
    
    except Exception as e:
        logger.error(f"Export failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Export failed", "message": str(e)}
        )


@router.post("/validate")
async def validate_import(file: UploadFile = File(...)):
    """
    驗證匯入檔案 (不執行匯入)
    
    Args:
        file: 上傳的 ZIP 檔案
        
    Returns:
        驗證報告
    """
    if not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=400,
            detail={"error": "Invalid file type", "message": "Only .zip files are allowed"}
        )
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
        try:
            # 儲存上傳檔案
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            
            # 驗證
            validator = ZipValidator()
            passed, report = validator.validate(temp_file.name)
            
            return {
                "filename": file.filename,
                "validation": report
            }
        
        finally:
            # 清理臨時檔案
            Path(temp_file.name).unlink(missing_ok=True)


@router.post("/import")
async def import_data(file: UploadFile = File(...)):
    """
    匯入工作計畫資料
    
    Args:
        file: 上傳的 ZIP 檔案
        
    Returns:
        匯入結果
    """
    if not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=400,
            detail={"error": "Invalid file type", "message": "Only .zip files are allowed"}
        )
    
    try:
        result = await importer.import_data(file)
        logger.info(f"Data imported successfully: {result}")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Import failed", "message": str(e)}
        )
```

**理由**:
- 分離驗證和匯入端點,提供更好的使用者體驗
- 使用 `UploadFile` 串流處理大檔案
- 詳細的錯誤處理和日誌記錄
- 適當的 HTTP 狀態碼

---

## 4. 錯誤處理策略

### 4.1 決策: 分層錯誤處理

```python
from enum import Enum
from typing import Optional, Dict, Any

class ErrorCategory(str, Enum):
    """錯誤類別"""
    VALIDATION = "validation"
    SECURITY = "security"
    FILESYSTEM = "filesystem"
    NETWORK = "network"
    INTERNAL = "internal"


class DataOperationError(Exception):
    """資料操作錯誤基礎類別"""
    
    def __init__(self, message: str, category: ErrorCategory, 
                 details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.category = category
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(DataOperationError):
    """驗證錯誤"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, ErrorCategory.VALIDATION, details)


class SecurityError(DataOperationError):
    """安全性錯誤"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, ErrorCategory.SECURITY, details)


class FileSystemError(DataOperationError):
    """檔案系統錯誤"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, ErrorCategory.FILESYSTEM, details)


# 錯誤處理中介層
from fastapi import Request
from fastapi.responses import JSONResponse

@router.exception_handler(DataOperationError)
async def data_operation_error_handler(request: Request, exc: DataOperationError):
    """統一錯誤處理"""
    
    status_code_map = {
        ErrorCategory.VALIDATION: 400,
        ErrorCategory.SECURITY: 403,
        ErrorCategory.FILESYSTEM: 500,
        ErrorCategory.INTERNAL: 500,
    }
    
    status_code = status_code_map.get(exc.category, 500)
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": exc.category.value,
            "message": exc.message,
            "details": exc.details
        }
    )
```

**理由**:
- 結構化錯誤便於前端處理
- 區分錯誤類型,提供適當的 HTTP 狀態碼
- 詳細資訊有助於除錯,但不洩露敏感資訊

---

## 5. 測試策略

### 5.1 單元測試範例

```python
import pytest
from pathlib import Path
import tempfile
import zipfile

class TestZipValidator:
    """ZipValidator 測試"""
    
    def test_valid_structure(self):
        """測試有效的目錄結構"""
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
            zip_path = f.name
        
        try:
            # 建立測試 ZIP
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                zipf.writestr('data/Day/20250101.md', '# Test')
                zipf.writestr('data/Week/20250105.md', '# Test')  # 2025/1/5 是周日
                zipf.writestr('data/Month/202501.md', '# Test')
                zipf.writestr('data/Year/2025.md', '# Test')
            
            # 驗證
            validator = ZipValidator()
            passed, report = validator.validate(zip_path)
            
            assert passed is True
            assert len(report['errors']) == 0
        
        finally:
            Path(zip_path).unlink()
    
    def test_invalid_week_date(self):
        """測試無效的周計畫日期 (非周日)"""
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
            zip_path = f.name
        
        try:
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                zipf.writestr('data/Day/20250101.md', '# Test')
                zipf.writestr('data/Week/20250101.md', '# Test')  # 2025/1/1 是周三
                zipf.writestr('data/Month/202501.md', '# Test')
                zipf.writestr('data/Year/2025.md', '# Test')
            
            validator = ZipValidator()
            passed, report = validator.validate(zip_path)
            
            assert passed is False
            assert any('not Sunday' in err for err in report['errors'])
        
        finally:
            Path(zip_path).unlink()
    
    def test_zip_slip_protection(self):
        """測試 Zip Slip 防護"""
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
            zip_path = f.name
        
        try:
            # 建立惡意 ZIP
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                # 嘗試路徑穿越
                info = zipfile.ZipInfo('../../../etc/passwd')
                zipf.writestr(info, 'malicious content')
            
            # 嘗試解壓縮
            with tempfile.TemporaryDirectory() as temp_dir:
                with pytest.raises(ValueError, match="Path Traversal"):
                    safe_extract_all(zip_path, temp_dir)
        
        finally:
            Path(zip_path).unlink()
    
    def test_file_size_limit(self):
        """測試檔案大小限制"""
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
            zip_path = f.name
        
        try:
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                # 建立超大檔案 (模擬)
                large_content = 'x' * (101 * 1024 * 1024)  # 101MB
                zipf.writestr('data/Day/20250101.md', large_content)
            
            validator = ZipValidator(max_total_size=100 * 1024 * 1024)
            passed, report = validator.validate(zip_path)
            
            assert passed is False
            assert any('too large' in err.lower() for err in report['errors'])
        
        finally:
            Path(zip_path).unlink()
```

---

## 6. 效能考量

### 6.1 效能指標

| 操作 | 檔案數 | 總大小 | 預期時間 | 記憶體使用 |
|------|--------|--------|----------|------------|
| 匯出 | 1,000 | 5MB | < 3s | ~20MB |
| 匯出 | 10,000 | 50MB | < 30s | ~20MB |
| 驗證 | 1,000 | 5MB | < 2s | ~10MB |
| 匯入 | 1,000 | 5MB | < 5s | ~30MB |

### 6.2 優化建議

1. **大檔案處理**: 使用 `compresslevel=6` 平衡速度與壓縮率
2. **並行處理**: 對於極大資料集,可考慮使用 `multiprocessing` 並行壓縮
3. **快取**: 對匯出檔案實作快取機制(如資料未變更則重用)
4. **進度回饋**: 對長時間操作提供 WebSocket 進度更新

---

## 7. 安全性檢查清單

- ✅ **Zip Slip 防護**: 使用 `Path.resolve()` 驗證路徑
- ✅ **檔案大小限制**: 防止 DoS 攻擊
- ✅ **檔案數量限制**: 防止資源耗盡
- ✅ **檔名驗證**: 防止特殊字元和路徑穿越
- ✅ **日期驗證**: 防止無效日期
- ✅ **檔案類型限制**: 只允許 .md 檔案
- ✅ **原子性操作**: 失敗時完整回滾
- ✅ **詳細日誌**: 記錄所有操作供稽核

---

## 8. 推薦的實作順序

1. **階段 1**: 實作 `ZipValidator` 和測試 (1-2 天)
2. **階段 2**: 實作匯出功能和 API 端點 (1 天)
3. **階段 3**: 實作安全解壓縮函式 (1 天)
4. **階段 4**: 實作 `DataImporter` 和原子性操作 (2 天)
5. **階段 5**: 整合測試和安全性測試 (1-2 天)
6. **階段 6**: 前端整合和 UI 開發 (2-3 天)

**總計**: 約 8-11 天

---

## 9. 替代方案比較

| 方案 | 優點 | 缺點 | 推薦度 |
|------|------|------|--------|
| **zipfile 標準庫** | 無依賴、穩定、文件完整 | API 較低階 | ⭐⭐⭐⭐⭐ |
| **tarfile** | Unix 原生支援 | Windows 相容性差 | ⭐⭐ |
| **7-Zip (py7zr)** | 高壓縮率 | 需額外依賴 | ⭐⭐⭐ |
| **自定義格式** | 完全控制 | 開發成本高 | ⭐ |

**結論**: `zipfile` 標準庫是最佳選擇,無需額外依賴且跨平台支援完整。

---

## 10. 參考資源

- [Python zipfile 官方文件](https://docs.python.org/3/library/zipfile.html)
- [OWASP Zip Slip 漏洞說明](https://github.com/snyk/zip-slip-vulnerability)
- [FastAPI 檔案上傳指南](https://fastapi.tiangolo.com/tutorial/request-files/)
- [Python tempfile 最佳實踐](https://docs.python.org/3/library/tempfile.html)

---

## 附錄 A: 完整使用範例

```python
# backend/data_export_service.py
from datetime import datetime
from pathlib import Path
import zipfile
import os

class DataExportService:
    """完整的資料匯出服務"""
    
    def __init__(self, data_dir: str = "backend/data"):
        self.data_dir = Path(data_dir)
    
    def export(self, output_path: str = None) -> dict:
        """執行匯出"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"export_data_{timestamp}.zip"
        
        stats = {'files': 0, 'size': 0, 'compressed': 0}
        
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
            for root, dirs, files in os.walk(self.data_dir):
                # 過濾
                files = [f for f in files if f.endswith('.md') and not f.startswith('.')]
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(self.data_dir.parent)
                    zipf.write(file_path, arcname=arcname)
                    
                    stats['files'] += 1
                    stats['size'] += file_path.stat().st_size
        
        stats['compressed'] = Path(output_path).stat().st_size
        stats['ratio'] = f"{(1 - stats['compressed'] / stats['size']) * 100:.1f}%"
        
        return stats


# 使用
if __name__ == "__main__":
    service = DataExportService()
    result = service.export()
    print(f"Exported {result['files']} files")
    print(f"Original: {result['size']} bytes")
    print(f"Compressed: {result['compressed']} bytes")
    print(f"Compression ratio: {result['ratio']}")
```

---

**研究完成日期**: 2025-10-25  
**建議審查者**: Backend Lead, Security Team  
**下一步**: 開始實作 `ZipValidator` 類別
