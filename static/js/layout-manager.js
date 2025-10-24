// Layout manager for resizable panels and layout control

class LayoutManager {
    constructor() {
        this.leftPanel = document.getElementById('left-panel');
        this.rightPanel = document.getElementById('right-panel');
        this.resizeHandle = document.getElementById('resize-handle');
        this.layoutToggleBtn = document.getElementById('layout-toggle-btn');
        
        this.isResizing = false;
        this.isLeftPanelCollapsed = Utils.loadFromStorage('left-panel-collapsed', false);
        this.maximizedPanel = null; // Track which panel is currently maximized
        
        this.init();
    }

    /**
     * Initialize layout manager
     */
    init() {
        this.bindResizeEvents();
        this.bindLayoutToggle();
        this.restoreLayout();
        this.setupResponsiveLayout();
    }

    /**
     * Bind resize events for the drag handle
     */
    bindResizeEvents() {
        let startX;
        let startLeftWidth;
        let startRightWidth;

        const handleMouseDown = (e) => {
            this.isResizing = true;
            startX = e.clientX;
            
            const leftRect = this.leftPanel.getBoundingClientRect();
            const rightRect = this.rightPanel.getBoundingClientRect();
            
            startLeftWidth = leftRect.width;
            startRightWidth = rightRect.width;
            
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            e.preventDefault();
        };

        const handleMouseMove = (e) => {
            if (!this.isResizing) return;
            
            const deltaX = e.clientX - startX;
            const containerWidth = this.leftPanel.parentElement.clientWidth;
            
            // Calculate new widths
            const newLeftWidth = startLeftWidth + deltaX;
            const newRightWidth = startRightWidth - deltaX;
            
            // Set minimum and maximum widths (20% - 80%)
            const minWidth = containerWidth * 0.2;
            const maxWidth = containerWidth * 0.8;
            
            if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
                const leftPercentage = (newLeftWidth / containerWidth) * 100;
                const rightPercentage = (newRightWidth / containerWidth) * 100;
                
                this.setPanelWidths(leftPercentage, rightPercentage);
                
                // Save layout preferences
                Utils.saveToStorage('panel-widths', {
                    left: leftPercentage,
                    right: rightPercentage
                });
            }
        };

        const handleMouseUp = () => {
            this.isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        this.resizeHandle.addEventListener('mousedown', handleMouseDown);

        // Touch events for mobile
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
            if (this.isResizing) {
                handleMouseUp();
            }
        });
    }

    /**
     * Bind layout toggle functionality
     */
    bindLayoutToggle() {
        this.layoutToggleBtn.addEventListener('click', () => {
            this.toggleLeftPanel();
        });
    }

    /**
     * Set panel widths
     */
    setPanelWidths(leftPercentage, rightPercentage) {
        this.leftPanel.style.width = `${leftPercentage}%`;
        this.rightPanel.style.width = `${rightPercentage}%`;
    }

    /**
     * Toggle left panel visibility
     */
    toggleLeftPanel() {
        this.isLeftPanelCollapsed = !this.isLeftPanelCollapsed;
        
        if (this.isLeftPanelCollapsed) {
            this.collapseLeftPanel();
        } else {
            this.restoreLeftPanel();
        }
        
        Utils.saveToStorage('left-panel-collapsed', this.isLeftPanelCollapsed);
        this.updateToggleButton();
    }

    /**
     * Collapse left panel
     */
    collapseLeftPanel() {
        // Save current width before collapsing
        const currentWidth = this.leftPanel.getBoundingClientRect().width;
        const containerWidth = this.leftPanel.parentElement.clientWidth;
        const currentPercentage = (currentWidth / containerWidth) * 100;
        
        Utils.saveToStorage('left-panel-width-before-collapse', currentPercentage);
        
        // Animate to collapsed state
        this.animatePanelCollapse();
    }

    /**
     * Restore left panel
     */
    restoreLeftPanel() {
        const savedWidth = Utils.loadFromStorage('left-panel-width-before-collapse', 50);
        this.animatePanelRestore(savedWidth);
    }

    /**
     * Animate panel collapse
     */
    animatePanelCollapse() {
        this.leftPanel.style.transition = 'width 0.3s ease';
        this.rightPanel.style.transition = 'width 0.3s ease';
        this.resizeHandle.style.transition = 'opacity 0.3s ease';
        
        this.setPanelWidths(0, 100);
        this.resizeHandle.style.opacity = '0';
        this.resizeHandle.style.pointerEvents = 'none';
        
        setTimeout(() => {
            this.leftPanel.style.display = 'none';
            this.clearTransitions();
        }, 300);
    }

    /**
     * Animate panel restore
     */
    animatePanelRestore(leftWidth) {
        this.leftPanel.style.display = 'flex';
        this.leftPanel.style.transition = 'width 0.3s ease';
        this.rightPanel.style.transition = 'width 0.3s ease';
        this.resizeHandle.style.transition = 'opacity 0.3s ease';
        
        // Use requestAnimationFrame to ensure display change takes effect
        requestAnimationFrame(() => {
            this.setPanelWidths(leftWidth, 100 - leftWidth);
            this.resizeHandle.style.opacity = '1';
            this.resizeHandle.style.pointerEvents = 'auto';
            
            setTimeout(() => {
                this.clearTransitions();
            }, 300);
        });
    }

    /**
     * Clear CSS transitions
     */
    clearTransitions() {
        this.leftPanel.style.transition = '';
        this.rightPanel.style.transition = '';
        this.resizeHandle.style.transition = '';
    }

    /**
     * Update toggle button appearance
     */
    updateToggleButton() {
        const icon = this.layoutToggleBtn.querySelector('svg');
        if (this.isLeftPanelCollapsed) {
            icon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            `;
            this.layoutToggleBtn.title = '顯示左側面板';
        } else {
            icon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            `;
            this.layoutToggleBtn.title = '隱藏左側面板';
        }
    }

    /**
     * Restore saved layout
     */
    restoreLayout() {
        // Restore panel widths
        const savedWidths = Utils.loadFromStorage('panel-widths');
        if (savedWidths) {
            this.setPanelWidths(savedWidths.left, savedWidths.right);
        }

        // Restore left panel collapse state
        if (this.isLeftPanelCollapsed) {
            this.leftPanel.style.display = 'none';
            this.setPanelWidths(0, 100);
            this.resizeHandle.style.opacity = '0';
            this.resizeHandle.style.pointerEvents = 'none';
        }
        
        this.updateToggleButton();
    }

    /**
     * Setup responsive layout for different screen sizes
     */
    setupResponsiveLayout() {
        const checkScreenSize = () => {
            const isMobile = window.innerWidth < 768;
            const isTablet = window.innerWidth < 1024 && window.innerWidth >= 768;
            
            if (isMobile) {
                this.setupMobileLayout();
            } else if (isTablet) {
                this.setupTabletLayout();
            } else {
                this.setupDesktopLayout();
            }
        };

        // Check on load and resize
        checkScreenSize();
        window.addEventListener('resize', Utils.debounce(checkScreenSize, 250));
    }

    /**
     * Setup mobile layout
     */
    setupMobileLayout() {
        const container = this.leftPanel.parentElement;
        container.classList.add('mobile-stack');
        
        // Stack panels vertically on mobile
        this.leftPanel.classList.add('mobile-full-width');
        this.rightPanel.classList.add('mobile-full-width');
        this.resizeHandle.classList.add('mobile-hidden');
        
        // Auto-collapse left panel on mobile
        if (!this.isLeftPanelCollapsed) {
            this.isLeftPanelCollapsed = true;
            this.leftPanel.style.display = 'none';
        }
    }

    /**
     * Setup tablet layout
     */
    setupTabletLayout() {
        const container = this.leftPanel.parentElement;
        container.classList.remove('mobile-stack');
        
        this.leftPanel.classList.remove('mobile-full-width');
        this.rightPanel.classList.remove('mobile-full-width');
        this.resizeHandle.classList.remove('mobile-hidden');
        
        // Adjust default widths for tablet
        if (!Utils.loadFromStorage('panel-widths')) {
            this.setPanelWidths(40, 60);
        }
    }

    /**
     * Setup desktop layout
     */
    setupDesktopLayout() {
        const container = this.leftPanel.parentElement;
        container.classList.remove('mobile-stack');
        
        this.leftPanel.classList.remove('mobile-full-width');
        this.rightPanel.classList.remove('mobile-full-width');
        this.resizeHandle.classList.remove('mobile-hidden');
        
        // Restore left panel if it was auto-collapsed on mobile
        if (this.isLeftPanelCollapsed && !Utils.loadFromStorage('left-panel-collapsed')) {
            this.isLeftPanelCollapsed = false;
            this.restoreLeftPanel();
        }
    }

    /**
     * Get current layout info
     */
    getLayoutInfo() {
        return {
            isLeftPanelCollapsed: this.isLeftPanelCollapsed,
            leftWidth: this.leftPanel.getBoundingClientRect().width,
            rightWidth: this.rightPanel.getBoundingClientRect().width,
            isMobile: window.innerWidth < 768,
            isTablet: window.innerWidth < 1024 && window.innerWidth >= 768
        };
    }

    /**
     * Force layout update
     */
    updateLayout() {
        this.setupResponsiveLayout();
    }

    /**
     * Reset layout to defaults
     */
    resetLayout() {
        // Clear saved preferences
        Utils.saveToStorage('panel-widths', null);
        Utils.saveToStorage('left-panel-collapsed', false);
        Utils.saveToStorage('left-panel-width-before-collapse', null);
        
        // Reset to default layout
        this.setPanelWidths(50, 50);
        this.isLeftPanelCollapsed = false;
        
        if (this.leftPanel.style.display === 'none') {
            this.restoreLeftPanel();
        }
        
        this.updateToggleButton();
    }

    /**
     * Maximize a panel (hide all other panels)
     * @param {HTMLElement} panelElement - The panel to maximize
     */
    maximizePanel(panelElement) {
        if (!panelElement || this.maximizedPanel === panelElement) {
            return; // Already maximized or invalid panel
        }

        // Set maximized panel reference
        this.maximizedPanel = panelElement;

        // Add maximized class to the panel
        panelElement.classList.add('panel-maximized');

        // Hide all other panels
        const allPanels = document.querySelectorAll('.plan-panel');
        allPanels.forEach(panel => {
            if (panel !== panelElement) {
                panel.classList.add('panel-hidden-by-maximize');
            }
        });
    }

    /**
     * Restore normal view (show all panels)
     */
    restoreNormalView() {
        if (!this.maximizedPanel) {
            return; // No panel is maximized
        }

        // Remove maximized class from the previously maximized panel
        this.maximizedPanel.classList.remove('panel-maximized');

        // Show all hidden panels
        const allPanels = document.querySelectorAll('.plan-panel');
        allPanels.forEach(panel => {
            panel.classList.remove('panel-hidden-by-maximize');
        });

        // Clear maximized panel reference
        this.maximizedPanel = null;
    }

    /**
     * Check if any panel is currently maximized
     * @returns {boolean}
     */
    isAnyPanelMaximized() {
        return this.maximizedPanel !== null;
    }

    /**
     * Get the currently maximized panel
     * @returns {HTMLElement|null}
     */
    getMaximizedPanel() {
        return this.maximizedPanel;
    }
}

// Export for use in other modules
window.LayoutManager = LayoutManager;