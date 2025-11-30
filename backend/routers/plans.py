"""
Plans Router - 計畫 CRUD 和導航 API

提供計畫的建立、讀取、更新、刪除功能，
以及日期導航和批次查詢功能。
"""

from fastapi import APIRouter, HTTPException, status
from datetime import date

from backend.models import (
    Plan, PlanType, PlanCreate, PlanUpdate, AllPlans,
    CopyRequest, ErrorResponse
)
from backend.routers.dependencies import get_plan_service

router = APIRouter(prefix="/api", tags=["Plans"])

# 取得共用的 service 實例
plan_service = get_plan_service()


# Plan CRUD endpoints
@router.get("/plans/{plan_type}/{plan_date}", response_model=Plan)
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


@router.post("/plans/{plan_type}/{plan_date}", response_model=Plan)
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


@router.put("/plans/{plan_type}/{plan_date}", response_model=Plan)
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


@router.delete("/plans/{plan_type}/{plan_date}")
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
@router.get("/plans/{plan_type}/{plan_date}/previous", response_model=Plan)
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


@router.get("/plans/{plan_type}/{plan_date}/next", response_model=Plan)
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


@router.get("/plans/all/{target_date}", response_model=AllPlans)
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
@router.post("/plans/copy", response_model=Plan)
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


# Plan existence check endpoint
@router.get("/plans/{plan_type}/{plan_date}/exists")
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
@router.get("/plans/existence")
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
