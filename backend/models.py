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


# Google Drive 儲存整合相關模型 (002-google-drive-storage)
class StorageModeType(str, Enum):
    """儲存模式類型"""
    LOCAL = "local"                    # 本地檔案系統
    GOOGLE_DRIVE = "google_drive"      # Google Drive


class GoogleAuthStatus(str, Enum):
    """Google 授權狀態"""
    NOT_CONNECTED = "not_connected"    # 未連結
    CONNECTED = "connected"            # 已連結
    EXPIRED = "expired"                # 授權過期
    ERROR = "error"                    # 授權錯誤


class StorageMode(BaseModel):
    """儲存模式設定"""
    mode: StorageModeType = StorageModeType.LOCAL
    google_drive_path: Optional[str] = "WorkPlanByCalendar"
    last_sync_at: Optional[datetime] = None
    
    @validator('google_drive_path')
    def validate_google_drive_path(cls, v):
        """驗證 Google Drive 路徑"""
        if v is None:
            return v
        if len(v) < 1 or len(v) > 255:
            raise ValueError('路徑長度必須在 1-255 字元之間')
        if '..' in v:
            raise ValueError('路徑不可包含 ".."')
        if v.startswith('/'):
            raise ValueError('路徑必須為相對路徑')
        return v


class GoogleAuthInfo(BaseModel):
    """Google 授權資訊（用於 API 回應，不含敏感資料）"""
    status: GoogleAuthStatus = GoogleAuthStatus.NOT_CONNECTED
    user_email: Optional[str] = None
    connected_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class GoogleAuthToken(BaseModel):
    """Google 授權 Token（僅後端使用，加密儲存）"""
    access_token: str
    refresh_token: str
    token_expiry: datetime
    user_email: str
    scopes: List[str]
    created_at: datetime
    updated_at: datetime


class StorageModeUpdateRequest(BaseModel):
    """儲存模式更新請求"""
    mode: StorageModeType
    google_drive_path: Optional[str] = None
    
    @validator('google_drive_path')
    def validate_google_drive_path(cls, v):
        """驗證 Google Drive 路徑"""
        if v is None:
            return v
        if len(v) < 1 or len(v) > 255:
            raise ValueError('路徑長度必須在 1-255 字元之間')
        if '..' in v:
            raise ValueError('路徑不可包含 ".."')
        if v.startswith('/'):
            raise ValueError('路徑必須為相對路徑')
        return v


class StorageStatusResponse(BaseModel):
    """儲存狀態回應"""
    mode: StorageModeType
    google_drive_path: Optional[str]
    google_auth: GoogleAuthInfo
    is_ready: bool  # 當前模式是否可用


class GoogleDrivePathUpdateRequest(BaseModel):
    """Google Drive 路徑更新請求"""
    path: str = Field(..., min_length=1, max_length=255)
    
    @validator('path')
    def validate_path(cls, v):
        """驗證路徑格式"""
        if '..' in v:
            raise ValueError('路徑不可包含 ".."')
        if v.startswith('/'):
            raise ValueError('路徑必須為相對路徑')
        return v


class GoogleAuthCallbackRequest(BaseModel):
    """OAuth 回調請求"""
    code: str  # Authorization Code
    redirect_uri: str


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
    storage: StorageMode = StorageMode()


class SettingsUpdate(BaseModel):
    ui: Optional[UISettings] = None
    storage: Optional[StorageMode] = None


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


# ============================================================
# 本地與 Google Drive 同步功能模型 (sync-files)
# ============================================================

class FileSyncStatus(str, Enum):
    """檔案同步狀態"""
    LOCAL_ONLY = "local_only"    # 僅存在本地 data/ 目錄
    CLOUD_ONLY = "cloud_only"    # 僅存在 Google Drive
    SAME = "same"                # 兩邊 MD5 hash 完全相同
    DIFFERENT = "different"      # 兩邊都有，但 MD5 不同


class SyncAction(str, Enum):
    """同步操作方向"""
    UPLOAD = "upload"            # 將本地檔案上傳至 Google Drive（覆蓋）
    DOWNLOAD = "download"        # 將 Google Drive 檔案下載至本地（覆蓋）
    SKIP = "skip"                # 不執行同步


class FileDiffStats(BaseModel):
    """
    檔案行數差異統計
    僅在 FileSyncStatus.DIFFERENT 時填充
    以「本地為基準」計算差異方向
    """
    local_lines: int             # 本地檔案的行數
    cloud_lines: int             # Google Drive 檔案的行數
    added_lines: int             # 雲端比本地多的行數（max(0, cloud - local)）
    removed_lines: int           # 本地比雲端多的行數（max(0, local - cloud)）


class FileSyncInfo(BaseModel):
    """單一檔案的同步狀態資訊"""
    relative_path: str                        # 相對路徑，如 "Year/2025.md"
    status: FileSyncStatus                    # 同步狀態
    local_modified_at: Optional[datetime]     # 本地最後修改時間
    local_md5: Optional[str]                  # 本地 MD5 hash
    cloud_modified_at: Optional[datetime]     # Google Drive 最後修改時間
    cloud_md5: Optional[str]                  # Google Drive 的 md5Checksum
    diff_stats: Optional[FileDiffStats]       # 僅 DIFFERENT 狀態時有值
    suggested_action: SyncAction              # 系統建議的操作


class SyncComparisonResult(BaseModel):
    """完整的比較結果"""
    files: List[FileSyncInfo]
    total_local_only: int
    total_cloud_only: int
    total_same: int
    total_different: int
    compared_at: datetime


class SyncOperationRequest(BaseModel):
    """單筆同步操作請求"""
    file_path: str
    action: SyncAction

    @validator('action')
    def action_not_skip(cls, v):
        if v == SyncAction.SKIP:
            raise ValueError("操作不可為 skip，請只包含 upload 或 download")
        return v


class SyncExecuteRequest(BaseModel):
    """批次同步操作請求"""
    operations: List[SyncOperationRequest]

    @validator('operations')
    def operations_not_empty(cls, v):
        if len(v) == 0:
            raise ValueError("操作清單不可為空")
        return v


class SyncOperationResult(BaseModel):
    """單筆操作執行結果"""
    file_path: str
    action: SyncAction
    success: bool
    error_message: Optional[str]


class SyncExecuteResult(BaseModel):
    """批次同步執行結果"""
    total: int
    success_count: int
    failed_count: int
    results: List[SyncOperationResult]
    executed_at: datetime
