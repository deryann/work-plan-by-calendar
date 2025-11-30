/**
 * Google Auth Manager
 * 
 * 負責 Google OAuth 2.0 授權流程管理，包含：
 * - Google Identity Services SDK 載入
 * - 授權流程處理
 * - 授權狀態查詢
 * - 登出功能
 * 
 * Feature: 002-google-drive-storage
 * User Story: US2 - Google 帳號登入與授權
 */

class GoogleAuthManager {
    constructor() {
        this.isInitialized = false;
        this.authStatus = null;
        this.onStatusChangeCallbacks = [];
    }

    /**
     * 初始化 Google Auth Manager
     * 載入 Google Identity Services SDK
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // 取得初始授權狀態
            await this.refreshStatus();
            this.isInitialized = true;
            console.log('[GoogleAuth] 初始化完成');
        } catch (error) {
            console.error('[GoogleAuth] 初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 啟動 Google OAuth 授權流程
     * 開啟新視窗導向 Google 授權頁面
     */
    async startAuth() {
        try {
            // 取得授權 URL
            const redirectUri = `${window.location.origin}/api/auth/google/callback`;
            const response = await window.api.getGoogleAuthUrl(redirectUri);
            
            if (!response || !response.auth_url) {
                throw new Error('無法取得授權 URL');
            }

            // 開啟授權視窗
            const authWindow = window.open(
                response.auth_url,
                'google-auth',
                'width=500,height=600,scrollbars=yes'
            );

            // 監聽授權完成
            return new Promise((resolve, reject) => {
                const checkClosed = setInterval(() => {
                    if (authWindow && authWindow.closed) {
                        clearInterval(checkClosed);
                        // 視窗關閉後刷新狀態
                        this.refreshStatus()
                            .then(() => {
                                if (this.authStatus && this.authStatus.status === 'connected') {
                                    resolve(this.authStatus);
                                } else {
                                    reject(new Error('授權流程未完成'));
                                }
                            })
                            .catch(reject);
                    }
                }, 500);

                // 30 秒超時
                setTimeout(() => {
                    clearInterval(checkClosed);
                    if (authWindow && !authWindow.closed) {
                        authWindow.close();
                    }
                    reject(new Error('授權逾時'));
                }, 30000);
            });
        } catch (error) {
            console.error('[GoogleAuth] 啟動授權失敗:', error);
            throw error;
        }
    }

    /**
     * 處理 OAuth 回調
     * 從 URL 參數中取得 authorization code 並完成授權
     * 
     * @param {string} code - Authorization Code
     * @param {string} redirectUri - 重導向 URL
     */
    async handleAuthCallback(code, redirectUri) {
        try {
            const result = await window.api.googleAuthCallback(code, redirectUri);
            this.authStatus = result;
            this._notifyStatusChange();
            return result;
        } catch (error) {
            console.error('[GoogleAuth] 處理回調失敗:', error);
            throw error;
        }
    }

    /**
     * 登出 Google 帳號
     */
    async logout() {
        try {
            await window.api.googleLogout();
            this.authStatus = { status: 'not_connected' };
            this._notifyStatusChange();
            console.log('[GoogleAuth] 已登出');
        } catch (error) {
            console.error('[GoogleAuth] 登出失敗:', error);
            throw error;
        }
    }

    /**
     * 取得目前授權狀態
     */
    async getAuthStatus() {
        return this.authStatus;
    }

    /**
     * 刷新授權狀態
     */
    async refreshStatus() {
        try {
            this.authStatus = await window.api.getGoogleAuthStatus();
            this._notifyStatusChange();
            return this.authStatus;
        } catch (error) {
            console.error('[GoogleAuth] 刷新狀態失敗:', error);
            this.authStatus = { status: 'not_connected' };
            this._notifyStatusChange();
            throw error;
        }
    }

    /**
     * 檢查是否已連結 Google 帳號
     */
    isConnected() {
        return this.authStatus && this.authStatus.status === 'connected';
    }

    /**
     * 取得已連結的 Google 帳號 email
     */
    getConnectedEmail() {
        if (this.isConnected()) {
            return this.authStatus.user_email;
        }
        return null;
    }

    /**
     * 註冊狀態變更回調
     * 
     * @param {Function} callback - 狀態變更時呼叫的函數
     */
    onStatusChange(callback) {
        if (typeof callback === 'function') {
            this.onStatusChangeCallbacks.push(callback);
        }
    }

    /**
     * 移除狀態變更回調
     * 
     * @param {Function} callback - 要移除的回調函數
     */
    offStatusChange(callback) {
        const index = this.onStatusChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.onStatusChangeCallbacks.splice(index, 1);
        }
    }

    /**
     * 通知所有註冊的回調
     * @private
     */
    _notifyStatusChange() {
        for (const callback of this.onStatusChangeCallbacks) {
            try {
                callback(this.authStatus);
            } catch (error) {
                console.error('[GoogleAuth] 回調執行錯誤:', error);
            }
        }
    }
}

// 建立全域實例
window.googleAuthManager = new GoogleAuthManager();
