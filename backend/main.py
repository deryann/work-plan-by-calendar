"""
Work Plan Calendar API - Main Application

重構後的架構：
- main.py: 應用程式初始化、中介軟體、靜態檔案掛載
- routers/: API endpoints 依功能分組
  - plans.py: 計畫 CRUD 和導航
  - settings.py: 應用程式設定
  - storage.py: 儲存模式和 Google Drive
  - auth.py: Google OAuth 認證
  - data.py: 資料匯出/匯入
"""

import os
import sys
from pathlib import Path

from fastapi import FastAPI, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from backend.models import ErrorResponse
from backend.routers import (
    plans_router,
    settings_router,
    storage_router,
    auth_router,
    data_router
)

# ============================================================================
# Application Setup
# ============================================================================

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

# ============================================================================
# Static Files
# ============================================================================

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

# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(IOError)
async def io_error_handler(request, exc):
    """處理 IO 錯誤"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="FILE_OPERATION_ERROR",
            message=str(exc),
            details={"request_url": str(request.url)}
        ).dict()
    )


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """處理數值錯誤"""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            error="INVALID_REQUEST",
            message=str(exc),
            details={"request_url": str(request.url)}
        ).dict()
    )

# ============================================================================
# Include Routers
# ============================================================================

app.include_router(plans_router)
app.include_router(settings_router)
app.include_router(storage_router)
app.include_router(auth_router)
app.include_router(data_router)

# ============================================================================
# Root Endpoints
# ============================================================================

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


# ============================================================================
# Health & Version Endpoints
# ============================================================================

@app.get("/api/health")
async def health_check():
    """健康檢查端點"""
    return {
        "status": "healthy",
        "service": "work-plan-calendar-api",
        "version": "1.0.0"
    }


@app.get("/api/version")
async def get_version():
    """取得版本資訊"""
    return {
        "project_name": os.getenv("PROJECT_NAME", "work-plan-calendar"),
        "version": os.getenv("IMAGE_TAG", "dev"),
        "commit_hash": os.getenv("GIT_COMMIT_HASH", "dev"),
        "build_time": os.getenv("BUILD_TIME", "unknown")
    }


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)