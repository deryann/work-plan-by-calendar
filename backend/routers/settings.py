"""
Settings Router - 應用程式設定 API

提供設定的讀取、更新、重設功能。
"""

from fastapi import APIRouter, HTTPException, status

from backend.models import Settings, UISettings, SettingsUpdate, ErrorResponse
from backend.routers.dependencies import get_settings_service

router = APIRouter(prefix="/api", tags=["Settings"])

# 取得共用的 service 實例
settings_service = get_settings_service()


@router.get("/settings", response_model=Settings)
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


@router.get("/settings/ui", response_model=UISettings)
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


@router.put("/settings", response_model=Settings)
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


@router.put("/settings/ui", response_model=Settings)
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


@router.post("/settings/reset", response_model=Settings)
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
