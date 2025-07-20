// API client for work plan calendar system

class PlanAPI {
    constructor(baseURL = 'http://localhost:8000') {
        this.baseURL = baseURL;
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
     * Health check
     * @returns {Promise<object>} Health status
     */
    async healthCheck() {
        return await this.request('/health');
    }
}

// API client singleton
const planAPI = new PlanAPI();

// Export for use in other modules
window.PlanAPI = PlanAPI;
window.planAPI = planAPI;