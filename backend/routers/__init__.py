"""
API Routers for Work Plan Calendar

將 API endpoints 依功能分組：
- plans: 計畫 CRUD 和導航
- settings: 應用程式設定
- storage: 儲存模式和 Google Drive
- auth: Google OAuth 認證
- data: 資料匯出/匯入
- sync: 本地與 Google Drive 差異比較與同步
"""

from .plans import router as plans_router
from .settings import router as settings_router
from .storage import router as storage_router
from .auth import router as auth_router
from .data import router as data_router
from .sync import router as sync_router

__all__ = [
    'plans_router',
    'settings_router',
    'storage_router',
    'auth_router',
    'data_router',
    'sync_router',
]
