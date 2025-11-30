// MaximizeManager component - handles maximize/restore functionality
class MaximizeManager {
    constructor(panel) {
        this.panel = panel;
    }

    /**
     * Toggle maximize state of this panel
     */
    toggleMaximize() {
        if (!this.panel.layoutManager) {
            console.warn('LayoutManager not available for panel maximize');
            return;
        }

        // If panel is collapsed, expand it first before maximizing
        if (this.panel.isCollapsed && !this.panel.isMaximized) {
            this.panel.collapseManager.toggleCollapse();
            // Give a brief moment for collapse animation to complete
            setTimeout(() => {
                this.performMaximizeToggle();
            }, 50);
        } else {
            this.performMaximizeToggle();
        }
    }

    /**
     * Perform the maximize/restore toggle operation
     */
    performMaximizeToggle() {
        const titleElement = this.panel.panelElement.querySelector('.panel-title');
        
        if (this.panel.isMaximized) {
            // Currently maximized, restore to normal view
            this.panel.layoutManager.restoreNormalView();
            this.panel.isMaximized = false;
            
            if (titleElement) {
                titleElement.title = '雙擊以最大化面板';
            }
        } else {
            // Currently normal, maximize this panel
            this.panel.layoutManager.maximizePanel(this.panel.panelElement);
            this.panel.isMaximized = true;
            
            if (titleElement) {
                titleElement.title = '再次雙擊以恢復正常檢視';
            }
        }
    }
}

window.MaximizeManager = MaximizeManager;
