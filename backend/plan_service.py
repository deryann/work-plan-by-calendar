import os
from datetime import datetime, date
from pathlib import Path
from typing import Optional
from .models import Plan, PlanType, AllPlans, CopyRequest, CopyMode
from .date_calculator import DateCalculator


class PlanService:
    """Business logic service for plan management."""
    
    def __init__(self, data_dir: Optional[str] = None):
        """初始化 PlanService
        
        Args:
            data_dir: 資料目錄路徑。如果為 None,自動偵測正確路徑
        """
        if data_dir is None:
            # 自動偵測路徑: backend/data 或 project_root/data
            backend_dir = Path(__file__).parent
            backend_data = backend_dir / "data"
            project_data = backend_dir.parent / "data"
            
            if backend_data.exists():
                self.data_dir = backend_data
            elif project_data.exists():
                self.data_dir = project_data
            else:
                # 預設建立在 backend/data
                self.data_dir = backend_data
        else:
            self.data_dir = Path(data_dir)
        
        self._ensure_directories_exist()
    
    def _ensure_directories_exist(self):
        """確保所有必要的目錄都存在"""
        for subdir in ["Year", "Month", "Week", "Day"]:
            (self.data_dir / subdir).mkdir(parents=True, exist_ok=True)
    
    def _read_file_content(self, file_path: Path) -> str:
        """讀取檔案內容，如果檔案不存在則返回空字串"""
        try:
            if file_path.exists():
                return file_path.read_text(encoding='utf-8')
            return ""
        except Exception as e:
            raise IOError(f"Error reading file {file_path}: {str(e)}")
    
    def _write_file_content(self, file_path: Path, content: str):
        """寫入檔案內容"""
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding='utf-8')
        except Exception as e:
            raise IOError(f"Error writing file {file_path}: {str(e)}")
    
    def _get_file_stats(self, file_path: Path) -> tuple[datetime, datetime]:
        """取得檔案的建立和修改時間"""
        if file_path.exists():
            stat = file_path.stat()
            created_at = datetime.fromtimestamp(stat.st_ctime)
            updated_at = datetime.fromtimestamp(stat.st_mtime)
        else:
            now = datetime.now()
            created_at = updated_at = now
        return created_at, updated_at
    
    def get_plan(self, plan_type: PlanType, target_date: date) -> Plan:
        """取得指定類型和日期的計畫"""
        canonical_date = DateCalculator.get_canonical_date(plan_type, target_date)
        file_path_str = DateCalculator.get_file_path(plan_type, canonical_date, str(self.data_dir))
        file_path = Path(file_path_str)
        
        content = self._read_file_content(file_path)
        
        # 如果檔案不存在或內容為空，創建預設內容
        if not content.strip():
            title = DateCalculator.format_title(plan_type, canonical_date)
            content = f"{title}\n\n"
            # 不自動寫入，讓用戶主動儲存
        
        created_at, updated_at = self._get_file_stats(file_path)
        
        # 從內容中提取標題（第一行）
        lines = content.strip().split('\n')
        if lines and lines[0].startswith('#'):
            title = lines[0]
        else:
            title = DateCalculator.format_title(plan_type, canonical_date)
        
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
        """建立新計畫"""
        canonical_date = DateCalculator.get_canonical_date(plan_type, target_date)
        file_path_str = DateCalculator.get_file_path(plan_type, canonical_date, str(self.data_dir))
        file_path = Path(file_path_str)
        
        # 如果內容不包含標題，添加預設標題
        if not content.strip().startswith('#'):
            title = DateCalculator.format_title(plan_type, canonical_date)
            content = f"{title}\n\n{content}".strip() + "\n"
        
        self._write_file_content(file_path, content)
        
        created_at, updated_at = self._get_file_stats(file_path)
        
        # 提取標題
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
    
    def update_plan(self, plan_type: PlanType, target_date: date, content: str) -> Plan:
        """更新計畫內容"""
        canonical_date = DateCalculator.get_canonical_date(plan_type, target_date)
        file_path_str = DateCalculator.get_file_path(plan_type, canonical_date, str(self.data_dir))
        file_path = Path(file_path_str)
        
        # 確保內容有標題
        if not content.strip().startswith('#'):
            title = DateCalculator.format_title(plan_type, canonical_date)
            content = f"{title}\n\n{content}".strip() + "\n"
        
        self._write_file_content(file_path, content)
        
        created_at, updated_at = self._get_file_stats(file_path)
        
        # 提取標題
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
    
    def delete_plan(self, plan_type: PlanType, target_date: date) -> bool:
        """刪除計畫檔案"""
        canonical_date = DateCalculator.get_canonical_date(plan_type, target_date)
        file_path_str = DateCalculator.get_file_path(plan_type, canonical_date, str(self.data_dir))
        file_path = Path(file_path_str)
        
        try:
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            raise IOError(f"Error deleting file {file_path}: {str(e)}")
    
    def get_previous_plan(self, plan_type: PlanType, target_date: date) -> Plan:
        """取得前一期計畫"""
        previous_date = DateCalculator.get_previous_period(plan_type, target_date)
        return self.get_plan(plan_type, previous_date)
    
    def get_next_plan(self, plan_type: PlanType, target_date: date) -> Plan:
        """取得後一期計畫"""
        next_date = DateCalculator.get_next_period(plan_type, target_date)
        return self.get_plan(plan_type, next_date)
    
    def get_all_plans_for_date(self, target_date: date) -> AllPlans:
        """取得指定日期對應的所有類型計畫"""
        plan_dates = DateCalculator.get_all_plan_dates_for_date(target_date)
        
        plans = {}
        for plan_type_str, plan_date in plan_dates.items():
            try:
                plan_type = PlanType(plan_type_str)
                plan = self.get_plan(plan_type, plan_date)
                plans[plan_type_str] = plan
            except Exception as e:
                # 如果某個計畫類型讀取失敗，設為 None
                plans[plan_type_str] = None
        
        return AllPlans(date=target_date, plans=plans)
    
    def copy_content(self, copy_request: CopyRequest) -> Plan:
        """複製內容到目標計畫"""
        # 取得目標計畫
        target_plan = self.get_plan(copy_request.target_type, copy_request.target_date)
        
        if copy_request.mode == CopyMode.REPLACE:
            # 替換模式：用新內容完全替換
            new_content = copy_request.content
        else:
            # 附加模式：將新內容添加到現有內容後
            existing_content = target_plan.content.strip()
            if existing_content:
                new_content = f"{existing_content}\n\n{copy_request.content}"
            else:
                new_content = copy_request.content
        
        # 更新目標計畫
        return self.update_plan(copy_request.target_type, copy_request.target_date, new_content)
    
    def plan_exists(self, plan_type: PlanType, target_date: date) -> bool:
        """檢查計畫檔案是否存在"""
        canonical_date = DateCalculator.get_canonical_date(plan_type, target_date)
        file_path_str = DateCalculator.get_file_path(plan_type, canonical_date, str(self.data_dir))
        file_path = Path(file_path_str)
        return file_path.exists() and file_path.stat().st_size > 0

    def get_plans_existence(self, start_date: date, end_date: date) -> dict:
        """取得日期範圍內的計畫存在狀態

        Args:
            start_date: 開始日期
            end_date: 結束日期

        Returns:
            字典，key 為日期字串 (YYYY-MM-DD)，value 為包含各計畫類型存在狀態的字典
            例如: {
                "2025-01-01": {"year": True, "month": True, "week": False, "day": True},
                "2025-01-02": {"year": True, "month": True, "week": False, "day": False},
                ...
            }
        """
        result = {}
        current_date = start_date

        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")

            # Get all plan dates for this date
            plan_dates = DateCalculator.get_all_plan_dates_for_date(current_date)

            # Check existence for each plan type
            existence_status = {}
            for plan_type_str in ["year", "month", "week", "day"]:
                try:
                    plan_type = PlanType(plan_type_str)
                    plan_date = plan_dates[plan_type_str]
                    existence_status[plan_type_str] = self.plan_exists(plan_type, plan_date)
                except Exception:
                    existence_status[plan_type_str] = False

            result[date_str] = existence_status

            # Move to next day
            from datetime import timedelta
            current_date = current_date + timedelta(days=1)

        return result