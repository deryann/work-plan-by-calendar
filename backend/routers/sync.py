"""
Sync Router - 本地與 Google Drive 差異比較與同步 API

Feature: sync-files (Issue #19)
"""

from fastapi import APIRouter, HTTPException, Query, status

from backend.models import (
    SyncComparisonResult, SyncExecuteRequest, SyncExecuteResult,
    GoogleAuthStatus, ErrorResponse
)
from backend.routers.dependencies import get_settings_service, get_google_auth_service

router = APIRouter(prefix="/api/sync", tags=["Sync"])

# 取得共用 service 實例
settings_service = get_settings_service()
google_auth_service = get_google_auth_service()


def _get_sync_service():
    """建立 SyncService 實例（不快取，因需要最新的 auth token）"""
    from backend.storage.local import LocalStorageProvider
    from backend.storage.google_drive import GoogleDriveStorageProvider
    from backend.sync_service import SyncService

    auth_status = google_auth_service.get_auth_status()
    if auth_status.status != GoogleAuthStatus.CONNECTED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorResponse(
                error="GOOGLE_NOT_CONNECTED",
                message="請先連結 Google 帳號才能使用同步功能",
                details={"auth_status": auth_status.status.value}
            ).dict()
        )

    storage_mode = settings_service.get_storage_mode()
    google_drive_path = storage_mode.google_drive_path or "WorkPlanByCalendar"

    local_provider = LocalStorageProvider()
    google_provider = GoogleDriveStorageProvider(
        base_path=google_drive_path,
        auth_service=google_auth_service
    )

    return SyncService(local_provider=local_provider, google_provider=google_provider)


@router.get("/compare", response_model=SyncComparisonResult)
async def compare_files():
    """比較本地與 Google Drive 的所有計畫檔案

    比較範圍：Year/, Month/, Week/, Day/ 四個子目錄（排除 settings/）
    比較標準：MD5 hash

    Returns:
        SyncComparisonResult 包含所有檔案的同步狀態與統計

    Raises:
        401: Google 帳號未連結或授權已過期
        503: Google Drive 連線失敗
    """
    try:
        sync_service = _get_sync_service()
        return sync_service.compare()
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "授權" in error_msg or "auth" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ErrorResponse(
                    error="AUTH_EXPIRED",
                    message="Google 授權已過期，請重新登入",
                    details={}
                ).dict()
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                error="SYNC_COMPARE_ERROR",
                message=f"無法連線至 Google Drive，請檢查網路：{error_msg}",
                details={}
            ).dict()
        )


@router.get("/diff")
async def get_file_diff(file_path: str = Query(..., description="計畫檔案相對路徑，如 Year/2025.md")):
    """取得單一檔案的本地與 Google Drive 內容，供前端差異比較顯示

    Args:
        file_path: 相對路徑（如 Year/2025.md）

    Returns:
        { file_path, local_content, cloud_content }
        若某端不存在則該欄位為空字串

    Raises:
        400: file_path 為空
        401: Google 帳號未連線
        404: 兩端皆不存在
        503: Google Drive 連線失敗
    """
    if not file_path or ".." in file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="INVALID_FILE_PATH",
                message="file_path 不合法",
                details={}
            ).dict()
        )
    try:
        sync_service = _get_sync_service()
        local_content = None
        cloud_content = None
        try:
            local_content = sync_service.local.read_file(file_path)
        except (FileNotFoundError, IOError):
            pass
        try:
            cloud_content = sync_service.cloud.read_file(file_path)
        except (FileNotFoundError, IOError):
            pass
        if local_content is None and cloud_content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorResponse(
                    error="FILE_NOT_FOUND",
                    message=f"本地與 Google Drive 皆找不到檔案：{file_path}",
                    details={"file_path": file_path}
                ).dict()
            )
        return {
            "file_path": file_path,
            "local_content": local_content or "",
            "cloud_content": cloud_content or "",
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "授權" in error_msg or "auth" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ErrorResponse(
                    error="AUTH_EXPIRED",
                    message="Google 授權已過期，請重新登入",
                    details={}
                ).dict()
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                error="SYNC_DIFF_ERROR",
                message=f"取得檔案內容失敗：{error_msg}",
                details={}
            ).dict()
        )


@router.post("/execute", response_model=SyncExecuteResult)
async def execute_sync(request: SyncExecuteRequest):
    """執行選定的同步操作

    依序執行 upload（本地→雲端）或 download（雲端→本地）操作。
    部分失敗時仍回傳 HTTP 200，前端應檢查 failed_count > 0。

    Args:
        request: 包含操作清單的請求（不可包含 skip，不可為空）

    Returns:
        SyncExecuteResult 包含每個操作的執行結果

    Raises:
        400: 請求格式錯誤（operations 為空或包含 skip）
        401: Google 帳號未連結或授權已過期
        503: Google Drive 連線失敗
    """
    try:
        sync_service = _get_sync_service()
        return sync_service.execute(request.operations)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="INVALID_REQUEST",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        error_msg = str(e)
        if "授權" in error_msg or "auth" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ErrorResponse(
                    error="AUTH_EXPIRED",
                    message="Google 授權已過期，請重新登入",
                    details={}
                ).dict()
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                error="SYNC_EXECUTE_ERROR",
                message=f"同步執行失敗：{error_msg}",
                details={}
            ).dict()
        )
