# 後端 API 設計規格 (FastAPI)

## API 架構概覽

### 技術棧
- **框架**: FastAPI
- **資料儲存**: 檔案系統 (Markdown 檔案)
- **資料驗證**: Pydantic
- **日期處理**: Python datetime

## API 端點設計

### 1. 計畫 CRUD 操作

#### 1.1 取得計畫內容
```http
GET /api/plans/{plan_type}/{date}
```

**參數說明**:
- `plan_type`: year | month | week | day
- `date`: YYYY-MM-DD 格式

**回應範例**:
```json
{
  "type": "day",
  "date": "2025-07-02",
  "title": "2025-07-02 日計畫",
  "content": "# 2025-07-02 日計畫\n\n## 今日目標\n- 完成專案設計\n- 複習會議內容",
  "created_at": "2025-07-02T00:00:00Z",
  "updated_at": "2025-07-02T10:30:00Z"
}
```

#### 1.2 更新計畫內容
```http
PUT /api/plans/{plan_type}/{date}
```

**請求體**:
```json
{
  "content": "# 2025-07-02 日計畫\n\n## 更新的內容"
}
```

#### 1.3 刪除計畫
```http
DELETE /api/plans/{plan_type}/{date}
```

#### 1.4 建立新計畫
```http
POST /api/plans/{plan_type}/{date}
```

### 2. 時間導航 API

#### 2.1 取得前一期計畫
```http
GET /api/plans/{plan_type}/{date}/previous
```

#### 2.2 取得後一期計畫
```http
GET /api/plans/{plan_type}/{date}/next
```

#### 2.3 取得指定日期的所有類型計畫
```http
GET /api/plans/all/{date}
```

**回應範例**:
```json
{
  "date": "2025-07-02",
  "plans": {
    "year": {
      "type": "year",
      "date": "2025-01-01",
      "title": "2025 年度計畫",
      "content": "...",
      "file_path": "data/Year/2025.md"
    },
    "month": {
      "type": "month", 
      "date": "2025-07-01",
      "title": "2025-07 月度計畫",
      "content": "...",
      "file_path": "data/Month/202507.md"
    },
    "week": {
      "type": "week",
      "date": "2025-06-29", 
      "title": "2025-06-29~2025-07-05 週計畫",
      "content": "...",
      "file_path": "data/Week/20250629.md"
    },
    "day": {
      "type": "day",
      "date": "2025-07-02",
      "title": "2025-07-02 日計畫", 
      "content": "...",
      "file_path": "data/Day/20250702.md"
    }
  }
}
```

### 3. 內容複製 API

#### 3.1 複製計畫內容
```http
POST /api/plans/copy
```

**請求體**:
```json
{
  "source_type": "week",
  "source_date": "2025-06-29",
  "target_type": "day", 
  "target_date": "2025-07-02",
  "content": "選取的 markdown 內容",
  "mode": "append" // append | replace
}
```

## 資料模型定義

### Pydantic 模型

```python
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel
from typing import Optional

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
    plans: dict[str, Optional[Plan]]

class CopyRequest(BaseModel):
    source_type: PlanType
    source_date: date
    target_type: PlanType
    target_date: date
    content: str
    mode: CopyMode = CopyMode.APPEND
```

## 服務層設計

### 1. PlanService 類別

```python
class PlanService:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
    
    def get_plan(self, plan_type: PlanType, date: date) -> Plan
    def create_plan(self, plan_type: PlanType, date: date, content: str) -> Plan
    def update_plan(self, plan_type: PlanType, date: date, content: str) -> Plan
    def delete_plan(self, plan_type: PlanType, date: date) -> bool
    def get_previous_plan(self, plan_type: PlanType, date: date) -> Plan
    def get_next_plan(self, plan_type: PlanType, date: date) -> Plan
    def get_all_plans_for_date(self, target_date: date) -> AllPlans
    def copy_content(self, copy_request: CopyRequest) -> Plan
```

### 2. DateCalculator 工具類別

```python
class DateCalculator:
    @staticmethod
    def get_week_start(date: date) -> date:
        """取得該週的周日日期"""
        
    @staticmethod  
    def get_previous_period(plan_type: PlanType, date: date) -> date:
        """計算前一期日期"""
        
    @staticmethod
    def get_next_period(plan_type: PlanType, date: date) -> date:
        """計算後一期日期"""
        
    @staticmethod
    def format_title(plan_type: PlanType, date: date) -> str:
        """產生標準標題格式"""
```

## 錯誤處理

### HTTP 狀態碼定義
- `200`: 成功
- `201`: 創建成功
- `404`: 計畫不存在
- `400`: 請求參數錯誤
- `500`: 伺服器內部錯誤

### 錯誤回應格式
```json
{
  "error": "PLAN_NOT_FOUND",
  "message": "指定的計畫不存在",
  "details": {
    "plan_type": "day",
    "date": "2025-07-02"
  }
}
```

## 檔案操作策略

### 1. 自動建立目錄結構
- 初次存取時自動建立 data/Year, data/Month, data/Week, data/Day 目錄

### 2. 檔案鎖定機制
- 避免併發寫入衝突

### 3. 備份策略
- 更新前先備份原檔案內容