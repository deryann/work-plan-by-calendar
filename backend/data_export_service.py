"""
資料匯出/匯入服務

提供 ZIP 檔案的建立、驗證和匯入功能。
包含 Zip Slip 防護和完整性驗證。
"""

from pathlib import Path
from datetime import datetime
from typing import Tuple, List
import zipfile
import tempfile
import shutil
import re

from backend.models import (
    ValidationError,
    ImportValidation,
    ExportResponse,
    ImportSuccessResponse,
    ErrorType
)

# 常數定義
# 使用絕對路徑,支援開發環境和部署環境
_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parent  # backend/
_project_root = _backend_dir.parent  # project root
DATA_DIR = _backend_dir / "data"  # backend/data/

# 如果 backend/data 不存在,嘗試使用專案根目錄的 data/
if not DATA_DIR.exists():
    DATA_DIR = _project_root / "data"
    if not DATA_DIR.exists():
        # 建立預設目錄結構
        DATA_DIR = _backend_dir / "data"
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        for dir_name in ["Day", "Week", "Month", "Year"]:
            (DATA_DIR / dir_name).mkdir(exist_ok=True)

TEMP_DIR = Path(tempfile.gettempdir())
REQUIRED_DIRS = ["Day", "Week", "Month", "Year"]
MAX_ZIP_SIZE = 100 * 1024 * 1024  # 100MB


# ============================================================================
# 匯出相關函數
# ============================================================================

def create_export_zip() -> Tuple[Path, int]:
    """
    建立匯出 ZIP 檔案
    
    Returns:
        Tuple[Path, int]: (ZIP 檔案路徑, 包含的檔案數量)
    
    Raises:
        FileNotFoundError: 如果 DATA_DIR 不存在
        IOError: 如果建立 ZIP 失敗
    """
    if not DATA_DIR.exists():
        raise FileNotFoundError(f"資料目錄不存在: {DATA_DIR}")
    
    # 產生帶時間戳的檔名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"export_data_{timestamp}.zip"
    zip_path = TEMP_DIR / filename
    
    file_count = 0
    
    try:
        # 使用 ZIP_DEFLATED 壓縮,串流方式處理
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 遞迴遍歷 DATA_DIR 目錄
            for item in DATA_DIR.rglob("*"):
                if item.is_file() and item.suffix == ".md":
                    # 計算相對路徑 (只保留 Day/Week/Month/Year 結構)
                    # /path/to/backend/data/Day/20251025.md -> Day/20251025.md
                    arcname = item.relative_to(DATA_DIR)
                    zipf.write(item, arcname)
                    file_count += 1
        
        return zip_path, file_count
        
    except Exception as e:
        # 清理失敗的 ZIP 檔案
        if zip_path.exists():
            zip_path.unlink()
        raise IOError(f"建立 ZIP 檔案失敗: {str(e)}")


# ============================================================================
# 驗證相關函數  
# ============================================================================

def validate_zip_structure(zip_path: Path) -> List[str]:
    """
    驗證 ZIP 檔案結構是否包含必要目錄
    
    Args:
        zip_path: ZIP 檔案路徑
        
    Returns:
        List[str]: 缺少的目錄清單 (空清單表示完整)
    """
    missing_dirs = []
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            # 取得所有檔案路徑
            all_paths = [Path(name) for name in zipf.namelist()]
            
            # 檢查每個必要目錄是否存在
            for required_dir in REQUIRED_DIRS:
                # 檢查是否有任何檔案路徑包含此目錄
                # 例如: data/Day/20251025.md 應包含 "Day"
                found = any(required_dir in str(p) for p in all_paths)
                if not found:
                    missing_dirs.append(required_dir)
        
        return missing_dirs
        
    except zipfile.BadZipFile:
        # 如果不是有效的 ZIP 檔案,回傳所有必要目錄為缺少
        return REQUIRED_DIRS.copy()


def validate_filename(filename: str, dir_type: str) -> Tuple[bool, str]:
    """
    驗證檔名格式是否正確
    
    Args:
        filename: 檔案名稱
        dir_type: 目錄類型 (Day/Week/Month/Year)
        
    Returns:
        Tuple[bool, str]: (是否有效, 錯誤訊息)
    """
    # 移除 .md 副檔名
    name_without_ext = filename.replace(".md", "")
    
    # 根據目錄類型定義格式規則
    patterns = {
        "Day": r"^\d{8}$",      # YYYYMMDD (8位數字)
        "Week": r"^\d{8}$",     # YYYYMMDD (8位數字,週日日期)
        "Month": r"^\d{6}$",    # YYYYMM (6位數字)
        "Year": r"^\d{4}$"      # YYYY (4位數字)
    }
    
    if dir_type not in patterns:
        return False, f"未知的目錄類型: {dir_type}"
    
    pattern = patterns[dir_type]
    if not re.match(pattern, name_without_ext):
        expected_format = {
            "Day": "YYYYMMDD",
            "Week": "YYYYMMDD",
            "Month": "YYYYMM",
            "Year": "YYYY"
        }[dir_type]
        return False, f"檔名格式錯誤,應為 {expected_format}.md"
    
    # 驗證日期有效性
    try:
        if dir_type == "Day" or dir_type == "Week":
            datetime.strptime(name_without_ext, "%Y%m%d")
        elif dir_type == "Month":
            datetime.strptime(name_without_ext, "%Y%m")
        elif dir_type == "Year":
            datetime.strptime(name_without_ext, "%Y")
    except ValueError:
        return False, f"日期格式有效但數值不正確: {name_without_ext}"
    
    return True, ""


def validate_weekday(filename: str) -> Tuple[bool, str]:
    """
    驗證日期是否為星期日
    
    Args:
        filename: 檔案名稱 (YYYYMMDD.md 格式)
        
    Returns:
        Tuple[bool, str]: (是否為星期日, 錯誤訊息)
    """
    # 移除 .md 副檔名
    date_str = filename.replace(".md", "")
    
    try:
        # 解析日期
        date_obj = datetime.strptime(date_str, "%Y%m%d")
        
        # 檢查是否為星期日 (weekday() == 6)
        if date_obj.weekday() != 6:
            weekday_names = ["一", "二", "三", "四", "五", "六", "日"]
            actual_weekday = weekday_names[date_obj.weekday()]
            return False, f"{date_str} 是星期{actual_weekday},週計畫必須以星期日日期命名"
        
        return True, ""
        
    except ValueError:
        return False, f"無法解析日期: {date_str}"


async def validate_zip_file(file) -> ImportValidation:
    """
    完整驗證上傳的 ZIP 檔案
    
    Args:
        file: FastAPI UploadFile 物件
        
    Returns:
        ImportValidation: 驗證結果
    """
    errors: List[ValidationError] = []
    warnings: List[ValidationError] = []
    file_count = 0
    
    # 建立臨時檔案儲存上傳的 ZIP
    temp_zip = TEMP_DIR / f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    
    try:
        # 儲存上傳檔案
        content = await file.read()
        temp_zip.write_bytes(content)
        
        # 1. 檢查檔案大小
        file_size = temp_zip.stat().st_size
        if file_size > MAX_ZIP_SIZE:
            errors.append(ValidationError(
                error_type=ErrorType.SIZE,
                file_path=str(temp_zip.name),
                message=f"ZIP 檔案過大: {file_size / 1024 / 1024:.2f}MB (上限 100MB)",
                details={"size_bytes": file_size, "max_size_bytes": MAX_ZIP_SIZE}
            ))
            return ImportValidation(
                is_valid=False,
                errors=errors,
                warnings=warnings,
                file_count=0,
                validated_at=datetime.now().isoformat()
            )
        
        # 2. 驗證 ZIP 結構
        missing_dirs = validate_zip_structure(temp_zip)
        if missing_dirs:
            errors.append(ValidationError(
                error_type=ErrorType.STRUCTURE,
                file_path="",
                message=f"ZIP 檔案缺少必要目錄: {', '.join(missing_dirs)}",
                details={"missing_dirs": missing_dirs, "required_dirs": REQUIRED_DIRS}
            ))
        
        # 3. 逐檔驗證
        with zipfile.ZipFile(temp_zip, 'r') as zipf:
            for zip_info in zipf.filelist:
                # 跳過目錄項目
                if zip_info.is_dir():
                    continue
                
                file_path = Path(zip_info.filename)
                
                # 只檢查 .md 檔案
                if file_path.suffix != ".md":
                    warnings.append(ValidationError(
                        error_type=ErrorType.FILENAME,
                        file_path=str(file_path),
                        message=f"忽略非 .md 檔案: {file_path.name}",
                        details={"suffix": file_path.suffix}
                    ))
                    continue
                
                file_count += 1
                
                # 判斷目錄類型
                dir_type = None
                for required_dir in REQUIRED_DIRS:
                    if required_dir in file_path.parts:
                        dir_type = required_dir
                        break
                
                if not dir_type:
                    errors.append(ValidationError(
                        error_type=ErrorType.STRUCTURE,
                        file_path=str(file_path),
                        message=f"檔案不在有效目錄中: {file_path}",
                        details={"path_parts": list(file_path.parts)}
                    ))
                    continue
                
                # 4. 驗證檔名格式
                is_valid, error_msg = validate_filename(file_path.name, dir_type)
                if not is_valid:
                    errors.append(ValidationError(
                        error_type=ErrorType.FILENAME,
                        file_path=str(file_path),
                        message=error_msg,
                        details={"dir_type": dir_type, "filename": file_path.name}
                    ))
                    continue
                
                # 5. Week 目錄額外檢查星期日
                if dir_type == "Week":
                    is_sunday, error_msg = validate_weekday(file_path.name)
                    if not is_sunday:
                        errors.append(ValidationError(
                            error_type=ErrorType.WEEKDAY,
                            file_path=str(file_path),
                            message=error_msg,
                            details={"filename": file_path.name}
                        ))
        
        # 6. 安全性檢查 - Zip Slip
        with zipfile.ZipFile(temp_zip, 'r') as zipf:
            for name in zipf.namelist():
                # 檢查是否包含路徑穿越字元
                if ".." in name or name.startswith("/"):
                    errors.append(ValidationError(
                        error_type=ErrorType.STRUCTURE,
                        file_path=name,
                        message=f"偵測到不安全的檔案路徑 (Zip Slip): {name}",
                        details={"path": name}
                    ))
        
        return ImportValidation(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            file_count=file_count,
            validated_at=datetime.now().isoformat()
        )
        
    except zipfile.BadZipFile:
        errors.append(ValidationError(
            error_type=ErrorType.STRUCTURE,
            file_path=str(temp_zip.name),
            message="上傳的檔案不是有效的 ZIP 格式",
            details={}
        ))
        return ImportValidation(
            is_valid=False,
            errors=errors,
            warnings=warnings,
            file_count=0,
            validated_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        errors.append(ValidationError(
            error_type=ErrorType.STRUCTURE,
            file_path="",
            message=f"驗證過程發生錯誤: {str(e)}",
            details={"exception": str(type(e).__name__)}
        ))
        return ImportValidation(
            is_valid=False,
            errors=errors,
            warnings=warnings,
            file_count=0,
            validated_at=datetime.now().isoformat()
        )
        
    finally:
        # 清理臨時檔案
        if temp_zip.exists():
            temp_zip.unlink()


# ============================================================================
# 匯入相關函數
# ============================================================================

def backup_current_data() -> Path:
    """
    建立當前資料的臨時備份
    
    Returns:
        Path: 備份目錄路徑
    
    Raises:
        IOError: 如果備份失敗
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = TEMP_DIR / f"backup_data_{timestamp}"
    
    try:
        # 如果 DATA_DIR 存在且有內容,進行備份
        if DATA_DIR.exists():
            shutil.copytree(DATA_DIR, backup_dir, dirs_exist_ok=True)
            print(f"✅ 資料已備份至: {backup_dir}")
        else:
            # 如果目錄不存在,建立空備份目錄作為標記
            backup_dir.mkdir(parents=True, exist_ok=True)
            print(f"⚠️  原始資料目錄不存在,建立空備份: {backup_dir}")
        
        return backup_dir
        
    except Exception as e:
        # 清理失敗的備份
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        raise IOError(f"備份失敗: {str(e)}")


def restore_backup(backup_path: Path) -> None:
    """
    從備份還原資料
    
    Args:
        backup_path: 備份目錄路徑
        
    Raises:
        IOError: 如果還原失敗
    """
    if not backup_path.exists():
        raise IOError(f"備份目錄不存在: {backup_path}")
    
    try:
        # 刪除當前資料
        if DATA_DIR.exists():
            shutil.rmtree(DATA_DIR)
        
        # 從備份還原
        if any(backup_path.iterdir()):  # 檢查備份是否有內容
            shutil.copytree(backup_path, DATA_DIR, dirs_exist_ok=True)
            print(f"✅ 資料已從備份還原: {backup_path}")
        else:
            # 空備份表示原本就沒有資料,確保目錄不存在
            print(f"⚠️  空備份,不進行還原")
        
        # 清理備份
        shutil.rmtree(backup_path)
        
    except Exception as e:
        raise IOError(f"還原失敗: {str(e)}")


def safe_extract_member(zip_file: zipfile.ZipFile, member: str, target_dir: Path) -> None:
    """
    安全解壓單一檔案 (防止 Zip Slip)
    
    Args:
        zip_file: ZipFile 物件
        member: 要解壓的檔案名稱
        target_dir: 目標目錄
        
    Raises:
        SecurityError: 如果偵測到路徑穿越攻擊
    """
    # 取得解壓後的完整路徑
    member_path = target_dir / member
    
    # 解析為絕對路徑並檢查是否在目標目錄內
    try:
        resolved_path = member_path.resolve()
        target_resolved = target_dir.resolve()
        
        # 檢查解壓路徑是否在目標目錄內 (防止 Zip Slip)
        if not str(resolved_path).startswith(str(target_resolved)):
            raise SecurityError(
                f"偵測到 Zip Slip 攻擊: {member} -> {resolved_path}"
            )
        
        # 安全解壓
        zip_file.extract(member, target_dir)
        
    except Exception as e:
        if isinstance(e, SecurityError):
            raise
        raise IOError(f"解壓檔案失敗 {member}: {str(e)}")


async def execute_import(file) -> ImportSuccessResponse:
    """
    執行資料匯入 (含原子性和回滾)
    
    Args:
        file: FastAPI UploadFile 物件
        
    Returns:
        ImportSuccessResponse: 匯入結果
        
    Raises:
        HTTPException: 如果驗證失敗或匯入過程發生錯誤
    """
    backup_path = None
    temp_zip = None
    
    try:
        # 1. 先儲存上傳的 ZIP 檔案
        temp_zip = TEMP_DIR / f"import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        content = await file.read()
        temp_zip.write_bytes(content)
        
        # 2. 驗證 ZIP 檔案 (使用檔案路徑而非 UploadFile)
        # 簡單驗證:檢查是否為有效 ZIP 和結構
        try:
            with zipfile.ZipFile(temp_zip, 'r') as zipf:
                # 檢查結構
                all_paths = [Path(name) for name in zipf.namelist()]
                missing_dirs = []
                for required_dir in REQUIRED_DIRS:
                    found = any(required_dir in str(p) for p in all_paths)
                    if not found:
                        missing_dirs.append(required_dir)
                
                if missing_dirs:
                    raise ValueError(f"ZIP 檔案缺少必要目錄: {', '.join(missing_dirs)}")
        except zipfile.BadZipFile:
            raise ValueError("上傳的檔案不是有效的 ZIP 格式")
        
        # 3. 建立備份
        backup_path = backup_current_data()
        
        # 4. 清空現有資料
        if DATA_DIR.exists():
            shutil.rmtree(DATA_DIR)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        
        # 5. 解壓匯入資料
        overwritten_count = 0
        imported_count = 0
        
        with zipfile.ZipFile(temp_zip, 'r') as zipf:
            for member in zipf.namelist():
                # 跳過目錄和非 .md 檔案
                if member.endswith('/') or not member.endswith('.md'):
                    continue
                
                # ZIP 內的路徑應該直接是 Day/Week/Month/Year 開頭
                # Day/20251025.md -> 直接使用
                target_file = DATA_DIR / member
                
                # 檢查檔案是否已存在 (用於統計覆寫數量)
                if target_file.exists():
                    overwritten_count += 1
                
                # 確保目標目錄存在
                target_file.parent.mkdir(parents=True, exist_ok=True)
                
                # 安全解壓到 DATA_DIR
                safe_extract_member(zipf, member, DATA_DIR)
                imported_count += 1
        
        # 6. 匯入成功,清理備份
        if backup_path and backup_path.exists():
            shutil.rmtree(backup_path)
        
        # 7. 清理臨時 ZIP
        if temp_zip and temp_zip.exists():
            temp_zip.unlink()
        
        return ImportSuccessResponse(
            success=True,
            message=f"成功匯入 {imported_count} 個檔案 (覆寫 {overwritten_count} 個)",
            file_count=imported_count,
            overwritten_count=overwritten_count,
            imported_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        # 匯入失敗,從備份還原
        if backup_path and backup_path.exists():
            try:
                restore_backup(backup_path)
                error_msg = f"匯入失敗已回滾: {str(e)}"
            except Exception as restore_error:
                error_msg = f"匯入失敗且回滾失敗: {str(e)} | 回滾錯誤: {str(restore_error)}"
        else:
            error_msg = f"匯入失敗: {str(e)}"
        
        # 清理臨時檔案
        if temp_zip and temp_zip.exists():
            temp_zip.unlink()
        
        raise IOError(error_msg)


# 自訂例外
class SecurityError(Exception):
    """安全性相關錯誤"""
    pass
