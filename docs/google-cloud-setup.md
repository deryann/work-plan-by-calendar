# Google Cloud Console 設定指南

本指南將協助您設定 Google Cloud 專案，以啟用工作計畫日曆系統的 Google Drive 儲存功能。

## 目錄

1. [建立 Google Cloud 專案](#1-建立-google-cloud-專案)
2. [啟用 Google Drive API](#2-啟用-google-drive-api)
3. [設定 OAuth 同意畫面](#3-設定-oauth-同意畫面)
4. [建立 OAuth 2.0 憑證](#4-建立-oauth-20-憑證)
5. [設定應用程式環境變數](#5-設定應用程式環境變數)
6. [驗證設定](#6-驗證設定)
7. [常見問題](#常見問題)

---

## 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 登入您的 Google 帳號
3. 點擊頂部的專案下拉選單
4. 點擊「新增專案」
5. 輸入專案名稱（例如：`work-plan-calendar`）
6. 選擇組織（個人使用可選「無組織」）
7. 點擊「建立」

![建立專案](https://developers.google.com/static/cloud/images/create-project.png)

---

## 2. 啟用 Google Drive API

1. 在 Google Cloud Console 中，確保已選擇正確的專案
2. 前往「API 和服務」>「資料庫」
3. 搜尋「Google Drive API」
4. 點擊「Google Drive API」
5. 點擊「啟用」

或直接訪問：
```
https://console.cloud.google.com/apis/library/drive.googleapis.com
```

---

## 3. 設定 OAuth 同意畫面

OAuth 同意畫面是使用者授權時看到的畫面，必須先設定才能建立憑證。

### 步驟

1. 前往「API 和服務」>「OAuth 同意畫面」
2. 選擇使用者類型：
   - **外部**：任何人都可以使用（需通過 Google 審核才能正式上線）
   - **內部**：僅限組織內部使用（需 Google Workspace）
3. 點擊「建立」

### 填寫應用程式資訊

| 欄位 | 建議值 | 說明 |
|------|--------|------|
| 應用程式名稱 | `工作計畫日曆` | 使用者授權時會看到此名稱 |
| 使用者支援電子郵件 | 您的電子郵件 | 使用者遇到問題時的聯絡方式 |
| 應用程式標誌 | （可選） | 64x64 到 1024x1024 的 PNG/JPG |
| 應用程式首頁 | `http://localhost:8000/frontend/` | 本地開發用 |
| 隱私權政策連結 | （可選） | 正式上線時必填 |
| 服務條款連結 | （可選） | 正式上線時必填 |
| 開發人員聯絡資訊 | 您的電子郵件 | Google 聯絡您的方式 |

### 新增範圍（Scopes）

點擊「新增或移除範圍」，選擇以下範圍：

| 範圍 | 說明 |
|------|------|
| `.../auth/drive.file` | 存取應用程式建立的檔案 |
| `.../auth/userinfo.email` | 讀取使用者電子郵件 |
| `.../auth/userinfo.profile` | 讀取使用者基本資訊 |

**注意**：我們只請求 `drive.file` 權限，這是最小必要權限，只能存取應用程式自己建立的檔案，無法讀取使用者其他的 Google Drive 檔案。

### 新增測試使用者

如果應用程式狀態為「測試中」，需要新增測試使用者：

1. 在「測試使用者」區塊點擊「新增使用者」
2. 輸入要測試的 Google 帳號電子郵件
3. 點擊「儲存」

**重要**：測試模式下，只有列表中的使用者才能完成授權流程。

---

## 4. 建立 OAuth 2.0 憑證

1. 前往「API 和服務」>「憑證」
2. 點擊「建立憑證」>「OAuth 用戶端 ID」
3. 選擇應用程式類型：「網頁應用程式」
4. 輸入名稱（例如：`Work Plan Calendar Web Client`）

### 設定已授權的來源

在「已授權的 JavaScript 來源」新增：

```
http://localhost:8000
```

如果您使用其他埠號或部署到伺服器，請相應修改：

```
# 開發環境
http://localhost:8000
http://127.0.0.1:8000

# 生產環境（範例）
https://your-domain.com
```

### 設定重新導向 URI

在「已授權的重新導向 URI」新增：

```
http://localhost:8000/frontend/
```

**注意**：URI 結尾的斜線 `/` 必須完全匹配！

### 下載憑證

1. 點擊「建立」
2. 系統會顯示您的用戶端 ID 和用戶端密鑰
3. **重要**：請妥善保存這些資訊，用戶端密鑰只會顯示一次
4. 點擊「下載 JSON」保存憑證檔案（可選）

---

## 5. 設定應用程式環境變數

### 建立 .env 檔案

在專案根目錄建立 `.env` 檔案：

```bash
# 複製範例檔案
cp .env.example .env
```

### 填入憑證資訊

編輯 `.env` 檔案：

```bash
# Google OAuth 憑證（必填）
GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx

# Token 加密金鑰（選填，系統會自動生成）
# GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-byte-base64-encoded-key
```

### 環境變數說明

| 變數名稱 | 必填 | 說明 |
|---------|------|------|
| `GOOGLE_CLIENT_ID` | ✅ | OAuth 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth 用戶端密鑰 |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | ❌ | 用於加密存儲的授權 Token，不設定則自動生成 |

### 安全注意事項

⚠️ **永遠不要將 `.env` 檔案提交到版本控制系統！**

確保 `.gitignore` 包含：

```
.env
.env.local
.env.*.local
```

---

## 6. 驗證設定

### 啟動應用程式

```bash
# 使用 uv 執行
uv run python start_server.py
```

### 測試 Google 授權流程

1. 開啟瀏覽器訪問 `http://localhost:8000/frontend/`
2. 點擊右上角設定圖示 ⚙️
3. 在「儲存設定」區塊點擊「連結 Google 帳號」
4. 應該會彈出 Google 登入視窗
5. 選擇您的 Google 帳號
6. 查看權限請求並點擊「允許」
7. 返回應用程式，應該會顯示「已連結」狀態

### 測試 Google Drive 連線

1. 設定 Google Drive 路徑（使用預設的 `WorkPlanCalendar` 或自訂）
2. 將儲存模式切換為「Google Drive」
3. 點擊「測試連線」按鈕
4. 應該會顯示「連線成功」訊息

### 驗證 Google Drive 中的資料夾

1. 前往 [Google Drive](https://drive.google.com/)
2. 應該可以看到新建立的 `WorkPlanCalendar` 資料夾
3. 資料夾內會有 `Year`, `Month`, `Week`, `Day` 子資料夾

---

## 常見問題

### Q: 出現「Access blocked: This app's request is invalid」錯誤

**原因**：OAuth 憑證設定的重新導向 URI 與實際 URI 不匹配。

**解決方法**：
1. 檢查 Google Cloud Console 中設定的重新導向 URI
2. 確保與應用程式使用的 URL 完全匹配（包括結尾的 `/`）
3. 注意 `http` 和 `https` 的區別

### Q: 出現「Error 400: redirect_uri_mismatch」錯誤

**原因**：已授權的 JavaScript 來源或重新導向 URI 設定錯誤。

**解決方法**：
1. 確認已在 Google Cloud Console 新增正確的來源
2. 等待幾分鐘讓設定生效（最多可能需要 5 分鐘）

### Q: 出現「This app is blocked」錯誤

**原因**：應用程式處於測試模式，但使用者未被加入測試使用者清單。

**解決方法**：
1. 前往 OAuth 同意畫面設定
2. 在「測試使用者」區塊新增您的 Google 帳號
3. 重新嘗試授權

### Q: 授權成功但無法存取 Google Drive

**原因**：可能是權限範圍不足或 API 未啟用。

**解決方法**：
1. 確認已啟用 Google Drive API
2. 確認 OAuth 同意畫面已包含 `drive.file` 範圍
3. 嘗試登出後重新授權

### Q: Token 過期或失效

**原因**：授權 Token 有效期限為 1 小時，Refresh Token 可能因安全原因被撤銷。

**解決方法**：
1. 在設定中點擊「登出」
2. 重新點擊「連結 Google 帳號」進行授權

### Q: 如何完全移除應用程式授權？

1. 前往 [Google 帳戶安全性設定](https://myaccount.google.com/permissions)
2. 找到「工作計畫日曆」應用程式
3. 點擊「移除存取權」

---

## 進階設定

### 自訂 Token 加密金鑰

如果您想使用自訂的加密金鑰：

```bash
# 生成 32 位元組的 Base64 編碼金鑰
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

將生成的金鑰設定到 `.env`：

```bash
GOOGLE_TOKEN_ENCRYPTION_KEY=your-generated-key-here
```

**注意**：更換加密金鑰後，之前儲存的授權資訊將無法解密，需要重新授權。

### 部署到生產環境

部署時請注意：

1. 使用 HTTPS
2. 更新 OAuth 憑證中的已授權來源和重新導向 URI
3. 考慮申請 OAuth 同意畫面驗證（外部應用程式需要）
4. 設定適當的 CORS 政策

---

## 相關連結

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Drive API 文件](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)

---

## 需要幫助？

如果您在設定過程中遇到問題，可以：

1. 查看應用程式的錯誤訊息
2. 檢查瀏覽器開發者工具的 Console 和 Network 標籤
3. 提交 GitHub Issue 描述您的問題
