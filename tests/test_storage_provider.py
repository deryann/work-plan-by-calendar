"""
LocalStorageProvider 單元測試

Feature: 002-google-drive-storage
User Story: US1 - 本地儲存模式
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from backend.storage import StorageProvider, LocalStorageProvider, FileStats


class TestLocalStorageProvider:
    """LocalStorageProvider 單元測試"""
    
    @pytest.fixture
    def temp_data_dir(self):
        """建立臨時測試目錄"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def storage(self, temp_data_dir):
        """建立 LocalStorageProvider 實例"""
        return LocalStorageProvider(data_dir=temp_data_dir)
    
    def test_implements_storage_provider_interface(self, storage):
        """測試實作 StorageProvider 介面"""
        assert isinstance(storage, StorageProvider)
    
    def test_data_dir_property(self, storage, temp_data_dir):
        """測試 data_dir 屬性"""
        assert storage.data_dir == Path(temp_data_dir)
    
    # === read_file 測試 ===
    
    def test_read_file_success(self, storage, temp_data_dir):
        """測試成功讀取檔案"""
        # 準備測試檔案
        test_file = Path(temp_data_dir) / "test.md"
        test_content = "# Test Content\n\nSome text here."
        test_file.write_text(test_content, encoding='utf-8')
        
        # 執行測試
        result = storage.read_file("test.md")
        
        # 驗證結果
        assert result == test_content
    
    def test_read_file_not_found(self, storage):
        """測試讀取不存在的檔案"""
        with pytest.raises(FileNotFoundError):
            storage.read_file("nonexistent.md")
    
    def test_read_file_in_subdirectory(self, storage, temp_data_dir):
        """測試讀取子目錄中的檔案"""
        # 準備測試檔案
        subdir = Path(temp_data_dir) / "Year"
        subdir.mkdir()
        test_file = subdir / "2025.md"
        test_content = "# 2025 年計畫"
        test_file.write_text(test_content, encoding='utf-8')
        
        # 執行測試
        result = storage.read_file("Year/2025.md")
        
        # 驗證結果
        assert result == test_content
    
    def test_read_file_path_traversal_attack(self, storage):
        """測試防止路徑穿越攻擊"""
        with pytest.raises(ValueError, match="不可包含"):
            storage.read_file("../etc/passwd")
    
    # === write_file 測試 ===
    
    def test_write_file_new_file(self, storage, temp_data_dir):
        """測試寫入新檔案"""
        content = "# New Content"
        storage.write_file("new_file.md", content)
        
        # 驗證檔案已建立
        result_file = Path(temp_data_dir) / "new_file.md"
        assert result_file.exists()
        assert result_file.read_text(encoding='utf-8') == content
    
    def test_write_file_overwrite(self, storage, temp_data_dir):
        """測試覆蓋現有檔案"""
        test_file = Path(temp_data_dir) / "existing.md"
        test_file.write_text("Old content", encoding='utf-8')
        
        new_content = "New content"
        storage.write_file("existing.md", new_content)
        
        assert test_file.read_text(encoding='utf-8') == new_content
    
    def test_write_file_creates_parent_directory(self, storage, temp_data_dir):
        """測試自動建立父目錄"""
        content = "# Deep Content"
        storage.write_file("deep/nested/dir/file.md", content)
        
        result_file = Path(temp_data_dir) / "deep/nested/dir/file.md"
        assert result_file.exists()
        assert result_file.read_text(encoding='utf-8') == content
    
    def test_write_file_path_traversal_attack(self, storage):
        """測試寫入時防止路徑穿越攻擊"""
        with pytest.raises(ValueError, match="不可包含"):
            storage.write_file("../malicious.md", "bad content")
    
    # === file_exists 測試 ===
    
    def test_file_exists_true(self, storage, temp_data_dir):
        """測試檔案存在"""
        test_file = Path(temp_data_dir) / "exists.md"
        test_file.write_text("content", encoding='utf-8')
        
        assert storage.file_exists("exists.md") is True
    
    def test_file_exists_false(self, storage):
        """測試檔案不存在"""
        assert storage.file_exists("not_exists.md") is False
    
    def test_file_exists_directory_returns_false(self, storage, temp_data_dir):
        """測試目錄不視為檔案"""
        dir_path = Path(temp_data_dir) / "some_dir"
        dir_path.mkdir()
        
        assert storage.file_exists("some_dir") is False
    
    # === delete_file 測試 ===
    
    def test_delete_file_success(self, storage, temp_data_dir):
        """測試成功刪除檔案"""
        test_file = Path(temp_data_dir) / "to_delete.md"
        test_file.write_text("content", encoding='utf-8')
        
        result = storage.delete_file("to_delete.md")
        
        assert result is True
        assert not test_file.exists()
    
    def test_delete_file_not_exists(self, storage):
        """測試刪除不存在的檔案"""
        result = storage.delete_file("nonexistent.md")
        assert result is False
    
    # === ensure_directory 測試 ===
    
    def test_ensure_directory_creates_new(self, storage, temp_data_dir):
        """測試建立新目錄"""
        storage.ensure_directory("new_dir")
        
        dir_path = Path(temp_data_dir) / "new_dir"
        assert dir_path.exists()
        assert dir_path.is_dir()
    
    def test_ensure_directory_creates_nested(self, storage, temp_data_dir):
        """測試建立巢狀目錄"""
        storage.ensure_directory("level1/level2/level3")
        
        dir_path = Path(temp_data_dir) / "level1/level2/level3"
        assert dir_path.exists()
        assert dir_path.is_dir()
    
    def test_ensure_directory_existing_ok(self, storage, temp_data_dir):
        """測試對現有目錄不報錯"""
        dir_path = Path(temp_data_dir) / "existing_dir"
        dir_path.mkdir()
        
        # 不應拋出異常
        storage.ensure_directory("existing_dir")
        assert dir_path.exists()
    
    # === get_file_stats 測試 ===
    
    def test_get_file_stats_existing_file(self, storage, temp_data_dir):
        """測試取得存在檔案的統計資訊"""
        test_file = Path(temp_data_dir) / "stats_test.md"
        test_content = "Test content for stats"
        test_file.write_text(test_content, encoding='utf-8')
        
        stats = storage.get_file_stats("stats_test.md")
        
        assert stats.exists is True
        assert stats.size == len(test_content.encode('utf-8'))
        assert isinstance(stats.created_at, datetime)
        assert isinstance(stats.modified_at, datetime)
    
    def test_get_file_stats_nonexistent_file(self, storage):
        """測試取得不存在檔案的統計資訊"""
        stats = storage.get_file_stats("nonexistent.md")
        
        assert stats.exists is False
        assert stats.size == 0
        assert stats.created_at is None
        assert stats.modified_at is None
    
    # === list_files 測試 ===
    
    def test_list_files_root_directory(self, storage, temp_data_dir):
        """測試列出根目錄"""
        # 準備測試結構
        (Path(temp_data_dir) / "file1.md").write_text("content")
        (Path(temp_data_dir) / "file2.txt").write_text("content")
        (Path(temp_data_dir) / "subdir").mkdir()
        
        result = storage.list_files("")
        
        assert "file1.md" in result
        assert "file2.txt" in result
        assert "subdir/" in result
    
    def test_list_files_subdirectory(self, storage, temp_data_dir):
        """測試列出子目錄"""
        subdir = Path(temp_data_dir) / "Year"
        subdir.mkdir()
        (subdir / "2024.md").write_text("content")
        (subdir / "2025.md").write_text("content")
        
        result = storage.list_files("Year")
        
        assert "2024.md" in result
        assert "2025.md" in result
    
    def test_list_files_nonexistent_directory(self, storage):
        """測試列出不存在的目錄"""
        with pytest.raises(FileNotFoundError):
            storage.list_files("nonexistent_dir")
    
    def test_list_files_sorted(self, storage, temp_data_dir):
        """測試列出結果已排序"""
        (Path(temp_data_dir) / "z_file.md").write_text("content")
        (Path(temp_data_dir) / "a_file.md").write_text("content")
        (Path(temp_data_dir) / "m_file.md").write_text("content")
        
        result = storage.list_files("")
        
        # 找出檔案在結果中的位置
        file_names = [f for f in result if not f.endswith('/')]
        assert file_names == sorted(file_names)


class TestLocalStorageProviderDefaultDataDir:
    """測試預設資料目錄"""
    
    def test_default_data_dir(self):
        """測試未指定 data_dir 時使用預設值"""
        storage = LocalStorageProvider()
        
        # 預設應指向專案根目錄的 data/
        expected_suffix = Path("data")
        assert storage.data_dir.name == "data"


class TestFileStatsDataClass:
    """FileStats 資料類別測試"""
    
    def test_default_values(self):
        """測試預設值"""
        stats = FileStats(exists=False)
        
        assert stats.exists is False
        assert stats.size == 0
        assert stats.created_at is None
        assert stats.modified_at is None
    
    def test_full_values(self):
        """測試完整值"""
        now = datetime.now()
        stats = FileStats(
            exists=True,
            size=1024,
            created_at=now,
            modified_at=now
        )
        
        assert stats.exists is True
        assert stats.size == 1024
        assert stats.created_at == now
        assert stats.modified_at == now
