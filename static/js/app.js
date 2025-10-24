// Main application controller for work plan calendar system

class WorkPlanApp {
    constructor() {
        this.currentDate = new Date();
        this.layoutManager = null;
        this.datePicker = null;
        this.settingsManager = null;
        this.settingsModal = null;
        this.panels = {
            history: {},
            current: {}
        };
        
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            await this.checkAPIHealth();
            await this.initializeComponents();
            this.bindGlobalEvents();
            await this.loadCurrentPlans();
            await this.loadHistoryPlans();
            this.updateDateDisplay();
            
            // Panel visibility is now applied immediately after each panel creation
            // No need for additional applyPanelVisibility call
            
            Utils.showSuccess('應用程式已載入完成');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            Utils.showError(`應用程式初始化失敗: ${error.message}`);
        }
    }

    /**
     * Check API health
     */
    async checkAPIHealth() {
        try {
            await planAPI.healthCheck();
        } catch (error) {
            throw new Error('無法連接到後端服務，請確認服務器是否正在運行');
        }
    }

    /**
     * Initialize components
     */
    async initializeComponents() {
        // Initialize settings manager first
        this.settingsManager = new SettingsManager();
        await this.settingsManager.init();
        
        // Apply initial theme after settings are loaded
        try {
            this.settingsManager.applyTheme();
        } catch (error) {
            console.warn('Failed to apply theme during initialization:', error);
            // Continue with app initialization even if theme fails
        }

        // Initialize settings modal
        this.settingsModal = new SettingsModal(this.settingsManager);

        // Initialize layout manager
        this.layoutManager = new LayoutManager();

        // Initialize date picker
        this.datePicker = new DatePicker({
            currentDate: this.currentDate,
            onDateSelect: async (date) => {
                await this.setCurrentDate(date);
            }
        });

        // Setup main date picker
        this.setupMainDatePicker();

        // Listen for settings changes
        this.settingsManager.onSettingsUpdated((settings) => {
            console.log('Settings updated:', settings);
            // Reload panels if needed when settings change
            this.onSettingsUpdated(settings);
        });
    }

    /**
     * Setup main date picker
     */
    setupMainDatePicker() {
        const mainDatePicker = document.getElementById('main-date-picker');
        if (mainDatePicker) {
            mainDatePicker.value = Utils.formatDate(this.currentDate);
            mainDatePicker.addEventListener('change', async (e) => {
                const newDate = Utils.parseDate(e.target.value);
                await this.setCurrentDate(newDate);
            });
        }
    }

    /**
     * Bind global events
     */
    bindGlobalEvents() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboardShortcuts(e);
        });

        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.layoutManager.updateLayout();
        }, 250));

        // Before unload warning if there are unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '您有未儲存的變更，確定要離開嗎？';
                return e.returnValue;
            }
        });

        // Initialize hotkeys modal event listeners
        this.initializeHotkeysModal();
        
        // Initialize header theme toggle button
        this.initializeHeaderThemeToggle();
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeyboardShortcuts(e) {
        // Handle Ctrl+Shift+H for hotkeys modal
        if (e.ctrlKey && e.shiftKey && e.key === 'H') {
            e.preventDefault();
            this.toggleHotkeysModal();
            return;
        }
        
        // Handle Escape key to close hotkeys modal
        if (e.key === 'Escape') {
            this.hideHotkeysModal();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveAllModifiedPanels();
                    break;
                case '\\':
                    e.preventDefault();
                    this.layoutManager.toggleLeftPanel();
                    break;
                case 'ArrowLeft':
                    if (e.altKey) {
                        e.preventDefault();
                        this.navigateDate(-1);
                    }
                    break;
                case 'ArrowRight':
                    if (e.altKey) {
                        e.preventDefault();
                        this.navigateDate(1);
                    }
                    break;
            }
        }
    }

    /**
     * Set current date and reload plans
     */
    async setCurrentDate(date) {
        this.currentDate = new Date(date);
        this.updateDateDisplay();
        this.updateMainDatePicker();
        await this.loadCurrentPlans();
        await this.loadHistoryPlans();
        
        // Panel visibility is now applied immediately after each panel creation
        // No need for additional setTimeout delay
    }

    /**
     * Navigate date by days
     */
    async navigateDate(days) {
        const newDate = dayjs(this.currentDate).add(days, 'day').toDate();
        await this.setCurrentDate(newDate);
    }

    /**
     * Update date display
     */
    updateDateDisplay() {
        const display = document.getElementById('current-date-display');
        if (display) {
            display.textContent = dayjs(this.currentDate).format('YYYY年MM月DD日 dddd');
        }
    }

    /**
     * Update main date picker value
     */
    updateMainDatePicker() {
        const mainDatePicker = document.getElementById('main-date-picker');
        if (mainDatePicker) {
            mainDatePicker.value = Utils.formatDate(this.currentDate);
        }
    }

    /**
     * Load current plans (right panel)
     */
    async loadCurrentPlans() {
        const planTypes = ['year', 'month', 'week', 'day'];
        
        for (const planType of planTypes) {
            await this.loadCurrentPlan(planType);
        }
    }

    /**
     * Load specific current plan
     */
    async loadCurrentPlan(planType) {
        let existingPanel = null;
        try {
            const container = document.getElementById(`${planType}-current-panel`);
            if (!container) return;

            // Store existing panel before destroying it
            existingPanel = this.panels.current[planType];

            // Create new panel
            const newPanel = new PlanPanel({
                type: planType,
                date: Utils.getCanonicalDate(planType, this.currentDate),
                isCurrent: true,
                container: container.parentElement,
                layoutManager: this.layoutManager, // Pass layoutManager reference
                onSave: (type, date, plan) => {
                    this.onPlanSaved(type, date, plan, true);
                },
                onNavigate: (type, date) => {
                    this.onPlanNavigated(type, date, true);
                }
            });

            // Only destroy the old panel after successful creation
            if (existingPanel) {
                existingPanel.destroy();
            }
            
            this.panels.current[planType] = newPanel;

            // Immediately apply visibility settings for this panel
            if (this.settingsManager) {
                const visible = this.settingsManager.getPanelVisibility('right', planType);
                const panelElement = document.getElementById(`${planType}-current-panel`);
                if (panelElement) {
                    if (visible) {
                        panelElement.style.display = '';
                        panelElement.classList.remove('settings-hidden');
                    } else {
                        panelElement.style.display = 'none';
                        panelElement.classList.add('settings-hidden');
                    }
                }
            }

        } catch (error) {
            console.error(`Failed to load current ${planType} plan:`, error);
            Utils.showError(`載入當期${planType}計畫失敗: ${error.message}`);
            
            // If panel creation failed, keep the existing panel
            if (existingPanel && this.panels.current[planType] !== existingPanel) {
                this.panels.current[planType] = existingPanel;
            }
        }
    }

    /**
     * Load history plans (left panel)
     */
    async loadHistoryPlans() {
        const planTypes = ['year', 'month', 'week', 'day'];
        
        for (const planType of planTypes) {
            await this.loadHistoryPlan(planType);
        }
    }

    /**
     * Load specific history plan
     */
    async loadHistoryPlan(planType) {
        let existingPanel = null;
        try {
            const container = document.getElementById(`${planType}-history-panel`);
            if (!container) return;

            // Get previous period date
            const previousDate = Utils.getPreviousPeriod(planType, this.currentDate);

            // Store existing panel before destroying it
            existingPanel = this.panels.history[planType];

            // Create new panel
            const newPanel = new PlanPanel({
                type: planType,
                date: Utils.getCanonicalDate(planType, previousDate),
                isCurrent: false,
                container: container.parentElement,
                layoutManager: this.layoutManager, // Pass layoutManager reference
                onSave: (type, date, plan) => {
                    this.onPlanSaved(type, date, plan, false);
                },
                onCopy: (type, date, content) => {
                    this.onPlanCopied(type, date, content);
                },
                onNavigate: (type, date) => {
                    this.onPlanNavigated(type, date, false);
                }
            });

            // Only destroy the old panel after successful creation
            if (existingPanel) {
                existingPanel.destroy();
            }
            
            this.panels.history[planType] = newPanel;

            // Immediately apply visibility settings for this panel
            if (this.settingsManager) {
                const visible = this.settingsManager.getPanelVisibility('left', planType);
                const panelElement = document.getElementById(`${planType}-history-panel`);
                if (panelElement) {
                    if (visible) {
                        panelElement.style.display = '';
                        panelElement.classList.remove('settings-hidden');
                    } else {
                        panelElement.style.display = 'none';
                        panelElement.classList.add('settings-hidden');
                    }
                }
            }

        } catch (error) {
            console.error(`Failed to load history ${planType} plan:`, error);
            Utils.showError(`載入歷史${planType}計畫失敗: ${error.message}`);
            
            // If panel creation failed, keep the existing panel
            if (existingPanel && this.panels.history[planType] !== existingPanel) {
                this.panels.history[planType] = existingPanel;
            }
        }
    }

    /**
     * Handle plan saved event
     */
    onPlanSaved(planType, date, plan, isCurrent) {
        console.log(`Plan saved: ${planType}, ${Utils.formatDate(date)}, current: ${isCurrent}`);
        
        // Could trigger additional actions like:
        // - Updating other related panels
        // - Sending notifications
        // - Updating navigation state
    }

    /**
     * Handle plan navigation event
     */
    onPlanNavigated(planType, date, isCurrent) {
        console.log(`Plan navigated: ${planType}, ${Utils.formatDate(date)}, current: ${isCurrent}`);
        
        // Update the corresponding panel's date display
        const panel = isCurrent ? this.panels.current[planType] : this.panels.history[planType];
        if (panel) {
            panel.updateTitle(Utils.formatPlanTitle(planType, date));
        }
    }

    /**
     * Handle plan content copied event
     */
    async onPlanCopied(planType, sourceDate, content) {
        try {
            // Copy to corresponding current plan
            const targetDate = Utils.getCanonicalDate(planType, this.currentDate);
            
            const copyRequest = {
                source_type: planType,
                source_date: Utils.formatDate(sourceDate),
                target_type: planType,
                target_date: Utils.formatDate(targetDate),
                content: content,
                mode: 'append'
            };

            await planAPI.copyContent(copyRequest);
            
            // Reload both current and history panels to ensure consistency
            await Promise.all([
                this.loadCurrentPlan(planType),
                this.loadHistoryPlan(planType)
            ]);
            
            Utils.showSuccess(`${planType}計畫內容已複製到當期`);
            
        } catch (error) {
            console.error('Failed to copy plan content:', error);
            Utils.showError(`複製計畫內容失敗: ${error.message}`);
            
            // On error, attempt to reload panels to recover state
            try {
                await Promise.all([
                    this.loadCurrentPlan(planType),
                    this.loadHistoryPlan(planType)
                ]);
            } catch (reloadError) {
                console.error('Failed to reload panels after copy error:', reloadError);
                Utils.showError('面板狀態異常，請重新整理頁面');
            }
        }
    }

    /**
     * Save all modified panels
     */
    async saveAllModifiedPanels() {
        const allPanels = [...Object.values(this.panels.current), ...Object.values(this.panels.history)];
        const modifiedPanels = allPanels.filter(panel => panel && panel.isModified);
        
        if (modifiedPanels.length === 0) {
            Utils.showSuccess('沒有需要儲存的變更');
            return;
        }

        try {
            Utils.showLoading();
            
            for (const panel of modifiedPanels) {
                await panel.saveContent();
            }
            
            Utils.showSuccess(`已儲存 ${modifiedPanels.length} 個計畫`);
            
        } catch (error) {
            console.error('Failed to save all panels:', error);
            Utils.showError(`批量儲存失敗: ${error.message}`);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        const allPanels = [...Object.values(this.panels.current), ...Object.values(this.panels.history)];
        return allPanels.some(panel => panel && panel.isModified);
    }

    /**
     * Refresh all plans
     */
    async refreshAllPlans() {
        try {
            Utils.showLoading();
            await this.loadCurrentPlans();
            await this.loadHistoryPlans();
            Utils.showSuccess('所有計畫已重新載入');
        } catch (error) {
            console.error('Failed to refresh plans:', error);
            Utils.showError(`重新載入失敗: ${error.message}`);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Export current date plans
     */
    async exportPlans() {
        try {
            const allPlans = await planAPI.getAllPlansForDate(Utils.formatDate(this.currentDate));
            
            let exportContent = `# ${Utils.formatDate(this.currentDate)} 計畫匯出\n\n`;
            
            const planTypes = ['year', 'month', 'week', 'day'];
            for (const planType of planTypes) {
                const plan = allPlans.plans[planType];
                if (plan && plan.content) {
                    exportContent += `## ${plan.title}\n\n${plan.content}\n\n---\n\n`;
                }
            }

            // Create download link
            const blob = new Blob([exportContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `plans-${Utils.formatDate(this.currentDate)}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showSuccess('計畫已匯出');
            
        } catch (error) {
            console.error('Failed to export plans:', error);
            Utils.showError(`匯出失敗: ${error.message}`);
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            currentDate: this.currentDate,
            hasUnsavedChanges: this.hasUnsavedChanges(),
            activePanels: Object.keys(this.panels.current).length + Object.keys(this.panels.history).length,
            layoutInfo: this.layoutManager.getLayoutInfo()
        };
    }

    /**
     * Initialize hotkeys modal event listeners
     */
    initializeHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        const closeBtn = document.getElementById('hotkeys-modal-close');
        
        if (!modal || !closeBtn) return;

        // Close button click handler
        closeBtn.addEventListener('click', () => {
            this.hideHotkeysModal();
        });

        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideHotkeysModal();
            }
        });
    }

    /**
     * Initialize header theme toggle button
     */
    initializeHeaderThemeToggle() {
        const themeToggleBtn = document.getElementById('header-theme-toggle');
        
        if (!themeToggleBtn) return;
        
        // Theme toggle click handler
        themeToggleBtn.addEventListener('click', () => {
            const newMode = this.settingsManager.toggleTheme();
            this.updateThemeToggleIcon(themeToggleBtn, newMode);
            Utils.showSuccess(`已切換為${newMode === 'light' ? '淺色' : '深色'}模式`);
        });
        
        // Initialize icon based on current theme
        this.updateThemeToggleIcon(themeToggleBtn, this.settingsManager.getThemeMode());
    }

    /**
     * Update theme toggle button icon
     */
    updateThemeToggleIcon(button, mode) {
        const svg = button.querySelector('svg');
        if (!svg) return;
        
        if (mode === 'dark') {
            // Sun icon for light mode toggle
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
            button.title = '切換為淺色模式';
        } else {
            // Moon icon for dark mode toggle
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
            button.title = '切換為深色模式';
        }
    }

    /**
     * Toggle hotkeys modal visibility
     */
    toggleHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        if (!modal) return;

        if (modal.classList.contains('hidden')) {
            this.showHotkeysModal();
        } else {
            this.hideHotkeysModal();
        }
    }

    /**
     * Show hotkeys modal
     */
    showHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus on the modal for accessibility
        modal.focus();
    }

    /**
     * Hide hotkeys modal
     */
    hideHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        if (!modal) return;

        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    /**
     * Handle settings updates
     */
    onSettingsUpdated(settings) {
        try {
            // Apply panel visibility immediately
            this.settingsManager.applyPanelVisibility();
            
            // Optionally reload panels that became visible
            this.reloadVisiblePanels();
            
        } catch (error) {
            console.error('Error applying settings updates:', error);
            Utils.showError('套用設定時發生錯誤');
        }
    }

    /**
     * Reload panels that are now visible
     */
    async reloadVisiblePanels() {
        const planTypes = ['year', 'month', 'week', 'day'];
        
        for (const planType of planTypes) {
            // Check if left panel is visible and reload if needed
            if (this.settingsManager.getPanelVisibility('left', planType)) {
                const leftPanelElement = document.getElementById(`${planType}-history-panel`);
                if (leftPanelElement && leftPanelElement.style.display !== 'none') {
                    await this.loadHistoryPlan(planType);
                }
            }
            
            // Check if right panel is visible and reload if needed
            if (this.settingsManager.getPanelVisibility('right', planType)) {
                const rightPanelElement = document.getElementById(`${planType}-current-panel`);
                if (rightPanelElement && rightPanelElement.style.display !== 'none') {
                    await this.loadCurrentPlan(planType);
                }
            }
        }
    }

    /**
     * Get settings manager instance
     */
    getSettingsManager() {
        return this.settingsManager;
    }

    /**
     * Get settings modal instance
     */
    getSettingsModal() {
        return this.settingsModal;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Configure Day.js plugins
    dayjs.extend(dayjs_plugin_weekOfYear);
    dayjs.extend(dayjs_plugin_isoWeek);
    
    // Initialize the application
    window.app = new WorkPlanApp();
    
    // Make app globally accessible for debugging
    console.log('Work Plan Calendar Application initialized');
    console.log('Access via window.app for debugging');
});

// Export for use in other modules
window.WorkPlanApp = WorkPlanApp;