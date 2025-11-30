// PlanPanel main component - orchestrates all sub-components
// Import sub-components (loaded via script tags in HTML)
// - PanelHeader
// - PanelContent
// - ResizeHandle
// - CollapseManager
// - MaximizeManager

class PlanPanel {
    constructor(options) {
        this.type = options.type; // year|month|week|day
        this.date = new Date(options.date);
        this.isCurrent = options.isCurrent || false;
        this.container = options.container;
        this.onSave = options.onSave || (() => {});
        this.onCopy = options.onCopy || (() => {});
        this.onNavigate = options.onNavigate || (() => {});
        this.layoutManager = options.layoutManager || null;
        this.settingsManager = options.settingsManager || null;

        // Panel state
        this.isCollapsed = Utils.loadFromStorage(`panel-collapsed-${this.type}`, false);
        this.isPreviewMode = false;
        this.isMaximized = false;
        this.content_data = '';
        this.originalContent = '';
        this.isModified = false;
        this.isSaving = false;
        this.autoSaveTimeout = null;

        // DOM elements
        this.panelElement = null;

        // Initialize sub-components
        this.header = new PanelHeader(this);
        this.content = new PanelContent(this);
        this.resizeHandle = new ResizeHandle(this);
        this.collapseManager = new CollapseManager(this);
        this.maximizeManager = new MaximizeManager(this);

        this.init();
    }

    /**
     * Initialize the panel
     */
    init() {
        this.render();
        this.bindEvents();
        this.loadContent();
        this.collapseManager.initializeCollapseState();
    }

    /**
     * Render panel HTML structure
     */
    render() {
        const panelId = `${this.type}-${this.isCurrent ? 'current' : 'history'}-panel`;
        
        this.panelElement = document.createElement('div');
        this.panelElement.className = `plan-panel panel-collapse-transition ${this.isCollapsed ? 'panel-collapsed' : 'panel-expanded'}`;
        this.panelElement.id = panelId;

        this.panelElement.innerHTML = this.header.render() + this.content.render(this.isCollapsed);

        // Replace the existing panel or append to container
        if (this.container.querySelector(`#${panelId}`)) {
            this.container.querySelector(`#${panelId}`).replaceWith(this.panelElement);
        } else {
            this.container.appendChild(this.panelElement);
        }

        // Initialize sub-component element references
        this.content.init(this.panelElement);
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        this.header.bindEvents(this.panelElement);
        this.content.bindEvents();
        this.resizeHandle.setupResizeHandler();
        this.resizeHandle.setupVerticalResizeHandle();
    }

    /**
     * Load content from API
     */
    async loadContent() {
        try {
            Utils.showLoading();
            const dateStr = Utils.formatDate(this.date);
            const plan = await planAPI.getPlan(this.type, dateStr);
            
            this.content_data = plan.content || '';
            this.originalContent = this.content_data;
            
            if (this.content.editorElement) {
                this.content.editorElement.value = this.content_data;
            }
            
            this.header.updateTitle(plan.title);
            this.header.updateStatus('saved');
            
            if (this.isPreviewMode) {
                this.content.updatePreview();
            }
        } catch (error) {
            console.error('Failed to load plan content:', error);
            Utils.showError(`載入${this.type}計畫失敗: ${error.message}`);
            this.header.updateStatus('error');
            
            this.content_data = '';
            this.originalContent = '';
            if (this.content.editorElement) {
                this.content.editorElement.value = '';
            }
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Save content to API
     */
    async saveContent() {
        if (this.isSaving) return;

        try {
            this.isSaving = true;
            this.header.updateSaveButton(true);
            
            const content = this.content.editorElement.value;
            const dateStr = Utils.formatDate(this.date);
            
            const plan = await planAPI.updatePlan(this.type, dateStr, content);
            
            this.content_data = content;
            this.originalContent = content;
            this.isModified = false;
            this.header.updateTitle(plan.title);
            this.header.updateStatus('saved');
            
            Utils.showSuccess('計畫已儲存');
            this.onSave(this.type, this.date, plan);
            
        } catch (error) {
            console.error('Failed to save plan:', error);
            Utils.showError(`儲存失敗: ${error.message}`);
            this.header.updateStatus('error');
        } finally {
            this.isSaving = false;
            this.header.updateSaveButton(false);
        }
    }

    /**
     * Handle content change
     */
    onContentChange() {
        const currentContent = this.content.editorElement.value;
        this.isModified = currentContent !== this.originalContent;

        if (this.isModified) {
            this.header.updateStatus('modified');
        } else {
            this.header.updateStatus('saved');
        }

        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        const autoSaveSettings = this.settingsManager
            ? this.settingsManager.getAutoSaveSettings()
            : { enabled: true, delay: 3 };

        if (autoSaveSettings.enabled) {
            const delayMs = (autoSaveSettings.delay || 3) * 1000;

            this.autoSaveTimeout = setTimeout(() => {
                if (this.isModified) {
                    this.saveContent();
                }
            }, delayMs);
        }

        if (this.isPreviewMode) {
            this.content.updatePreview();
        }
    }

    /**
     * Toggle collapse state (delegate to CollapseManager)
     */
    toggleCollapse() {
        this.collapseManager.toggleCollapse();
    }

    /**
     * Toggle preview mode
     */
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        this.content.togglePreview(this.isPreviewMode);
    }

    /**
     * Toggle maximize state (delegate to MaximizeManager)
     */
    toggleMaximize() {
        this.maximizeManager.toggleMaximize();
    }

    /**
     * Navigate to previous period
     */
    navigateToPrevious() {
        const previousDate = Utils.getPreviousPeriod(this.type, this.date);
        this.navigateToDate(previousDate);
    }

    /**
     * Navigate to next period
     */
    navigateToNext() {
        const nextDate = Utils.getNextPeriod(this.type, this.date);
        this.navigateToDate(nextDate);
    }

    /**
     * Navigate to specific date
     */
    navigateToDate(newDate) {
        this.date = newDate;
        this.header.updateTitle(Utils.formatPlanTitle(this.type, this.date));
        this.loadContent();
        this.onNavigate(this.type, this.date);
    }

    /**
     * Show date picker
     */
    showDatePicker() {
        const dateStr = prompt('請輸入日期 (YYYY-MM-DD):', Utils.formatDate(this.date));
        if (dateStr) {
            try {
                const newDate = Utils.parseDate(dateStr);
                this.navigateToDate(newDate);
            } catch (error) {
                Utils.showError('日期格式錯誤');
            }
        }
    }

    /**
     * Copy content to current plan
     */
    async copyToCurrentPlan() {
        try {
            if (this.isModified) {
                await this.saveContent();
            }

            let contentToCopy;
            const selectionStart = this.content.editorElement.selectionStart;
            const selectionEnd = this.content.editorElement.selectionEnd;
            
            if (selectionStart !== selectionEnd) {
                contentToCopy = this.content.editorElement.value.substring(selectionStart, selectionEnd);
            } else {
                contentToCopy = this.content.editorElement.value;
            }

            if (!contentToCopy.trim()) {
                Utils.showError('沒有內容可複製');
                return;
            }

            const copyBtn = this.panelElement.querySelector('.copy-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            copyBtn.disabled = true;

            try {
                this.onCopy(this.type, this.date, contentToCopy);
            } finally {
                setTimeout(() => {
                    if (copyBtn) {
                        copyBtn.innerHTML = originalText;
                        copyBtn.disabled = false;
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to copy content:', error);
            Utils.showError(`複製失敗: ${error.message}`);
        }
    }

    /**
     * Destroy panel
     */
    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.resizeHandle.destroy();
        
        if (this.panelElement) {
            this.panelElement.remove();
        }
    }

    /**
     * Get current content
     */
    getContent() {
        return this.content.getContent();
    }

    /**
     * Set content
     */
    setContent(content) {
        this.content.setContent(content);
        this.onContentChange();
    }
}

window.PlanPanel = PlanPanel;
