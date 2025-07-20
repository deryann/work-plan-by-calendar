from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict


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