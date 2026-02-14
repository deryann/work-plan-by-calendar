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
        this.contentArea = document.getElementById('drawer-content');
        this.titleEl = document.getElementById('drawer-title');
        this.periodLabel = document.getElementById('drawer-period-label');

        this.bindEvents();
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

        // Previous period
        const prevBtn = document.getElementById('drawer-prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigatePrevious());
        }

        // Next period
        const nextBtn = document.getElementById('drawer-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateNext());
        }

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
     * Open drawer for a specific plan type
     */
    async open(planType) {
        this.currentType = planType;
        this.isOpen = true;

        // Calculate previous period date
        const appDate = this.app.currentDate;
        this.currentDate = Utils.getPreviousPeriod(planType, appDate);

        // Update UI
        this.updateTitle();
        this.updatePeriodLabel();

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
     * Navigate to previous period
     */
    async navigatePrevious() {
        if (!this.currentType || !this.currentDate) return;
        this.currentDate = Utils.getPreviousPeriod(this.currentType, this.currentDate);
        this.updatePeriodLabel();
        await this.loadPlan();
    }

    /**
     * Navigate to next period
     */
    async navigateNext() {
        if (!this.currentType || !this.currentDate) return;
        this.currentDate = Utils.getNextPeriod(this.currentType, this.currentDate);
        this.updatePeriodLabel();
        await this.loadPlan();
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
                this.updatePeriodLabel();
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

    /**
     * Update drawer title
     */
    updateTitle() {
        if (this.titleEl) {
            this.titleEl.textContent = `歷史${this.getTypeLabel()}計畫`;
        }
    }

    /**
     * Update period label
     */
    updatePeriodLabel() {
        if (this.periodLabel && this.currentDate) {
            this.periodLabel.textContent = Utils.formatPlanTitle(this.currentType, this.currentDate);
        }
    }
}

window.HistoryDrawer = HistoryDrawer;
