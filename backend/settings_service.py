import json
import os
from pathlib import Path
from typing import Optional
from backend.models import Settings, UISettings, PanelSettings, SettingsUpdate


class SettingsService:
    """Service for managing user settings"""
    
    def __init__(self, settings_dir: str = "data/settings"):
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