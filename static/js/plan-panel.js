// PlanPanel component for work plan calendar system

class PlanPanel {
    constructor(options) {
        this.type = options.type; // year|month|week|day
        this.date = new Date(options.date); // Target date
        this.isCurrent = options.isCurrent || false;
        this.container = options.container;
        this.onSave = options.onSave || (() => {});
        this.onCopy = options.onCopy || (() => {});
        this.onNavigate = options.onNavigate || (() => {});

        // Panel state
        this.isCollapsed = Utils.loadFromStorage(`panel-collapsed-${this.type}`, false);
        this.isPreviewMode = false;
        this.content = '';
        this.originalContent = '';
        this.isModified = false;
        this.isSaving = false;
        this.autoSaveTimeout = null;

        // DOM elements
        this.panelElement = null;
        this.headerElement = null;
        this.contentElement = null;
        this.editorElement = null;
        this.previewElement = null;

        this.init();
    }

    /**
     * Initialize the panel
     */
    init() {
        this.render();
        this.bindEvents();
        this.loadContent();
        this.initializeCollapseState();
    }

    /**
     * Render panel HTML structure
     */
    render() {
        const panelId = `${this.type}-${this.isCurrent ? 'current' : 'history'}-panel`;
        
        this.panelElement = document.createElement('div');
        this.panelElement.className = `plan-panel panel-collapse-transition ${this.isCollapsed ? 'panel-collapsed' : 'panel-expanded'}`;
        this.panelElement.id = panelId;

        this.panelElement.innerHTML = `
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
                        <h3 class="panel-title font-semibold text-gray-800 flex items-center">
                            <span class="status-indicator"></span>
                            <span class="title-text">${Utils.formatPlanTitle(this.type, this.date)}</span>
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
                        ${!this.isCurrent ? `
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
                        <button class="save-btn action-btn" title="儲存">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="panel-content ${this.isCollapsed ? 'hidden' : ''}">
                <!-- Edit mode -->
                <div class="edit-mode">
                    <div class="markdown-editor-container">
                        <textarea 
                            class="markdown-editor w-full h-64 p-3 border-0 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="輸入 Markdown 內容..."
                        ></textarea>
                    </div>
                </div>
                
                <!-- Preview mode -->
                <div class="preview-mode hidden">
                    <div class="markdown-preview prose max-w-none p-3 min-h-64 bg-gray-50 rounded"></div>
                </div>
            </div>
        `;

        // Replace the existing panel or append to container
        if (this.container.querySelector(`#${panelId}`)) {
            this.container.querySelector(`#${panelId}`).replaceWith(this.panelElement);
        } else {
            this.container.appendChild(this.panelElement);
        }

        // Cache DOM elements
        this.headerElement = this.panelElement.querySelector('.panel-header');
        this.contentElement = this.panelElement.querySelector('.panel-content');
        this.editorElement = this.panelElement.querySelector('.markdown-editor');
        this.previewElement = this.panelElement.querySelector('.markdown-preview');
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Collapse/expand button
        this.panelElement.querySelector('.collapse-btn').addEventListener('click', () => {
            this.toggleCollapse();
        });

        // Navigation buttons
        this.panelElement.querySelector('.prev-btn').addEventListener('click', () => {
            this.navigateToPrevious();
        });

        this.panelElement.querySelector('.next-btn').addEventListener('click', () => {
            this.navigateToNext();
        });

        // Preview toggle button
        this.panelElement.querySelector('.preview-toggle-btn').addEventListener('click', () => {
            this.togglePreview();
        });

        // Save button
        this.panelElement.querySelector('.save-btn').addEventListener('click', () => {
            this.saveContent();
        });

        // Copy button (if exists)
        const copyBtn = this.panelElement.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyToCurrentPlan();
            });
        }

        // Date picker button
        this.panelElement.querySelector('.date-picker-btn').addEventListener('click', () => {
            this.showDatePicker();
        });

        // Content change handler with auto-save
        this.editorElement.addEventListener('input', () => {
            this.onContentChange();
        });

        // Prevent form submission on Enter in editor
        this.editorElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                e.target.value = e.target.value.substring(0, start) + '\t' + e.target.value.substring(end);
                e.target.selectionStart = e.target.selectionEnd = start + 1;
            }
        });
    }

    /**
     * Load content from API
     */
    async loadContent() {
        try {
            Utils.showLoading();
            const dateStr = Utils.formatDate(this.date);
            const plan = await planAPI.getPlan(this.type, dateStr);
            
            this.content = plan.content || '';
            this.originalContent = this.content;
            this.editorElement.value = this.content;
            this.updateTitle(plan.title);
            this.updateStatus('saved');
            
            if (this.isPreviewMode) {
                this.updatePreview();
            }
        } catch (error) {
            console.error('Failed to load plan content:', error);
            Utils.showError(`載入${this.type}計畫失敗: ${error.message}`);
            this.updateStatus('error');
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
            this.updateSaveButton(true);
            
            const content = this.editorElement.value;
            const dateStr = Utils.formatDate(this.date);
            
            const plan = await planAPI.updatePlan(this.type, dateStr, content);
            
            this.content = content;
            this.originalContent = content;
            this.isModified = false;
            this.updateTitle(plan.title);
            this.updateStatus('saved');
            
            Utils.showSuccess('計畫已儲存');
            this.onSave(this.type, this.date, plan);
            
        } catch (error) {
            console.error('Failed to save plan:', error);
            Utils.showError(`儲存失敗: ${error.message}`);
            this.updateStatus('error');
        } finally {
            this.isSaving = false;
            this.updateSaveButton(false);
        }
    }

    /**
     * Handle content change
     */
    onContentChange() {
        const currentContent = this.editorElement.value;
        this.isModified = currentContent !== this.originalContent;
        
        if (this.isModified) {
            this.updateStatus('modified');
        } else {
            this.updateStatus('saved');
        }

        // Auto-save with debounce
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            if (this.isModified) {
                this.saveContent();
            }
        }, 3000);

        // Update preview if in preview mode
        if (this.isPreviewMode) {
            this.updatePreview();
        }
    }

    /**
     * Initialize collapse state based on stored preference
     */
    initializeCollapseState() {
        if (this.isCollapsed) {
            const collapseBtn = this.panelElement.querySelector('.collapse-btn');
            const collapseChevron = this.panelElement.querySelector('.collapse-chevron');
            
            this.contentElement.classList.add('hidden');
            this.panelElement.classList.add('panel-collapsed');
            collapseBtn.classList.add('collapsed');
            
            // Set initial collapsed state without animation
            collapseChevron.style.transition = 'none';
            collapseChevron.style.transform = 'rotate(180deg)';
            
            // Re-enable transitions after a brief delay  
            setTimeout(() => {
                collapseChevron.style.transition = '';
            }, 50);
        }
    }

    /**
     * Toggle collapse state
     */
    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        Utils.saveToStorage(`panel-collapsed-${this.type}`, this.isCollapsed);
        
        const collapseBtn = this.panelElement.querySelector('.collapse-btn');
        const collapseChevron = this.panelElement.querySelector('.collapse-chevron');
        
        if (this.isCollapsed) {
            this.contentElement.classList.add('hidden');
            this.panelElement.classList.add('panel-collapsed');
            this.panelElement.classList.remove('panel-expanded');
            collapseBtn.classList.add('collapsed');
            
            // Rotate chevron up (180 degrees)
            collapseChevron.style.transform = 'rotate(180deg)';
        } else {
            this.contentElement.classList.remove('hidden');
            this.panelElement.classList.remove('panel-collapsed');
            this.panelElement.classList.add('panel-expanded');
            collapseBtn.classList.remove('collapsed');
            
            // Rotate chevron back to down (0 degrees)
            collapseChevron.style.transform = 'rotate(0deg)';
        }
    }

    /**
     * Toggle preview mode
     */
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        
        const editMode = this.panelElement.querySelector('.edit-mode');
        const previewMode = this.panelElement.querySelector('.preview-mode');
        const previewToggleBtn = this.panelElement.querySelector('.preview-toggle-btn');
        
        if (this.isPreviewMode) {
            editMode.classList.add('hidden');
            previewMode.classList.remove('hidden');
            previewToggleBtn.classList.add('active');
            this.updatePreview();
        } else {
            editMode.classList.remove('hidden');
            previewMode.classList.add('hidden');
            previewToggleBtn.classList.remove('active');
        }
    }

    /**
     * Update preview content
     */
    updatePreview() {
        const content = this.editorElement.value;
        const html = marked.parse(content);
        this.previewElement.innerHTML = html;
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
        this.updateTitle(Utils.formatPlanTitle(this.type, this.date));
        this.loadContent();
        this.onNavigate(this.type, this.date);
    }

    /**
     * Show date picker
     */
    showDatePicker() {
        // This will be implemented when DatePicker component is ready
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
            const content = this.editorElement.value;
            if (!content.trim()) {
                Utils.showError('沒有內容可複製');
                return;
            }

            // This will trigger the copy functionality
            this.onCopy(this.type, this.date, content);
            Utils.showSuccess('內容已複製到當期計畫');
        } catch (error) {
            console.error('Failed to copy content:', error);
            Utils.showError(`複製失敗: ${error.message}`);
        }
    }

    /**
     * Update panel title
     */
    updateTitle(title) {
        const titleElement = this.panelElement.querySelector('.title-text');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Update panel status
     */
    updateStatus(status) {
        const indicator = this.panelElement.querySelector('.status-indicator');
        indicator.className = `status-indicator panel-status-${status}`;
    }

    /**
     * Update save button state
     */
    updateSaveButton(loading) {
        const saveBtn = this.panelElement.querySelector('.save-btn');
        if (loading) {
            saveBtn.classList.add('btn-loading');
            saveBtn.disabled = true;
        } else {
            saveBtn.classList.remove('btn-loading');
            saveBtn.disabled = false;
        }
    }

    /**
     * Destroy panel
     */
    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        if (this.panelElement) {
            this.panelElement.remove();
        }
    }

    /**
     * Get current content
     */
    getContent() {
        return this.editorElement.value;
    }

    /**
     * Set content
     */
    setContent(content) {
        this.editorElement.value = content;
        this.onContentChange();
    }
}

// Export for use in other modules
window.PlanPanel = PlanPanel;