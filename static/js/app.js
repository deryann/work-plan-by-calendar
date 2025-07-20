// Main application controller for work plan calendar system

class WorkPlanApp {
    constructor() {
        this.currentDate = new Date();
        this.layoutManager = null;
        this.datePicker = null;
        this.panels = {
            history: {},
            current: {}
        };
        
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            await this.checkAPIHealth();
            this.initializeComponents();
            this.bindGlobalEvents();
            this.loadCurrentPlans();
            this.loadHistoryPlans();
            this.updateDateDisplay();
            
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
    initializeComponents() {
        // Initialize layout manager
        this.layoutManager = new LayoutManager();

        // Initialize date picker
        this.datePicker = new DatePicker({
            currentDate: this.currentDate,
            onDateSelect: (date) => {
                this.setCurrentDate(date);
            }
        });

        // Setup main date picker
        this.setupMainDatePicker();
    }

    /**
     * Setup main date picker
     */
    setupMainDatePicker() {
        const mainDatePicker = document.getElementById('main-date-picker');
        if (mainDatePicker) {
            mainDatePicker.value = Utils.formatDate(this.currentDate);
            mainDatePicker.addEventListener('change', (e) => {
                const newDate = Utils.parseDate(e.target.value);
                this.setCurrentDate(newDate);
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

        // Before unload warning if there are unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '您有未儲存的變更，確定要離開嗎？';
                return e.returnValue;
            }
        });
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveAllModifiedPanels();
                    break;
                case '\\':
                    e.preventDefault();
                    this.layoutManager.toggleLeftPanel();
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

    /**
     * Set current date and reload plans
     */
    setCurrentDate(date) {
        this.currentDate = new Date(date);
        this.updateDateDisplay();
        this.updateMainDatePicker();
        this.loadCurrentPlans();
        this.loadHistoryPlans();
    }

    /**
     * Navigate date by days
     */
    navigateDate(days) {
        const newDate = dayjs(this.currentDate).add(days, 'day').toDate();
        this.setCurrentDate(newDate);
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
     * Load current plans (right panel)
     */
    async loadCurrentPlans() {
        const planTypes = ['year', 'month', 'week', 'day'];
        
        for (const planType of planTypes) {
            await this.loadCurrentPlan(planType);
        }
    }

    /**
     * Load specific current plan
     */
    async loadCurrentPlan(planType) {
        try {
            const container = document.getElementById(`${planType}-current-panel`);
            if (!container) return;

            // Destroy existing panel
            if (this.panels.current[planType]) {
                this.panels.current[planType].destroy();
            }

            // Create new panel
            this.panels.current[planType] = new PlanPanel({
                type: planType,
                date: Utils.getCanonicalDate(planType, this.currentDate),
                isCurrent: true,
                container: container.parentElement,
                onSave: (type, date, plan) => {
                    this.onPlanSaved(type, date, plan, true);
                },
                onNavigate: (type, date) => {
                    this.onPlanNavigated(type, date, true);
                }
            });

        } catch (error) {
            console.error(`Failed to load current ${planType} plan:`, error);
            Utils.showError(`載入當期${planType}計畫失敗: ${error.message}`);
        }
    }

    /**
     * Load history plans (left panel)
     */
    async loadHistoryPlans() {
        const planTypes = ['year', 'month', 'week', 'day'];
        
        for (const planType of planTypes) {
            await this.loadHistoryPlan(planType);
        }
    }

    /**
     * Load specific history plan
     */
    async loadHistoryPlan(planType) {
        try {
            const container = document.getElementById(`${planType}-history-panel`);
            if (!container) return;

            // Get previous period date
            const previousDate = Utils.getPreviousPeriod(planType, this.currentDate);

            // Destroy existing panel
            if (this.panels.history[planType]) {
                this.panels.history[planType].destroy();
            }

            // Create new panel
            this.panels.history[planType] = new PlanPanel({
                type: planType,
                date: Utils.getCanonicalDate(planType, previousDate),
                isCurrent: false,
                container: container.parentElement,
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

        } catch (error) {
            console.error(`Failed to load history ${planType} plan:`, error);
            Utils.showError(`載入歷史${planType}計畫失敗: ${error.message}`);
        }
    }

    /**
     * Handle plan saved event
     */
    onPlanSaved(planType, date, plan, isCurrent) {
        console.log(`Plan saved: ${planType}, ${Utils.formatDate(date)}, current: ${isCurrent}`);
        
        // Could trigger additional actions like:
        // - Updating other related panels
        // - Sending notifications
        // - Updating navigation state
    }

    /**
     * Handle plan navigation event
     */
    onPlanNavigated(planType, date, isCurrent) {
        console.log(`Plan navigated: ${planType}, ${Utils.formatDate(date)}, current: ${isCurrent}`);
        
        // Update the corresponding panel's date display
        const panel = isCurrent ? this.panels.current[planType] : this.panels.history[planType];
        if (panel) {
            panel.updateTitle(Utils.formatPlanTitle(planType, date));
        }
    }

    /**
     * Handle plan content copied event
     */
    async onPlanCopied(planType, sourceDate, content) {
        try {
            // Copy to corresponding current plan
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
            
            // Reload the target panel
            await this.loadCurrentPlan(planType);
            
            Utils.showSuccess(`${planType}計畫內容已複製到當期`);
            
        } catch (error) {
            console.error('Failed to copy plan content:', error);
            Utils.showError(`複製計畫內容失敗: ${error.message}`);
        }
    }

    /**
     * Save all modified panels
     */
    async saveAllModifiedPanels() {
        const allPanels = [...Object.values(this.panels.current), ...Object.values(this.panels.history)];
        const modifiedPanels = allPanels.filter(panel => panel && panel.isModified);
        
        if (modifiedPanels.length === 0) {
            Utils.showSuccess('沒有需要儲存的變更');
            return;
        }

        try {
            Utils.showLoading();
            
            for (const panel of modifiedPanels) {
                await panel.saveContent();
            }
            
            Utils.showSuccess(`已儲存 ${modifiedPanels.length} 個計畫`);
            
        } catch (error) {
            console.error('Failed to save all panels:', error);
            Utils.showError(`批量儲存失敗: ${error.message}`);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        const allPanels = [...Object.values(this.panels.current), ...Object.values(this.panels.history)];
        return allPanels.some(panel => panel && panel.isModified);
    }

    /**
     * Refresh all plans
     */
    async refreshAllPlans() {
        try {
            Utils.showLoading();
            await this.loadCurrentPlans();
            await this.loadHistoryPlans();
            Utils.showSuccess('所有計畫已重新載入');
        } catch (error) {
            console.error('Failed to refresh plans:', error);
            Utils.showError(`重新載入失敗: ${error.message}`);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Export current date plans
     */
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

            // Create download link
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

    /**
     * Get application status
     */
    getStatus() {
        return {
            currentDate: this.currentDate,
            hasUnsavedChanges: this.hasUnsavedChanges(),
            activePanels: Object.keys(this.panels.current).length + Object.keys(this.panels.history).length,
            layoutInfo: this.layoutManager.getLayoutInfo()
        };
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Configure Day.js plugins
    dayjs.extend(dayjs_plugin_weekOfYear);
    dayjs.extend(dayjs_plugin_isoWeek);
    
    // Initialize the application
    window.app = new WorkPlanApp();
    
    // Make app globally accessible for debugging
    console.log('Work Plan Calendar Application initialized');
    console.log('Access via window.app for debugging');
});

// Export for use in other modules
window.WorkPlanApp = WorkPlanApp;