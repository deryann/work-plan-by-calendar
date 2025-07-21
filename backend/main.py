from fastapi import FastAPI, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from typing import Optional
import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from backend.models import (
    Plan, PlanType, PlanCreate, PlanUpdate, AllPlans, 
    CopyRequest, ErrorResponse
)
from backend.plan_service import PlanService

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

# Initialize the plan service
plan_service = PlanService()


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)