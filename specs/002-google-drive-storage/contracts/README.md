# API Contracts

本目錄包含 Google Drive 儲存整合功能的 API 合約定義。

## 合約檔案

| 檔案 | 說明 |
|-----|------|
| [google-auth-api.yaml](google-auth-api.yaml) | Google OAuth 2.0 授權相關 API |
| [storage-settings-api.yaml](storage-settings-api.yaml) | 儲存模式設定相關 API |

## 端點總覽

### Google Auth API

| 方法 | 端點 | 說明 |
|-----|------|------|
| GET | `/api/auth/google/status` | 取得 Google 授權狀態 |
| GET | `/api/auth/google/authorize` | 取得 OAuth 授權 URL |
| POST | `/api/auth/google/callback` | 處理 OAuth 回調 |
| POST | `/api/auth/google/logout` | 登出 Google 帳號 |
| POST | `/api/auth/google/refresh` | 刷新 Token |

### Storage Settings API

| 方法 | 端點 | 說明 |
|-----|------|------|
| GET | `/api/storage/status` | 取得儲存狀態 |
| PUT | `/api/storage/mode` | 更新儲存模式 |
| PUT | `/api/storage/google-drive-path` | 更新 Google Drive 路徑 |
| POST | `/api/storage/test-connection` | 測試 Google Drive 連線 |

## 使用方式

這些 OpenAPI 規格可用於：
- 產生 API 文件
- 產生客戶端 SDK
- 合約測試驗證
