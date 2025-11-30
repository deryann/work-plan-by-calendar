"""
Google Drive Storage Provider

實作 StorageProvider 抽象介面，使用 Google Drive API 進行檔案操作。
"""

import builtins
import io
import time
import logging
from datetime import datetime
from pathlib import PurePosixPath
from typing import Optional, Dict, List, Any
from functools import lru_cache

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials

from .base import StorageProvider, FileStats

# 設置日誌
logger = logging.getLogger(__name__)


# ========================================
# 自定義錯誤類別 (T082)
# ========================================

class GoogleDriveError(Exception):
    """Google Drive 操作錯誤基類"""
    pass


class NetworkError(GoogleDriveError):
    """網路連線錯誤"""
    def __init__(self, message: str = "網路連線失敗，請檢查您的網路狀態"):
        super().__init__(message)


class AuthExpiredError(GoogleDriveError):
    """授權過期錯誤"""
    def __init__(self, message: str = "Google 授權已過期，請重新登入"):
        super().__init__(message)


class QuotaExceededError(GoogleDriveError):
    """API 配額超過錯誤"""
    def __init__(self, message: str = "已達到 Google Drive API 使用限制，請稍後再試"):
        super().__init__(message)


class FileNotFoundError(GoogleDriveError, builtins.FileNotFoundError):
    """檔案不存在錯誤
    
    繼承自 builtins.FileNotFoundError 以確保與 Python 標準異常捕獲相容。
    """
    def __init__(self, path: str):
        super().__init__(f"找不到檔案: {path}")
        self.path = path


# ========================================
# GoogleDriveStorageProvider (T067-T083)
# ========================================

class GoogleDriveStorageProvider(StorageProvider):
    """Google Drive 儲存提供者
    
    使用 Google Drive API v3 進行檔案操作。
    所有路徑都是相對於 base_path（預設為 "WorkPlanByCalendar"）。
    
    Features:
    - 檔案 ID 快取機制減少 API 呼叫
    - 指數退避重試機制處理暫時性錯誤
    - 友善的錯誤訊息轉換
    """
    
    # MIME types
    FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
    TEXT_MIME_TYPE = 'text/markdown'
    
    # 重試設定
    MAX_RETRIES = 3
    INITIAL_BACKOFF = 1.0  # 秒
    BACKOFF_MULTIPLIER = 2.0
    
    def __init__(
        self,
        base_path: str = "WorkPlanByCalendar",
        credentials: Optional[Credentials] = None,
        auth_service: Optional[Any] = None
    ):
        """初始化 Google Drive Storage Provider
        
        Args:
            base_path: Google Drive 中的根資料夾路徑
            credentials: Google OAuth2 憑證（可選）
            auth_service: GoogleAuthService 實例，用於取得和刷新憑證
        """
        self.base_path = base_path
        self._credentials = credentials
        self._auth_service = auth_service
        self._service = None
        
        # 檔案 ID 快取 (T077)
        self._folder_cache: Dict[str, str] = {}  # path -> folder_id
        self._file_cache: Dict[str, str] = {}    # path -> file_id
        
        # 根資料夾 ID 快取
        self._base_folder_id: Optional[str] = None
    
    @property
    def service(self):
        """取得 Google Drive API 服務實例（延遲初始化）"""
        if self._service is None:
            credentials = self._get_credentials()
            if credentials is None:
                raise AuthExpiredError("無法取得 Google 授權憑證")
            self._service = build('drive', 'v3', credentials=credentials)
        return self._service
    
    def _get_credentials(self) -> Optional[Credentials]:
        """取得有效的憑證"""
        if self._credentials is not None:
            return self._credentials
        
        if self._auth_service is not None:
            token = self._auth_service.load_token()
            if token is None:
                return None
            
            # 檢查是否過期並刷新
            if datetime.now() >= token.token_expiry:
                refreshed_token = self._auth_service.refresh_token()
                if refreshed_token is None:
                    return None
                token = refreshed_token
            
            return Credentials(
                token=token.access_token,
                refresh_token=token.refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=self._auth_service.client_id,
                client_secret=self._auth_service.client_secret,
                scopes=token.scopes
            )
        
        return None
    
    def _invalidate_service(self):
        """重置服務實例（用於憑證刷新後）"""
        self._service = None
    
    # ========================================
    # 重試機制 (T078)
    # ========================================
    
    def _execute_with_retry(self, request, description: str = "operation"):
        """執行 API 請求，帶有指數退避重試機制
        
        Args:
            request: Google API 請求物件
            description: 操作描述（用於日誌）
            
        Returns:
            API 回應結果
            
        Raises:
            GoogleDriveError: 操作失敗
        """
        backoff = self.INITIAL_BACKOFF
        last_error = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                return request.execute()
            except HttpError as e:
                last_error = e
                error_code = e.resp.status
                
                # 處理特定錯誤 (T083)
                if error_code == 401:
                    # 授權失敗，嘗試刷新憑證
                    if self._auth_service is not None:
                        self._auth_service.refresh_token()
                        self._invalidate_service()
                        continue
                    raise AuthExpiredError()
                
                elif error_code == 403:
                    error_reason = e.error_details[0].get('reason', '') if e.error_details else ''
                    if 'quotaExceeded' in str(e) or 'rateLimitExceeded' in str(e):
                        raise QuotaExceededError()
                    raise GoogleDriveError(f"存取被拒絕: {self._translate_error(e)}")
                
                elif error_code == 404:
                    raise FileNotFoundError(description)
                
                elif error_code in (500, 502, 503, 504):
                    # 伺服器錯誤，可重試
                    logger.warning(
                        f"Google Drive {description} 失敗 (嘗試 {attempt + 1}/{self.MAX_RETRIES}): {e}"
                    )
                    if attempt < self.MAX_RETRIES - 1:
                        time.sleep(backoff)
                        backoff *= self.BACKOFF_MULTIPLIER
                        continue
                
                else:
                    raise GoogleDriveError(f"Google Drive 操作失敗: {self._translate_error(e)}")
            
            except Exception as e:
                if 'ConnectionError' in str(type(e)) or 'timeout' in str(e).lower():
                    raise NetworkError()
                raise GoogleDriveError(f"未預期的錯誤: {str(e)}")
        
        # 所有重試都失敗
        raise GoogleDriveError(f"操作 '{description}' 在 {self.MAX_RETRIES} 次嘗試後失敗")
    
    def _translate_error(self, error: HttpError) -> str:
        """將 Google API 錯誤轉換為友善訊息 (T083)"""
        try:
            if hasattr(error, 'error_details') and error.error_details:
                reason = error.error_details[0].get('message', str(error))
                
                # 常見錯誤翻譯
                translations = {
                    'insufficientPermissions': '權限不足，請確認已授予 Google Drive 存取權限',
                    'notFound': '找不到指定的檔案或資料夾',
                    'userRateLimitExceeded': '使用者請求頻率過高，請稍後再試',
                    'rateLimitExceeded': 'API 請求頻率過高，請稍後再試',
                    'quotaExceeded': '已達到儲存空間或 API 配額限制',
                    'storageQuotaExceeded': 'Google Drive 儲存空間已滿',
                }
                
                for key, message in translations.items():
                    if key in reason:
                        return message
                
                return reason
            return str(error)
        except Exception:
            return str(error)
    
    # ========================================
    # 輔助方法 (T068-T070)
    # ========================================
    
    def _get_base_folder_id(self) -> str:
        """取得或建立根資料夾 ID"""
        if self._base_folder_id is not None:
            return self._base_folder_id
        
        # 解析 base_path（可能包含子資料夾）
        path_parts = PurePosixPath(self.base_path).parts
        
        parent_id = 'root'
        for part in path_parts:
            folder_id = self._get_or_create_folder(part, parent_id)
            parent_id = folder_id
        
        self._base_folder_id = parent_id
        return self._base_folder_id
    
    def _get_or_create_folder(self, name: str, parent_id: str = 'root') -> str:
        """取得或建立資料夾 (T068)
        
        Args:
            name: 資料夾名稱
            parent_id: 父資料夾 ID
            
        Returns:
            資料夾 ID
        """
        cache_key = f"{parent_id}/{name}"
        
        # 檢查快取
        if cache_key in self._folder_cache:
            return self._folder_cache[cache_key]
        
        # 搜尋現有資料夾
        query = (
            f"name = '{name}' and "
            f"'{parent_id}' in parents and "
            f"mimeType = '{self.FOLDER_MIME_TYPE}' and "
            f"trashed = false"
        )
        
        request = self.service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name)'
        )
        results = self._execute_with_retry(request, f"搜尋資料夾 '{name}'")
        
        if results.get('files'):
            folder_id = results['files'][0]['id']
            self._folder_cache[cache_key] = folder_id
            return folder_id
        
        # 建立新資料夾
        file_metadata = {
            'name': name,
            'mimeType': self.FOLDER_MIME_TYPE,
            'parents': [parent_id]
        }
        
        request = self.service.files().create(
            body=file_metadata,
            fields='id'
        )
        folder = self._execute_with_retry(request, f"建立資料夾 '{name}'")
        
        folder_id = folder['id']
        self._folder_cache[cache_key] = folder_id
        logger.info(f"已建立資料夾: {name} (ID: {folder_id})")
        
        return folder_id
    
    def _find_file(self, name: str, parent_id: str) -> Optional[str]:
        """搜尋檔案 (T069)
        
        Args:
            name: 檔案名稱
            parent_id: 父資料夾 ID
            
        Returns:
            檔案 ID 或 None（如果不存在）
        """
        cache_key = f"{parent_id}/{name}"
        
        # 檢查快取
        if cache_key in self._file_cache:
            return self._file_cache[cache_key]
        
        query = (
            f"name = '{name}' and "
            f"'{parent_id}' in parents and "
            f"mimeType != '{self.FOLDER_MIME_TYPE}' and "
            f"trashed = false"
        )
        
        request = self.service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name)'
        )
        results = self._execute_with_retry(request, f"搜尋檔案 '{name}'")
        
        if results.get('files'):
            file_id = results['files'][0]['id']
            self._file_cache[cache_key] = file_id
            return file_id
        
        return None
    
    def _build_folder_path(self, relative_path: str) -> str:
        """建立資料夾路徑並返回最終資料夾 ID (T070)
        
        Args:
            relative_path: 相對路徑（如 "Year/2025.md"）
            
        Returns:
            包含檔案的資料夾 ID
        """
        path = PurePosixPath(relative_path)
        parent_parts = path.parent.parts
        
        # 從根資料夾開始
        current_id = self._get_base_folder_id()
        
        # 遞迴建立子資料夾
        for part in parent_parts:
            if part and part != '.':
                current_id = self._get_or_create_folder(part, current_id)
        
        return current_id
    
    def _resolve_path(self, relative_path: str) -> tuple[str, str]:
        """解析路徑為 (父資料夾 ID, 檔案名稱)"""
        path = PurePosixPath(relative_path)
        folder_id = self._build_folder_path(relative_path)
        filename = path.name
        return folder_id, filename
    
    def _invalidate_cache(self, relative_path: str):
        """清除指定路徑的快取"""
        path = PurePosixPath(relative_path)
        
        # 清除檔案快取
        for key in list(self._file_cache.keys()):
            if path.name in key:
                del self._file_cache[key]
    
    # ========================================
    # StorageProvider 介面實作 (T071-T076)
    # ========================================
    
    def read_file(self, relative_path: str) -> str:
        """讀取檔案內容 (T071)"""
        folder_id, filename = self._resolve_path(relative_path)
        file_id = self._find_file(filename, folder_id)
        
        if file_id is None:
            raise FileNotFoundError(relative_path)
        
        request = self.service.files().get_media(fileId=file_id)
        
        # 下載檔案內容
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        buffer.seek(0)
        content = buffer.read().decode('utf-8')
        
        logger.debug(f"已讀取檔案: {relative_path}")
        return content
    
    def write_file(self, relative_path: str, content: str) -> None:
        """寫入檔案內容（建立或更新）(T072)"""
        folder_id, filename = self._resolve_path(relative_path)
        file_id = self._find_file(filename, folder_id)
        
        # 準備內容
        buffer = io.BytesIO(content.encode('utf-8'))
        media = MediaIoBaseUpload(buffer, mimetype=self.TEXT_MIME_TYPE, resumable=True)
        
        if file_id is not None:
            # 更新現有檔案
            request = self.service.files().update(
                fileId=file_id,
                media_body=media
            )
            self._execute_with_retry(request, f"更新檔案 '{relative_path}'")
            logger.debug(f"已更新檔案: {relative_path}")
        else:
            # 建立新檔案
            file_metadata = {
                'name': filename,
                'parents': [folder_id]
            }
            request = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            )
            result = self._execute_with_retry(request, f"建立檔案 '{relative_path}'")
            
            # 更新快取
            cache_key = f"{folder_id}/{filename}"
            self._file_cache[cache_key] = result['id']
            logger.debug(f"已建立檔案: {relative_path}")
    
    def file_exists(self, relative_path: str) -> bool:
        """檢查檔案是否存在 (T073)"""
        try:
            folder_id, filename = self._resolve_path(relative_path)
            return self._find_file(filename, folder_id) is not None
        except Exception:
            return False
    
    def delete_file(self, relative_path: str) -> bool:
        """刪除檔案 (T074)"""
        folder_id, filename = self._resolve_path(relative_path)
        file_id = self._find_file(filename, folder_id)
        
        if file_id is None:
            return False
        
        request = self.service.files().delete(fileId=file_id)
        self._execute_with_retry(request, f"刪除檔案 '{relative_path}'")
        
        # 清除快取
        self._invalidate_cache(relative_path)
        
        logger.info(f"已刪除檔案: {relative_path}")
        return True
    
    def ensure_directory(self, relative_path: str) -> None:
        """確保目錄存在（遞迴建立）(T075)"""
        path = PurePosixPath(relative_path)
        current_id = self._get_base_folder_id()
        
        for part in path.parts:
            if part and part != '.':
                current_id = self._get_or_create_folder(part, current_id)
    
    def get_file_stats(self, relative_path: str) -> FileStats:
        """取得檔案統計資訊 (T076)"""
        try:
            folder_id, filename = self._resolve_path(relative_path)
            file_id = self._find_file(filename, folder_id)
            
            if file_id is None:
                return FileStats(exists=False)
            
            request = self.service.files().get(
                fileId=file_id,
                fields='id,name,size,createdTime,modifiedTime'
            )
            file_info = self._execute_with_retry(request, f"取得檔案資訊 '{relative_path}'")
            
            return FileStats(
                exists=True,
                size=int(file_info.get('size', 0)),
                created_at=datetime.fromisoformat(
                    file_info['createdTime'].replace('Z', '+00:00')
                ).replace(tzinfo=None),
                modified_at=datetime.fromisoformat(
                    file_info['modifiedTime'].replace('Z', '+00:00')
                ).replace(tzinfo=None)
            )
        except FileNotFoundError:
            return FileStats(exists=False)
        except Exception as e:
            logger.warning(f"取得檔案統計資訊失敗: {relative_path}, {e}")
            return FileStats(exists=False)
    
    def list_files(self, relative_path: str = "") -> List[str]:
        """列出目錄內的檔案"""
        try:
            if relative_path:
                folder_id = self._build_folder_path(relative_path + "/dummy")
            else:
                folder_id = self._get_base_folder_id()
            
            query = (
                f"'{folder_id}' in parents and "
                f"mimeType != '{self.FOLDER_MIME_TYPE}' and "
                f"trashed = false"
            )
            
            request = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(name)',
                orderBy='name'
            )
            results = self._execute_with_retry(request, f"列出檔案 '{relative_path}'")
            
            return sorted([f['name'] for f in results.get('files', [])])
        except Exception as e:
            logger.warning(f"列出檔案失敗: {relative_path}, {e}")
            return []
    
    # ========================================
    # 連線測試
    # ========================================
    
    def test_connection(self) -> dict:
        """測試 Google Drive 連線
        
        Returns:
            測試結果字典，包含 success, message, details
        """
        try:
            # 測試 1: 取得使用者資訊
            about = self.service.about().get(fields='user').execute()
            user_email = about.get('user', {}).get('emailAddress', 'Unknown')
            
            # 測試 2: 確認根資料夾存在/可建立
            base_folder_id = self._get_base_folder_id()
            
            # 測試 3: 嘗試列出根資料夾內容
            request = self.service.files().list(
                q=f"'{base_folder_id}' in parents and trashed = false",
                spaces='drive',
                fields='files(id,name)',
                pageSize=10
            )
            results = self._execute_with_retry(request, "列出根資料夾")
            file_count = len(results.get('files', []))
            
            return {
                'success': True,
                'message': 'Google Drive 連線成功',
                'details': {
                    'user_email': user_email,
                    'base_folder': self.base_path,
                    'base_folder_id': base_folder_id,
                    'file_count': file_count
                }
            }
        except AuthExpiredError as e:
            return {
                'success': False,
                'message': str(e),
                'details': {'error_type': 'auth_expired'}
            }
        except NetworkError as e:
            return {
                'success': False,
                'message': str(e),
                'details': {'error_type': 'network'}
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'連線測試失敗: {str(e)}',
                'details': {'error_type': 'unknown', 'error': str(e)}
            }
    
    def clear_cache(self):
        """清除所有快取"""
        self._folder_cache.clear()
        self._file_cache.clear()
        self._base_folder_id = None
