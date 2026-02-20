// Settings Google Section - handles Google Auth, Drive path, and Storage Mode

class SettingsGoogleSection {
    constructor() {
        this.googleAuthStatus = null;
        this.storageStatus = null;
        this.bindEvents();
    }

    /**
     * Initialize: load statuses and register auth change listener
     */
    async init() {
        await this.loadGoogleAuthStatus();
        await this.loadStorageStatus();

        // Listen for Google auth status changes
        if (window.googleAuthManager) {
            window.googleAuthManager.onStatusChange((status) => {
                this.googleAuthStatus = status;
                this.updateGoogleAuthUI();
            });
        }
    }

    /**
     * Bind Google/storage event listeners
     */
    bindEvents() {
        // Google Auth buttons
        const googleConnectBtn = document.getElementById('google-connect-btn');
        if (googleConnectBtn) {
            googleConnectBtn.addEventListener('click', () => {
                this.handleGoogleConnect();
            });
        }

        const googleDisconnectBtn = document.getElementById('google-disconnect-btn');
        if (googleDisconnectBtn) {
            googleDisconnectBtn.addEventListener('click', () => {
                this.handleGoogleDisconnect();
            });
        }

        // Google Drive path input
        const googleDrivePathInput = document.getElementById('google-drive-path-input');
        if (googleDrivePathInput) {
            googleDrivePathInput.addEventListener('input', (e) => {
                this.validateGoogleDrivePath(e.target.value);
            });
            googleDrivePathInput.addEventListener('blur', (e) => {
                this.handleGoogleDrivePathChange(e.target.value);
            });
        }

        const saveGoogleDrivePathBtn = document.getElementById('save-google-drive-path-btn');
        if (saveGoogleDrivePathBtn) {
            saveGoogleDrivePathBtn.addEventListener('click', () => {
                const input = document.getElementById('google-drive-path-input');
                if (input) {
                    this.saveGoogleDrivePath(input.value);
                }
            });
        }

        // Test connection button
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.handleTestConnection();
            });
        }

        // 同步管理按鈕
        const syncPanelBtn = document.getElementById('open-sync-panel-btn');
        if (syncPanelBtn) {
            syncPanelBtn.addEventListener('click', () => {
                if (window.syncPanel) {
                    if (window.settingsModal) window.settingsModal.hide();
                    window.syncPanel.show();
                }
            });
        }

        // Storage mode radio buttons
        const storageModeRadios = document.querySelectorAll('.storage-mode-radio');
        storageModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleStorageModeChange(e.target.value);
            });
        });
    }

    // ========================================
    // Google Auth Methods
    // ========================================

    /**
     * Load Google auth status
     */
    async loadGoogleAuthStatus() {
        try {
            if (window.googleAuthManager) {
                await window.googleAuthManager.init();
                this.googleAuthStatus = await window.googleAuthManager.getAuthStatus();
                this.updateGoogleAuthUI();
            }
        } catch (error) {
            console.error('Failed to load Google auth status:', error);
            this.googleAuthStatus = { status: 'not_connected' };
            this.updateGoogleAuthUI();
        }
    }

    /**
     * Update Google auth UI based on current status
     */
    updateGoogleAuthUI() {
        const statusContainer = document.getElementById('google-auth-status');
        const connectBtn = document.getElementById('google-connect-btn');
        const disconnectBtn = document.getElementById('google-disconnect-btn');
        const emailDisplay = document.getElementById('google-connected-email');

        if (!statusContainer) return;

        const status = this.googleAuthStatus;
        const isConnected = status && status.status === 'connected';

        if (connectBtn) {
            connectBtn.style.display = isConnected ? 'none' : 'inline-block';
        }

        if (disconnectBtn) {
            disconnectBtn.style.display = isConnected ? 'inline-block' : 'none';
        }

        if (emailDisplay) {
            if (isConnected && status.user_email) {
                emailDisplay.textContent = status.user_email;
                emailDisplay.parentElement.style.display = 'flex';
            } else {
                emailDisplay.parentElement.style.display = 'none';
            }
        }

        // Update status indicator
        const statusIndicator = document.getElementById('google-auth-indicator');
        if (statusIndicator) {
            if (isConnected) {
                statusIndicator.className = 'w-2 h-2 rounded-full bg-green-500';
                statusIndicator.title = '已連結';
            } else if (status && status.status === 'expired') {
                statusIndicator.className = 'w-2 h-2 rounded-full bg-yellow-500';
                statusIndicator.title = '授權過期';
            } else {
                statusIndicator.className = 'w-2 h-2 rounded-full bg-gray-400';
                statusIndicator.title = '未連結';
            }
        }

        // Update storage UI when auth status changes
        this.updateStorageUI();

        // 顯示/隱藏同步管理按鈕
        const syncSection = document.getElementById('sync-management-section');
        if (syncSection) {
            syncSection.style.display = isConnected ? 'block' : 'none';
        }
    }

    /**
     * Handle Google account connection
     */
    async handleGoogleConnect() {
        try {
            Utils.showLoading('正在連結 Google 帳號...');

            const result = await window.googleAuthManager.startAuth();

            this.googleAuthStatus = result;
            this.updateGoogleAuthUI();

            // Reload storage status to get latest settings
            await this.loadStorageStatus();

            // Reload all plans to reflect data from current storage mode
            if (window.app && typeof window.app.refreshAllPlans === 'function') {
                await window.app.refreshAllPlans();
            }

            Utils.hideLoading();
            Utils.showSuccess('已成功連結 Google 帳號');

        } catch (error) {
            Utils.hideLoading();
            console.error('Google connect failed:', error);
            Utils.showError('連結 Google 帳號失敗: ' + error.message);
        }
    }

    /**
     * Handle Google account disconnection
     */
    async handleGoogleDisconnect() {
        if (!confirm('確定要解除 Google 帳號連結嗎？')) {
            return;
        }

        try {
            Utils.showLoading('正在解除連結...');

            // If currently in Google Drive mode, switch to local first
            const wasGoogleDriveMode = this.storageStatus?.mode === 'google_drive';
            if (wasGoogleDriveMode) {
                try {
                    const result = await window.planAPI.updateStorageMode('local', this.storageStatus?.google_drive_path);
                    this.storageStatus = result;
                    this.updateStorageModeUI();
                    this.updateStorageUI();

                    // Dispatch event to update header icon
                    window.dispatchEvent(new CustomEvent('storage-mode-changed', {
                        detail: { mode: 'local', status: result }
                    }));
                } catch (switchError) {
                    console.warn('Failed to switch storage mode, continuing with logout:', switchError);
                }
            }

            if (window.googleAuthManager) {
                await window.googleAuthManager.logout();
            }

            this.googleAuthStatus = { status: 'not_connected' };
            this.updateGoogleAuthUI();

            // Reload all plans to reflect data from local storage
            if (window.app && typeof window.app.refreshAllPlans === 'function') {
                await window.app.refreshAllPlans();
            }

            Utils.hideLoading();
            Utils.showSuccess('已解除 Google 帳號連結');

        } catch (error) {
            Utils.hideLoading();
            console.error('Google disconnect failed:', error);
            Utils.showError('解除連結失敗: ' + error.message);
        }
    }

    // ========================================
    // Storage Settings Methods
    // ========================================

    /**
     * Load storage status
     */
    async loadStorageStatus() {
        try {
            this.storageStatus = await window.planAPI.getStorageStatus();
            this.updateStorageUI();
            this.updateStorageModeUI();
        } catch (error) {
            console.error('Failed to load storage status:', error);
            this.storageStatus = null;
        }
    }

    /**
     * Update storage UI based on current status
     */
    updateStorageUI() {
        const pathInput = document.getElementById('google-drive-path-input');
        const pathError = document.getElementById('google-drive-path-error');
        const pathContainer = document.getElementById('google-drive-path-container');

        if (pathInput && this.storageStatus) {
            pathInput.value = this.storageStatus.google_drive_path || 'WorkPlanByCalendar';
        }

        // Show/hide path container based on Google auth status
        if (pathContainer) {
            const isConnected = this.googleAuthStatus?.status === 'connected';
            pathContainer.style.display = isConnected ? 'block' : 'none';
        }

        // Clear error on load
        if (pathError) {
            pathError.textContent = '';
            pathError.style.display = 'none';
        }
    }

    /**
     * Validate Google Drive path input
     * @param {string} path - Path to validate
     * @returns {object} Validation result { isValid, message }
     */
    validateGoogleDrivePath(path) {
        const pathError = document.getElementById('google-drive-path-error');
        const pathInput = document.getElementById('google-drive-path-input');
        const saveBtn = document.getElementById('save-google-drive-path-btn');

        let isValid = true;
        let message = '';

        // Validation rules
        if (!path || path.trim().length === 0) {
            isValid = false;
            message = '路徑不可為空';
        } else if (path.length > 255) {
            isValid = false;
            message = '路徑長度不可超過 255 字元';
        } else if (path.includes('..')) {
            isValid = false;
            message = '路徑不可包含 ".."';
        } else if (path.startsWith('/')) {
            isValid = false;
            message = '路徑必須為相對路徑（不可以 "/" 開頭）';
        } else if (/[<>:"|?*]/.test(path)) {
            isValid = false;
            message = '路徑包含無效字元（不可包含 <>:"|?*）';
        }

        // Update UI
        if (pathError) {
            if (isValid) {
                pathError.style.display = 'none';
                pathError.textContent = '';
            } else {
                pathError.style.display = 'block';
                pathError.textContent = message;
            }
        }

        if (pathInput) {
            if (isValid) {
                pathInput.classList.remove('border-red-500');
                pathInput.classList.add('border-gray-300', 'dark:border-gray-600');
            } else {
                pathInput.classList.remove('border-gray-300', 'dark:border-gray-600');
                pathInput.classList.add('border-red-500');
            }
        }

        if (saveBtn) {
            saveBtn.disabled = !isValid;
        }

        return { isValid, message };
    }

    /**
     * Handle Google Drive path change (on blur)
     * @param {string} path - New path value
     */
    handleGoogleDrivePathChange(path) {
        const trimmedPath = path.trim();
        const pathInput = document.getElementById('google-drive-path-input');

        if (pathInput) {
            pathInput.value = trimmedPath;
        }

        this.validateGoogleDrivePath(trimmedPath);
    }

    /**
     * Save Google Drive path
     * @param {string} path - Path to save
     */
    async saveGoogleDrivePath(path) {
        const trimmedPath = path.trim();

        // Validate before saving
        const validation = this.validateGoogleDrivePath(trimmedPath);
        if (!validation.isValid) {
            Utils.showError(validation.message);
            return;
        }

        // Check if path actually changed
        if (this.storageStatus?.google_drive_path === trimmedPath) {
            Utils.showSuccess('路徑未變更');
            return;
        }

        try {
            Utils.showLoading('正在儲存路徑設定...');

            await window.planAPI.updateGoogleDrivePath(trimmedPath);

            // Update local state
            if (this.storageStatus) {
                this.storageStatus.google_drive_path = trimmedPath;
            }

            Utils.hideLoading();
            Utils.showSuccess('Google Drive 路徑已更新');

        } catch (error) {
            Utils.hideLoading();
            console.error('Failed to save Google Drive path:', error);
            Utils.showError('儲存失敗: ' + error.message);
        }
    }

    /**
     * Handle storage mode change
     * @param {string} newMode - New storage mode ('local' or 'google_drive')
     */
    async handleStorageModeChange(newMode) {
        const currentMode = this.storageStatus?.mode || 'local';

        // If no change, do nothing
        if (newMode === currentMode) {
            return;
        }

        // If switching to Google Drive, check auth status
        if (newMode === 'google_drive') {
            if (this.googleAuthStatus?.status !== 'connected') {
                Utils.showError('請先連結 Google 帳號才能切換到 Google Drive 模式');
                // Reset radio button
                this.updateStorageModeUI();
                return;
            }

            // Show confirmation dialog
            if (!await this.confirmStorageModeSwitch('google_drive')) {
                this.updateStorageModeUI();
                return;
            }
        } else if (currentMode === 'google_drive') {
            // Switching from Google Drive to local
            if (!await this.confirmStorageModeSwitch('local')) {
                this.updateStorageModeUI();
                return;
            }
        }

        // Execute mode switch
        await this.executeStorageModeSwitch(newMode);
    }

    /**
     * Confirm storage mode switch
     * @param {string} targetMode - Target storage mode
     * @returns {Promise<boolean>} User confirmation result
     */
    async confirmStorageModeSwitch(targetMode) {
        let message;

        if (targetMode === 'google_drive') {
            message = `確定要切換到 Google Drive 模式嗎？\n\n` +
                `切換後：\n` +
                `• 計畫資料將儲存到 Google Drive\n` +
                `• 需要網路連線才能存取資料\n` +
                `• 現有本地資料不會自動同步`;
        } else {
            message = `確定要切換回本地模式嗎？\n\n` +
                `切換後：\n` +
                `• 計畫資料將儲存在本機\n` +
                `• Google Drive 上的資料不會自動同步到本機`;
        }

        return confirm(message);
    }

    /**
     * Execute storage mode switch
     * @param {string} newMode - New storage mode
     */
    async executeStorageModeSwitch(newMode) {
        try {
            Utils.showLoading('正在切換儲存模式...');

            const googleDrivePath = this.storageStatus?.google_drive_path;
            const result = await window.planAPI.updateStorageMode(newMode, googleDrivePath);

            // Update local state
            this.storageStatus = result;
            this.updateStorageModeUI();
            this.updateStorageUI();

            // Reload all plans to reflect data from new storage mode
            if (window.app && typeof window.app.refreshAllPlans === 'function') {
                await window.app.refreshAllPlans();
            }

            Utils.hideLoading();

            const modeText = newMode === 'google_drive' ? 'Google Drive' : '本地';
            Utils.showSuccess(`已切換到${modeText}模式`);

            // Dispatch event for other components to react
            window.dispatchEvent(new CustomEvent('storage-mode-changed', {
                detail: { mode: newMode, status: result }
            }));

            // 切換到 Google Drive 模式時，自動開啟同步面板並比較
            if (newMode === 'google_drive' && window.syncPanel) {
                if (window.settingsModal) window.settingsModal.hide();
                window.syncPanel.show(true);
            }

        } catch (error) {
            Utils.hideLoading();
            console.error('Storage mode switch failed:', error);

            // Reset UI to current state
            this.updateStorageModeUI();

            // Show appropriate error message
            if (error.message.includes('尚未完全實作')) {
                Utils.showError('Google Drive 功能尚在開發中，敬請期待！');
            } else {
                Utils.showError('切換儲存模式失敗: ' + error.message);
            }
        }
    }

    /**
     * Update storage mode UI
     */
    updateStorageModeUI() {
        const currentMode = this.storageStatus?.mode || 'local';
        const localRadio = document.getElementById('storage-mode-local');
        const googleDriveRadio = document.getElementById('storage-mode-google-drive');

        if (localRadio) {
            localRadio.checked = currentMode === 'local';
        }
        if (googleDriveRadio) {
            googleDriveRadio.checked = currentMode === 'google_drive';
            // Disable Google Drive option if not connected
            const isConnected = this.googleAuthStatus?.status === 'connected';
            googleDriveRadio.disabled = !isConnected;

            const label = document.querySelector('label[for="storage-mode-google-drive"]');
            if (label) {
                if (isConnected) {
                    label.classList.remove('opacity-50', 'cursor-not-allowed');
                } else {
                    label.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }
        }
    }

    /**
     * Handle test connection button click
     */
    async handleTestConnection() {
        try {
            Utils.showLoading('正在測試連線...');

            const result = await window.planAPI.testGoogleDriveConnection();

            Utils.hideLoading();

            if (result.success) {
                const details = result.details || {};
                const message = `✓ ${result.message}\n\n` +
                    `帳號: ${details.user_email || 'N/A'}\n` +
                    `資料夾: ${details.base_folder || 'N/A'}\n` +
                    `檔案數: ${details.file_count || 0}`;
                Utils.showSuccess(message);
            } else {
                this.showGoogleDriveError(result);
            }
        } catch (error) {
            Utils.hideLoading();
            console.error('Connection test failed:', error);
            Utils.showError('連線測試失敗: ' + error.message);
        }
    }

    /**
     * Show Google Drive error with friendly message
     * @param {object} result - Error result from API
     */
    showGoogleDriveError(result) {
        const errorType = result.details?.error_type;
        let message = result.message;
        let suggestion = '';

        switch (errorType) {
            case 'not_connected':
                suggestion = '請先在設定中連結您的 Google 帳號';
                break;
            case 'auth_expired':
                suggestion = '請重新連結 Google 帳號以更新授權';
                break;
            case 'network':
                suggestion = '請檢查您的網路連線後再試';
                break;
            case 'quota_exceeded':
                suggestion = '請稍後再試，或聯繫 Google 了解配額限制';
                break;
            default:
                suggestion = '如果問題持續發生，請嘗試重新連結 Google 帳號';
        }

        Utils.showError(`${message}\n\n${suggestion}`);
    }
}

window.SettingsGoogleSection = SettingsGoogleSection;
