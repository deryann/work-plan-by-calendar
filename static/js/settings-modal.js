// Settings modal component for managing application preferences

class SettingsModal {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.modal = document.getElementById('settings-modal');
        this.isVisible = false;
        this.pendingSettings = null;
        this.googleAuthStatus = null;
        
        this.init();
    }

    /**
     * Initialize modal event listeners
     */
    init() {
        if (!this.modal) {
            console.error('Settings modal element not found');
            return;
        }

        this.bindEvents();
        this.loadCurrentSettings();
        this.loadGoogleAuthStatus();
        
        // Listen for settings updates from the manager
        this.settingsManager.onSettingsUpdated((settings) => {
            this.loadCurrentSettings();
        });
        
        // Listen for Google auth status changes
        if (window.googleAuthManager) {
            window.googleAuthManager.onStatusChange((status) => {
                this.googleAuthStatus = status;
                this.updateGoogleAuthUI();
            });
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.show();
            });
        }

        // Close button
        const closeBtn = document.getElementById('settings-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('settings-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancel();
            });
        }

        // Save button
        const saveBtn = document.getElementById('settings-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.save();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('settings-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.handleExport();
            });
        }

        // Import button  
        const importBtn = document.getElementById('import-data-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('import-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }

        // Import file input
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleImport(e.target.files[0]);
                }
            });
        }

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

        // Panel toggle checkboxes
        const toggles = document.querySelectorAll('.panel-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.onPanelToggleChange(e);
            });
        });

        // Theme mode radio buttons
        const themeRadios = document.querySelectorAll('.theme-mode-radio');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.onThemeModeChange(e);
            });
        });

        // Theme toggle button
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Auto-save enabled toggle
        const autoSaveToggle = document.getElementById('autosave-enabled-toggle');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => {
                this.onAutoSaveEnabledChange(e);
            });
        }

        // Auto-save delay input
        const autoSaveDelayInput = document.getElementById('autosave-delay-input');
        if (autoSaveDelayInput) {
            autoSaveDelayInput.addEventListener('input', (e) => {
                this.onAutoSaveDelayChange(e);
            });
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isVisible) {
                if (e.key === 'Escape') {
                    this.hide();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    this.save();
                }
            }
        });
    }

    /**
     * Show the modal
     */
    show() {
        if (!this.modal) return;

        this.loadCurrentSettings();
        this.modal.classList.remove('hidden');
        this.modal.setAttribute('aria-hidden', 'false');
        this.isVisible = true;
        
        // Focus on the first checkbox for accessibility
        const firstToggle = this.modal.querySelector('.panel-toggle');
        if (firstToggle) {
            firstToggle.focus();
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        if (!this.modal) return;

        this.modal.classList.add('hidden');
        this.modal.setAttribute('aria-hidden', 'true');
        this.isVisible = false;
        this.pendingSettings = null;
    }

    /**
     * Cancel changes and close modal
     */
    cancel() {
        this.loadCurrentSettings(); // Reset to current settings
        this.hide();
    }

    /**
     * Save settings
     */
    async save() {
        if (!this.pendingSettings) {
            Utils.showSuccess('沒有變更需要儲存');
            this.hide();
            return;
        }

        try {
            Utils.showLoading();
            
            await this.settingsManager.saveSettings(this.pendingSettings);
            
            // Apply the new settings to the UI immediately
            this.settingsManager.applyPanelVisibility();
            this.settingsManager.applyTheme();
            
            Utils.showSuccess('設定已儲存');
            this.hide();
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            Utils.showError(`儲存設定失敗: ${error.message}`);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Reset settings to defaults
     */
    async reset() {
        if (!confirm('確定要重設所有設定為預設值嗎？')) {
            return;
        }

        try {
            Utils.showLoading();
            
            await this.settingsManager.resetSettings();
            
            // Reload the modal with default settings
            this.loadCurrentSettings();
            
            // Apply the reset settings to the UI
            this.settingsManager.applyPanelVisibility();
            this.settingsManager.applyTheme();
            
            Utils.showSuccess('設定已重設為預設值');
            
        } catch (error) {
            console.error('Failed to reset settings:', error);
            Utils.showError(`重設設定失敗: ${error.message}`);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Load current settings into the modal form
     */
    loadCurrentSettings() {
        const settings = this.settingsManager.getSettings();
        const uiSettings = settings.ui;

        // Update theme radio buttons
        const themeMode = this.settingsManager.getThemeMode();
        const lightRadio = document.getElementById('theme-light');
        const darkRadio = document.getElementById('theme-dark');
        if (lightRadio && darkRadio) {
            lightRadio.checked = themeMode === 'light';
            darkRadio.checked = themeMode === 'dark';
        }

        // Update checkboxes based on current settings
        const planTypes = ['year', 'month', 'week', 'day'];
        const panelSides = ['left', 'right'];

        for (const side of panelSides) {
            for (const type of planTypes) {
                const checkbox = document.getElementById(`${side}-${type}-toggle`);
                if (checkbox && uiSettings.panels[side]) {
                    checkbox.checked = uiSettings.panels[side][type] || false;
                }
            }
        }

        // Update auto-save settings
        const autoSaveSettings = this.settingsManager.getAutoSaveSettings();
        const autoSaveToggle = document.getElementById('autosave-enabled-toggle');
        const autoSaveDelayInput = document.getElementById('autosave-delay-input');

        if (autoSaveToggle) {
            autoSaveToggle.checked = autoSaveSettings.enabled !== false;
        }
        if (autoSaveDelayInput) {
            autoSaveDelayInput.value = autoSaveSettings.delay || 3;
        }

        // Clear pending settings since we're loading current ones
        this.pendingSettings = null;
    }

    /**
     * Handle panel toggle changes
     */
    onPanelToggleChange(event) {
        const toggle = event.target;
        const panelSide = toggle.dataset.panel;
        const planType = toggle.dataset.type;
        const isChecked = toggle.checked;

        // Create or update pending settings
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }

        // Update the pending setting
        if (!this.pendingSettings.ui.panels[panelSide]) {
            this.pendingSettings.ui.panels[panelSide] = {};
        }
        this.pendingSettings.ui.panels[panelSide][planType] = isChecked;

        console.log(`Panel toggle changed: ${panelSide} ${planType} = ${isChecked}`);
    }

    /**
     * Handle theme mode changes
     */
    onThemeModeChange(event) {
        const radio = event.target;
        const newMode = radio.value;

        // Create or update pending settings
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }

        // Update the pending theme mode
        if (!this.pendingSettings.ui.theme) {
            this.pendingSettings.ui.theme = this.settingsManager.getDefaultSettings().ui.theme;
        }
        this.pendingSettings.ui.theme.mode = newMode;

        console.log(`Theme mode changed to: ${newMode}`);
    }

    /**
     * Toggle theme instantly (for quick toggle button)
     */
    toggleTheme() {
        const newMode = this.settingsManager.toggleTheme();

        // Update the radio buttons to reflect the change
        const lightRadio = document.getElementById('theme-light');
        const darkRadio = document.getElementById('theme-dark');
        if (lightRadio && darkRadio) {
            lightRadio.checked = newMode === 'light';
            darkRadio.checked = newMode === 'dark';
        }

        // Update pending settings if modal is open
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }
        this.pendingSettings.ui.theme.mode = newMode;

        console.log(`Theme toggled to: ${newMode}`);
    }

    /**
     * Handle auto-save enabled toggle change
     */
    onAutoSaveEnabledChange(event) {
        const toggle = event.target;
        const isEnabled = toggle.checked;

        // Create or update pending settings
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }

        // Update the pending auto-save enabled setting
        if (!this.pendingSettings.ui.autoSave) {
            this.pendingSettings.ui.autoSave = this.settingsManager.getDefaultSettings().ui.autoSave;
        }
        this.pendingSettings.ui.autoSave.enabled = isEnabled;

        console.log(`Auto-save enabled changed to: ${isEnabled}`);
    }

    /**
     * Handle auto-save delay input change
     */
    onAutoSaveDelayChange(event) {
        const input = event.target;
        let delay = parseInt(input.value, 10);

        // Validate delay value
        if (isNaN(delay) || delay < 1) {
            delay = 1;
            input.value = 1;
        } else if (delay > 60) {
            delay = 60;
            input.value = 60;
        }

        // Create or update pending settings
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }

        // Update the pending auto-save delay setting
        if (!this.pendingSettings.ui.autoSave) {
            this.pendingSettings.ui.autoSave = this.settingsManager.getDefaultSettings().ui.autoSave;
        }
        this.pendingSettings.ui.autoSave.delay = delay;

        console.log(`Auto-save delay changed to: ${delay} seconds`);
    }

    /**
     * Get modal state for debugging
     */
    getState() {
        return {
            isVisible: this.isVisible,
            hasPendingChanges: !!this.pendingSettings,
            pendingSettings: this.pendingSettings,
            currentSettings: this.settingsManager.getSettings()
        };
    }

    /**
     * Validate form data
     */
    validateFormData() {
        const planTypes = ['year', 'month', 'week', 'day'];
        const panelSides = ['left', 'right'];

        // Check if at least one panel is visible on each side
        for (const side of panelSides) {
            let hasVisiblePanel = false;
            
            for (const type of planTypes) {
                const checkbox = document.getElementById(`${side}-${type}-toggle`);
                if (checkbox && checkbox.checked) {
                    hasVisiblePanel = true;
                    break;
                }
            }

            if (!hasVisiblePanel) {
                const sideName = side === 'left' ? '左側' : '右側';
                Utils.showError(`${sideName}面板至少需要顯示一個計畫類型`);
                return false;
            }
        }

        return true;
    }

    /**
     * Preview settings changes (for future enhancement)
     */
    previewChanges() {
        if (this.pendingSettings) {
            // Temporarily apply settings for preview
            const tempManager = new SettingsManager();
            tempManager.currentSettings = this.pendingSettings;
            tempManager.applyPanelVisibility();
            
            // Add visual indicator that this is a preview
            const panels = document.querySelectorAll('.plan-panel');
            panels.forEach(panel => {
                panel.style.opacity = '0.7';
                panel.style.border = '2px dashed #3B82F6';
            });
            
            // Remove preview after 2 seconds
            setTimeout(() => {
                this.settingsManager.applyPanelVisibility();
                panels.forEach(panel => {
                    panel.style.opacity = '';
                    panel.style.border = '';
                });
            }, 2000);
        }
    }

    /**
     * Handle data export
     */
    async handleExport() {
        try {
            Utils.showLoading('正在匯出資料...');
            
            const result = await window.planAPI.exportData();
            
            Utils.showSuccess(`成功匯出 ${result.file_count} 個檔案`);
            
            // Trigger download
            window.planAPI.downloadExport(result.filename);
            
        } catch (error) {
            console.error('Export failed:', error);
            Utils.showError('匯出失敗: ' + error.message);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Handle data import (placeholder for US2/US3)
     */
    async handleImport(file) {
        if (!file) {
            Utils.showError('請選擇要匯入的 ZIP 檔案');
            return;
        }

        try {
            Utils.showLoading('正在驗證檔案...');

            // 呼叫驗證 API
            const validation = await window.planAPI.validateImport(file);

            Utils.hideLoading();

            // 如果有錯誤,顯示錯誤訊息並中斷
            if (!validation.is_valid) {
                const errorMessages = validation.errors.map(err => 
                    `• ${err.message}`
                ).join('\n');
                
                Utils.showError(
                    `驗證失敗,發現 ${validation.errors.length} 個錯誤:\n\n${errorMessages}\n\n請修正後重新上傳。`
                );
                return;
            }

            // 如果有警告,顯示但不中斷
            if (validation.warnings && validation.warnings.length > 0) {
                const warningMessages = validation.warnings.map(warn => 
                    `• ${warn.message}`
                ).join('\n');
                
                console.warn('驗證警告:', warningMessages);
            }

            // 驗證通過,詢問是否繼續匯入
            const confirmMessage = `驗證通過!\n\n` +
                `檔案數量: ${validation.file_count} 個\n` +
                (validation.warnings?.length > 0 ? `警告: ${validation.warnings.length} 個\n` : '') +
                `\n確定要匯入這些資料嗎?\n(將覆蓋現有的同名檔案)`;

            if (!confirm(confirmMessage)) {
                Utils.showError('已取消匯入');
                return;
            }

            // 執行匯入
            Utils.showLoading('正在匯入資料...');
            
            const importResult = await window.planAPI.executeImport(file);
            
            Utils.hideLoading();
            Utils.showSuccess(
                `${importResult.message}\n\n` +
                `匯入時間: ${new Date(importResult.imported_at).toLocaleString('zh-TW')}`
            );

            // 重新整理頁面以顯示新資料
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            Utils.hideLoading();
            Utils.showError(`匯入失敗: ${error.message}`);
            console.error('Import error:', error);
        }
    }

    // ========================================
    // Google Auth Methods (002-google-drive-storage)
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
    }

    /**
     * Handle Google account connection
     */
    async handleGoogleConnect() {
        try {
            Utils.showLoading('正在連結 Google 帳號...');

            if (!window.googleAuthManager) {
                throw new Error('Google Auth Manager 未初始化');
            }

            const result = await window.googleAuthManager.startAuth();
            
            this.googleAuthStatus = result;
            this.updateGoogleAuthUI();
            
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

            if (window.googleAuthManager) {
                await window.googleAuthManager.logout();
            }

            this.googleAuthStatus = { status: 'not_connected' };
            this.updateGoogleAuthUI();
            
            Utils.hideLoading();
            Utils.showSuccess('已解除 Google 帳號連結');
            
        } catch (error) {
            Utils.hideLoading();
            console.error('Google disconnect failed:', error);
            Utils.showError('解除連結失敗: ' + error.message);
        }
    }
}

// Export for use in other modules
window.SettingsModal = SettingsModal;