// Settings modal component for managing application preferences

class SettingsModal {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.modal = document.getElementById('settings-modal');
        this.isVisible = false;
        this.pendingSettings = null;
        this.googleAuthStatus = null;
        this.storageStatus = null;
        
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
        this.loadStorageStatus();
        
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
        // Tab navigation
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.settings-tab').dataset.tab);
            });
        });

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

        // Google Drive path input (002-google-drive-storage)
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

        // Test connection button (T085)
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.handleTestConnection();
            });
        }

        // Storage mode radio buttons (002-google-drive-storage)
        const storageModeRadios = document.querySelectorAll('.storage-mode-radio');
        storageModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleStorageModeChange(e.target.value);
            });
        });

        // Layout mode radio buttons
        const layoutModeRadios = document.querySelectorAll('.layout-mode-radio');
        layoutModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.onLayoutModeChange(e.target.value);
            });
        });

        // Initialize card order drag-and-drop
        this.initCardOrderDrag();

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
        
        // Reset to first tab when opening modal
        this.switchTab('appearance');
        
        // Focus on the first toggle for accessibility
        const firstToggle = this.modal.querySelector('.settings-tab-content.active .panel-toggle, .settings-tab-content.active input[type="radio"]');
        if (firstToggle) {
            firstToggle.focus();
        }
    }

    /**
     * Switch between settings tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
                tab.style.borderBottom = '2px solid var(--color-accent)';
                tab.style.color = 'var(--color-accent)';
            } else {
                tab.classList.remove('active');
                tab.style.borderBottom = '2px solid transparent';
                tab.style.color = 'var(--color-text-secondary)';
            }
        });

        // Update tab content
        const contents = document.querySelectorAll('.settings-tab-content');
        contents.forEach(content => {
            const contentTabName = content.id.replace('settings-tab-', '');
            if (contentTabName === tabName) {
                content.style.display = 'block';
                content.classList.add('active');
            } else {
                content.style.display = 'none';
                content.classList.remove('active');
            }
        });
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

            // Check if layout mode or card order changed
            const layoutChanged = this.pendingSettings.layout &&
                this.pendingSettings.layout.mode !== this.settingsManager.getLayoutMode();
            const cardOrderChanged = this.pendingSettings.layout &&
                JSON.stringify(this.pendingSettings.layout.cardOrder) !==
                JSON.stringify(this.settingsManager.getCardOrder());

            // Apply layout settings immediately to localStorage
            if (this.pendingSettings.layout) {
                if (this.pendingSettings.layout.mode) {
                    this.settingsManager.setLayoutMode(this.pendingSettings.layout.mode);
                }
                if (this.pendingSettings.layout.cardOrder) {
                    this.settingsManager.setCardOrder(this.pendingSettings.layout.cardOrder);
                }
            }

            await this.settingsManager.saveSettings(this.pendingSettings);

            // Apply the new settings to the UI immediately
            this.settingsManager.applyPanelVisibility();
            this.settingsManager.applyTheme();

            Utils.showSuccess('設定已儲存');
            this.hide();

            // Reload if layout changed
            if (layoutChanged || cardOrderChanged) {
                setTimeout(() => window.location.reload(), 500);
            }

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

        // Update layout mode radio buttons
        const layoutMode = this.settingsManager.getLayoutMode();
        const focusedRadio = document.getElementById('layout-mode-focused');
        const classicRadio = document.getElementById('layout-mode-classic');
        if (focusedRadio && classicRadio) {
            focusedRadio.checked = layoutMode === 'focused';
            classicRadio.checked = layoutMode === 'classic';
        }

        // Update card order list
        this.renderCardOrderList();

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

    // ========================================
    // Layout Settings Methods
    // ========================================

    /**
     * Handle layout mode change
     */
    onLayoutModeChange(mode) {
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }
        if (!this.pendingSettings.layout) {
            this.pendingSettings.layout = this.settingsManager.getDefaultSettings().layout;
        }
        this.pendingSettings.layout.mode = mode;
    }

    /**
     * Render card order list
     */
    renderCardOrderList() {
        const list = document.getElementById('card-order-list');
        if (!list) return;

        const order = this.settingsManager.getCardOrder();
        const labels = { day: '日計畫', week: '週計畫', month: '月計畫', year: '年計畫' };

        list.innerHTML = order.map((type, idx) => `
            <div class="card-order-item" draggable="true" data-type="${type}" data-index="${idx}">
                <span class="drag-handle">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
                    </svg>
                </span>
                <span class="text-sm font-medium" style="color: var(--color-text);">${labels[type] || type}</span>
                <span class="ml-auto text-xs" style="color: var(--color-text-secondary);">${idx + 1}</span>
            </div>
        `).join('');

        this.bindCardOrderDragEvents();
    }

    /**
     * Initialize card order drag-and-drop
     */
    initCardOrderDrag() {
        // Initial render is done in loadCurrentSettings
    }

    /**
     * Bind drag events to card order items
     */
    bindCardOrderDragEvents() {
        const list = document.getElementById('card-order-list');
        if (!list) return;

        let draggedItem = null;

        list.querySelectorAll('.card-order-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                if (draggedItem) draggedItem.classList.remove('dragging');
                draggedItem = null;
                // Update order from DOM
                this.updateCardOrderFromDOM();
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (draggedItem && draggedItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        list.insertBefore(draggedItem, item);
                    } else {
                        list.insertBefore(draggedItem, item.nextSibling);
                    }
                }
            });
        });
    }

    /**
     * Update card order from current DOM order
     */
    updateCardOrderFromDOM() {
        const list = document.getElementById('card-order-list');
        if (!list) return;

        const newOrder = Array.from(list.querySelectorAll('.card-order-item'))
            .map(item => item.dataset.type);

        // Update index labels
        list.querySelectorAll('.card-order-item').forEach((item, idx) => {
            const indexLabel = item.querySelector('.ml-auto');
            if (indexLabel) indexLabel.textContent = idx + 1;
        });

        // Store in pending settings
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }
        if (!this.pendingSettings.layout) {
            this.pendingSettings.layout = this.settingsManager.getDefaultSettings().layout;
        }
        this.pendingSettings.layout.cardOrder = newOrder;
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

        // Update storage UI when auth status changes
        this.updateStorageUI();
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
    // Storage Settings Methods (002-google-drive-storage)
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
        const saveBtn = document.getElementById('save-google-drive-path-btn');
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
            
            const result = await window.planAPI.updateGoogleDrivePath(trimmedPath);
            
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
     * Handle test connection button click (T085)
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
     * Show Google Drive error with friendly message (T086-T087)
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

// Export for use in other modules
window.SettingsModal = SettingsModal;