"""
LocalStorageProvider - 本地檔案系統儲存實作

實作 StorageProvider 介面，使用本地檔案系統進行資料儲存。
這是預設的儲存提供者，確保離線環境下系統正常運作。

Feature: 002-google-drive-storage
User Story: US1 - 本地儲存模式
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from .base import StorageProvider, FileStats


class LocalStorageProvider(StorageProvider):
    """
    本地檔案系統儲存提供者
    
    使用本地檔案系統進行檔案讀寫操作。
    所有路徑操作相對於指定的資料根目錄。
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        初始化 LocalStorageProvider
        
        Args:
            data_dir: 資料根目錄路徑。若為 None，使用專案根目錄的 data/
        """
        if data_dir is None:
            # 預設使用專案根目錄的 data
            backend_dir = Path(__file__).parent.parent
            self._data_dir = backend_dir.parent / "data"
        else:
            self._data_dir = Path(data_dir)
        
        # 確保資料目錄存在
        self._data_dir.mkdir(parents=True, exist_ok=True)
    
    @property
    def data_dir(self) -> Path:
        """取得資料根目錄路徑"""
        return self._data_dir
    
    def _resolve_path(self, relative_path: str) -> Path:
        """
        將相對路徑解析為絕對路徑
        
        Args:
            relative_path: 相對於資料根目錄的路徑
            
        Returns:
            完整的絕對路徑
        """
        # 清理路徑，防止路徑穿越攻擊
        clean_path = Path(relative_path)
        if ".." in clean_path.parts:
            raise ValueError("路徑不可包含 '..'")
        
        return self._data_dir / clean_path
    
    def read_file(self, relative_path: str) -> str:
        """
        讀取檔案內容
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑
            
        Returns:
            檔案內容字串
            
        Raises:
            FileNotFoundError: 檔案不存在時
            IOError: 讀取檔案失敗時
        """
        file_path = self._resolve_path(relative_path)
        
        try:
            if not file_path.exists():
                raise FileNotFoundError(f"檔案不存在: {relative_path}")
            return file_path.read_text(encoding='utf-8')
        except FileNotFoundError:
            raise
        except Exception as e:
            raise IOError(f"讀取檔案失敗 {relative_path}: {str(e)}")
    
    def write_file(self, relative_path: str, content: str) -> None:
        """
        寫入檔案內容
        
        若檔案不存在則建立，若已存在則覆蓋。
        若父目錄不存在會自動建立。
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑
            content: 要寫入的內容
            
        Raises:
            IOError: 寫入檔案失敗時
        """
        file_path = self._resolve_path(relative_path)
        
        try:
            # 確保父目錄存在
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding='utf-8')
        except Exception as e:
            raise IOError(f"寫入檔案失敗 {relative_path}: {str(e)}")
    
    def file_exists(self, relative_path: str) -> bool:
        """
        檢查檔案是否存在
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑
            
        Returns:
            檔案存在返回 True，否則返回 False
        """
        file_path = self._resolve_path(relative_path)
        return file_path.exists() and file_path.is_file()
    
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
        file_path = self._resolve_path(relative_path)
        
        try:
            if not file_path.exists():
                return False
            file_path.unlink()
            return True
        except Exception as e:
            raise IOError(f"刪除檔案失敗 {relative_path}: {str(e)}")
    
    def ensure_directory(self, relative_path: str) -> None:
        """
        確保目錄存在
        
        若目錄不存在則建立（包含父目錄）。
        
        Args:
            relative_path: 相對於資料根目錄的目錄路徑
            
        Raises:
            IOError: 建立目錄失敗時
        """
        dir_path = self._resolve_path(relative_path)
        
        try:
            dir_path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise IOError(f"建立目錄失敗 {relative_path}: {str(e)}")
    
    def get_file_stats(self, relative_path: str) -> FileStats:
        """
        取得檔案統計資訊
        
        Args:
            relative_path: 相對於資料根目錄的檔案路徑
            
        Returns:
            FileStats 物件，包含檔案存在狀態、大小、建立時間、修改時間
        """
        file_path = self._resolve_path(relative_path)
        
        if not file_path.exists():
            return FileStats(exists=False)
        
        try:
            stat = file_path.stat()
            return FileStats(
                exists=True,
                size=stat.st_size,
                created_at=datetime.fromtimestamp(stat.st_ctime),
                modified_at=datetime.fromtimestamp(stat.st_mtime)
            )
        except Exception:
            return FileStats(exists=False)
    
    def list_files(self, relative_path: str = "") -> list[str]:
        """
        列出目錄中的檔案
        
        Args:
            relative_path: 相對於資料根目錄的目錄路徑，空字串表示根目錄
            
        Returns:
            檔案/目錄名稱列表（目錄以 / 結尾）
            
        Raises:
            FileNotFoundError: 目錄不存在時
        """
        dir_path = self._resolve_path(relative_path) if relative_path else self._data_dir
        
        if not dir_path.exists():
            raise FileNotFoundError(f"目錄不存在: {relative_path}")
        
        if not dir_path.is_dir():
            raise ValueError(f"路徑不是目錄: {relative_path}")
        
        result = []
        for item in sorted(dir_path.iterdir()):
            if item.is_dir():
                result.append(f"{item.name}/")
            else:
                result.append(item.name)
        
        return result
