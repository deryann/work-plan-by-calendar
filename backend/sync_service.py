"""
SyncService - 本地與 Google Drive 差異比較與同步服務

同時持有 LocalStorageProvider 和 GoogleDriveStorageProvider，
執行 MD5 比對和檔案同步操作。

Feature: sync-files (Issue #19)
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.storage.local import LocalStorageProvider
from backend.storage.google_drive import GoogleDriveStorageProvider
from backend.models import (
    FileSyncStatus, SyncAction, FileDiffStats, FileSyncInfo,
    SyncComparisonResult, SyncOperationRequest, SyncOperationResult,
    SyncExecuteResult
)

logger = logging.getLogger(__name__)

# 納入同步比較的計畫目錄（排除 settings/）
PLAN_DIRECTORIES = ["Year", "Month", "Week", "Day"]


class SyncService:
    """
    本地與 Google Drive 同步服務

    同時持有兩個 StorageProvider，獨立於 PlanService 的單一 Provider 策略。
    """

    def __init__(
        self,
        local_provider: LocalStorageProvider,
        google_provider: GoogleDriveStorageProvider
    ):
        self.local = local_provider
        self.cloud = google_provider

    # ============================================================
    # 內部輔助方法
    # ============================================================

    def _compute_local_md5(self, relative_path: str) -> str:
        """計算本地檔案的 MD5 hash"""
        content = self.local.read_file(relative_path)
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def _list_all_local_files(self) -> Dict[str, dict]:
        """
        列出所有計畫目錄中的本地 .md 檔案

        Returns:
            Dict mapping relative_path -> {'modified_at': datetime}
        """
        result = {}
        for directory in PLAN_DIRECTORIES:
            try:
                files = self.local.list_files(directory)
                for filename in files:
                    if not filename.endswith('.md'):
                        continue
                    relative_path = f"{directory}/{filename}"
                    stats = self.local.get_file_stats(relative_path)
                    result[relative_path] = {
                        'modified_at': stats.modified_at,
                    }
            except FileNotFoundError:
                # 目錄不存在本地，跳過
                pass
            except Exception as e:
                logger.warning(f"列出本地目錄 {directory} 失敗: {e}")
        return result

    def _list_all_cloud_files(self) -> Dict[str, dict]:
        """
        列出所有計畫目錄中的 Google Drive .md 檔案

        Returns:
            Dict mapping relative_path -> {'md5': str, 'modified_at': datetime}
        """
        result = {}
        for directory in PLAN_DIRECTORIES:
            try:
                files_meta = self.cloud.list_files_with_metadata(directory)
                for meta in files_meta:
                    name = meta.get('name', '')
                    if not name.endswith('.md'):
                        continue
                    relative_path = f"{directory}/{name}"
                    modified_at = None
                    if meta.get('modifiedTime'):
                        try:
                            modified_at = datetime.fromisoformat(
                                meta['modifiedTime'].replace('Z', '+00:00')
                            )
                        except Exception:
                            pass
                    result[relative_path] = {
                        'md5': meta.get('md5Checksum'),
                        'modified_at': modified_at,
                    }
            except Exception as e:
                logger.warning(f"列出雲端目錄 {directory} 失敗: {e}")
        return result

    # ============================================================
    # 核心操作：比較
    # ============================================================

    def compare(self) -> SyncComparisonResult:
        """
        比較本地與 Google Drive 的所有計畫檔案

        Returns:
            SyncComparisonResult 包含所有檔案的同步狀態
        """
        local_files = self._list_all_local_files()
        cloud_files = self._list_all_cloud_files()

        all_paths = sorted(set(local_files.keys()) | set(cloud_files.keys()))

        file_infos: List[FileSyncInfo] = []

        for path in all_paths:
            local_info = local_files.get(path)
            cloud_info = cloud_files.get(path)

            if local_info and not cloud_info:
                # 僅本地存在
                try:
                    local_md5 = self._compute_local_md5(path)
                except Exception as e:
                    logger.warning(f"計算 MD5 失敗 {path}: {e}")
                    local_md5 = None

                file_infos.append(FileSyncInfo(
                    relative_path=path,
                    status=FileSyncStatus.LOCAL_ONLY,
                    local_modified_at=local_info['modified_at'],
                    local_md5=local_md5,
                    cloud_modified_at=None,
                    cloud_md5=None,
                    diff_stats=None,
                    suggested_action=SyncAction.UPLOAD,
                ))

            elif not local_info and cloud_info:
                # 僅雲端存在
                file_infos.append(FileSyncInfo(
                    relative_path=path,
                    status=FileSyncStatus.CLOUD_ONLY,
                    local_modified_at=None,
                    local_md5=None,
                    cloud_modified_at=cloud_info['modified_at'],
                    cloud_md5=cloud_info['md5'],
                    diff_stats=None,
                    suggested_action=SyncAction.DOWNLOAD,
                ))

            else:
                # 兩邊都存在，比較 MD5
                try:
                    local_md5 = self._compute_local_md5(path)
                except Exception as e:
                    logger.warning(f"計算本地 MD5 失敗 {path}: {e}")
                    local_md5 = None

                cloud_md5 = cloud_info['md5']

                if local_md5 and cloud_md5 and local_md5 == cloud_md5:
                    # SAME
                    file_infos.append(FileSyncInfo(
                        relative_path=path,
                        status=FileSyncStatus.SAME,
                        local_modified_at=local_info['modified_at'],
                        local_md5=local_md5,
                        cloud_modified_at=cloud_info['modified_at'],
                        cloud_md5=cloud_md5,
                        diff_stats=None,
                        suggested_action=SyncAction.SKIP,
                    ))
                else:
                    # DIFFERENT - 計算行數差異
                    diff_stats = self._compute_diff_stats(path)
                    file_infos.append(FileSyncInfo(
                        relative_path=path,
                        status=FileSyncStatus.DIFFERENT,
                        local_modified_at=local_info['modified_at'],
                        local_md5=local_md5,
                        cloud_modified_at=cloud_info['modified_at'],
                        cloud_md5=cloud_md5,
                        diff_stats=diff_stats,
                        suggested_action=SyncAction.SKIP,
                    ))

        return SyncComparisonResult(
            files=file_infos,
            total_local_only=sum(1 for f in file_infos if f.status == FileSyncStatus.LOCAL_ONLY),
            total_cloud_only=sum(1 for f in file_infos if f.status == FileSyncStatus.CLOUD_ONLY),
            total_same=sum(1 for f in file_infos if f.status == FileSyncStatus.SAME),
            total_different=sum(1 for f in file_infos if f.status == FileSyncStatus.DIFFERENT),
            compared_at=datetime.now(timezone.utc),
        )

    def _compute_diff_stats(self, relative_path: str) -> Optional[FileDiffStats]:
        """計算兩端檔案的行數差異（僅在 DIFFERENT 狀態使用）"""
        try:
            local_content = self.local.read_file(relative_path)
            cloud_content = self.cloud.read_file(relative_path)
            local_lines = len(local_content.splitlines())
            cloud_lines = len(cloud_content.splitlines())
            return FileDiffStats(
                local_lines=local_lines,
                cloud_lines=cloud_lines,
                added_lines=max(0, cloud_lines - local_lines),
                removed_lines=max(0, local_lines - cloud_lines),
            )
        except Exception as e:
            logger.warning(f"計算行數差異失敗 {relative_path}: {e}")
            return None

    # ============================================================
    # 核心操作：執行同步
    # ============================================================

    def execute(self, operations: List[SyncOperationRequest]) -> SyncExecuteResult:
        """
        執行批次同步操作

        Args:
            operations: 操作清單（只包含 upload/download，不含 skip）

        Returns:
            SyncExecuteResult 包含每個操作的執行結果
        """
        results: List[SyncOperationResult] = []

        for op in operations:
            try:
                if op.action == SyncAction.UPLOAD:
                    content = self.local.read_file(op.file_path)
                    self.cloud.write_file(op.file_path, content)
                elif op.action == SyncAction.DOWNLOAD:
                    content = self.cloud.read_file(op.file_path)
                    self.local.write_file(op.file_path, content)
                else:
                    # skip 不應出現在 operations 中（Validator 已阻擋，此為防禦性程式碼）
                    continue

                results.append(SyncOperationResult(
                    file_path=op.file_path,
                    action=op.action,
                    success=True,
                    error_message=None,
                ))
            except Exception as e:
                logger.error(f"同步操作失敗 {op.action} {op.file_path}: {e}")
                results.append(SyncOperationResult(
                    file_path=op.file_path,
                    action=op.action,
                    success=False,
                    error_message=str(e),
                ))

        return SyncExecuteResult(
            total=len(results),
            success_count=sum(1 for r in results if r.success),
            failed_count=sum(1 for r in results if not r.success),
            results=results,
            executed_at=datetime.now(timezone.utc),
        )
