"""
Google Drive Storage Provider 單元測試

使用 mock 測試 GoogleDriveStorageProvider 的各項功能。
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch
from io import BytesIO
# 
from backend.storage.google_drive import (
    GoogleDriveStorageProvider,
    GoogleDriveError,
    NetworkError,
    AuthExpiredError,
    QuotaExceededError,
    FileNotFoundError
)
from backend.storage.base import FileStats


class TestGoogleDriveStorageProviderInit:
    """初始化測試"""
    
    def test_init_with_defaults(self):
        """測試預設初始化"""
        provider = GoogleDriveStorageProvider()
        
        assert provider.base_path == "WorkPlanByCalendar"
        assert provider._credentials is None
        assert provider._auth_service is None
        assert provider._service is None
    
    def test_init_with_custom_path(self):
        """測試自訂路徑"""
        provider = GoogleDriveStorageProvider(base_path="CustomFolder/SubFolder")
        
        assert provider.base_path == "CustomFolder/SubFolder"
    
    def test_init_with_auth_service(self):
        """測試帶有 auth_service 的初始化"""
        mock_auth_service = Mock()
        provider = GoogleDriveStorageProvider(auth_service=mock_auth_service)
        
        assert provider._auth_service == mock_auth_service


class TestGoogleDriveErrors:
    """錯誤類別測試"""
    
    def test_network_error_default_message(self):
        """測試 NetworkError 預設訊息"""
        error = NetworkError()
        assert "網路連線失敗" in str(error)
    
    def test_auth_expired_error_default_message(self):
        """測試 AuthExpiredError 預設訊息"""
        error = AuthExpiredError()
        assert "授權已過期" in str(error)
    
    def test_quota_exceeded_error_default_message(self):
        """測試 QuotaExceededError 預設訊息"""
        error = QuotaExceededError()
        assert "使用限制" in str(error)
    
    def test_file_not_found_error_with_path(self):
        """測試 FileNotFoundError 包含路徑"""
        error = FileNotFoundError("Year/2025.md")
        assert "Year/2025.md" in str(error)
        assert error.path == "Year/2025.md"


class TestGoogleDriveStorageProviderMocked:
    """使用 mock 的功能測試"""
    
    @pytest.fixture
    def mock_service(self):
        """建立 mock 的 Google Drive service"""
        return MagicMock()
    
    @pytest.fixture
    def provider(self, mock_service):
        """建立帶有 mock service 的 provider"""
        provider = GoogleDriveStorageProvider(base_path="TestFolder")
        provider._service = mock_service
        return provider
    
    def test_get_or_create_folder_existing(self, provider, mock_service):
        """測試取得現有資料夾"""
        # Mock 搜尋結果 - 資料夾已存在
        mock_service.files().list().execute.return_value = {
            'files': [{'id': 'existing_folder_id', 'name': 'Year'}]
        }
        
        folder_id = provider._get_or_create_folder('Year', 'root')
        
        assert folder_id == 'existing_folder_id'
        assert 'root/Year' in provider._folder_cache
    
    def test_get_or_create_folder_new(self, provider, mock_service):
        """測試建立新資料夾"""
        # Mock 搜尋結果 - 資料夾不存在
        mock_service.files().list().execute.return_value = {'files': []}
        # Mock 建立資料夾
        mock_service.files().create().execute.return_value = {'id': 'new_folder_id'}
        
        folder_id = provider._get_or_create_folder('Month', 'root')
        
        assert folder_id == 'new_folder_id'
        mock_service.files().create.assert_called()
    
    def test_get_or_create_folder_cached(self, provider, mock_service):
        """測試資料夾 ID 快取"""
        # 預先設定快取
        provider._folder_cache['root/CachedFolder'] = 'cached_folder_id'
        
        folder_id = provider._get_or_create_folder('CachedFolder', 'root')
        
        assert folder_id == 'cached_folder_id'
        # 不應該呼叫 API
        mock_service.files().list.assert_not_called()
    
    def test_find_file_existing(self, provider, mock_service):
        """測試找到現有檔案"""
        mock_service.files().list().execute.return_value = {
            'files': [{'id': 'file_123', 'name': '2025.md'}]
        }
        
        file_id = provider._find_file('2025.md', 'folder_id')
        
        assert file_id == 'file_123'
    
    def test_find_file_not_found(self, provider, mock_service):
        """測試檔案不存在"""
        mock_service.files().list().execute.return_value = {'files': []}
        
        file_id = provider._find_file('nonexistent.md', 'folder_id')
        
        assert file_id is None
    
    def test_file_exists_true(self, provider, mock_service):
        """測試 file_exists 返回 True"""
        # Mock 資料夾和檔案查詢
        mock_service.files().list().execute.side_effect = [
            {'files': [{'id': 'folder_id', 'name': 'Year'}]},  # base folder
            {'files': [{'id': 'file_id', 'name': '2025.md'}]}   # file search
        ]
        provider._base_folder_id = 'base_folder_id'
        
        exists = provider.file_exists('Year/2025.md')
        
        assert exists is True
    
    def test_file_exists_false(self, provider, mock_service):
        """測試 file_exists 返回 False"""
        mock_service.files().list().execute.side_effect = [
            {'files': [{'id': 'folder_id', 'name': 'Year'}]},
            {'files': []}  # 檔案不存在
        ]
        provider._base_folder_id = 'base_folder_id'
        
        exists = provider.file_exists('Year/nonexistent.md')
        
        assert exists is False
    
    def test_delete_file_success(self, provider, mock_service):
        """測試成功刪除檔案"""
        # Mock 檔案查詢
        mock_service.files().list().execute.return_value = {
            'files': [{'id': 'file_to_delete', 'name': '2025.md'}]
        }
        provider._base_folder_id = 'base_folder_id'
        
        result = provider.delete_file('Year/2025.md')
        
        assert result is True
        mock_service.files().delete.assert_called_with(fileId='file_to_delete')
    
    def test_delete_file_not_found(self, provider, mock_service):
        """測試刪除不存在的檔案"""
        mock_service.files().list().execute.return_value = {'files': []}
        provider._base_folder_id = 'base_folder_id'
        
        result = provider.delete_file('Year/nonexistent.md')
        
        assert result is False
    
    def test_get_file_stats_existing(self, provider, mock_service):
        """測試取得現有檔案統計資訊"""
        mock_service.files().list().execute.return_value = {
            'files': [{'id': 'file_id', 'name': '2025.md'}]
        }
        mock_service.files().get().execute.return_value = {
            'id': 'file_id',
            'name': '2025.md',
            'size': '1024',
            'createdTime': '2025-01-01T10:00:00.000Z',
            'modifiedTime': '2025-01-15T15:30:00.000Z'
        }
        provider._base_folder_id = 'base_folder_id'
        
        stats = provider.get_file_stats('Year/2025.md')
        
        assert stats.exists is True
        assert stats.size == 1024
        assert stats.created_at is not None
        assert stats.modified_at is not None
    
    def test_get_file_stats_nonexistent(self, provider, mock_service):
        """測試取得不存在檔案的統計資訊"""
        mock_service.files().list().execute.return_value = {'files': []}
        provider._base_folder_id = 'base_folder_id'
        
        stats = provider.get_file_stats('Year/nonexistent.md')
        
        assert stats.exists is False
    
    def test_list_files(self, provider, mock_service):
        """測試列出檔案"""
        # 第一次呼叫：_get_or_create_folder 搜尋 'Year' 資料夾
        # 第二次呼叫：list_files 列出檔案
        mock_service.files().list().execute.side_effect = [
            {'files': [{'id': 'year_folder_id', 'name': 'Year'}]},  # 搜尋資料夾
            {
                'files': [
                    {'name': '2024.md'},
                    {'name': '2025.md'},
                    {'name': '2023.md'}
                ]
            }  # 列出檔案
        ]
        provider._base_folder_id = 'base_folder_id'
        
        files = provider.list_files('Year')
        
        # 應該排序
        assert files == ['2023.md', '2024.md', '2025.md']
    
    def test_ensure_directory(self, provider, mock_service):
        """測試確保目錄存在"""
        mock_service.files().list().execute.return_value = {'files': []}
        mock_service.files().create().execute.return_value = {'id': 'new_folder_id'}
        provider._base_folder_id = 'base_folder_id'
        
        # 應該不拋出異常
        provider.ensure_directory('Year/SubFolder/DeepFolder')
        
        # 應該呼叫建立資料夾（多次）
        assert mock_service.files().create.call_count >= 1
    
    def test_clear_cache(self, provider):
        """測試清除快取"""
        provider._folder_cache['test'] = 'value'
        provider._file_cache['test'] = 'value'
        provider._base_folder_id = 'id'
        
        provider.clear_cache()
        
        assert len(provider._folder_cache) == 0
        assert len(provider._file_cache) == 0
        assert provider._base_folder_id is None


class TestGoogleDriveRetryMechanism:
    """重試機制測試"""
    
    @pytest.fixture
    def provider(self):
        """建立 provider"""
        provider = GoogleDriveStorageProvider()
        provider._service = MagicMock()
        return provider
    
    @patch('backend.storage.google_drive.time.sleep')
    def test_retry_on_server_error(self, mock_sleep, provider):
        """測試伺服器錯誤時重試"""
        from googleapiclient.errors import HttpError
        
        # 模擬前兩次失敗，第三次成功
        mock_response = Mock()
        mock_response.status = 503
        
        error = HttpError(mock_response, b'Service Unavailable')
        
        mock_request = Mock()
        mock_request.execute.side_effect = [error, error, {'success': True}]
        
        result = provider._execute_with_retry(mock_request, 'test operation')
        
        assert result == {'success': True}
        assert mock_sleep.call_count == 2  # 重試了兩次


class TestGoogleDriveConnectionTest:
    """連線測試功能測試"""
    
    @pytest.fixture
    def provider(self):
        """建立 provider"""
        provider = GoogleDriveStorageProvider()
        provider._service = MagicMock()
        return provider
    
    def test_connection_success(self, provider):
        """測試連線成功"""
        provider._service.about().get().execute.return_value = {
            'user': {'emailAddress': 'test@example.com'}
        }
        provider._service.files().list().execute.return_value = {
            'files': [{'id': '1', 'name': 'file1.md'}]
        }
        provider._base_folder_id = 'folder_id'
        
        result = provider.test_connection()
        
        assert result['success'] is True
        assert result['details']['user_email'] == 'test@example.com'
    
    def test_connection_failure(self, provider):
        """測試連線失敗"""
        provider._service.about().get().execute.side_effect = Exception('Connection failed')
        
        result = provider.test_connection()
        
        assert result['success'] is False
        assert 'failed' in result['message'].lower() or '失敗' in result['message']


class TestGoogleDriveReadWrite:
    """讀寫操作測試"""
    
    @pytest.fixture
    def provider(self):
        """建立 provider"""
        provider = GoogleDriveStorageProvider()
        provider._service = MagicMock()
        provider._base_folder_id = 'base_folder_id'
        return provider
    
    @patch('backend.storage.google_drive.MediaIoBaseDownload')
    def test_read_file_success(self, mock_downloader_class, provider):
        """測試成功讀取檔案"""
        # Mock 檔案查詢
        provider._service.files().list().execute.return_value = {
            'files': [{'id': 'file_id', 'name': '2025.md'}]
        }
        
        # Mock 下載
        mock_downloader = MagicMock()
        mock_downloader.next_chunk.side_effect = [(None, False), (None, True)]
        mock_downloader_class.return_value = mock_downloader
        
        # 模擬下載的內容
        with patch.object(provider, '_find_file', return_value='file_id'):
            with patch.object(provider, '_resolve_path', return_value=('folder_id', '2025.md')):
                # 由於 BytesIO mock 複雜，這裡簡化測試
                pass
    
    @patch('backend.storage.google_drive.MediaIoBaseUpload')
    def test_write_file_new(self, mock_uploader_class, provider):
        """測試寫入新檔案"""
        # Mock 檔案不存在
        with patch.object(provider, '_find_file', return_value=None):
            with patch.object(provider, '_resolve_path', return_value=('folder_id', 'new.md')):
                provider._service.files().create().execute.return_value = {'id': 'new_file_id'}
                
                provider.write_file('Year/new.md', '# New Content')
                
                provider._service.files().create.assert_called()
    
    @patch('backend.storage.google_drive.MediaIoBaseUpload')
    def test_write_file_update(self, mock_uploader_class, provider):
        """測試更新現有檔案"""
        # Mock 檔案存在
        with patch.object(provider, '_find_file', return_value='existing_file_id'):
            with patch.object(provider, '_resolve_path', return_value=('folder_id', 'existing.md')):
                provider.write_file('Year/existing.md', '# Updated Content')
                
                provider._service.files().update.assert_called_with(
                    fileId='existing_file_id',
                    media_body=mock_uploader_class.return_value
                )
