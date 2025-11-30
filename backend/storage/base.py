"""
StorageProvider 抽象基底類別

提供統一的檔案儲存介面，支援不同儲存後端（本地、Google Drive 等）。
採用策略模式 (Strategy Pattern) 實作，確保易於擴展和測試。

Feature: 002-google-drive-storage
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from dataclasses import dataclass


@dataclass
class FileStats:
    """檔案統計資訊"""
    exists: bool
    size: int = 0
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None


class StorageProvider(ABC):
    """
    儲存提供者抽象基類
    
    所有儲存後端（本地檔案系統、Google Drive 等）都必須實作此介面。
    相對路徑以資料根目錄為基準（如 "Year/2025.md"）。
    """
    
    @abstractmethod
    def read_file(self, relative_path: str) -> str:
        """
        讀取檔案內容
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑（如 "Year/2025.md"）
            
        Returns:
            檔案內容字串
            
        Raises:
            FileNotFoundError: 檔案不存在時
            IOError: 讀取檔案失敗時
        """
        pass
    
    @abstractmethod
    def write_file(self, relative_path: str, content: str) -> None:
        """
        寫入檔案內容
        
        若檔案不存在則建立，若已存在則覆蓋。
        若父目錄不存在會自動建立。
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑（如 "Year/2025.md"）
            content: 要寫入的內容
            
        Raises:
            IOError: 寫入檔案失敗時
        """
        pass
    
    @abstractmethod
    def file_exists(self, relative_path: str) -> bool:
        """
        檢查檔案是否存在
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑
            
        Returns:
            檔案存在返回 True，否則返回 False
        """
        pass
    
    @abstractmethod
    def delete_file(self, relative_path: str) -> bool:
        """
        刪除檔案
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑
            
        Returns:
            刪除成功返回 True，檔案不存在返回 False
            
        Raises:
            IOError: 刪除檔案失敗時
        """
        pass
    
    @abstractmethod
    def ensure_directory(self, relative_path: str) -> None:
        """
        確保目錄存在
        
        若目錄不存在則建立（包含父目錄）。
        
        Args:
            relative_path: 相對於資料根目錄的目錄路徑（如 "Year/"）
            
        Raises:
            IOError: 建立目錄失敗時
        """
        pass
    
    @abstractmethod
    def get_file_stats(self, relative_path: str) -> FileStats:
        """
        取得檔案統計資訊
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑
            
        Returns:
            FileStats 物件，包含檔案存在狀態、大小、建立時間、修改時間
        """
        pass
    
    @abstractmethod
    def list_files(self, relative_path: str = "") -> list[str]:
        """
        列出目錄中的檔案
        
        Args:
            relative_path: 相對於資料根目錄的目錄路徑，空字串表示根目錄
            
        Returns:
            檔案/目錄名稱列表（不含路徑前綴）
            
        Raises:
            FileNotFoundError: 目錄不存在時
        """
        pass
