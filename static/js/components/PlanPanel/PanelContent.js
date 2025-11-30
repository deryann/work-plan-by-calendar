// PanelContent component - handles content area, editor and preview
class PanelContent {
    constructor(panel) {
        this.panel = panel;
        this.element = null;
        this.editorElement = null;
        this.previewElement = null;
    }

    /**
     * Generate content HTML
     */
    render(isCollapsed) {
        return `
            <div class="panel-content ${isCollapsed ? 'hidden' : ''}">
                <!-- Edit mode -->
                <div class="edit-mode">
                    <div class="markdown-editor-container">
                        <textarea 
                            class="markdown-editor focus:ring-2 focus:ring-blue-500"
                            placeholder="輸入 Markdown 內容..."
                        ></textarea>
                        <div class="vertical-resize-handle" title="拖拉調整高度"></div>
                    </div>
                </div>
                
                <!-- Preview mode -->
                <div class="preview-mode hidden">
                    <div class="markdown-editor-container">
                        <div class="markdown-preview prose max-w-none p-3 rounded-t" style="min-height: 6rem;"></div>
                        <div class="vertical-resize-handle" title="拖拉調整高度"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize content element references
     */
    init(panelElement) {
        this.element = panelElement.querySelector('.panel-content');
        this.editorElement = panelElement.querySelector('.markdown-editor');
        this.previewElement = panelElement.querySelector('.markdown-preview');
    }

    /**
     * Bind content event handlers
     */
    bindEvents() {
        // Content change handler with auto-save
        this.editorElement.addEventListener('input', () => {
            this.panel.onContentChange();
        });

        // Handle Tab key in editor
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
     * Toggle preview mode
     */
    togglePreview(isPreviewMode) {
        const editMode = this.panel.panelElement.querySelector('.edit-mode');
        const previewMode = this.panel.panelElement.querySelector('.preview-mode');
        const previewToggleBtn = this.panel.panelElement.querySelector('.preview-toggle-btn');
        
        if (isPreviewMode) {
            editMode.classList.add('hidden');
            previewMode.classList.remove('hidden');
            previewToggleBtn.classList.add('active');
            this.updatePreview();
            this.panel.resizeHandle.setupPreviewResizeHandle();
        } else {
            editMode.classList.remove('hidden');
            previewMode.classList.add('hidden');
            previewToggleBtn.classList.remove('active');
        }
    }

    /**
     * Update preview content with Highlight.js and Mermaid support
     */
    async updatePreview() {
        const content = this.editorElement.value;
        
        try {
            let html = '';
            
            if (typeof marked !== 'undefined') {
                const renderer = new marked.Renderer();
                
                renderer.code = function(code, lang) {
                    const id = 'code-' + Math.random().toString(36).substr(2, 9);
                    
                    if (lang === 'mermaid') {
                        return `<div class="mermaid-container" data-mermaid-id="${id}" data-mermaid-code="${this.escapeHtml(code)}">
                            <div class="mermaid" id="${id}" style="text-align: center;">${code}</div>
                        </div>`;
                    } else {
                        const languageClass = lang ? ` language-${lang}` : '';
                        return `<pre><code class="hljs${languageClass}" data-lang="${lang || 'plaintext'}">${this.escapeHtml(code)}</code></pre>`;
                    }
                };
                
                renderer.escapeHtml = function(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                };
                
                marked.setOptions({
                    renderer: renderer,
                    gfm: true,
                    breaks: true,
                    pedantic: false,
                    sanitize: false
                });
                
                if (typeof marked.parse === 'function') {
                    html = marked.parse(content);
                } else if (typeof marked === 'function') {
                    html = marked(content);
                }
            } else {
                throw new Error('marked library not loaded');
            }
            
            if (typeof html !== 'string' || html === '[object Object]') {
                throw new Error('Invalid HTML output from marked');
            }
            
            this.previewElement.innerHTML = html;
            await this.processMermaidDiagrams();
            this.applySyntaxHighlighting();
            
        } catch (error) {
            console.warn('Markdown parsing failed, using fallback:', error.message);
            this.applyFallbackRendering(content);
        }
        
        const editorHeight = this.editorElement.offsetHeight;
        this.previewElement.style.minHeight = editorHeight + 'px';
    }
    
    /**
     * Process Mermaid diagrams in the preview
     */
    async processMermaidDiagrams() {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid library not available');
            return;
        }
        
        const mermaidElements = this.previewElement.querySelectorAll('.mermaid');
        
        for (let element of mermaidElements) {
            try {
                const graphDefinition = element.textContent.trim();
                if (graphDefinition) {
                    element.innerHTML = '';
                    const { svg } = await mermaid.render(element.id + '_graph', graphDefinition);
                    element.innerHTML = svg;
                    
                    const container = element.closest('.mermaid-container');
                    if (container) {
                        container.style.margin = '1rem 0';
                        container.style.padding = '1rem';
                        container.style.border = '1px solid var(--color-border)';
                        container.style.borderRadius = '0.5rem';
                        container.style.backgroundColor = 'var(--color-secondary)';
                    }
                }
            } catch (error) {
                console.error('Failed to render Mermaid diagram:', error);
                element.innerHTML = `<div class="error-message" style="color: #ef4444; padding: 1rem; border: 1px solid #ef4444; border-radius: 0.25rem; background-color: #fef2f2;">
                    <strong>Mermaid 渲染錯誤:</strong><br>
                    <code style="font-size: 0.875rem;">${error.message}</code>
                </div>`;
            }
        }
    }
    
    /**
     * Apply syntax highlighting to code blocks
     */
    applySyntaxHighlighting() {
        if (typeof hljs === 'undefined') {
            console.warn('Highlight.js library not available');
            return;
        }
        
        const codeBlocks = this.previewElement.querySelectorAll('pre code');
        
        codeBlocks.forEach(block => {
            try {
                hljs.highlightElement(block);
                this.addCopyButton(block);
            } catch (error) {
                console.warn('Failed to highlight code block:', error);
            }
        });
    }
    
    /**
     * Add copy button to code blocks
     */
    addCopyButton(codeBlock) {
        const pre = codeBlock.parentElement;
        if (pre && !pre.querySelector('.copy-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn absolute top-2 right-2 px-2 py-1 text-xs rounded transition-colors';
            copyBtn.style.backgroundColor = 'var(--color-secondary)';
            copyBtn.style.color = 'var(--color-text-secondary)';
            copyBtn.style.border = '1px solid var(--color-border)';
            copyBtn.textContent = '複製';
            
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                    copyBtn.textContent = '已複製';
                    setTimeout(() => copyBtn.textContent = '複製', 2000);
                }).catch(err => {
                    console.error('Failed to copy code:', err);
                });
            });
            
            pre.style.position = 'relative';
            pre.appendChild(copyBtn);
        }
    }
    
    /**
     * Fallback rendering when libraries are not available
     */
    applyFallbackRendering(content) {
        let html = content
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/`(.*?)`/gim, '<code>$1</code>')
            .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^[\s]*-[\s]+(.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '');
            
        if (html && !html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }
        
        this.previewElement.innerHTML = html;
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
    }
}

window.PanelContent = PanelContent;
