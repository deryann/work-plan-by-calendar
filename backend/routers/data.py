"""
Data Router - 資料匯出/匯入 API

提供資料的匯出（ZIP 打包）和匯入（驗證、執行）功能。
"""

import re
import tempfile
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse

from backend.models import (
    ExportResponse, ImportValidation, ImportSuccessResponse, ErrorResponse
)
from backend.data_export_service import create_export_zip, validate_zip_file, execute_import

router = APIRouter(prefix="/api", tags=["Data Export/Import"])


@router.post("/export/create", response_model=ExportResponse)
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


@router.get("/export/download/{filename}")
async def download_export(filename: str):
    """下載匯出的 ZIP 檔案"""
    # 驗證檔名格式 (防止路徑穿越攻擊)
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


@router.post("/import/validate", response_model=ImportValidation)
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


@router.post("/import/execute", response_model=ImportSuccessResponse)
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
