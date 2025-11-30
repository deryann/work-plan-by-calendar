from fastapi import FastAPI, HTTPException, status, Request, UploadFile, File, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, datetime
from typing import Optional
import sys
import os
import tempfile
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from backend.models import (
    Plan, PlanType, PlanCreate, PlanUpdate, AllPlans, 
    CopyRequest, ErrorResponse, Settings, UISettings, SettingsUpdate,
    ExportResponse, ImportValidation, ImportSuccessResponse,
    GoogleAuthInfo, GoogleAuthCallbackRequest, StorageStatusResponse,
    GoogleDrivePathUpdateRequest, StorageMode, StorageModeType,
    StorageModeUpdateRequest, GoogleAuthStatus
)
from backend.plan_service import PlanService
from backend.settings_service import SettingsService
from backend.data_export_service import create_export_zip, validate_zip_file, execute_import
from backend.google_auth_service import GoogleAuthService, GoogleAuthError

app = FastAPI(
    title="Work Plan Calendar API",
    description="REST API for managing hierarchical work plans by calendar periods",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files - serve from project root
static_dir = project_root / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Mount frontend files
frontend_dir = project_root / "frontend"
if frontend_dir.exists():
    app.mount("/frontend", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

# Mount snapshot files - serve screenshot documentation
snapshot_dir = project_root / "snapshot"
if snapshot_dir.exists():
    app.mount("/snapshot", StaticFiles(directory=str(snapshot_dir), html=True), name="snapshot")

# Initialize services with correct data directory
# 使用專案根目錄的 data 作為資料目錄
data_dir = project_root / "data"
plan_service = PlanService(data_dir=str(data_dir))
settings_service = SettingsService()
google_auth_service = GoogleAuthService()


@app.exception_handler(IOError)
async def io_error_handler(request, exc):
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=ErrorResponse(
            error="FILE_OPERATION_ERROR",
            message=str(exc),
            details={"request_url": str(request.url)}
        ).dict()
    )


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=ErrorResponse(
            error="INVALID_REQUEST",
            message=str(exc),
            details={"request_url": str(request.url)}
        ).dict()
    )


@app.get("/")
async def root():
    """Root endpoint serving the frontend application"""
    index_path = project_root / "frontend" / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "Work Plan Calendar API", "version": "1.0.0", "error": "Frontend not found"}


@app.get("/app")
async def app_frontend():
    """Alternative frontend endpoint"""
    index_path = project_root / "frontend" / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"error": "Frontend not found"}


# Plan CRUD endpoints
@app.get("/api/plans/{plan_type}/{plan_date}", response_model=Plan)
async def get_plan(plan_type: PlanType, plan_date: date):
    """取得計畫內容"""
    try:
        plan = plan_service.get_plan(plan_type, plan_date)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PLAN_READ_ERROR",
                message=f"Failed to read plan: {str(e)}",
                details={"plan_type": plan_type, "date": str(plan_date)}
            ).dict()
        )


@app.post("/api/plans/{plan_type}/{plan_date}", response_model=Plan)
async def create_plan(plan_type: PlanType, plan_date: date, plan_data: PlanCreate):
    """建立新計畫"""
    try:
        plan = plan_service.create_plan(plan_type, plan_date, plan_data.content)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PLAN_CREATE_ERROR",
                message=f"Failed to create plan: {str(e)}",
                details={"plan_type": plan_type, "date": str(plan_date)}
            ).dict()
        )


@app.put("/api/plans/{plan_type}/{plan_date}", response_model=Plan)
async def update_plan(plan_type: PlanType, plan_date: date, plan_data: PlanUpdate):
    """更新計畫內容"""
    try:
        plan = plan_service.update_plan(plan_type, plan_date, plan_data.content)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PLAN_UPDATE_ERROR",
                message=f"Failed to update plan: {str(e)}",
                details={"plan_type": plan_type, "date": str(plan_date)}
            ).dict()
        )


@app.delete("/api/plans/{plan_type}/{plan_date}")
async def delete_plan(plan_type: PlanType, plan_date: date):
    """刪除計畫"""
    try:
        success = plan_service.delete_plan(plan_type, plan_date)
        if success:
            return {"message": "Plan deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorResponse(
                    error="PLAN_NOT_FOUND",
                    message="Plan file not found",
                    details={"plan_type": plan_type, "date": str(plan_date)}
                ).dict()
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PLAN_DELETE_ERROR",
                message=f"Failed to delete plan: {str(e)}",
                details={"plan_type": plan_type, "date": str(plan_date)}
            ).dict()
        )


# Navigation endpoints
@app.get("/api/plans/{plan_type}/{plan_date}/previous", response_model=Plan)
async def get_previous_plan(plan_type: PlanType, plan_date: date):
    """取得前一期計畫"""
    try:
        plan = plan_service.get_previous_plan(plan_type, plan_date)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PREVIOUS_PLAN_ERROR",
                message=f"Failed to get previous plan: {str(e)}",
                details={"plan_type": plan_type, "date": str(plan_date)}
            ).dict()
        )


@app.get("/api/plans/{plan_type}/{plan_date}/next", response_model=Plan)
async def get_next_plan(plan_type: PlanType, plan_date: date):
    """取得後一期計畫"""
    try:
        plan = plan_service.get_next_plan(plan_type, plan_date)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="NEXT_PLAN_ERROR",
                message=f"Failed to get next plan: {str(e)}",
                details={"plan_type": plan_type, "date": str(plan_date)}
            ).dict()
        )


@app.get("/api/plans/all/{target_date}", response_model=AllPlans)
async def get_all_plans_for_date(target_date: date):
    """取得指定日期的所有類型計畫"""
    try:
        all_plans = plan_service.get_all_plans_for_date(target_date)
        return all_plans
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="ALL_PLANS_ERROR",
                message=f"Failed to get all plans: {str(e)}",
                details={"target_date": str(target_date)}
            ).dict()
        )


# Content copy endpoint
@app.post("/api/plans/copy", response_model=Plan)
async def copy_plan_content(copy_request: CopyRequest):
    """複製計畫內容"""
    try:
        plan = plan_service.copy_content(copy_request)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="COPY_CONTENT_ERROR",
                message=f"Failed to copy content: {str(e)}",
                details={
                    "source_type": copy_request.source_type,
                    "source_date": str(copy_request.source_date),
                    "target_type": copy_request.target_type,
                    "target_date": str(copy_request.target_date)
                }
            ).dict()
        )


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """健康檢查端點"""
    return {
        "status": "healthy",
        "service": "work-plan-calendar-api",
        "version": "1.0.0"
    }


# Version info endpoint
@app.get("/api/version")
async def get_version():
    """取得版本資訊"""
    version = os.getenv("IMAGE_TAG", "dev")
    commit_hash = os.getenv("GIT_COMMIT_HASH", "dev")
    project_name = os.getenv("PROJECT_NAME", "work-plan-calendar")
    
    return {
        "project_name": project_name,
        "version": version,
        "commit_hash": commit_hash,
        "build_time": os.getenv("BUILD_TIME", "unknown")
    }


# Plan existence check endpoint
@app.get("/api/plans/{plan_type}/{plan_date}/exists")
async def check_plan_exists(plan_type: PlanType, plan_date: date):
    """檢查計畫是否存在"""
    try:
        exists = plan_service.plan_exists(plan_type, plan_date)
        return {"exists": exists}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PLAN_CHECK_ERROR",
                message=f"Failed to check plan existence: {str(e)}",
                details={"plan_type": plan_type, "date": str(plan_date)}
            ).dict()
        )


# Plans existence for date range endpoint
@app.get("/api/plans/existence")
async def get_plans_existence(start_date: date, end_date: date):
    """取得日期範圍內的計畫存在狀態"""
    try:
        # Check if date range is valid
        if start_date > end_date:
            raise ValueError("Start date must be before or equal to end date")

        # Limit the date range to prevent excessive queries (max 60 days)
        delta = (end_date - start_date).days
        if delta > 60:
            raise ValueError("Date range cannot exceed 60 days")

        # Get plans existence for the date range
        result = plan_service.get_plans_existence(start_date, end_date)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="INVALID_DATE_RANGE",
                message=str(e),
                details={"start_date": str(start_date), "end_date": str(end_date)}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PLANS_EXISTENCE_ERROR",
                message=f"Failed to get plans existence: {str(e)}",
                details={"start_date": str(start_date), "end_date": str(end_date)}
            ).dict()
        )


# Settings endpoints
@app.get("/api/settings", response_model=Settings)
async def get_settings():
    """取得所有設定"""
    try:
        settings = settings_service.load_settings()
        return settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="SETTINGS_READ_ERROR",
                message=f"Failed to read settings: {str(e)}",
                details={}
            ).dict()
        )


@app.get("/api/settings/ui", response_model=UISettings)
async def get_ui_settings():
    """取得 UI 設定"""
    try:
        ui_settings = settings_service.get_ui_settings()
        return ui_settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="UI_SETTINGS_READ_ERROR",
                message=f"Failed to read UI settings: {str(e)}",
                details={}
            ).dict()
        )


@app.put("/api/settings", response_model=Settings)
async def update_settings(settings_update: SettingsUpdate):
    """更新設定"""
    try:
        updated_settings = settings_service.update_settings(settings_update)
        return updated_settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="SETTINGS_UPDATE_ERROR",
                message=f"Failed to update settings: {str(e)}",
                details={}
            ).dict()
        )


@app.put("/api/settings/ui", response_model=Settings)
async def update_ui_settings(ui_settings: UISettings):
    """更新 UI 設定"""
    try:
        updated_settings = settings_service.update_ui_settings(ui_settings)
        return updated_settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="UI_SETTINGS_UPDATE_ERROR",
                message=f"Failed to update UI settings: {str(e)}",
                details={}
            ).dict()
        )


@app.post("/api/settings/reset", response_model=Settings)
async def reset_settings():
    """重設設定為預設值"""
    try:
        default_settings = settings_service.reset_settings()
        return default_settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="SETTINGS_RESET_ERROR",
                message=f"Failed to reset settings: {str(e)}",
                details={}
            ).dict()
        )


# Data Export/Import endpoints
@app.post("/api/export/create", response_model=ExportResponse)
async def export_data():
    """建立資料匯出檔案"""
    try:
        zip_path, file_count = create_export_zip()
        file_size = zip_path.stat().st_size
        created_at = datetime.now().isoformat()
        
        return ExportResponse(
            filename=zip_path.name,
            file_size=file_size,
            created_at=created_at,
            file_count=file_count,
            download_url=f"/api/export/download/{zip_path.name}"
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error="DATA_DIR_NOT_FOUND",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="EXPORT_ERROR",
                message=f"匯出失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.get("/api/export/download/{filename}")
async def download_export(filename: str):
    """下載匯出的 ZIP 檔案"""
    # 驗證檔名格式 (防止路徑穿越攻擊)
    import re
    if not re.match(r'^export_data_\d{8}_\d{6}\.zip$', filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="INVALID_FILENAME",
                message="無效的檔案名稱格式",
                details={"expected_format": "export_data_YYYYMMDD_HHMMSS.zip"}
            ).dict()
        )
    
    file_path = Path(tempfile.gettempdir()) / filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error="FILE_NOT_FOUND",
                message="找不到指定的匯出檔案",
                details={"filename": filename}
            ).dict()
        )
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/zip"
    )


@app.post("/api/import/validate", response_model=ImportValidation)
async def validate_import(file: UploadFile = File(...)):
    """驗證匯入檔案格式和內容"""
    try:
        validation_result = await validate_zip_file(file)
        return validation_result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="VALIDATION_ERROR",
                message=f"驗證過程發生錯誤: {str(e)}",
                details={}
            ).dict()
        )


@app.post("/api/import/execute", response_model=ImportSuccessResponse)
async def import_data(file: UploadFile = File(...)):
    """執行資料匯入 (含驗證、備份、回滾機制)"""
    try:
        import_result = await execute_import(file)
        return import_result
    except ValueError as e:
        # 驗證失敗
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="VALIDATION_FAILED",
                message=str(e),
                details={}
            ).dict()
        )
    except IOError as e:
        # 匯入/回滾失敗
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="IMPORT_ERROR",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="UNKNOWN_ERROR",
                message=f"匯入過程發生未知錯誤: {str(e)}",
                details={}
            ).dict()
        )


# Google Auth endpoints (002-google-drive-storage)

# Storage endpoints (002-google-drive-storage)
@app.get("/api/storage/status", response_model=StorageStatusResponse)
async def get_storage_status():
    """取得儲存狀態
    
    回傳：
    - 當前儲存模式
    - Google Drive 路徑設定
    - Google 授權狀態
    - 儲存是否可用
    """
    try:
        storage_mode = settings_service.get_storage_mode()
        auth_status = google_auth_service.get_auth_status()
        
        # 判斷當前模式是否可用
        is_ready = True
        if storage_mode.mode == StorageModeType.GOOGLE_DRIVE:
            # Google Drive 模式需要已授權才可用
            from backend.models import GoogleAuthStatus
            is_ready = auth_status.status == GoogleAuthStatus.CONNECTED
        
        return StorageStatusResponse(
            mode=storage_mode.mode,
            google_drive_path=storage_mode.google_drive_path,
            google_auth=auth_status,
            is_ready=is_ready
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="STORAGE_STATUS_ERROR",
                message=f"取得儲存狀態失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.put("/api/storage/google-drive-path", response_model=Settings)
async def update_google_drive_path(request: GoogleDrivePathUpdateRequest):
    """更新 Google Drive 儲存路徑
    
    Args:
        request: 包含新路徑的請求物件
        
    Returns:
        更新後的完整設定
    """
    try:
        updated_settings = settings_service.update_google_drive_path(request.path)
        return updated_settings
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="INVALID_PATH",
                message=str(e),
                details={"path": request.path}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="PATH_UPDATE_ERROR",
                message=f"更新路徑失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.put("/api/storage/mode", response_model=StorageStatusResponse)
async def update_storage_mode(request: StorageModeUpdateRequest):
    """切換儲存模式
    
    Args:
        request: 包含新儲存模式的請求物件
        
    Returns:
        更新後的儲存狀態
        
    Raises:
        400: 切換到 Google Drive 模式但未授權
    """
    try:
        # 如果切換到 Google Drive 模式，需要驗證授權狀態
        if request.mode == StorageModeType.GOOGLE_DRIVE:
            auth_status = google_auth_service.get_auth_status()
            if auth_status.status != GoogleAuthStatus.CONNECTED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=ErrorResponse(
                        error="GOOGLE_NOT_CONNECTED",
                        message="請先連結 Google 帳號才能切換到 Google Drive 模式",
                        details={"current_auth_status": auth_status.status.value}
                    ).dict()
                )
        
        # 更新儲存模式
        storage_mode = StorageMode(
            mode=request.mode,
            google_drive_path=request.google_drive_path or settings_service.get_storage_mode().google_drive_path
        )
        settings_service.update_storage_mode(storage_mode)
        
        # 動態切換 PlanService 的 StorageProvider
        plan_service.switch_storage_provider(request.mode)
        
        # 回傳更新後的狀態
        auth_status = google_auth_service.get_auth_status()
        is_ready = True
        if request.mode == StorageModeType.GOOGLE_DRIVE:
            is_ready = auth_status.status == GoogleAuthStatus.CONNECTED
        
        return StorageStatusResponse(
            mode=storage_mode.mode,
            google_drive_path=storage_mode.google_drive_path,
            google_auth=auth_status,
            is_ready=is_ready
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="INVALID_MODE",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="MODE_UPDATE_ERROR",
                message=f"切換儲存模式失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.get("/api/auth/google/status", response_model=GoogleAuthInfo)
async def get_google_auth_status():
    """取得 Google 授權狀態"""
    try:
        auth_status = google_auth_service.get_auth_status()
        return auth_status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="AUTH_STATUS_ERROR",
                message=f"取得授權狀態失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.get("/api/auth/google/authorize")
async def get_google_auth_url(redirect_uri: str = Query(..., description="OAuth 回調 URL")):
    """取得 Google OAuth 授權 URL"""
    try:
        auth_url = google_auth_service.get_auth_url(redirect_uri)
        return {"auth_url": auth_url}
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="AUTH_URL_ERROR",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="AUTH_URL_ERROR",
                message=f"產生授權 URL 失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.post("/api/auth/google/callback", response_model=GoogleAuthInfo)
async def google_auth_callback(callback_request: GoogleAuthCallbackRequest):
    """處理 Google OAuth 回調"""
    try:
        auth_info = google_auth_service.handle_callback(
            code=callback_request.code,
            redirect_uri=callback_request.redirect_uri
        )
        return auth_info
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="AUTH_CALLBACK_ERROR",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="AUTH_CALLBACK_ERROR",
                message=f"處理授權回調失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.post("/api/auth/google/logout")
async def google_logout():
    """登出 Google 帳號"""
    try:
        success = google_auth_service.logout()
        if success:
            return {"message": "已成功登出 Google 帳號"}
        else:
            return {"message": "目前未連結 Google 帳號"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="LOGOUT_ERROR",
                message=f"登出失敗: {str(e)}",
                details={}
            ).dict()
        )


@app.post("/api/auth/google/refresh", response_model=GoogleAuthInfo)
async def refresh_google_token():
    """刷新 Google Token"""
    try:
        token = google_auth_service.refresh_token()
        if token:
            return GoogleAuthInfo(
                status="connected",
                user_email=token.user_email,
                connected_at=token.created_at,
                expires_at=token.token_expiry
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ErrorResponse(
                    error="REFRESH_FAILED",
                    message="無法刷新 Token，請重新登入",
                    details={}
                ).dict()
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="REFRESH_ERROR",
                message=f"刷新 Token 失敗: {str(e)}",
                details={}
            ).dict()
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)