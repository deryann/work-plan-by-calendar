// Markdown editor component with syntax highlighting

class MarkdownEditor {
    constructor(options) {
        this.container = options.container;
        this.onChange = options.onChange || (() => {});
        this.content = options.content || '';
        this.placeholder = options.placeholder || '輸入 Markdown 內容...';
        
        this.editor = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize markdown editor
     */
    init() {
        this.createEditor();
        this.bindEvents();
        this.isInitialized = true;
    }

    /**
     * Create editor HTML
     */
    createEditor() {
        this.container.innerHTML = `
            <div class="markdown-editor-wrapper relative w-full h-full">
                <textarea 
                    class="markdown-editor w-full h-full p-3 border-0 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="${this.placeholder}"
                >${this.content}</textarea>
                
                <div class="editor-toolbar absolute top-2 right-2 flex space-x-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button class="toolbar-btn bold-btn p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded" title="粗體 (Ctrl+B)">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4v12h5.5c2.5 0 4.5-1.5 4.5-3.5 0-1.2-.7-2.3-1.8-2.8C12.3 9.2 13 8.2 13 7c0-2-2-3-4.5-3H3zm3 2h2.5c.8 0 1.5.7 1.5 1.5S9.3 9 8.5 9H6V6zm0 5h3c1.1 0 2 .9 2 2s-.9 2-2 2H6v-4z"/>
                        </svg>
                    </button>
                    
                    <button class="toolbar-btn italic-btn p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded" title="斜體 (Ctrl+I)">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 4h8v2h-2.5l-2 8H14v2H6v-2h2.5l2-8H8V4z"/>
                        </svg>
                    </button>
                    
                    <button class="toolbar-btn header-btn p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded" title="標題 (Ctrl+H)">
                        H
                    </button>
                    
                    <button class="toolbar-btn list-btn p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded" title="清單 (Ctrl+L)">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4h2v2H3V4zm4 0h10v2H7V4zM3 8h2v2H3V8zm4 0h10v2H7V8zm-4 4h2v2H3v-2zm4 0h10v2H7v-2z"/>
                        </svg>
                    </button>
                    
                    <button class="toolbar-btn link-btn p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded" title="連結 (Ctrl+K)">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        this.editor = this.container.querySelector('.markdown-editor');
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Content change handler
        this.editor.addEventListener('input', () => {
            this.content = this.editor.value;
            this.onChange(this.content);
        });

        // Keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Toolbar button handlers
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('toolbar-btn') || e.target.closest('.toolbar-btn')) {
                const btn = e.target.classList.contains('toolbar-btn') ? e.target : e.target.closest('.toolbar-btn');
                this.handleToolbarClick(btn);
            }
        });

        // Tab handling for indentation
        this.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertText('\t');
            }
        });

        // Auto-close brackets and quotes
        this.editor.addEventListener('keydown', (e) => {
            this.handleAutoClose(e);
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.toggleBold();
                    break;
                case 'i':
                    e.preventDefault();
                    this.toggleItalic();
                    break;
                case 'h':
                    e.preventDefault();
                    this.toggleHeader();
                    break;
                case 'l':
                    e.preventDefault();
                    this.toggleList();
                    break;
                case 'k':
                    e.preventDefault();
                    this.insertLink();
                    break;
            }
        }
    }

    /**
     * Handle toolbar button clicks
     */
    handleToolbarClick(button) {
        if (button.classList.contains('bold-btn')) {
            this.toggleBold();
        } else if (button.classList.contains('italic-btn')) {
            this.toggleItalic();
        } else if (button.classList.contains('header-btn')) {
            this.toggleHeader();
        } else if (button.classList.contains('list-btn')) {
            this.toggleList();
        } else if (button.classList.contains('link-btn')) {
            this.insertLink();
        }
    }

    /**
     * Handle auto-close for brackets and quotes
     */
    handleAutoClose(e) {
        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'",
            '`': '`'
        };

        if (pairs[e.key]) {
            const selection = this.getSelection();
            if (selection.text) {
                // Wrap selected text
                e.preventDefault();
                this.wrapSelection(e.key, pairs[e.key]);
            } else if (e.key === '"' || e.key === "'" || e.key === '`') {
                // Auto-close quotes only if not already closed
                const before = this.editor.value.substring(0, selection.start);
                const after = this.editor.value.substring(selection.start);
                
                if (!after.startsWith(e.key)) {
                    e.preventDefault();
                    this.insertText(e.key + pairs[e.key]);
                    this.setCursor(selection.start + 1);
                }
            }
        }
    }

    /**
     * Toggle bold formatting
     */
    toggleBold() {
        this.wrapSelection('**', '**');
    }

    /**
     * Toggle italic formatting
     */
    toggleItalic() {
        this.wrapSelection('*', '*');
    }

    /**
     * Toggle header formatting
     */
    toggleHeader() {
        const selection = this.getSelection();
        const lines = this.getSelectedLines();
        
        let newText = lines.map(line => {
            if (line.startsWith('# ')) {
                return line.substring(2);
            } else if (line.startsWith('## ')) {
                return '# ' + line.substring(3);
            } else if (line.startsWith('### ')) {
                return '## ' + line.substring(4);
            } else {
                return '# ' + line;
            }
        }).join('\n');

        this.replaceSelection(newText);
    }

    /**
     * Toggle list formatting
     */
    toggleList() {
        const lines = this.getSelectedLines();
        
        let newText = lines.map(line => {
            if (line.startsWith('- ')) {
                return line.substring(2);
            } else {
                return '- ' + line;
            }
        }).join('\n');

        this.replaceSelection(newText);
    }

    /**
     * Insert link
     */
    insertLink() {
        const selection = this.getSelection();
        const text = selection.text || '連結文字';
        const url = prompt('請輸入連結網址:', 'https://');
        
        if (url) {
            this.replaceSelection(`[${text}](${url})`);
        }
    }

    /**
     * Insert text at cursor position
     */
    insertText(text) {
        const selection = this.getSelection();
        const before = this.editor.value.substring(0, selection.start);
        const after = this.editor.value.substring(selection.end);
        
        this.editor.value = before + text + after;
        this.setCursor(selection.start + text.length);
        this.onChange(this.editor.value);
    }

    /**
     * Wrap selection with prefix and suffix
     */
    wrapSelection(prefix, suffix) {
        const selection = this.getSelection();
        if (selection.text) {
            this.replaceSelection(prefix + selection.text + suffix);
        } else {
            this.insertText(prefix + suffix);
            this.setCursor(selection.start + prefix.length);
        }
    }

    /**
     * Replace current selection with new text
     */
    replaceSelection(newText) {
        const selection = this.getSelection();
        const before = this.editor.value.substring(0, selection.start);
        const after = this.editor.value.substring(selection.end);
        
        this.editor.value = before + newText + after;
        this.setCursor(selection.start + newText.length);
        this.onChange(this.editor.value);
    }

    /**
     * Get current selection
     */
    getSelection() {
        return {
            start: this.editor.selectionStart,
            end: this.editor.selectionEnd,
            text: this.editor.value.substring(this.editor.selectionStart, this.editor.selectionEnd)
        };
    }

    /**
     * Get selected lines
     */
    getSelectedLines() {
        const selection = this.getSelection();
        const before = this.editor.value.substring(0, selection.start);
        const after = this.editor.value.substring(selection.end);
        
        const lineStart = before.lastIndexOf('\n') + 1;
        const lineEnd = after.indexOf('\n');
        const lineEndPos = lineEnd === -1 ? this.editor.value.length : selection.end + lineEnd;
        
        const fullSelection = this.editor.value.substring(lineStart, lineEndPos);
        return fullSelection.split('\n');
    }

    /**
     * Set cursor position
     */
    setCursor(position) {
        this.editor.selectionStart = position;
        this.editor.selectionEnd = position;
        this.editor.focus();
    }

    /**
     * Get editor content
     */
    getValue() {
        return this.editor.value;
    }

    /**
     * Set editor content
     */
    setValue(content) {
        this.editor.value = content;
        this.content = content;
    }

    /**
     * Focus editor
     */
    focus() {
        this.editor.focus();
    }

    /**
     * Destroy editor
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use in other modules
window.MarkdownEditor = MarkdownEditor;