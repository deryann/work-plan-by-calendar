// PanelHeader component - handles header rendering and navigation
class PanelHeader {
    constructor(panel) {
        this.panel = panel;
        this.element = null;
    }

    /**
     * Generate header HTML
     */
    render() {
        return `
            <div class="panel-header">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <!-- Collapse button -->
                        <button class="collapse-btn circular-collapse-btn" title="摺疊/展開">
                            <svg class="w-5 h-5 collapse-icon" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none" class="collapse-circle"></circle>
                                <polyline class="collapse-chevron" points="8,10 12,14 16,10" stroke="currentColor" stroke-width="2" fill="none"></polyline>
                            </svg>
                        </button>
                        
                        <!-- Previous button -->
                        <button class="prev-btn nav-btn" title="前一期">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                        </button>
                        
                        <!-- Title -->
                        <h3 class="panel-title font-semibold flex items-center">
                            <span class="status-indicator"></span>
                            <span class="title-text">${Utils.formatPlanTitle(this.panel.type, this.panel.date)}</span>
                        </h3>
                        
                        <!-- Next button -->
                        <button class="next-btn nav-btn" title="後一期">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <!-- Date picker button -->
                        <button class="date-picker-btn nav-btn" title="選擇日期">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                        
                        <!-- Copy button -->
                        ${!this.panel.isCurrent ? `
                        <button class="copy-btn nav-btn" title="複製到當期計畫">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                            </svg>
                        </button>
                        ` : ''}
                        
                        <!-- Preview toggle button -->
                        <button class="preview-toggle-btn nav-btn" title="預覽/編輯切換">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        
                        <!-- Save button -->
                        <button class="save-btn nav-btn" title="儲存">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Bind header event handlers
     */
    bindEvents(panelElement) {
        this.element = panelElement.querySelector('.panel-header');

        // Collapse/expand button
        panelElement.querySelector('.collapse-btn').addEventListener('click', () => {
            this.panel.toggleCollapse();
        });

        // Navigation buttons
        panelElement.querySelector('.prev-btn').addEventListener('click', () => {
            this.panel.navigateToPrevious();
        });

        panelElement.querySelector('.next-btn').addEventListener('click', () => {
            this.panel.navigateToNext();
        });

        // Preview toggle button
        panelElement.querySelector('.preview-toggle-btn').addEventListener('click', () => {
            this.panel.togglePreview();
        });

        // Save button
        panelElement.querySelector('.save-btn').addEventListener('click', () => {
            this.panel.saveContent();
        });

        // Copy button (if exists)
        const copyBtn = panelElement.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.panel.copyToCurrentPlan();
            });
        }

        // Date picker button
        panelElement.querySelector('.date-picker-btn').addEventListener('click', () => {
            this.panel.showDatePicker();
        });

        // Double-click on title for maximize
        this.bindDoubleClickEvent(panelElement);
    }

    /**
     * Bind double-click event to panel title for maximize toggle
     */
    bindDoubleClickEvent(panelElement) {
        const titleElement = panelElement.querySelector('.panel-title');
        if (titleElement && this.panel.layoutManager) {
            titleElement.title = '雙擊以最大化面板';
            titleElement.addEventListener('dblclick', () => {
                this.panel.toggleMaximize();
            });
        }
    }

    /**
     * Update panel title
     */
    updateTitle(title) {
        const titleElement = this.panel.panelElement.querySelector('.title-text');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Update panel status indicator
     */
    updateStatus(status) {
        const indicator = this.panel.panelElement.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator panel-status-${status}`;
        }
    }

    /**
     * Update save button state
     */
    updateSaveButton(loading) {
        const saveBtn = this.panel.panelElement.querySelector('.save-btn');
        if (saveBtn) {
            if (loading) {
                saveBtn.classList.add('btn-loading');
                saveBtn.disabled = true;
            } else {
                saveBtn.classList.remove('btn-loading');
                saveBtn.disabled = false;
            }
        }
    }
}

window.PanelHeader = PanelHeader;
