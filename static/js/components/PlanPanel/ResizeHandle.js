// ResizeHandle component - handles vertical resize functionality
class ResizeHandle {
    constructor(panel) {
        this.panel = panel;
        this.resizeObserver = null;
        this.resizeCheckInterval = null;
    }

    /**
     * Setup resize handler for textarea and container synchronization
     */
    setupResizeHandler() {
        const container = this.panel.panelElement.querySelector('.markdown-editor-container');
        const editorElement = this.panel.content.editorElement;
        
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    if (entry.target === editorElement) {
                        const textareaHeight = entry.contentRect.height + 
                            parseFloat(getComputedStyle(editorElement).paddingTop) + 
                            parseFloat(getComputedStyle(editorElement).paddingBottom);
                        const resizeHandleHeight = 12;
                        container.style.height = (textareaHeight + resizeHandleHeight) + 'px';
                    }
                }
            });
            
            this.resizeObserver.observe(editorElement);
        } else {
            this.syncContainerHeight();
            this.resizeCheckInterval = setInterval(() => {
                this.syncContainerHeight();
            }, 100);
        }
    }

    /**
     * Sync container height with textarea height
     */
    syncContainerHeight() {
        const container = this.panel.panelElement.querySelector('.markdown-editor-container');
        const editorElement = this.panel.content.editorElement;
        const textareaHeight = editorElement.offsetHeight;
        const resizeHandleHeight = 12;
        
        if (container.offsetHeight !== textareaHeight + resizeHandleHeight) {
            container.style.height = (textareaHeight + resizeHandleHeight) + 'px';
        }
    }

    /**
     * Setup vertical resize handle for textarea
     */
    setupVerticalResizeHandle() {
        const resizeHandle = this.panel.panelElement.querySelector('.edit-mode .vertical-resize-handle');
        const container = this.panel.panelElement.querySelector('.edit-mode .markdown-editor-container');
        const editorElement = this.panel.content.editorElement;
        
        if (!resizeHandle || !container) {
            console.warn('Resize handle setup failed: elements not found');
            return;
        }
        
        resizeHandle.style.opacity = '1';

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        const startResize = (e) => {
            isResizing = true;
            startY = e.clientY || e.touches[0].clientY;
            startHeight = editorElement.offsetHeight;
            
            resizeHandle.classList.add('dragging');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            document.addEventListener('touchmove', handleResize, { passive: false });
            document.addEventListener('touchend', stopResize);
        };

        const handleResize = (e) => {
            if (!isResizing) return;
            
            e.preventDefault();
            const currentY = e.clientY || e.touches[0].clientY;
            const deltaY = currentY - startY;
            const newHeight = Math.max(96, startHeight + deltaY);
            const resizeHandleHeight = 12;
            
            editorElement.style.height = newHeight + 'px';
            container.style.height = (newHeight + resizeHandleHeight) + 'px';
        };

        const stopResize = () => {
            if (!isResizing) return;
            
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', handleResize);
            document.removeEventListener('touchend', stopResize);
            
            const currentHeight = editorElement.offsetHeight;
            Utils.saveToStorage(`editor-height-${this.panel.type}`, currentHeight);
        };

        resizeHandle.addEventListener('mousedown', startResize);
        resizeHandle.addEventListener('touchstart', startResize, { passive: false });

        // Load saved height preference
        const savedHeight = Utils.loadFromStorage(`editor-height-${this.panel.type}`, 96);
        const resizeHandleHeight = 12;
        if (savedHeight && savedHeight >= 96) {
            editorElement.style.height = savedHeight + 'px';
            container.style.height = (savedHeight + resizeHandleHeight) + 'px';
        }
    }

    /**
     * Setup vertical resize handle for preview mode
     */
    setupPreviewResizeHandle() {
        const previewMode = this.panel.panelElement.querySelector('.preview-mode');
        const resizeHandle = previewMode.querySelector('.vertical-resize-handle');
        const container = previewMode.querySelector('.markdown-editor-container');
        const previewElement = previewMode.querySelector('.markdown-preview');
        const editorElement = this.panel.content.editorElement;
        
        if (!resizeHandle || !container || !previewElement) return;

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        const startResize = (e) => {
            isResizing = true;
            startY = e.clientY || e.touches[0].clientY;
            startHeight = previewElement.offsetHeight;
            
            resizeHandle.classList.add('dragging');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            document.addEventListener('touchmove', handleResize, { passive: false });
            document.addEventListener('touchend', stopResize);
        };

        const handleResize = (e) => {
            if (!isResizing) return;
            
            e.preventDefault();
            const currentY = e.clientY || e.touches[0].clientY;
            const deltaY = currentY - startY;
            const newHeight = Math.max(96, startHeight + deltaY);
            const resizeHandleHeight = 12;
            
            previewElement.style.height = newHeight + 'px';
            container.style.height = (newHeight + resizeHandleHeight) + 'px';
        };

        const stopResize = () => {
            if (!isResizing) return;
            
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', handleResize);
            document.removeEventListener('touchend', stopResize);
            
            // Sync the editor height with preview height
            const currentHeight = previewElement.offsetHeight;
            editorElement.style.height = currentHeight + 'px';
            Utils.saveToStorage(`editor-height-${this.panel.type}`, currentHeight);
        };

        // Remove existing listeners to prevent duplicates
        resizeHandle.removeEventListener('mousedown', startResize);
        resizeHandle.removeEventListener('touchstart', startResize);
        
        resizeHandle.addEventListener('mousedown', startResize);
        resizeHandle.addEventListener('touchstart', startResize, { passive: false });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.resizeCheckInterval) {
            clearInterval(this.resizeCheckInterval);
        }
    }
}

window.ResizeHandle = ResizeHandle;
