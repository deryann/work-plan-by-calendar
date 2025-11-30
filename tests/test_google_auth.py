"""
Google Auth Service 單元測試

Feature: 002-google-drive-storage
User Story: US2 - Google 帳號登入與授權

使用 mock 測試 GoogleAuthService，避免實際呼叫 Google API。
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

from backend.google_auth_service import (
    GoogleAuthService,
    GoogleAuthError,
    TokenEncryptionError,
    encrypt_token,
    decrypt_token,
    get_encryption_key,
    SCOPES,
)
from backend.models import GoogleAuthStatus, GoogleAuthInfo, GoogleAuthToken


class TestTokenEncryption:
    """Token 加密/解密測試"""
    
    @pytest.fixture(autouse=True)
    def setup_encryption_key(self, monkeypatch):
        """設定測試用加密金鑰"""
        # 生成有效的 Fernet 金鑰
        from cryptography.fernet import Fernet
        test_key = Fernet.generate_key().decode()
        monkeypatch.setenv('GOOGLE_TOKEN_ENCRYPTION_KEY', test_key)
    
    def test_encrypt_and_decrypt_roundtrip(self):
        """測試加密後解密能還原原文"""
        original = "test_access_token_12345"
        encrypted = encrypt_token(original)
        decrypted = decrypt_token(encrypted)
        
        assert decrypted == original
        assert encrypted != original
    
    def test_encrypt_produces_different_ciphertext(self):
        """測試每次加密結果不同（Fernet 使用隨機 IV）"""
        original = "same_token"
        encrypted1 = encrypt_token(original)
        encrypted2 = encrypt_token(original)
        
        # Fernet 會產生不同的加密結果，但都能解密回原文
        assert encrypted1 != encrypted2
        assert decrypt_token(encrypted1) == original
        assert decrypt_token(encrypted2) == original
    
    def test_decrypt_with_wrong_key_fails(self, monkeypatch):
        """測試使用錯誤金鑰解密會失敗"""
        original = "secret_token"
        encrypted = encrypt_token(original)
        
        # 更換金鑰
        from cryptography.fernet import Fernet
        new_key = Fernet.generate_key().decode()
        monkeypatch.setenv('GOOGLE_TOKEN_ENCRYPTION_KEY', new_key)
        
        with pytest.raises(TokenEncryptionError):
            decrypt_token(encrypted)
    
    def test_get_encryption_key_from_env(self, monkeypatch):
        """測試從環境變數取得金鑰"""
        from cryptography.fernet import Fernet
        expected_key = Fernet.generate_key()
        monkeypatch.setenv('GOOGLE_TOKEN_ENCRYPTION_KEY', expected_key.decode())
        
        key = get_encryption_key()
        assert key == expected_key


class TestGoogleAuthService:
    """GoogleAuthService 測試"""
    
    @pytest.fixture
    def temp_token_path(self):
        """建立臨時 Token 檔案路徑"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir) / "google_auth.json"
    
    @pytest.fixture
    def mock_env(self, monkeypatch):
        """設定測試環境變數"""
        from cryptography.fernet import Fernet
        monkeypatch.setenv('GOOGLE_CLIENT_ID', 'test_client_id')
        monkeypatch.setenv('GOOGLE_CLIENT_SECRET', 'test_client_secret')
        monkeypatch.setenv('GOOGLE_TOKEN_ENCRYPTION_KEY', Fernet.generate_key().decode())
    
    @pytest.fixture
    def auth_service(self, temp_token_path, mock_env):
        """建立 GoogleAuthService 實例"""
        return GoogleAuthService(token_path=temp_token_path)
    
    def test_init_creates_token_directory(self, temp_token_path, mock_env):
        """測試初始化時建立 Token 目錄"""
        service = GoogleAuthService(token_path=temp_token_path)
        assert temp_token_path.parent.exists()
    
    def test_get_auth_status_not_connected(self, auth_service):
        """測試未連結時的授權狀態"""
        status = auth_service.get_auth_status()
        
        assert status.status == GoogleAuthStatus.NOT_CONNECTED
        assert status.user_email is None
    
    def test_save_and_load_token(self, auth_service):
        """測試 Token 儲存和載入"""
        now = datetime.now()
        token = GoogleAuthToken(
            access_token="test_access_token",
            refresh_token="test_refresh_token",
            token_expiry=now + timedelta(hours=1),
            user_email="test@example.com",
            scopes=SCOPES,
            created_at=now,
            updated_at=now
        )
        
        # 儲存
        auth_service.save_token(token)
        
        # 載入
        loaded = auth_service.load_token()
        
        assert loaded is not None
        assert loaded.access_token == "test_access_token"
        assert loaded.refresh_token == "test_refresh_token"
        assert loaded.user_email == "test@example.com"
    
    def test_saved_token_is_encrypted(self, auth_service, temp_token_path):
        """測試儲存的 Token 是加密的"""
        now = datetime.now()
        token = GoogleAuthToken(
            access_token="plaintext_access_token",
            refresh_token="plaintext_refresh_token",
            token_expiry=now + timedelta(hours=1),
            user_email="test@example.com",
            scopes=SCOPES,
            created_at=now,
            updated_at=now
        )
        
        auth_service.save_token(token)
        
        # 直接讀取檔案內容
        raw_content = temp_token_path.read_text()
        data = json.loads(raw_content)
        
        # 敏感資料應該被加密，不是明文
        assert "plaintext_access_token" not in data["access_token"]
        assert "plaintext_refresh_token" not in data["refresh_token"]
        assert "_encrypted_fields" in data
    
    def test_get_auth_status_connected(self, auth_service):
        """測試已連結時的授權狀態"""
        now = datetime.now()
        token = GoogleAuthToken(
            access_token="valid_token",
            refresh_token="valid_refresh",
            token_expiry=now + timedelta(hours=1),  # 未過期
            user_email="user@example.com",
            scopes=SCOPES,
            created_at=now,
            updated_at=now
        )
        auth_service.save_token(token)
        
        status = auth_service.get_auth_status()
        
        assert status.status == GoogleAuthStatus.CONNECTED
        assert status.user_email == "user@example.com"
    
    def test_get_auth_status_expired(self, auth_service):
        """測試 Token 過期時的授權狀態"""
        now = datetime.now()
        token = GoogleAuthToken(
            access_token="expired_token",
            refresh_token="",  # 無 refresh token
            token_expiry=now - timedelta(hours=1),  # 已過期
            user_email="user@example.com",
            scopes=SCOPES,
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=2)
        )
        auth_service.save_token(token)
        
        status = auth_service.get_auth_status()
        
        assert status.status == GoogleAuthStatus.EXPIRED
    
    def test_logout_removes_token(self, auth_service):
        """測試登出會移除 Token"""
        now = datetime.now()
        token = GoogleAuthToken(
            access_token="token_to_remove",
            refresh_token="refresh_to_remove",
            token_expiry=now + timedelta(hours=1),
            user_email="user@example.com",
            scopes=SCOPES,
            created_at=now,
            updated_at=now
        )
        auth_service.save_token(token)
        
        # 確認 Token 存在
        assert auth_service.load_token() is not None
        
        # 登出
        result = auth_service.logout()
        
        assert result is True
        assert auth_service.load_token() is None
    
    def test_logout_when_not_connected(self, auth_service):
        """測試未連結時登出返回 False"""
        result = auth_service.logout()
        assert result is False
    
    @patch('backend.google_auth_service.Flow')
    def test_get_auth_url(self, mock_flow_class, auth_service):
        """測試產生授權 URL"""
        mock_flow = Mock()
        mock_flow.authorization_url.return_value = ("https://accounts.google.com/auth", None)
        mock_flow_class.from_client_config.return_value = mock_flow
        
        redirect_uri = "http://localhost:8000/callback"
        url = auth_service.get_auth_url(redirect_uri)
        
        assert url == "https://accounts.google.com/auth"
        mock_flow_class.from_client_config.assert_called_once()
    
    def test_get_auth_url_without_credentials_fails(self, temp_token_path, monkeypatch):
        """測試未設定 OAuth 憑證時失敗"""
        from cryptography.fernet import Fernet
        monkeypatch.setenv('GOOGLE_TOKEN_ENCRYPTION_KEY', Fernet.generate_key().decode())
        monkeypatch.delenv('GOOGLE_CLIENT_ID', raising=False)
        monkeypatch.delenv('GOOGLE_CLIENT_SECRET', raising=False)
        
        service = GoogleAuthService(token_path=temp_token_path)
        
        with pytest.raises(GoogleAuthError, match="未設定 Google OAuth 憑證"):
            service.get_auth_url("http://localhost/callback")


class TestGoogleAuthServiceMockedAPI:
    """使用 Mock 測試需要 Google API 的功能"""
    
    @pytest.fixture
    def temp_token_path(self):
        """建立臨時 Token 檔案路徑"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir) / "google_auth.json"
    
    @pytest.fixture
    def mock_env(self, monkeypatch):
        """設定測試環境變數"""
        from cryptography.fernet import Fernet
        monkeypatch.setenv('GOOGLE_CLIENT_ID', 'test_client_id')
        monkeypatch.setenv('GOOGLE_CLIENT_SECRET', 'test_client_secret')
        monkeypatch.setenv('GOOGLE_TOKEN_ENCRYPTION_KEY', Fernet.generate_key().decode())
    
    @pytest.fixture
    def auth_service(self, temp_token_path, mock_env):
        """建立 GoogleAuthService 實例"""
        return GoogleAuthService(token_path=temp_token_path)
    
    @patch('backend.google_auth_service.Flow')
    def test_handle_callback_success(self, mock_flow_class, auth_service):
        """測試處理授權回調成功"""
        # Mock credentials
        mock_credentials = Mock()
        mock_credentials.token = "new_access_token"
        mock_credentials.refresh_token = "new_refresh_token"
        mock_credentials.expiry = datetime.now() + timedelta(hours=1)
        mock_credentials.scopes = SCOPES
        
        # Mock flow
        mock_flow = Mock()
        mock_flow.credentials = mock_credentials
        mock_flow_class.from_client_config.return_value = mock_flow
        
        # Mock _get_user_email method
        with patch.object(auth_service, '_get_user_email', return_value="newuser@example.com"):
            # 執行
            result = auth_service.handle_callback(
                code="auth_code_123",
                redirect_uri="http://localhost/callback"
            )
        
        assert result.status == GoogleAuthStatus.CONNECTED
        assert result.user_email == "newuser@example.com"
        
        # 確認 Token 已儲存
        saved_token = auth_service.load_token()
        assert saved_token is not None
        assert saved_token.access_token == "new_access_token"
    
    @patch('backend.google_auth_service.Credentials')
    @patch('backend.google_auth_service.Request')
    def test_refresh_token_success(self, mock_request, mock_credentials_class, auth_service):
        """測試刷新 Token 成功"""
        # 先儲存一個即將過期的 Token
        now = datetime.now()
        old_token = GoogleAuthToken(
            access_token="old_access_token",
            refresh_token="valid_refresh_token",
            token_expiry=now - timedelta(minutes=5),  # 已過期
            user_email="user@example.com",
            scopes=SCOPES,
            created_at=now - timedelta(days=7),
            updated_at=now - timedelta(hours=1)
        )
        auth_service.save_token(old_token)
        
        # Mock Credentials 刷新
        mock_credentials = Mock()
        mock_credentials.token = "refreshed_access_token"
        mock_credentials.refresh_token = "valid_refresh_token"
        mock_credentials.expiry = now + timedelta(hours=1)
        mock_credentials.scopes = SCOPES
        mock_credentials_class.return_value = mock_credentials
        
        # 執行刷新
        new_token = auth_service.refresh_token()
        
        assert new_token is not None
        assert new_token.access_token == "refreshed_access_token"
        mock_credentials.refresh.assert_called_once()
    
    def test_refresh_token_no_token(self, auth_service):
        """測試無 Token 時刷新返回 None"""
        result = auth_service.refresh_token()
        assert result is None
    
    def test_refresh_token_no_refresh_token(self, auth_service):
        """測試無 refresh_token 時刷新返回 None"""
        now = datetime.now()
        token = GoogleAuthToken(
            access_token="access_only",
            refresh_token="",  # 無 refresh token
            token_expiry=now - timedelta(hours=1),
            user_email="user@example.com",
            scopes=SCOPES,
            created_at=now,
            updated_at=now
        )
        auth_service.save_token(token)
        
        result = auth_service.refresh_token()
        assert result is None
