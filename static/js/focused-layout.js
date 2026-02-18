// FocusedLayout - manages the single-column card stack layout

class FocusedLayout {
    constructor() {
        this.cardStack = document.getElementById('card-stack');
        this.maximizedPanel = null;
    }

    /**
     * Initialize layout
     */
    init() {
        // Nothing complex needed - single column layout is inherently responsive
    }

    /**
     * Update layout (called on window resize)
     */
    updateLayout() {
        // Single column layout auto-adapts; no action needed
    }

    /**
     * Get layout info for compatibility with app.js
     */
    getLayoutInfo() {
        return {
            mode: 'focused',
            isMobile: window.innerWidth < 768,
            isTablet: window.innerWidth < 1024 && window.innerWidth >= 768
        };
    }

    /**
     * Toggle left panel - no-op in focused mode
     */
    toggleLeftPanel() {
        // No left panel in focused layout
        console.log('toggleLeftPanel is not applicable in focused layout');
    }

    /**
     * Maximize panel - compatible with LayoutManager interface
     */
    maximizePanel(panelElement) {
        if (!panelElement || this.maximizedPanel === panelElement) return;
        this.maximizedPanel = panelElement;
        panelElement.classList.add('panel-maximized');
        document.querySelectorAll('.plan-card, .plan-panel').forEach(el => {
            if (el !== panelElement) {
                el.classList.add('panel-hidden-by-maximize');
            }
        });
    }

    /**
     * Restore normal view
     */
    restoreNormalView() {
        if (!this.maximizedPanel) return;
        this.maximizedPanel.classList.remove('panel-maximized');
        document.querySelectorAll('.plan-card, .plan-panel').forEach(el => {
            el.classList.remove('panel-hidden-by-maximize');
        });
        this.maximizedPanel = null;
    }

    /**
     * Check if any panel is maximized
     */
    isAnyPanelMaximized() {
        return this.maximizedPanel !== null;
    }

    /**
     * Get maximized panel
     */
    getMaximizedPanel() {
        return this.maximizedPanel;
    }
}

window.FocusedLayout = FocusedLayout;
