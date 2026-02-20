// HistoryDrawer - slide-in panel for comparing with historical plans

class HistoryDrawer {
    constructor(app) {
        this.app = app;
        this.isOpen = false;
        this.currentType = null;
        this.currentDate = null;
        this.currentPanel = null;

        // DOM
        this.backdrop = document.getElementById('drawer-backdrop');
        this.drawer = document.getElementById('history-drawer');
        this.resizeHandle = document.getElementById('drawer-resize-handle');
        this.contentArea = document.getElementById('drawer-content');
        this.titleEl = document.getElementById('drawer-title');
        this.typeButtons = document.querySelectorAll('.drawer-type-btn');

        this.isResizing = false;
        this.minWidth = 280;
        this.maxWidth = Math.min(window.innerWidth * 0.85, 900);

        this.bindEvents();
        this.bindResizeEvents();
    }

    /**
     * Bind resize events for the drawer width handle
     */
    bindResizeEvents() {
        if (!this.resizeHandle || !this.drawer) return;

        let startX;
        let startWidth;

        const handleMouseDown = (e) => {
            this.isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(this.drawer.style.width, 10) || this.drawer.getBoundingClientRect().width;

            this.resizeHandle.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            e.preventDefault();
        };

        const handleMouseMove = (e) => {
            if (!this.isResizing) return;

            // Dragging left increases width (drawer is on the right)
            const deltaX = startX - e.clientX;
            const newWidth = Math.min(Math.max(startWidth + deltaX, this.minWidth), this.maxWidth);
            this.drawer.style.width = `${newWidth}px`;
        };

        const handleMouseUp = () => {
            if (!this.isResizing) return;
            this.isResizing = false;

            this.resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Save the preferred width
            const currentWidth = parseInt(this.drawer.style.width, 10);
            if (currentWidth) {
                Utils.saveToStorage('drawer-width', currentWidth);
            }

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        this.resizeHandle.addEventListener('mousedown', handleMouseDown);

        // Touch support
        this.resizeHandle.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            handleMouseDown({ clientX: touch.clientX, preventDefault: e.preventDefault.bind(e) });
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isResizing) {
                const touch = e.touches[0];
                handleMouseMove({ clientX: touch.clientX });
            }
        });

        document.addEventListener('touchend', () => {
            if (this.isResizing) handleMouseUp();
        });

        // Restore saved width
        const savedWidth = Utils.loadFromStorage('drawer-width');
        if (savedWidth) {
            this.drawer.style.width = `${savedWidth}px`;
        }

        // Update maxWidth on window resize
        window.addEventListener('resize', () => {
            this.maxWidth = Math.min(window.innerWidth * 0.85, 900);
        });
    }

    /**
     * Bind drawer events
     */
    bindEvents() {
        // Close button
        const closeBtn = document.getElementById('drawer-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Backdrop click to close
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => this.close());
        }

        // Type selector buttons
        this.typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.switchType(type);
            });
        });

        // Copy to current
        const copyBtn = document.getElementById('drawer-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyToCurrent());
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Switch to a different plan type
     */
    switchType(newType) {
        if (!newType) return;
        this.open(newType);
    }

    /**
     * Update type button active states
     */
    updateTypeButtons() {
        this.typeButtons.forEach(btn => {
            btn.classList.toggle('drawer-type-btn--active', btn.dataset.type === this.currentType);
        });
    }

    /**
     * Open drawer for a specific plan type
     */
    async open(planType) {
        this.currentType = planType;
        this.isOpen = true;

        // Calculate previous period date
        const appDate = this.app.currentDate;
        this.currentDate = Utils.getPreviousPeriod(planType, appDate);

        // Update type buttons
        this.updateTypeButtons();

        // Show drawer with animation
        if (this.backdrop) this.backdrop.classList.remove('hidden');
        if (this.drawer) this.drawer.classList.add('drawer-open');

        // Load content
        await this.loadPlan();
    }

    /**
     * Close drawer
     */
    close() {
        this.isOpen = false;

        if (this.drawer) this.drawer.classList.remove('drawer-open');
        if (this.backdrop) this.backdrop.classList.add('hidden');

        // Destroy panel
        if (this.currentPanel) {
            this.currentPanel.destroy();
            this.currentPanel = null;
        }

        // Clear content
        if (this.contentArea) {
            this.contentArea.innerHTML = '';
        }
    }

    /**
     * Load plan content into drawer
     */
    async loadPlan() {
        if (!this.contentArea) return;

        // Destroy existing panel
        if (this.currentPanel) {
            this.currentPanel.destroy();
            this.currentPanel = null;
        }

        // Clear content area
        this.contentArea.innerHTML = '';

        // Create a PlanPanel instance inside the drawer
        const canonicalDate = Utils.getCanonicalDate(this.currentType, this.currentDate);

        this.currentPanel = new PlanPanel({
            type: this.currentType,
            date: canonicalDate,
            isCurrent: false,
            container: this.contentArea,
            settingsManager: this.app.settingsManager,
            onSave: (type, date, plan) => {
                console.log(`History plan saved: ${type}, ${Utils.formatDate(date)}`);
            },
            onNavigate: (type, date) => {
                this.currentDate = date;
            }
        });
    }

    /**
     * Copy content from history to current plan
     */
    async copyToCurrent() {
        if (!this.currentPanel || !this.currentType) return;

        try {
            const content = this.currentPanel.getContent();
            if (!content || !content.trim()) {
                Utils.showError('沒有內容可複製');
                return;
            }

            await this.app.onPlanCopied(this.currentType, this.currentDate, content);
            Utils.showSuccess(`已複製到當期${this.getTypeLabel()}計畫`);

        } catch (error) {
            console.error('Copy failed:', error);
            Utils.showError(`複製失敗: ${error.message}`);
        }
    }

    /**
     * Get type label
     */
    getTypeLabel() {
        const labels = { day: '日', week: '週', month: '月', year: '年' };
        return labels[this.currentType] || '';
    }
}

window.HistoryDrawer = HistoryDrawer;
