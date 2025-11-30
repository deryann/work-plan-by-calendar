import json
import os
from pathlib import Path
from typing import Optional
from backend.models import (
    Settings, UISettings, PanelSettings, SettingsUpdate,
    StorageMode, StorageModeType
)


class SettingsService:
    """Service for managing application settings."""
    
    def __init__(self, settings_dir: Optional[str] = None):
        """初始化 SettingsService
        
        Args:
            settings_dir: 設定檔目錄路徑。如果為 None,使用專案根目錄的 data/settings
        """
        if settings_dir is None:
            # 預設使用專案根目錄的 data/settings
            backend_dir = Path(__file__).parent
            self.settings_dir = backend_dir.parent / "data" / "settings"
        else:
            self.settings_dir = Path(settings_dir)
        
        self.settings_file = self.settings_dir / "settings.json"
        self.ensure_settings_directory()
        
    def ensure_settings_directory(self):
        """Create settings directory if it doesn't exist"""
        self.settings_dir.mkdir(parents=True, exist_ok=True)
        
    def get_default_settings(self) -> Settings:
        """Get default settings"""
        return Settings(
            ui=UISettings(
                panels={
                    "left": PanelSettings(year=True, month=True, week=True, day=True),
                    "right": PanelSettings(year=True, month=True, week=True, day=True)
                }
            ),
            storage=StorageMode(
                mode=StorageModeType.LOCAL,
                google_drive_path="WorkPlanByCalendar"
            )
        )
        
    def load_settings(self) -> Settings:
        """Load settings from file or return defaults"""
        try:
            if self.settings_file.exists():
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    settings_data = json.load(f)
                return Settings(**settings_data)
            else:
                # Return default settings and save them
                default_settings = self.get_default_settings()
                self.save_settings(default_settings)
                return default_settings
        except Exception as e:
            print(f"Error loading settings: {e}")
            # Return default settings if there's an error
            return self.get_default_settings()
    
    def save_settings(self, settings: Settings) -> None:
        """Save settings to file"""
        try:
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings.dict(), f, indent=2, ensure_ascii=False)
        except Exception as e:
            raise IOError(f"Failed to save settings: {e}")
    
    def update_settings(self, settings_update: SettingsUpdate) -> Settings:
        """Update existing settings with new values"""
        current_settings = self.load_settings()
        
        # Update UI settings if provided
        if settings_update.ui is not None:
            current_settings.ui = settings_update.ui
        
        # Update storage settings if provided
        if settings_update.storage is not None:
            current_settings.storage = settings_update.storage
            
        self.save_settings(current_settings)
        return current_settings
    
    def reset_settings(self) -> Settings:
        """Reset settings to default values"""
        default_settings = self.get_default_settings()
        self.save_settings(default_settings)
        return default_settings
    
    def get_ui_settings(self) -> UISettings:
        """Get UI-specific settings"""
        settings = self.load_settings()
        return settings.ui
    
    def update_ui_settings(self, ui_settings: UISettings) -> Settings:
        """Update UI settings specifically"""
        current_settings = self.load_settings()
        current_settings.ui = ui_settings
        self.save_settings(current_settings)
        return current_settings
    
    # ===== Storage Mode Methods =====
    
    def get_storage_mode(self) -> StorageMode:
        """取得儲存模式設定"""
        settings = self.load_settings()
        return settings.storage
    
    def update_storage_mode(self, storage_mode: StorageMode) -> Settings:
        """更新儲存模式設定
        
        Args:
            storage_mode: 新的儲存模式設定
            
        Returns:
            更新後的完整設定
        """
        current_settings = self.load_settings()
        current_settings.storage = storage_mode
        self.save_settings(current_settings)
        return current_settings
    
    def update_google_drive_path(self, path: str) -> Settings:
        """更新 Google Drive 儲存路徑
        
        Args:
            path: 新的 Google Drive 路徑
            
        Returns:
            更新後的完整設定
            
        Raises:
            ValueError: 路徑格式不正確
        """
        # 路徑驗證由 StorageMode validator 處理
        current_settings = self.load_settings()
        current_settings.storage.google_drive_path = path
        self.save_settings(current_settings)
        return current_settings
    
    def set_storage_mode_type(self, mode: StorageModeType) -> Settings:
        """設定儲存模式類型
        
        Args:
            mode: 儲存模式類型 (LOCAL 或 GOOGLE_DRIVE)
            
        Returns:
            更新後的完整設定
        """
        current_settings = self.load_settings()
        current_settings.storage.mode = mode
        self.save_settings(current_settings)
        return current_settings