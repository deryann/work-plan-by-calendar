"""
Router Dependencies - 共用的依賴注入

提供各 Router 共用的 Service 實例，確保單例模式。
"""

from pathlib import Path
from typing import Optional

# Service 單例
_plan_service = None
_settings_service = None
_google_auth_service = None


def get_project_root() -> Path:
    """取得專案根目錄"""
    return Path(__file__).parent.parent.parent


def get_data_dir() -> Path:
    """取得資料目錄"""
    return get_project_root() / "data"


def get_plan_service():
    """取得 PlanService 單例"""
    global _plan_service
    if _plan_service is None:
        from backend.plan_service import PlanService
        _plan_service = PlanService(data_dir=str(get_data_dir()))
    return _plan_service


def get_settings_service():
    """取得 SettingsService 單例"""
    global _settings_service
    if _settings_service is None:
        from backend.settings_service import SettingsService
        _settings_service = SettingsService()
    return _settings_service


def get_google_auth_service():
    """取得 GoogleAuthService 單例"""
    global _google_auth_service
    if _google_auth_service is None:
        from backend.google_auth_service import GoogleAuthService
        _google_auth_service = GoogleAuthService()
    return _google_auth_service


def reset_services():
    """重設所有 Service 實例（用於測試）"""
    global _plan_service, _settings_service, _google_auth_service
    _plan_service = None
    _settings_service = None
    _google_auth_service = None
