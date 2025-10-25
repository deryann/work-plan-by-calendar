from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List


class PlanType(str, Enum):
    YEAR = "year"
    MONTH = "month"
    WEEK = "week"
    DAY = "day"


class CopyMode(str, Enum):
    APPEND = "append"
    REPLACE = "replace"


# 資料匯出/匯入相關的 Enum 和模型
class ErrorType(str, Enum):
    """驗證錯誤類型"""
    STRUCTURE = "structure"
    FILENAME = "filename"
    DATE = "date"
    WEEKDAY = "weekday"
    SIZE = "size"


class PlanBase(BaseModel):
    content: str


class PlanCreate(PlanBase):
    pass


class PlanUpdate(PlanBase):
    pass


class Plan(PlanBase):
    type: PlanType
    date: date
    title: str
    created_at: datetime
    updated_at: datetime
    file_path: str


class AllPlans(BaseModel):
    date: date
    plans: Dict[str, Optional[Plan]]


class CopyRequest(BaseModel):
    source_type: PlanType
    source_date: date
    target_type: PlanType
    target_date: date
    content: str
    mode: CopyMode = CopyMode.APPEND


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict] = None


# Settings models
class PanelSettings(BaseModel):
    year: bool = True
    month: bool = True
    week: bool = True
    day: bool = True


class ThemeColors(BaseModel):
    primary: str = "#ffffff"
    secondary: str = "#f3f4f6"
    accent: str = "#3b82f6"
    border: str = "#e2e8f0"
    text: str = "#374151"
    textSecondary: str = "#64748b"
    titleText: str = "#1f2937"


class ThemeSettings(BaseModel):
    mode: str = "light"  # "light" or "dark"
    colors: Dict[str, ThemeColors] = {
        "light": ThemeColors(
            primary="#ffffff",
            secondary="#f3f4f6",
            accent="#3b82f6",
            border="#e2e8f0",
            text="#374151",
            textSecondary="#64748b",
            titleText="#1f2937"
        ),
        "dark": ThemeColors(
            primary="#2d2d2d",
            secondary="#1a1a1a",
            accent="#60a5fa",
            border="#404040",
            text="#e5e5e5",
            textSecondary="#a3a3a3",
            titleText="#ffffff"
        )
    }


class UISettings(BaseModel):
    panels: Dict[str, PanelSettings] = {
        "left": PanelSettings(),
        "right": PanelSettings()
    }
    theme: ThemeSettings = ThemeSettings()


class Settings(BaseModel):
    ui: UISettings = UISettings()


class SettingsUpdate(BaseModel):
    ui: Optional[UISettings] = None


# 資料匯出/匯入模型
class ValidationError(BaseModel):
    """單一驗證錯誤"""
    error_type: ErrorType
    file_path: str
    message: str
    details: Optional[dict] = None  # 改為 dict 以支援結構化資訊


class ImportValidation(BaseModel):
    """匯入檔案驗證結果"""
    is_valid: bool
    errors: List[ValidationError] = Field(default_factory=list)
    warnings: List[ValidationError] = Field(default_factory=list)  # 改為 ValidationError 以保持一致
    file_count: int = Field(ge=0)
    validated_at: str
    
    @validator('errors')
    def check_errors_when_invalid(cls, v, values):
        """確保 is_valid=false 時必須有錯誤"""
        if not values.get('is_valid') and len(v) == 0:
            raise ValueError('is_valid=false 時 errors 必須包含至少一個錯誤')
        return v


class ExportResponse(BaseModel):
    """匯出操作回應"""
    filename: str
    file_size: int = Field(ge=0)
    created_at: str
    file_count: int = Field(ge=0)
    download_url: str


class ImportSuccessResponse(BaseModel):
    """匯入成功回應"""
    success: bool
    message: str
    file_count: int = Field(ge=0)
    overwritten_count: int = Field(ge=0)
    imported_at: str
