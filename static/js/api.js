// API client for work plan calendar system

class PlanAPI {
    constructor(baseURL) {
        // Auto-detect base URL if not provided
        if (!baseURL) {
            if (window.location.protocol === 'file:') {
                this.baseURL = 'http://localhost:8000';
            } else {
                this.baseURL = window.location.origin;
            }
        } else {
            this.baseURL = baseURL;
        }
    }

    /**
     * Make HTTP request with error handling
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise<any>} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Get plan content
     * @param {string} planType - Plan type (year, month, week, day)
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<object>} Plan data
     */
    async getPlan(planType, date) {
        return await this.request(`/plans/${planType}/${date}`);
    }

    /**
     * Create new plan
     * @param {string} planType - Plan type
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} content - Plan content
     * @returns {Promise<object>} Created plan data
     */
    async createPlan(planType, date, content) {
        return await this.request(`/plans/${planType}/${date}`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    /**
     * Update existing plan
     * @param {string} planType - Plan type
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} content - Updated plan content
     * @returns {Promise<object>} Updated plan data
     */
    async updatePlan(planType, date, content) {
        return await this.request(`/plans/${planType}/${date}`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
    }

    /**
     * Delete plan
     * @param {string} planType - Plan type
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<object>} Deletion result
     */
    async deletePlan(planType, date) {
        return await this.request(`/plans/${planType}/${date}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get previous period plan
     * @param {string} planType - Plan type
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<object>} Previous plan data
     */
    async getPreviousPlan(planType, date) {
        return await this.request(`/plans/${planType}/${date}/previous`);
    }

    /**
     * Get next period plan
     * @param {string} planType - Plan type
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<object>} Next plan data
     */
    async getNextPlan(planType, date) {
        return await this.request(`/plans/${planType}/${date}/next`);
    }

    /**
     * Get all plans for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<object>} All plans data
     */
    async getAllPlansForDate(date) {
        return await this.request(`/plans/all/${date}`);
    }

    /**
     * Copy content between plans
     * @param {object} copyRequest - Copy request data
     * @returns {Promise<object>} Result plan data
     */
    async copyContent(copyRequest) {
        return await this.request('/plans/copy', {
            method: 'POST',
            body: JSON.stringify(copyRequest)
        });
    }

    /**
     * Check if plan exists
     * @param {string} planType - Plan type
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<boolean>} True if plan exists
     */
    async planExists(planType, date) {
        try {
            const response = await this.request(`/plans/${planType}/${date}/exists`);
            return response.exists;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get all settings
     * @returns {Promise<object>} Settings object
     */
    async getSettings() {
        return await this.request('/settings');
    }

    /**
     * Get UI settings
     * @returns {Promise<object>} UI settings object
     */
    async getUISettings() {
        return await this.request('/settings/ui');
    }

    /**
     * Update settings
     * @param {object} settings - Settings object
     * @returns {Promise<object>} Updated settings
     */
    async updateSettings(settings) {
        return await this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    /**
     * Update UI settings
     * @param {object} uiSettings - UI settings object
     * @returns {Promise<object>} Updated settings
     */
    async updateUISettings(uiSettings) {
        return await this.request('/settings/ui', {
            method: 'PUT',
            body: JSON.stringify(uiSettings)
        });
    }

    /**
     * Reset settings to defaults
     * @returns {Promise<object>} Default settings
     */
    async resetSettings() {
        return await this.request('/settings/reset', {
            method: 'POST'
        });
    }

    /**
     * Health check
     * @returns {Promise<object>} Health status
     */
    async healthCheck() {
        return await this.request('/health');
    }

    /**
     * Export all plan data as ZIP file
     * @returns {Promise<object>} Export response with download URL
     */
    async exportData() {
        const response = await fetch(`${this.baseURL}/api/export/create`, {
            method: 'POST'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || '匯出失敗');
        }
        return await response.json();
    }

    /**
     * Trigger browser download of exported ZIP file
     * @param {string} filename - ZIP filename to download
     */
    downloadExport(filename) {
        const downloadUrl = `${this.baseURL}/api/export/download/${filename}`;
        window.location.href = downloadUrl;
    }

    /**
     * Validate import ZIP file
     * @param {File} file - ZIP file to validate
     * @returns {Promise<object>} Validation result with errors/warnings
     */
    async validateImport(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseURL}/api/import/validate`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || '驗證失敗');
        }
        
        return await response.json();
    }

    /**
     * Execute data import (with validation, backup, and rollback)
     * @param {File} file - ZIP file to import
     * @returns {Promise<object>} Import result with file count and overwritten count
     */
    async executeImport(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseURL}/api/import/execute`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || '匯入失敗');
        }
        
        return await response.json();
    }
}

// API client singleton
const planAPI = new PlanAPI();

// Export for use in other modules
window.PlanAPI = PlanAPI;
window.planAPI = planAPI;