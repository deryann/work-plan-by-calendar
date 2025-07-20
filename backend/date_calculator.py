from datetime import date, timedelta
from typing import Tuple
from .models import PlanType


class DateCalculator:
    """Date calculation utility for plan periods."""
    
    @staticmethod
    def get_week_start(target_date: date) -> date:
        """取得該週的周日日期 (Sunday-based week)"""
        # Python weekday(): Monday=0, Sunday=6
        # We want Sunday=0, so we adjust
        days_since_sunday = (target_date.weekday() + 1) % 7
        week_start = target_date - timedelta(days=days_since_sunday)
        return week_start
    
    @staticmethod
    def get_week_end(target_date: date) -> date:
        """取得該週的周六日期"""
        week_start = DateCalculator.get_week_start(target_date)
        return week_start + timedelta(days=6)
    
    @staticmethod
    def get_previous_period(plan_type: PlanType, target_date: date) -> date:
        """計算前一期日期"""
        if plan_type == PlanType.YEAR:
            return date(target_date.year - 1, 1, 1)
        elif plan_type == PlanType.MONTH:
            if target_date.month == 1:
                return date(target_date.year - 1, 12, 1)
            else:
                return date(target_date.year, target_date.month - 1, 1)
        elif plan_type == PlanType.WEEK:
            week_start = DateCalculator.get_week_start(target_date)
            return week_start - timedelta(days=7)
        elif plan_type == PlanType.DAY:
            return target_date - timedelta(days=1)
        else:
            raise ValueError(f"Unknown plan type: {plan_type}")
    
    @staticmethod
    def get_next_period(plan_type: PlanType, target_date: date) -> date:
        """計算後一期日期"""
        if plan_type == PlanType.YEAR:
            return date(target_date.year + 1, 1, 1)
        elif plan_type == PlanType.MONTH:
            if target_date.month == 12:
                return date(target_date.year + 1, 1, 1)
            else:
                return date(target_date.year, target_date.month + 1, 1)
        elif plan_type == PlanType.WEEK:
            week_start = DateCalculator.get_week_start(target_date)
            return week_start + timedelta(days=7)
        elif plan_type == PlanType.DAY:
            return target_date + timedelta(days=1)
        else:
            raise ValueError(f"Unknown plan type: {plan_type}")
    
    @staticmethod
    def format_title(plan_type: PlanType, target_date: date) -> str:
        """產生標準標題格式"""
        if plan_type == PlanType.YEAR:
            return f"# {target_date.year} 年度計畫"
        elif plan_type == PlanType.MONTH:
            return f"# {target_date.strftime('%Y-%m')} 月度計畫"
        elif plan_type == PlanType.WEEK:
            week_start = DateCalculator.get_week_start(target_date)
            week_end = DateCalculator.get_week_end(target_date)
            return f"# {week_start.strftime('%Y-%m-%d')}~{week_end.strftime('%Y-%m-%d')} 週計畫"
        elif plan_type == PlanType.DAY:
            return f"# {target_date.strftime('%Y-%m-%d')} 日計畫"
        else:
            raise ValueError(f"Unknown plan type: {plan_type}")
    
    @staticmethod
    def get_filename(plan_type: PlanType, target_date: date) -> str:
        """產生檔案名稱"""
        if plan_type == PlanType.YEAR:
            return f"{target_date.year}.md"
        elif plan_type == PlanType.MONTH:
            return f"{target_date.strftime('%Y%m')}.md"
        elif plan_type == PlanType.WEEK:
            week_start = DateCalculator.get_week_start(target_date)
            return f"{week_start.strftime('%Y%m%d')}.md"
        elif plan_type == PlanType.DAY:
            return f"{target_date.strftime('%Y%m%d')}.md"
        else:
            raise ValueError(f"Unknown plan type: {plan_type}")
    
    @staticmethod
    def get_canonical_date(plan_type: PlanType, target_date: date) -> date:
        """取得該計畫類型的標準日期"""
        if plan_type == PlanType.YEAR:
            return date(target_date.year, 1, 1)
        elif plan_type == PlanType.MONTH:
            return date(target_date.year, target_date.month, 1)
        elif plan_type == PlanType.WEEK:
            return DateCalculator.get_week_start(target_date)
        elif plan_type == PlanType.DAY:
            return target_date
        else:
            raise ValueError(f"Unknown plan type: {plan_type}")
    
    @staticmethod
    def get_file_path(plan_type: PlanType, target_date: date, base_dir: str = "data") -> str:
        """取得完整檔案路徑"""
        subdir_map = {
            PlanType.YEAR: "Year",
            PlanType.MONTH: "Month", 
            PlanType.WEEK: "Week",
            PlanType.DAY: "Day"
        }
        
        subdir = subdir_map[plan_type]
        filename = DateCalculator.get_filename(plan_type, target_date)
        return f"{base_dir}/{subdir}/{filename}"
    
    @staticmethod
    def get_all_plan_dates_for_date(target_date: date) -> dict:
        """取得指定日期對應的所有計畫類型的標準日期"""
        return {
            "year": DateCalculator.get_canonical_date(PlanType.YEAR, target_date),
            "month": DateCalculator.get_canonical_date(PlanType.MONTH, target_date),
            "week": DateCalculator.get_canonical_date(PlanType.WEEK, target_date),
            "day": DateCalculator.get_canonical_date(PlanType.DAY, target_date)
        }