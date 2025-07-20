# 資料結構設計規格

## 目錄結構設計

```
project/
├── data/
│   ├── Year/
│   │   ├── 2023.md
│   │   ├── 2024.md
│   │   └── 2025.md
│   ├── Month/
│   │   ├── 202301.md
│   │   ├── 202302.md
│   │   └── ...
│   ├── Week/
│   │   ├── 20250601.md  # 該週周日日期
│   │   ├── 20250608.md
│   │   └── ...
│   └── Day/
│       ├── 20250601.md
│       ├── 20250602.md
│       └── ...
```

## 檔案命名規則

### 1. 年度計畫檔案
- 檔名格式：`YYYY.md`
- 例：`2025.md`

### 2. 月度計畫檔案
- 檔名格式：`YYYYMM.md`
- 例：`202507.md`

### 3. 週計畫檔案
- 檔名格式：`YYYYMMDD.md`（該週周日日期）
- 例：`20250601.md`（2025年6月1日至6月7日的週計畫）

### 4. 日計畫檔案
- 檔名格式：`YYYYMMDD.md`
- 例：`20250602.md`

## Markdown 內容格式規範

### 1. 年度計畫標題格式
```markdown
# 2025 年度計畫

<!-- 計畫內容 -->
```

### 2. 月度計畫標題格式
```markdown
# 2025-07 月度計畫

<!-- 計畫內容 -->
```

### 3. 週計畫標題格式
```markdown
# 2025-06-01~2025-06-07 週計畫

<!-- 計畫內容 -->
```

### 4. 日計畫標題格式
```markdown
# 2025-06-02 日計畫

<!-- 計畫內容 -->
```

## 資料模型定義

### PlanItem 資料結構

```python
from enum import Enum
from datetime import date
from pydantic import BaseModel

class PlanType(str, Enum):
    YEAR = "year"
    MONTH = "month" 
    WEEK = "week"
    DAY = "day"

class PlanItem(BaseModel):
    type: PlanType
    date: date  # 基準日期
    title: str  # 計畫標題
    content: str  # Markdown 內容
    created_at: datetime
    updated_at: datetime
```

### 日期計算邏輯

#### 1. 週計畫日期計算
- 輸入任意日期，計算該週的周日日期作為檔名
- 標題顯示該週的周日至周六日期範圍

#### 2. 時間導航邏輯
- 前一年：當前年份 - 1
- 前一月：當前月份 - 1（跨年處理）
- 前一週：當前週日日期 - 7天
- 前一日：當前日期 - 1天

## 檔案系統操作規範

### 1. 檔案讀取
- 檔案不存在時，返回空內容並創建預設標題
- 檔案存在時，解析 Markdown 內容

### 2. 檔案寫入
- 自動創建目錄結構
- 更新時保留檔案修改時間戳記

### 3. 錯誤處理
- 檔案權限錯誤
- 磁碟空間不足
- 檔案格式錯誤