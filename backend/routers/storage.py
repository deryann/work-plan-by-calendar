"""
Storage Router - 儲存模式和 Google Drive 整合 API

提供儲存模式的查詢、切換，以及 Google Drive 路徑設定。
"""

from fastapi import APIRouter, HTTPException, status

from backend.models import (
    Settings, ErrorResponse, StorageStatusResponse,
    GoogleDrivePathUpdateRequest, StorageMode, StorageModeType,
    StorageModeUpdateRequest, GoogleAuthStatus
)
from backend.routers.dependencies import (
    get_settings_service, 
    get_google_auth_service,
    get_plan_service
)

router = APIRouter(prefix="/api/storage", tags=["Storage"])

# 取得共用的 service 實例
settings_service = get_settings_service()
google_auth_service = get_google_auth_service()
plan_service = get_plan_service()


@router.get("/status", response_model=StorageStatusResponse)
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


@router.put("/google-drive-path", response_model=Settings)
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


@router.put("/mode", response_model=StorageStatusResponse)
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


@router.post("/test-connection")
async def test_google_drive_connection():
    """測試 Google Drive 連線 (T081)
    
    Returns:
        連線測試結果，包含：
        - success: 是否成功
        - message: 結果訊息
        - details: 詳細資訊（成功時包含帳號資訊）
    """
    try:
        # 檢查授權狀態
        auth_status = google_auth_service.get_auth_status()
        if auth_status.status != GoogleAuthStatus.CONNECTED:
            return {
                "success": False,
                "message": "請先連結 Google 帳號",
                "details": {"error_type": "not_connected"}
            }
        
        # 建立 GoogleDriveStorageProvider 並測試連線
        from backend.storage import GoogleDriveStorageProvider
        
        storage_mode = settings_service.get_storage_mode()
        provider = GoogleDriveStorageProvider(
            base_path=storage_mode.google_drive_path or "WorkPlanByCalendar",
            auth_service=google_auth_service
        )
        
        result = provider.test_connection()
        return result
        
    except Exception as e:
        return {
            "success": False,
            "message": f"連線測試失敗: {str(e)}",
            "details": {"error_type": "unknown", "error": str(e)}
        }
