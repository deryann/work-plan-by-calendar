// PlanCard - main card component for focused layout
// Manages three states: collapsed (preview), expanded (editor), focus (fullscreen)

class PlanCard {
    constructor(options) {
        this.type = options.type; // year|month|week|day
        this.date = new Date(options.date);
        this.container = options.container;
        this.settingsManager = options.settingsManager || null;
        this.onSave = options.onSave || (() => {});
        this.onOpenHistory = options.onOpenHistory || (() => {});

        // Card state
        this.isExpanded = options.expanded || false;
        this.isFocusMode = false;
        this.isPreviewMode = false;
        this.content_data = '';
        this.originalContent = '';
        this.isModified = false;
        this.isSaving = false;
        this.autoSaveTimeout = null;

        // DOM
        this.cardElement = null;

        // Sub-components
        this.header = new CardHeader(this);

        this.init();
    }

    /**
     * Initialize the card
     */
    init() {
        this.render();
        this.bindEvents();
        this.loadContent();
    }

    /**
     * Render card HTML
     */
    render() {
        const cardId = `card-${this.type}`;
        this.cardElement = document.createElement('div');
        this.cardElement.className = 'plan-card';
        this.cardElement.id = cardId;
        this.cardElement.style.cssText = 'border: 1px solid var(--color-border); border-radius: 0.5rem; background: var(--color-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow 0.2s ease, transform 0.2s ease; overflow: hidden;';

        this.cardElement.innerHTML = this.header.render()
            + this.renderPreview()
            + this.renderContent();

        // Replace existing or append
        const existing = this.container.querySelector(`#${cardId}`);
        if (existing) {
            existing.replaceWith(this.cardElement);
        } else {
            this.container.appendChild(this.cardElement);
        }

        // Cache DOM refs
        this.editorElement = this.cardElement.querySelector('.card-editor');
        this.previewElement = this.cardElement.querySelector('.card-markdown-preview');
        this.contentWrapper = this.cardElement.querySelector('.card-content-wrapper');
        this.previewWrapper = this.cardElement.querySelector('.card-preview');

        this.applyExpandState();
    }

    /**
     * Render collapsed preview section
     */
    renderPreview() {
        return `<div class="card-preview" style="color: var(--color-text-secondary); font-size: 0.8125rem; padding: 0 0.75rem 0.625rem; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">（載入中...）</div>`;
    }

    /**
     * Render expanded content section (editor + toolbar)
     */
    renderContent() {
        return `
            <div class="card-content-wrapper" style="display: none;">
                <!-- Toolbar -->
                <div class="card-toolbar" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-border); background: var(--color-primary);">
                    <div style="display: flex; align-items: center; gap: 0.375rem;">
                        <!-- Preview toggle -->
                        <button class="card-preview-toggle nav-btn" title="預覽/編輯切換" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            <span>預覽</span>
                        </button>
                        <!-- Focus mode -->
                        <button class="card-focus-btn nav-btn" title="專注模式（雙擊標題）" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                            </svg>
                            <span>專注</span>
                        </button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.375rem;">
                        <!-- Save button -->
                        <button class="card-save-btn nav-btn" title="儲存 (Ctrl+S)" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                            </svg>
                            <span>儲存</span>
                        </button>
                    </div>
                </div>

                <!-- Edit mode -->
                <div class="card-edit-mode">
                    <textarea
                        class="card-editor"
                        placeholder="輸入 Markdown 內容..."
                        style="width: 100%; min-height: 12rem; padding: 0.75rem; border: none; outline: none; resize: vertical; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 0.875rem; line-height: 1.5; background: var(--color-primary); color: var(--color-text); display: block;"
                    ></textarea>
                </div>

                <!-- Preview mode -->
                <div class="card-preview-mode" style="display: none;">
                    <div class="card-markdown-preview markdown-preview prose max-w-none p-3" style="min-height: 12rem;"></div>
                </div>
            </div>
        `;
    }

    /**
     * Apply expand/collapse state to DOM
     */
    applyExpandState() {
        if (!this.cardElement) return;
        const preview = this.cardElement.querySelector('.card-preview');
        const content = this.contentWrapper;

        if (this.isExpanded) {
            if (preview) {
                preview.classList.add('card-preview-hidden');
                preview.classList.remove('card-preview-visible');
            }
            if (content) {
                content.style.display = '';
                content.classList.remove('card-collapsed');
                content.classList.add('card-expanded');
            }
        } else {
            if (preview) {
                preview.classList.remove('card-preview-hidden');
                preview.classList.add('card-preview-visible');
            }
            if (content) {
                content.classList.remove('card-expanded');
                content.classList.add('card-collapsed');
            }
        }
    }

    /**
     * Bind events
     */
    bindEvents() {
        this.header.bindEvents(this.cardElement);

        // Editor input
        if (this.editorElement) {
            this.editorElement.addEventListener('input', () => {
                this.onContentChange();
            });

            // Tab key support
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

        // Preview toggle
        const previewToggle = this.cardElement.querySelector('.card-preview-toggle');
        if (previewToggle) {
            previewToggle.addEventListener('click', () => this.togglePreview());
        }

        // Save button
        const saveBtn = this.cardElement.querySelector('.card-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveContent());
        }

        // Focus mode button
        const focusBtn = this.cardElement.querySelector('.card-focus-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => this.toggleFocusMode());
        }

        // Hover effect
        this.cardElement.addEventListener('mouseenter', () => {
            if (!this.isFocusMode) {
                this.cardElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }
        });
        this.cardElement.addEventListener('mouseleave', () => {
            if (!this.isFocusMode) {
                this.cardElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }
        });
    }

    /**
     * Toggle expand/collapse
     */
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        this.header.updateChevron(this.isExpanded);
        this.applyExpandState();
        Utils.saveToStorage(`card-expanded-${this.type}`, this.isExpanded);
    }

    /**
     * Open history drawer
     */
    openHistory() {
        this.onOpenHistory(this.type);
    }

    /**
     * Toggle focus (fullscreen) mode
     */
    toggleFocusMode() {
        this.isFocusMode = !this.isFocusMode;

        if (this.isFocusMode) {
            // Ensure expanded
            if (!this.isExpanded) {
                this.isExpanded = true;
                this.header.updateChevron(true);
                this.applyExpandState();
            }
            this.cardElement.classList.add('panel-maximized');
            // Hide other cards
            document.querySelectorAll('.plan-card').forEach(c => {
                if (c !== this.cardElement) {
                    c.classList.add('panel-hidden-by-maximize');
                }
            });
            // Update focus button
            const focusBtn = this.cardElement.querySelector('.card-focus-btn span');
            if (focusBtn) focusBtn.textContent = '退出';
        } else {
            this.cardElement.classList.remove('panel-maximized');
            document.querySelectorAll('.plan-card').forEach(c => {
                c.classList.remove('panel-hidden-by-maximize');
            });
            const focusBtn = this.cardElement.querySelector('.card-focus-btn span');
            if (focusBtn) focusBtn.textContent = '專注';
        }
    }

    /**
     * Toggle preview mode
     */
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        const editMode = this.cardElement.querySelector('.card-edit-mode');
        const previewMode = this.cardElement.querySelector('.card-preview-mode');
        const toggleBtn = this.cardElement.querySelector('.card-preview-toggle');

        if (this.isPreviewMode) {
            editMode.style.display = 'none';
            previewMode.style.display = '';
            toggleBtn.classList.add('active');
            this.updateMarkdownPreview();
        } else {
            editMode.style.display = '';
            previewMode.style.display = 'none';
            toggleBtn.classList.remove('active');
        }
    }

    /**
     * Update markdown preview
     */
    async updateMarkdownPreview() {
        const content = this.editorElement.value;
        try {
            let html = '';
            if (typeof marked !== 'undefined') {
                if (typeof marked.parse === 'function') {
                    html = marked.parse(content);
                } else if (typeof marked === 'function') {
                    html = marked(content);
                }
            }
            if (typeof html !== 'string' || html === '[object Object]') {
                html = Utils.escapeHtml(content).replace(/\n/g, '<br>');
            }
            this.previewElement.innerHTML = html;

            // Syntax highlighting
            if (typeof hljs !== 'undefined') {
                this.previewElement.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightElement(block);
                });
            }

            // Mermaid
            if (typeof mermaid !== 'undefined') {
                const mermaidEls = this.previewElement.querySelectorAll('.mermaid, code.language-mermaid');
                for (const el of mermaidEls) {
                    try {
                        const code = el.textContent.trim();
                        if (code) {
                            const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
                            const { svg } = await mermaid.render(id, code);
                            el.innerHTML = svg;
                        }
                    } catch (e) {
                        console.warn('Mermaid render error:', e);
                    }
                }
            }
        } catch (error) {
            console.warn('Preview render error:', error);
            this.previewElement.innerHTML = Utils.escapeHtml(content).replace(/\n/g, '<br>');
        }
    }

    /**
     * Load content from API
     */
    async loadContent() {
        try {
            const dateStr = Utils.formatDate(this.date);
            const plan = await planAPI.getPlan(this.type, dateStr);

            this.content_data = plan.content || '';
            this.originalContent = this.content_data;

            if (this.editorElement) {
                this.editorElement.value = this.content_data;
            }

            this.header.updateStatus('saved');
            this.updatePreviewText();

        } catch (error) {
            console.error(`Failed to load ${this.type} plan:`, error);
            this.content_data = '';
            this.originalContent = '';
            if (this.editorElement) {
                this.editorElement.value = '';
            }
            this.header.updateStatus('error');
            this.updatePreviewText();
        }
    }

    /**
     * Update the collapsed preview text
     */
    updatePreviewText() {
        const previewEl = this.cardElement.querySelector('.card-preview');
        if (previewEl) {
            const previewText = CardPreview.getPreview(this.content_data);
            previewEl.textContent = previewText;
        }
    }

    /**
     * Handle content change
     */
    onContentChange() {
        const currentContent = this.editorElement.value;
        this.isModified = currentContent !== this.originalContent;
        this.header.updateStatus(this.isModified ? 'modified' : 'saved');

        // Update preview text for collapsed state
        this.content_data = currentContent;
        this.updatePreviewText();

        // Auto-save
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

        // Update live preview if in preview mode
        if (this.isPreviewMode) {
            this.updateMarkdownPreview();
        }
    }

    /**
     * Save content to API
     */
    async saveContent() {
        if (this.isSaving) return;

        try {
            this.isSaving = true;
            const content = this.editorElement.value;
            const dateStr = Utils.formatDate(this.date);

            const plan = await planAPI.updatePlan(this.type, dateStr, content);

            this.content_data = content;
            this.originalContent = content;
            this.isModified = false;
            this.header.updateStatus('saved');

            this.onSave(this.type, this.date, plan);

        } catch (error) {
            console.error('Failed to save:', error);
            Utils.showError(`儲存失敗: ${error.message}`);
            this.header.updateStatus('error');
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Update card for new date
     */
    async updateDate(newDate) {
        this.date = new Date(newDate);
        // Re-render header date display
        const headerEl = this.cardElement.querySelector('.card-header');
        if (headerEl) {
            const dateSpan = headerEl.querySelectorAll('span')[2]; // third span = date
            if (dateSpan) {
                dateSpan.textContent = this.header.getDateDisplay();
            }
        }
        await this.loadContent();
    }

    /**
     * Destroy card
     */
    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        if (this.cardElement) {
            this.cardElement.remove();
        }
    }
}

window.PlanCard = PlanCard;
