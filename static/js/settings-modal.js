// Settings modal component for managing application preferences

class SettingsModal {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.modal = document.getElementById('settings-modal');
        this.isVisible = false;
        this.pendingSettings = null;

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

        // Listen for settings updates from the manager
        this.settingsManager.onSettingsUpdated(() => {
            this.loadCurrentSettings();
        });

        // Initialize sub-sections (event binding handled internally)
        this.dataSection = new SettingsDataSection();
        this.googleSection = new SettingsGoogleSection();
        this.googleSection.init();
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
     * Initialize pendingSettings from current saved settings (if not already set)
     */
    _initPendingSettings() {
        if (!this.pendingSettings) {
            this.pendingSettings = JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
        }
    }

    /**
     * Set all radio inputs in a named group to match the given value
     * @param {string} name - The radio group name attribute
     * @param {string} value - The value to select
     */
    _setRadioGroup(name, value) {
        document.querySelectorAll(`input[name="${name}"]`)
            .forEach(radio => { radio.checked = radio.value === value; });
    }

    /**
     * Load current settings into the modal form
     */
    loadCurrentSettings() {
        const settings = this.settingsManager.getSettings();
        const uiSettings = settings.ui;

        // Update theme and layout mode radio buttons
        this._setRadioGroup('theme-mode', this.settingsManager.getThemeMode());
        this._setRadioGroup('layout-mode', this.settingsManager.getLayoutMode());

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

        this._initPendingSettings();

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

        this._initPendingSettings();

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
        this._setRadioGroup('theme-mode', newMode);

        // Update pending settings if modal is open
        this._initPendingSettings();
        this.pendingSettings.ui.theme.mode = newMode;

        console.log(`Theme toggled to: ${newMode}`);
    }

    /**
     * Handle auto-save enabled toggle change
     */
    onAutoSaveEnabledChange(event) {
        const toggle = event.target;
        const isEnabled = toggle.checked;

        this._initPendingSettings();

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

        this._initPendingSettings();

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
        this._initPendingSettings();
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
        this._initPendingSettings();
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

}

// Export for use in other modules
window.SettingsModal = SettingsModal;