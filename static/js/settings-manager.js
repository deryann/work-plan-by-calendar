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
     * Merge settings with defaults
     */
    mergeWithDefaults(settings) {
        const defaults = this.getDefaultSettings();
        const merged = JSON.parse(JSON.stringify(defaults));

        if (settings && settings.ui && settings.ui.panels) {
            if (settings.ui.panels.left) {
                Object.assign(merged.ui.panels.left, settings.ui.panels.left);
            }
            if (settings.ui.panels.right) {
                Object.assign(merged.ui.panels.right, settings.ui.panels.right);
            }
        }

        return merged;
    }
}

// Export for use in other modules
window.SettingsManager = SettingsManager;