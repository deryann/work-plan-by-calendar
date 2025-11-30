// CollapseManager component - handles collapse/expand functionality
class CollapseManager {
    constructor(panel) {
        this.panel = panel;
    }

    /**
     * Initialize collapse state based on stored preference
     */
    initializeCollapseState() {
        if (this.panel.isCollapsed) {
            const collapseBtn = this.panel.panelElement.querySelector('.collapse-btn');
            const collapseChevron = this.panel.panelElement.querySelector('.collapse-chevron');
            const contentElement = this.panel.panelElement.querySelector('.panel-content');
            
            contentElement.classList.add('hidden');
            this.panel.panelElement.classList.add('panel-collapsed');
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
        this.panel.isCollapsed = !this.panel.isCollapsed;
        Utils.saveToStorage(`panel-collapsed-${this.panel.type}`, this.panel.isCollapsed);
        
        const collapseBtn = this.panel.panelElement.querySelector('.collapse-btn');
        const collapseChevron = this.panel.panelElement.querySelector('.collapse-chevron');
        const contentElement = this.panel.panelElement.querySelector('.panel-content');
        
        if (this.panel.isCollapsed) {
            contentElement.classList.add('hidden');
            this.panel.panelElement.classList.add('panel-collapsed');
            this.panel.panelElement.classList.remove('panel-expanded');
            collapseBtn.classList.add('collapsed');
            collapseChevron.style.transform = 'rotate(180deg)';
        } else {
            contentElement.classList.remove('hidden');
            this.panel.panelElement.classList.remove('panel-collapsed');
            this.panel.panelElement.classList.add('panel-expanded');
            collapseBtn.classList.remove('collapsed');
            collapseChevron.style.transform = 'rotate(0deg)';
        }
    }
}

window.CollapseManager = CollapseManager;
