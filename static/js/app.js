// Main application controller for work plan calendar system

class WorkPlanApp {
    constructor() {
        this.currentDate = new Date();
        this.layoutManager = null;
        this.datePicker = null;
        this.settingsManager = null;
        this.settingsModal = null;
        this.historyDrawer = null;
        this.layoutMode = 'focused'; // 'focused' or 'classic'

        // Panels storage - works for both layouts
        this.panels = {
            history: {},
            current: {}
        };
        // Cards storage for focused layout
        this.cards = {};

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

            if (this.layoutMode === 'focused') {
                await this.loadCards();
            } else {
                await this.loadCurrentPlans();
                await this.loadHistoryPlans();
            }

            this.updateDateDisplay();
            this.updateBreadcrumb();
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

        // Determine layout mode from settings manager
        this.layoutMode = this.settingsManager.getLayoutMode();

        // Apply initial theme
        try {
            this.settingsManager.applyTheme();
        } catch (error) {
            console.warn('Failed to apply theme during initialization:', error);
        }

        // Initialize settings modal
        this.settingsModal = new SettingsModal(this.settingsManager);

        // Initialize sync panel (Issue #19)
        this.syncPanel = new SyncPanel();
        window.syncPanel = this.syncPanel;

        // Initialize sync diff modal (diff view for DIFFERENT files)
        this.syncDiffModal = new SyncDiffModal();
        window.syncDiffModal = this.syncDiffModal;

        // Initialize calendar modal
        this.calendarModal = new CalendarModal(this);

        // Initialize layout based on mode
        if (this.layoutMode === 'focused') {
            this.layoutManager = new FocusedLayout();
            // Show focused layout elements, hide classic
            this.showFocusedLayout();
        } else {
            this.layoutManager = new LayoutManager();
            // Show classic layout elements, hide focused
            this.showClassicLayout();
        }

        // Initialize date picker
        this.datePicker = new DatePicker({
            currentDate: this.currentDate,
            onDateSelect: async (date) => {
                await this.setCurrentDate(date);
            }
        });

        // Setup main date picker
        this.setupMainDatePicker();

        // Initialize storage mode indicator
        this.initializeStorageModeIndicator();

        // Initialize history drawer (focused mode only)
        if (this.layoutMode === 'focused') {
            this.historyDrawer = new HistoryDrawer(this);
        }

        // Listen for settings changes
        this.settingsManager.onSettingsUpdated((settings) => {
            this.onSettingsUpdated(settings);
        });

        // Listen for storage mode changes
        window.addEventListener('storage-mode-changed', (e) => {
            this.updateStorageModeIndicator(e.detail.mode);
        });
    }

    /**
     * Show focused layout DOM, hide classic
     */
    showFocusedLayout() {
        const focusedContainer = document.getElementById('focused-container');
        const classicContainer = document.getElementById('classic-container');
        const breadcrumb = document.getElementById('breadcrumb-nav');
        const layoutToggleBtn = document.getElementById('layout-toggle-btn');

        if (focusedContainer) focusedContainer.style.display = '';
        if (classicContainer) classicContainer.style.display = 'none';
        if (breadcrumb) breadcrumb.style.display = '';
        if (layoutToggleBtn) layoutToggleBtn.style.display = 'none';
    }

    /**
     * Show classic layout DOM, hide focused
     */
    showClassicLayout() {
        const focusedContainer = document.getElementById('focused-container');
        const classicContainer = document.getElementById('classic-container');
        const breadcrumb = document.getElementById('breadcrumb-nav');
        const layoutToggleBtn = document.getElementById('layout-toggle-btn');

        if (focusedContainer) focusedContainer.style.display = 'none';
        if (classicContainer) classicContainer.style.display = '';
        if (breadcrumb) breadcrumb.style.display = 'none';
        if (layoutToggleBtn) layoutToggleBtn.style.display = '';
    }

    /**
     * Switch layout mode
     */
    async switchLayout(mode) {
        if (mode === this.layoutMode) return;

        // Save any unsaved changes first
        if (this.hasUnsavedChanges()) {
            await this.saveAllModifiedPanels();
        }

        this.layoutMode = mode;
        this.settingsManager.setLayoutMode(mode);

        // Reload page to apply new layout
        window.location.reload();
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

        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '您有未儲存的變更，確定要離開嗎？';
                return e.returnValue;
            }
        });

        // Initialize hotkeys modal
        this.initializeHotkeysModal();

        // Initialize header theme toggle
        this.initializeHeaderThemeToggle();

        // Layout mode switch button
        const layoutModeBtn = document.getElementById('layout-mode-btn');
        if (layoutModeBtn) {
            layoutModeBtn.addEventListener('click', () => {
                const newMode = this.layoutMode === 'focused' ? 'classic' : 'focused';
                this.switchLayout(newMode);
            });
        }
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

        // Handle Escape key
        if (e.key === 'Escape') {
            // Close history drawer first if open
            if (this.historyDrawer && this.historyDrawer.isOpen) {
                this.historyDrawer.close();
                return;
            }
            // Exit focus mode if active
            if (this.layoutMode === 'focused') {
                const focusedCard = Object.values(this.cards).find(c => c && c.isFocusMode);
                if (focusedCard) {
                    focusedCard.toggleFocusMode();
                    return;
                }
            }
            this.hideHotkeysModal();
            return;
        }

        // Number keys 1-4 to jump to cards (focused layout only, not in text inputs)
        if (this.layoutMode === 'focused' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
            const tag = e.target.tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
            if (!isInput && e.key >= '1' && e.key <= '4') {
                e.preventDefault();
                this.jumpToCard(parseInt(e.key));
                return;
            }
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveAllModifiedPanels();
                    break;
                case '\\':
                    e.preventDefault();
                    if (this.layoutMode === 'classic') {
                        this.layoutManager.toggleLeftPanel();
                    }
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

    // ========================================
    // Focused Layout Methods
    // ========================================

    /**
     * Load all cards (focused layout)
     */
    async loadCards() {
        const cardOrder = this.settingsManager.getCardOrder();
        const cardStack = document.getElementById('card-stack');
        if (!cardStack) return;

        for (const planType of cardOrder) {
            await this.loadCard(planType);
        }
    }

    /**
     * Load a single card
     */
    async loadCard(planType) {
        const cardStack = document.getElementById('card-stack');
        if (!cardStack) return;

        // Destroy existing card
        if (this.cards[planType]) {
            this.cards[planType].destroy();
        }

        // Determine if expanded (day is expanded by default)
        const defaultExpanded = planType === 'day';
        const isExpanded = Utils.loadFromStorage(`card-expanded-${planType}`, defaultExpanded);

        this.cards[planType] = new PlanCard({
            type: planType,
            date: Utils.getCanonicalDate(planType, this.currentDate),
            container: cardStack,
            expanded: isExpanded,
            settingsManager: this.settingsManager,
            onSave: (type, date, plan) => {
                this.onPlanSaved(type, date, plan, true);
            },
            onOpenHistory: (type) => {
                if (this.historyDrawer) {
                    this.historyDrawer.open(type);
                }
            }
        });
    }

    /**
     * Reload a card after copy
     */
    async reloadCard(planType) {
        if (this.cards[planType]) {
            await this.cards[planType].updateDate(
                Utils.getCanonicalDate(planType, this.currentDate)
            );
        }
    }

    /**
     * Jump to card by number (1-4)
     */
    jumpToCard(num) {
        const cardOrder = this.settingsManager.getCardOrder();
        const targetType = cardOrder[num - 1];
        if (!targetType) return;

        const card = this.cards[targetType];
        if (!card || !card.cardElement) return;

        // Expand if collapsed
        if (!card.isExpanded) {
            card.toggleExpand();
        }

        // Scroll into view
        card.cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Focus editor
        if (card.editorElement) {
            card.editorElement.focus();
        }
    }

    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb() {
        const d = dayjs(this.currentDate);
        const yearEl = document.getElementById('bc-year');
        const monthEl = document.getElementById('bc-month');
        const weekEl = document.getElementById('bc-week');
        const dayEl = document.getElementById('bc-day');

        if (yearEl) yearEl.textContent = d.format('YYYY');
        if (monthEl) monthEl.textContent = `${d.format('M')}月`;

        if (weekEl) {
            const weekStart = Utils.getWeekStart(this.currentDate);
            const weekEnd = Utils.getWeekEnd(this.currentDate);
            weekEl.textContent = `${dayjs(weekStart).format('MM/DD')}~${dayjs(weekEnd).format('MM/DD')}`;
        }

        if (dayEl) {
            const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
            dayEl.textContent = `${d.format('M/D')}(${dayNames[d.day()]})`;
        }
    }

    // ========================================
    // Classic Layout Methods (preserved)
    // ========================================

    /**
     * Set current date and reload plans
     */
    async setCurrentDate(date) {
        this.currentDate = new Date(date);
        this.updateDateDisplay();
        this.updateMainDatePicker();
        this.updateBreadcrumb();

        if (this.layoutMode === 'focused') {
            // Update all cards
            for (const [planType, card] of Object.entries(this.cards)) {
                if (card) {
                    await card.updateDate(Utils.getCanonicalDate(planType, this.currentDate));
                }
            }
        } else {
            await this.loadCurrentPlans();
            await this.loadHistoryPlans();
        }
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
     * Load current plans (classic layout - right panel)
     */
    async loadCurrentPlans() {
        const planTypes = ['year', 'month', 'week', 'day'];
        for (const planType of planTypes) {
            await this.loadCurrentPlan(planType);
        }
    }

    /**
     * Load specific current plan (classic layout)
     */
    async loadCurrentPlan(planType) {
        let existingPanel = null;
        try {
            const container = document.getElementById(`${planType}-current-panel`);
            if (!container) return;

            existingPanel = this.panels.current[planType];

            const newPanel = new PlanPanel({
                type: planType,
                date: Utils.getCanonicalDate(planType, this.currentDate),
                isCurrent: true,
                container: container.parentElement,
                layoutManager: this.layoutManager,
                settingsManager: this.settingsManager,
                onSave: (type, date, plan) => {
                    this.onPlanSaved(type, date, plan, true);
                },
                onNavigate: (type, date) => {
                    this.onPlanNavigated(type, date, true);
                }
            });

            if (existingPanel) {
                existingPanel.destroy();
            }

            this.panels.current[planType] = newPanel;

            if (this.settingsManager) {
                const visible = this.settingsManager.getPanelVisibility('right', planType);
                const panelElement = document.getElementById(`${planType}-current-panel`);
                if (panelElement) {
                    panelElement.style.display = visible ? '' : 'none';
                    panelElement.classList.toggle('settings-hidden', !visible);
                }
            }

        } catch (error) {
            console.error(`Failed to load current ${planType} plan:`, error);
            Utils.showError(`載入當期${planType}計畫失敗: ${error.message}`);
            if (existingPanel && this.panels.current[planType] !== existingPanel) {
                this.panels.current[planType] = existingPanel;
            }
        }
    }

    /**
     * Load history plans (classic layout - left panel)
     */
    async loadHistoryPlans() {
        const planTypes = ['year', 'month', 'week', 'day'];
        for (const planType of planTypes) {
            await this.loadHistoryPlan(planType);
        }
    }

    /**
     * Load specific history plan (classic layout)
     */
    async loadHistoryPlan(planType) {
        let existingPanel = null;
        try {
            const container = document.getElementById(`${planType}-history-panel`);
            if (!container) return;

            const previousDate = Utils.getPreviousPeriod(planType, this.currentDate);
            existingPanel = this.panels.history[planType];

            const newPanel = new PlanPanel({
                type: planType,
                date: Utils.getCanonicalDate(planType, previousDate),
                isCurrent: false,
                container: container.parentElement,
                layoutManager: this.layoutManager,
                settingsManager: this.settingsManager,
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

            if (existingPanel) {
                existingPanel.destroy();
            }

            this.panels.history[planType] = newPanel;

            if (this.settingsManager) {
                const visible = this.settingsManager.getPanelVisibility('left', planType);
                const panelElement = document.getElementById(`${planType}-history-panel`);
                if (panelElement) {
                    panelElement.style.display = visible ? '' : 'none';
                    panelElement.classList.toggle('settings-hidden', !visible);
                }
            }

        } catch (error) {
            console.error(`Failed to load history ${planType} plan:`, error);
            Utils.showError(`載入歷史${planType}計畫失敗: ${error.message}`);
            if (existingPanel && this.panels.history[planType] !== existingPanel) {
                this.panels.history[planType] = existingPanel;
            }
        }
    }

    // ========================================
    // Shared Methods
    // ========================================

    onPlanSaved(planType, date, plan, isCurrent) {
        console.log(`Plan saved: ${planType}, ${Utils.formatDate(date)}, current: ${isCurrent}`);
    }

    onPlanNavigated(planType, date, isCurrent) {
        console.log(`Plan navigated: ${planType}, ${Utils.formatDate(date)}, current: ${isCurrent}`);
        const panel = isCurrent ? this.panels.current[planType] : this.panels.history[planType];
        if (panel) {
            panel.updateTitle(Utils.formatPlanTitle(planType, date));
        }
    }

    async onPlanCopied(planType, sourceDate, content) {
        try {
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

            if (this.layoutMode === 'focused') {
                await this.reloadCard(planType);
            } else {
                await Promise.all([
                    this.loadCurrentPlan(planType),
                    this.loadHistoryPlan(planType)
                ]);
            }

            Utils.showSuccess(`${planType}計畫內容已複製到當期`);

        } catch (error) {
            console.error('Failed to copy plan content:', error);
            Utils.showError(`複製計畫內容失敗: ${error.message}`);
        }
    }

    async saveAllModifiedPanels() {
        let modifiedItems = [];

        if (this.layoutMode === 'focused') {
            modifiedItems = Object.values(this.cards).filter(c => c && c.isModified);
        } else {
            const allPanels = [...Object.values(this.panels.current), ...Object.values(this.panels.history)];
            modifiedItems = allPanels.filter(p => p && p.isModified);
        }

        if (modifiedItems.length === 0) {
            Utils.showSuccess('沒有需要儲存的變更');
            return;
        }

        try {
            for (const item of modifiedItems) {
                await item.saveContent();
            }
            Utils.showSuccess(`已儲存 ${modifiedItems.length} 個計畫`);
        } catch (error) {
            console.error('Failed to save all:', error);
            Utils.showError(`批量儲存失敗: ${error.message}`);
        }
    }

    hasUnsavedChanges() {
        if (this.layoutMode === 'focused') {
            return Object.values(this.cards).some(c => c && c.isModified);
        }
        const allPanels = [...Object.values(this.panels.current), ...Object.values(this.panels.history)];
        return allPanels.some(p => p && p.isModified);
    }

    async refreshAllPlans() {
        try {
            Utils.showLoading();
            if (this.layoutMode === 'focused') {
                await this.loadCards();
            } else {
                await this.loadCurrentPlans();
                await this.loadHistoryPlans();
            }
            Utils.showSuccess('所有計畫已重新載入');
        } catch (error) {
            console.error('Failed to refresh plans:', error);
            Utils.showError(`重新載入失敗: ${error.message}`);
        } finally {
            Utils.hideLoading();
        }
    }

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

    getStatus() {
        return {
            currentDate: this.currentDate,
            layoutMode: this.layoutMode,
            hasUnsavedChanges: this.hasUnsavedChanges(),
            layoutInfo: this.layoutManager.getLayoutInfo()
        };
    }

    // ========================================
    // UI Helpers
    // ========================================

    initializeHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        const closeBtn = document.getElementById('hotkeys-modal-close');
        if (!modal || !closeBtn) return;

        closeBtn.addEventListener('click', () => this.hideHotkeysModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideHotkeysModal();
        });
    }

    initializeHeaderThemeToggle() {
        const themeToggleBtn = document.getElementById('header-theme-toggle');
        if (!themeToggleBtn) return;

        themeToggleBtn.addEventListener('click', () => {
            const newMode = this.settingsManager.toggleTheme();
            this.updateThemeToggleIcon(themeToggleBtn, newMode);
            Utils.showSuccess(`已切換為${newMode === 'light' ? '淺色' : '深色'}模式`);
        });

        this.updateThemeToggleIcon(themeToggleBtn, this.settingsManager.getThemeMode());
    }

    updateThemeToggleIcon(button, mode) {
        const svg = button.querySelector('svg');
        if (!svg) return;

        if (mode === 'dark') {
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
            button.title = '切換為淺色模式';
        } else {
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
            button.title = '切換為深色模式';
        }
    }

    toggleHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        if (!modal) return;
        modal.classList.contains('hidden') ? this.showHotkeysModal() : this.hideHotkeysModal();
    }

    showHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        modal.focus();
    }

    hideHotkeysModal() {
        const modal = document.getElementById('hotkeys-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    onSettingsUpdated(settings) {
        try {
            if (this.layoutMode === 'classic') {
                this.settingsManager.applyPanelVisibility();
                this.reloadVisiblePanels();
            }
        } catch (error) {
            console.error('Error applying settings updates:', error);
        }
    }

    async reloadVisiblePanels() {
        if (this.layoutMode !== 'classic') return;
        const planTypes = ['year', 'month', 'week', 'day'];

        for (const planType of planTypes) {
            if (this.settingsManager.getPanelVisibility('left', planType)) {
                const el = document.getElementById(`${planType}-history-panel`);
                if (el && el.style.display !== 'none') {
                    await this.loadHistoryPlan(planType);
                }
            }
            if (this.settingsManager.getPanelVisibility('right', planType)) {
                const el = document.getElementById(`${planType}-current-panel`);
                if (el && el.style.display !== 'none') {
                    await this.loadCurrentPlan(planType);
                }
            }
        }
    }

    getSettingsManager() { return this.settingsManager; }
    getSettingsModal() { return this.settingsModal; }

    // ========================================
    // Storage Mode Indicator
    // ========================================

    async initializeStorageModeIndicator() {
        try {
            const status = await window.planAPI.getStorageStatus();
            this.updateStorageModeIndicator(status.mode);
        } catch (error) {
            console.warn('Failed to load storage mode:', error);
            this.updateStorageModeIndicator('local');
        }
    }

    updateStorageModeIndicator(mode) {
        const indicator = document.getElementById('storage-mode-indicator');
        if (!indicator) return;

        const icon = indicator.querySelector('.storage-mode-icon');
        const text = indicator.querySelector('.storage-mode-text');

        if (mode === 'google_drive') {
            indicator.classList.remove('storage-local');
            indicator.classList.add('storage-cloud');
            indicator.title = '雲端儲存模式';
            if (icon) {
                icon.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>`;
            }
            if (text) text.textContent = '雲端';
        } else {
            indicator.classList.remove('storage-cloud');
            indicator.classList.add('storage-local');
            indicator.title = '本地儲存模式';
            if (icon) {
                icon.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>`;
            }
            if (text) text.textContent = '本地';
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    dayjs.extend(dayjs_plugin_weekOfYear);
    dayjs.extend(dayjs_plugin_isoWeek);

    window.app = new WorkPlanApp();

    console.log('Work Plan Calendar Application initialized');
    console.log('Access via window.app for debugging');
});

window.WorkPlanApp = WorkPlanApp;
