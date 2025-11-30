"""
Google Auth Service - Google OAuth 2.0 授權服務

處理 Google OAuth 認證流程，包含：
- Token 加密/解密
- OAuth 授權 URL 生成
- Authorization Code 交換
- Token 刷新
- 授權狀態查詢

Feature: 002-google-drive-storage
User Story: US2 - Google 帳號登入與授權
"""

import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError

from .models import (
    GoogleAuthStatus,
    GoogleAuthInfo,
    GoogleAuthToken,
)


# Google OAuth 2.0 設定
SCOPES = [
    'https://www.googleapis.com/auth/drive.file',  # 僅存取應用程式建立的檔案
    'https://www.googleapis.com/auth/userinfo.email',  # 取得使用者 email
    'openid',  # OpenID Connect
]

# Token 儲存路徑
DEFAULT_TOKEN_PATH = Path(__file__).parent.parent / "data" / "settings" / "google_auth.json"


class TokenEncryptionError(Exception):
    """Token 加密/解密錯誤"""
    pass


class GoogleAuthError(Exception):
    """Google 授權錯誤"""
    pass


def get_encryption_key() -> bytes:
    """
    取得 Token 加密金鑰
    
    從環境變數 GOOGLE_TOKEN_ENCRYPTION_KEY 讀取，若不存在則生成新金鑰。
    
    Returns:
        加密金鑰 (bytes)
        
    Raises:
        TokenEncryptionError: 金鑰格式不正確
    """
    key = os.getenv('GOOGLE_TOKEN_ENCRYPTION_KEY')
    
    if not key:
        # 開發環境：生成新金鑰並提示
        new_key = Fernet.generate_key()
        print("=" * 60)
        print("警告: 未設定 GOOGLE_TOKEN_ENCRYPTION_KEY 環境變數")
        print("請將以下金鑰設定為環境變數以確保 Token 安全:")
        print(f"  export GOOGLE_TOKEN_ENCRYPTION_KEY={new_key.decode()}")
        print("=" * 60)
        return new_key
    
    try:
        # 驗證金鑰格式
        key_bytes = key.encode() if isinstance(key, str) else key
        Fernet(key_bytes)  # 驗證是否為有效的 Fernet 金鑰
        return key_bytes
    except Exception as e:
        raise TokenEncryptionError(f"無效的加密金鑰格式: {e}")


def encrypt_token(value: str) -> str:
    """
    加密敏感資料
    
    Args:
        value: 要加密的字串
        
    Returns:
        加密後的字串 (Base64 編碼)
    """
    key = get_encryption_key()
    f = Fernet(key)
    encrypted = f.encrypt(value.encode())
    return encrypted.decode()


def decrypt_token(encrypted_value: str) -> str:
    """
    解密敏感資料
    
    Args:
        encrypted_value: 加密的字串 (Base64 編碼)
        
    Returns:
        解密後的原始字串
        
    Raises:
        TokenEncryptionError: 解密失敗
    """
    try:
        key = get_encryption_key()
        f = Fernet(key)
        decrypted = f.decrypt(encrypted_value.encode())
        return decrypted.decode()
    except InvalidToken:
        raise TokenEncryptionError("Token 解密失敗，可能金鑰不正確或資料已損壞")
    except Exception as e:
        raise TokenEncryptionError(f"解密錯誤: {e}")


class GoogleAuthService:
    """
    Google OAuth 2.0 授權服務
    
    負責處理 Google 帳號的授權、Token 管理，以及授權狀態查詢。
    """
    
    def __init__(self, token_path: Optional[Path] = None):
        """
        初始化 GoogleAuthService
        
        Args:
            token_path: Token 儲存路徑。若為 None，使用預設路徑。
        """
        self.token_path = token_path or DEFAULT_TOKEN_PATH
        self._client_id = os.getenv('GOOGLE_CLIENT_ID')
        self._client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        
        # 確保目錄存在
        self.token_path.parent.mkdir(parents=True, exist_ok=True)
    
    @property
    def client_id(self) -> Optional[str]:
        """取得 Google OAuth Client ID"""
        return self._client_id
    
    @property
    def client_secret(self) -> Optional[str]:
        """取得 Google OAuth Client Secret"""
        return self._client_secret
    
    def _get_client_config(self) -> dict:
        """取得 OAuth Client 設定"""
        if not self._client_id or not self._client_secret:
            raise GoogleAuthError(
                "未設定 Google OAuth 憑證。請設定環境變數 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET"
            )
        
        return {
            "web": {
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost:8000/api/auth/google/callback"],
            }
        }
    
    def get_auth_url(self, redirect_uri: str) -> str:
        """
        產生 OAuth 授權 URL
        
        Args:
            redirect_uri: 授權完成後的重導向 URL
            
        Returns:
            Google OAuth 授權頁面 URL
        """
        try:
            flow = Flow.from_client_config(
                self._get_client_config(),
                scopes=SCOPES,
                redirect_uri=redirect_uri
            )
            
            auth_url, _ = flow.authorization_url(
                access_type='offline',  # 取得 refresh_token
                include_granted_scopes='true',
                prompt='consent'  # 強制顯示授權頁面以取得 refresh_token
            )
            
            return auth_url
        except Exception as e:
            raise GoogleAuthError(f"產生授權 URL 失敗: {e}")
    
    def handle_callback(self, code: str, redirect_uri: str) -> GoogleAuthInfo:
        """
        處理 OAuth 回調，交換 Authorization Code 取得 Token
        
        Args:
            code: Authorization Code
            redirect_uri: 與授權請求相同的重導向 URL
            
        Returns:
            GoogleAuthInfo 包含使用者資訊
        """
        try:
            flow = Flow.from_client_config(
                self._get_client_config(),
                scopes=SCOPES,
                redirect_uri=redirect_uri
            )
            
            # 交換 code 取得 token
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # 取得使用者 email
            user_email = self._get_user_email(credentials)
            
            # 建立 Token 物件
            now = datetime.now()
            token = GoogleAuthToken(
                access_token=credentials.token,
                refresh_token=credentials.refresh_token or "",
                token_expiry=credentials.expiry or (now + timedelta(hours=1)),
                user_email=user_email,
                scopes=list(credentials.scopes or SCOPES),
                created_at=now,
                updated_at=now
            )
            
            # 儲存 Token
            self.save_token(token)
            
            return GoogleAuthInfo(
                status=GoogleAuthStatus.CONNECTED,
                user_email=user_email,
                connected_at=now,
                expires_at=token.token_expiry
            )
            
        except Exception as e:
            raise GoogleAuthError(f"處理授權回調失敗: {e}")
    
    def _get_user_email(self, credentials: Credentials) -> str:
        """取得使用者 email"""
        try:
            from googleapiclient.discovery import build
            
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            return user_info.get('email', 'unknown@example.com')
        except Exception:
            return 'unknown@example.com'
    
    def get_auth_status(self) -> GoogleAuthInfo:
        """
        查詢目前的授權狀態
        
        Returns:
            GoogleAuthInfo 包含授權狀態和使用者資訊
        """
        token = self.load_token()
        
        if token is None:
            return GoogleAuthInfo(status=GoogleAuthStatus.NOT_CONNECTED)
        
        # 檢查 Token 是否過期
        now = datetime.now()
        if token.token_expiry < now:
            # 嘗試刷新
            try:
                refreshed_token = self.refresh_token()
                if refreshed_token:
                    return GoogleAuthInfo(
                        status=GoogleAuthStatus.CONNECTED,
                        user_email=refreshed_token.user_email,
                        connected_at=refreshed_token.created_at,
                        expires_at=refreshed_token.token_expiry
                    )
            except Exception:
                pass
            
            return GoogleAuthInfo(
                status=GoogleAuthStatus.EXPIRED,
                user_email=token.user_email,
                connected_at=token.created_at,
                expires_at=token.token_expiry
            )
        
        return GoogleAuthInfo(
            status=GoogleAuthStatus.CONNECTED,
            user_email=token.user_email,
            connected_at=token.created_at,
            expires_at=token.token_expiry
        )
    
    def logout(self) -> bool:
        """
        登出，清除授權資訊
        
        Returns:
            True 表示成功，False 表示無授權資訊可清除
        """
        if not self.token_path.exists():
            return False
        
        try:
            self.token_path.unlink()
            return True
        except Exception:
            return False
    
    def refresh_token(self) -> Optional[GoogleAuthToken]:
        """
        刷新 Access Token
        
        Returns:
            刷新後的 GoogleAuthToken，若失敗返回 None
        """
        token = self.load_token()
        if token is None or not token.refresh_token:
            return None
        
        try:
            credentials = Credentials(
                token=token.access_token,
                refresh_token=token.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self._client_id,
                client_secret=self._client_secret,
                scopes=token.scopes
            )
            
            # 執行刷新
            credentials.refresh(Request())
            
            # 更新 Token
            now = datetime.now()
            new_token = GoogleAuthToken(
                access_token=credentials.token,
                refresh_token=credentials.refresh_token or token.refresh_token,
                token_expiry=credentials.expiry or (now + timedelta(hours=1)),
                user_email=token.user_email,
                scopes=list(credentials.scopes or token.scopes),
                created_at=token.created_at,
                updated_at=now
            )
            
            self.save_token(new_token)
            return new_token
            
        except RefreshError:
            # Refresh Token 已失效
            return None
        except Exception:
            return None
    
    def save_token(self, token: GoogleAuthToken) -> None:
        """
        儲存 Token（加密敏感欄位）
        
        Args:
            token: 要儲存的 GoogleAuthToken
        """
        token_data = {
            "access_token": encrypt_token(token.access_token),
            "refresh_token": encrypt_token(token.refresh_token),
            "token_expiry": token.token_expiry.isoformat(),
            "user_email": token.user_email,
            "scopes": token.scopes,
            "created_at": token.created_at.isoformat(),
            "updated_at": token.updated_at.isoformat(),
            "_encrypted_fields": ["access_token", "refresh_token"]
        }
        
        self.token_path.write_text(
            json.dumps(token_data, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )
    
    def load_token(self) -> Optional[GoogleAuthToken]:
        """
        載入 Token（解密敏感欄位）
        
        Returns:
            GoogleAuthToken，若不存在或解密失敗返回 None
        """
        if not self.token_path.exists():
            return None
        
        try:
            token_data = json.loads(self.token_path.read_text(encoding='utf-8'))
            
            return GoogleAuthToken(
                access_token=decrypt_token(token_data["access_token"]),
                refresh_token=decrypt_token(token_data["refresh_token"]),
                token_expiry=datetime.fromisoformat(token_data["token_expiry"]),
                user_email=token_data["user_email"],
                scopes=token_data["scopes"],
                created_at=datetime.fromisoformat(token_data["created_at"]),
                updated_at=datetime.fromisoformat(token_data["updated_at"])
            )
        except (json.JSONDecodeError, KeyError, TokenEncryptionError):
            return None
        except Exception:
            return None
    
    def get_credentials(self) -> Optional[Credentials]:
        """
        取得有效的 Google API Credentials
        
        若 Token 過期會自動刷新。
        
        Returns:
            有效的 Credentials，若無效返回 None
        """
        token = self.load_token()
        if token is None:
            return None
        
        credentials = Credentials(
            token=token.access_token,
            refresh_token=token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self._client_id,
            client_secret=self._client_secret,
            scopes=token.scopes,
            expiry=token.token_expiry
        )
        
        # 檢查是否需要刷新
        if credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
                # 更新儲存的 Token
                now = datetime.now()
                new_token = GoogleAuthToken(
                    access_token=credentials.token,
                    refresh_token=credentials.refresh_token or token.refresh_token,
                    token_expiry=credentials.expiry or (now + timedelta(hours=1)),
                    user_email=token.user_email,
                    scopes=list(credentials.scopes or token.scopes),
                    created_at=token.created_at,
                    updated_at=now
                )
                self.save_token(new_token)
            except RefreshError:
                return None
        
        return credentials
