"""
Storage module for Work Plan Calendar.

This module provides storage abstraction allowing the application
to switch between local file storage and Google Drive storage.

Feature: 002-google-drive-storage
"""

from .base import StorageProvider, FileStats
from .local import LocalStorageProvider
from .google_drive import (
    GoogleDriveStorageProvider,
    GoogleDriveError,
    NetworkError,
    AuthExpiredError,
    QuotaExceededError
)

__all__ = [
    'StorageProvider',
    'FileStats', 
    'LocalStorageProvider',
    'GoogleDriveStorageProvider',
    'GoogleDriveError',
    'NetworkError',
    'AuthExpiredError',
    'QuotaExceededError'
]
