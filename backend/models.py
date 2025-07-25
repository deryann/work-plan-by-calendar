from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, Any


class PlanType(str, Enum):
    YEAR = "year"
    MONTH = "month"
    WEEK = "week"
    DAY = "day"


class CopyMode(str, Enum):
    APPEND = "append"
    REPLACE = "replace"


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