// Settings manager for UI preferences and configuration

class SettingsManager {
    constructor() {
        this.currentSettings = null;
        this.callbacks = {
            'settings-updated': []
        };
        this.init();
    }

    /**
     * Initialize settings manager
     */
    async init() {
        try {
            await this.loadSettings();
        } catch (error) {
            console.warn('Failed to load settings from server, using defaults:', error);
            this.currentSettings = this.getDefaultSettings();
        }
        
        // Always ensure we have valid settings
        if (!this.validateSettings(this.currentSettings)) {
            console.warn('Invalid settings structure, using defaults');
            this.currentSettings = this.getDefaultSettings();
        }
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            ui: {
                panels: {
                    left: {
                        year: true,
                        month: true,
                        week: true,
                        day: true
                    },
                    right: {
                        year: true,
                        month: true,
                        week: true,
                        day: true
                    }
                },
                theme: {
                    mode: 'light', // 'light' or 'dark'
                    colors: {
                        light: {
                            primary: '#ffffff',
                            secondary: '#f3f4f6',
                            accent: '#3b82f6',
                            border: '#e2e8f0',
                            text: '#374151',
                            textSecondary: '#64748b',
                            titleText: '#1f2937'
                        },
                        dark: {
                            primary: '#2d2d2d',
                            secondary: '#1a1a1a',
                            accent: '#60a5fa',
                            border: '#404040',
                            text: '#e5e5e5',
                            textSecondary: '#a3a3a3',
                            titleText: '#ffffff'
                        }
                    }
                }
            }
        };
    }

    /**
     * Load settings from server
     */
    async loadSettings() {
        try {
            const uiSettings = await planAPI.getUISettings();
            this.currentSettings = {
                ui: uiSettings
            };
            if (window.location.hostname === 'localhost') {
                console.log('Settings loaded successfully:', this.currentSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            throw error;
        }
    }

    /**
     * Save settings to server
     */
    async saveSettings(settings) {
        try {
            const updatedSettings = await planAPI.updateUISettings(settings.ui);
            this.currentSettings = updatedSettings;
            this.notifyCallbacks('settings-updated', this.currentSettings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * Reset settings to default
     */
    async resetSettings() {
        try {
            const settings = await planAPI.resetSettings();
            this.currentSettings = settings;
            this.notifyCallbacks('settings-updated', this.currentSettings);
            return true;
        } catch (error) {
            console.error('Error resetting settings:', error);
            throw error;
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return this.currentSettings || this.getDefaultSettings();
    }

    /**
     * Get UI settings
     */
    getUISettings() {
        const settings = this.getSettings();
        return settings.ui;
    }

    /**
     * Get panel visibility setting
     */
    getPanelVisibility(panelSide, planType) {
        const uiSettings = this.getUISettings();
        if (!uiSettings || !uiSettings.panels || !uiSettings.panels[panelSide]) {
            console.warn(`Settings not found for ${panelSide} panel`);
            return true; // Default to visible if settings not found
        }
        const visible = uiSettings.panels[panelSide][planType];
        if (window.location.hostname === 'localhost') {
            console.log(`Panel visibility for ${panelSide}-${planType}: ${visible}`);
        }
        return visible !== false; // Default to true if undefined
    }

    /**
     * Set panel visibility
     */
    setPanelVisibility(panelSide, planType, visible) {
        const settings = this.getSettings();
        if (!settings.ui.panels[panelSide]) {
            settings.ui.panels[panelSide] = {};
        }
        settings.ui.panels[panelSide][planType] = visible;
        return settings;
    }

    /**
     * Update settings locally (without saving to server)
     */
    updateSettingsLocally(newSettings) {
        this.currentSettings = { ...this.currentSettings, ...newSettings };
        this.notifyCallbacks('settings-updated', this.currentSettings);
    }

    /**
     * Register callback for settings updates
     */
    onSettingsUpdated(callback) {
        this.callbacks['settings-updated'].push(callback);
    }

    /**
     * Unregister callback for settings updates
     */
    offSettingsUpdated(callback) {
        const index = this.callbacks['settings-updated'].indexOf(callback);
        if (index > -1) {
            this.callbacks['settings-updated'].splice(index, 1);
        }
    }

    /**
     * Notify callbacks
     */
    notifyCallbacks(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in settings callback:', error);
                }
            });
        }
    }

    /**
     * Apply panel visibility to DOM
     */
    applyPanelVisibility() {
        const planTypes = ['year', 'month', 'week', 'day'];
        const panelSides = ['left', 'right'];

        if (window.location.hostname === 'localhost') {
            console.log('Applying panel visibility settings:', this.getSettings());
        }

        for (const side of panelSides) {
            for (const type of planTypes) {
                const visible = this.getPanelVisibility(side, type);
                const panelId = `${type}-${side === 'left' ? 'history' : 'current'}-panel`;
                const panelElement = document.getElementById(panelId);
                
                if (panelElement) {
                    if (visible) {
                        panelElement.style.display = '';
                        panelElement.classList.remove('settings-hidden');
                    } else {
                        panelElement.style.display = 'none';
                        panelElement.classList.add('settings-hidden');
                    }
                    
                    if (window.location.hostname === 'localhost') {
                        console.log(`${visible ? 'Showing' : 'Hiding'} panel: ${panelId}`);
                    }
                } else {
                    if (window.location.hostname === 'localhost') {
                        console.warn(`Panel element not found: ${panelId}`);
                    }
                }
            }
        }
    }

    /**
     * Get settings summary for debugging
     */
    getSettingsSummary() {
        const settings = this.getSettings();
        return {
            hasSettings: !!this.currentSettings,
            leftPanels: settings.ui.panels.left,
            rightPanels: settings.ui.panels.right,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Validate settings structure
     */
    validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return false;
        }

        if (!settings.ui || !settings.ui.panels) {
            return false;
        }

        const { left, right } = settings.ui.panels;
        if (!left || !right) {
            return false;
        }

        const requiredTypes = ['year', 'month', 'week', 'day'];
        for (const type of requiredTypes) {
            if (typeof left[type] !== 'boolean' || typeof right[type] !== 'boolean') {
                return false;
            }
        }

        return true;
    }

    /**
     * Get theme settings
     */
    getThemeSettings() {
        try {
            const settings = this.getSettings();
            if (!settings || !settings.ui || !settings.ui.theme) {
                return this.getDefaultSettings().ui.theme;
            }
            return settings.ui.theme;
        } catch (error) {
            console.warn('Error getting theme settings, using defaults:', error);
            return this.getDefaultSettings().ui.theme;
        }
    }

    /**
     * Get current theme mode
     */
    getThemeMode() {
        try {
            const themeSettings = this.getThemeSettings();
            return themeSettings.mode || 'light';
        } catch (error) {
            console.warn('Error getting theme mode, using light:', error);
            return 'light';
        }
    }

    /**
     * Set theme mode
     */
    setThemeMode(mode) {
        const settings = this.getSettings();
        if (!settings.ui.theme) {
            settings.ui.theme = this.getDefaultSettings().ui.theme;
        }
        settings.ui.theme.mode = mode;
        return settings;
    }

    /**
     * Get current theme colors
     */
    getCurrentThemeColors() {
        try {
            const themeSettings = this.getThemeSettings();
            const mode = themeSettings.mode || 'light';
            
            if (!themeSettings.colors || !themeSettings.colors[mode]) {
                console.warn(`Theme colors not found for mode ${mode}, using defaults`);
                const defaultSettings = this.getDefaultSettings();
                return defaultSettings.ui.theme.colors[mode] || defaultSettings.ui.theme.colors.light;
            }
            
            return themeSettings.colors[mode];
        } catch (error) {
            console.warn('Error getting current theme colors, using defaults:', error);
            const defaultSettings = this.getDefaultSettings();
            return defaultSettings.ui.theme.colors.light;
        }
    }

    /**
     * Update theme colors
     */
    updateThemeColors(mode, colors) {
        const settings = this.getSettings();
        if (!settings.ui.theme) {
            settings.ui.theme = this.getDefaultSettings().ui.theme;
        }
        settings.ui.theme.colors[mode] = { ...settings.ui.theme.colors[mode], ...colors };
        return settings;
    }

    /**
     * Apply theme to DOM
     */
    applyTheme() {
        try {
            // Ensure we have valid settings
            if (!this.currentSettings) {
                console.warn('No settings available, using defaults for theme');
                this.currentSettings = this.getDefaultSettings();
            }

            const themeColors = this.getCurrentThemeColors();
            const mode = this.getThemeMode();
            
            if (!themeColors) {
                console.warn('No theme colors available, using default light theme');
                const defaultSettings = this.getDefaultSettings();
                const lightColors = defaultSettings.ui.theme.colors.light;
                
                // Apply default light theme
                const root = document.documentElement;
                root.style.setProperty('--color-primary', lightColors.primary);
                root.style.setProperty('--color-secondary', lightColors.secondary);
                root.style.setProperty('--color-accent', lightColors.accent);
                root.style.setProperty('--color-border', lightColors.border);
                root.style.setProperty('--color-text', lightColors.text);
                root.style.setProperty('--color-text-secondary', lightColors.textSecondary);
                root.style.setProperty('--color-title-text', lightColors.titleText || lightColors.text);
                
                document.body.classList.remove('theme-light', 'theme-dark');
                document.body.classList.add('theme-light');
                return;
            }
            
            // Apply CSS custom properties
            const root = document.documentElement;
            root.style.setProperty('--color-primary', themeColors.primary);
            root.style.setProperty('--color-secondary', themeColors.secondary);
            root.style.setProperty('--color-accent', themeColors.accent);
            root.style.setProperty('--color-border', themeColors.border);
            root.style.setProperty('--color-text', themeColors.text);
            root.style.setProperty('--color-text-secondary', themeColors.textSecondary);
            root.style.setProperty('--color-title-text', themeColors.titleText || themeColors.text);
            
            // Apply theme class to body
            document.body.classList.remove('theme-light', 'theme-dark');
            document.body.classList.add(`theme-${mode}`);
            
            // Update Highlight.js theme
            this.updateHighlightTheme(mode);
            
            // Update Mermaid theme
            this.updateMermaidTheme(mode);
            
            if (window.location.hostname === 'localhost') {
                console.log(`Applied ${mode} theme:`, themeColors);
            }
        } catch (error) {
            console.error('Error applying theme:', error);
            // Fallback to safe default
            document.body.classList.remove('theme-light', 'theme-dark');
            document.body.classList.add('theme-light');
        }
    }

    /**
     * Toggle theme mode
     */
    toggleTheme() {
        const currentMode = this.getThemeMode();
        const newMode = currentMode === 'light' ? 'dark' : 'light';
        const settings = this.setThemeMode(newMode);
        this.updateSettingsLocally(settings);
        this.applyTheme();
        return newMode;
    }

    /**
     * Merge settings with defaults
     */
    mergeWithDefaults(settings) {
        const defaults = this.getDefaultSettings();
        const merged = JSON.parse(JSON.stringify(defaults));

        if (settings && settings.ui) {
            if (settings.ui.panels) {
                if (settings.ui.panels.left) {
                    Object.assign(merged.ui.panels.left, settings.ui.panels.left);
                }
                if (settings.ui.panels.right) {
                    Object.assign(merged.ui.panels.right, settings.ui.panels.right);
                }
            }
            if (settings.ui.theme) {
                if (settings.ui.theme.mode) {
                    merged.ui.theme.mode = settings.ui.theme.mode;
                }
                if (settings.ui.theme.colors) {
                    if (settings.ui.theme.colors.light) {
                        Object.assign(merged.ui.theme.colors.light, settings.ui.theme.colors.light);
                    }
                    if (settings.ui.theme.colors.dark) {
                        Object.assign(merged.ui.theme.colors.dark, settings.ui.theme.colors.dark);
                    }
                }
            }
        }

        return merged;
    }
    
    /**
     * Update Highlight.js theme based on current mode
     */
    updateHighlightTheme(mode) {
        try {
            const highlightTheme = document.getElementById('highlight-theme');
            if (highlightTheme) {
                const themeUrl = mode === 'dark' 
                    ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
                    : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
                
                highlightTheme.href = themeUrl;
                
                // Trigger re-highlighting of existing code blocks after theme loads
                highlightTheme.addEventListener('load', () => {
                    this.rehighlightCodeBlocks();
                }, { once: true });
            }
        } catch (error) {
            console.warn('Failed to update Highlight.js theme:', error);
        }
    }
    
    /**
     * Update Mermaid theme and re-render diagrams
     */
    updateMermaidTheme(mode) {
        try {
            if (typeof mermaid !== 'undefined') {
                const theme = mode === 'dark' ? 'dark' : 'default';
                
                // Reinitialize mermaid with new theme
                mermaid.initialize({
                    startOnLoad: false,
                    theme: theme,
                    securityLevel: 'loose',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                });
                
                // Re-render all Mermaid diagrams
                this.rerenderMermaidDiagrams();
            }
        } catch (error) {
            console.warn('Failed to update Mermaid theme:', error);
        }
    }
    
    /**
     * Re-highlight all code blocks in the document
     */
    rehighlightCodeBlocks() {
        try {
            if (typeof hljs !== 'undefined') {
                // Find all code blocks and re-highlight them
                const codeBlocks = document.querySelectorAll('pre code.hljs');
                codeBlocks.forEach(block => {
                    // Remove existing highlighting classes
                    block.className = block.className.replace(/hljs-\S+/g, '');
                    block.classList.add('hljs');
                    
                    // Re-apply highlighting
                    hljs.highlightElement(block);
                });
            }
        } catch (error) {
            console.warn('Failed to re-highlight code blocks:', error);
        }
    }
    
    /**
     * Re-render all Mermaid diagrams with new theme
     */
    rerenderMermaidDiagrams() {
        try {
            if (typeof mermaid !== 'undefined') {
                const mermaidElements = document.querySelectorAll('.mermaid');
                
                mermaidElements.forEach(async (element) => {
                    try {
                        // Get the original mermaid code from a data attribute or reconstruct
                        const container = element.closest('.mermaid-container');
                        if (container) {
                            const originalCode = container.getAttribute('data-mermaid-code');
                            if (originalCode) {
                                // Clear current content
                                element.innerHTML = '';
                                
                                // Re-render with new theme
                                const { svg } = await mermaid.render(element.id + '_graph', originalCode);
                                element.innerHTML = svg;
                            }
                        }
                    } catch (error) {
                        console.warn('Failed to re-render Mermaid diagram:', error);
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to re-render Mermaid diagrams:', error);
        }
    }
}

// Export for use in other modules
window.SettingsManager = SettingsManager;