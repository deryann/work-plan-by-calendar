// Utility functions for work plan calendar system

class Utils {
    /**
     * Show loading overlay
     */
    static showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    static hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Show error toast
     * @param {string} message - Error message to display
     * @param {number} duration - Duration in milliseconds (default: 5000)
     */
    static showError(message, duration = 5000) {
        const toast = document.getElementById('error-toast');
        const messageEl = document.getElementById('error-message');
        
        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, duration);
        }
    }

    /**
     * Show success toast
     * @param {string} message - Success message to display
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    static showSuccess(message, duration = 3000) {
        const toast = document.getElementById('success-toast');
        const messageEl = document.getElementById('success-message');
        
        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, duration);
        }
    }

    /**
     * Format date to YYYY-MM-DD string
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    static formatDate(date) {
        return dayjs(date).format('YYYY-MM-DD');
    }

    /**
     * Parse date string to Date object
     * @param {string} dateString - Date string in YYYY-MM-DD format
     * @returns {Date} Date object
     */
    static parseDate(dateString) {
        return dayjs(dateString).toDate();
    }

    /**
     * Get week start date (Sunday) for a given date
     * @param {Date} date - Target date
     * @returns {Date} Week start date
     */
    static getWeekStart(date) {
        const d = dayjs(date);
        const dayOfWeek = d.day(); // 0 = Sunday, 1 = Monday, etc.
        return d.subtract(dayOfWeek, 'day').toDate();
    }

    /**
     * Get week end date (Saturday) for a given date
     * @param {Date} date - Target date
     * @returns {Date} Week end date
     */
    static getWeekEnd(date) {
        const weekStart = Utils.getWeekStart(date);
        return dayjs(weekStart).add(6, 'day').toDate();
    }

    /**
     * Format plan title based on type and date
     * @param {string} planType - Plan type (year, month, week, day)
     * @param {Date} date - Target date
     * @returns {string} Formatted title
     */
    static formatPlanTitle(planType, date) {
        const d = dayjs(date);
        
        switch (planType) {
            case 'year':
                return `${d.format('YYYY')} 年度計畫`;
            case 'month':
                return `${d.format('YYYY-MM')} 月度計畫`;
            case 'week':
                const weekStart = Utils.getWeekStart(date);
                const weekEnd = Utils.getWeekEnd(date);
                return `${Utils.formatDate(weekStart)}~${Utils.formatDate(weekEnd)} 週計畫`;
            case 'day':
                return `${d.format('YYYY-MM-DD')} 日計畫`;
            default:
                return '未知計畫';
        }
    }

    /**
     * Get previous period date
     * @param {string} planType - Plan type
     * @param {Date} date - Current date
     * @returns {Date} Previous period date
     */
    static getPreviousPeriod(planType, date) {
        const d = dayjs(date);
        
        switch (planType) {
            case 'year':
                return d.subtract(1, 'year').startOf('year').toDate();
            case 'month':
                return d.subtract(1, 'month').startOf('month').toDate();
            case 'week':
                const weekStart = Utils.getWeekStart(date);
                return dayjs(weekStart).subtract(7, 'day').toDate();
            case 'day':
                return d.subtract(1, 'day').toDate();
            default:
                return date;
        }
    }

    /**
     * Get next period date
     * @param {string} planType - Plan type
     * @param {Date} date - Current date
     * @returns {Date} Next period date
     */
    static getNextPeriod(planType, date) {
        const d = dayjs(date);
        
        switch (planType) {
            case 'year':
                return d.add(1, 'year').startOf('year').toDate();
            case 'month':
                return d.add(1, 'month').startOf('month').toDate();
            case 'week':
                const weekStart = Utils.getWeekStart(date);
                return dayjs(weekStart).add(7, 'day').toDate();
            case 'day':
                return d.add(1, 'day').toDate();
            default:
                return date;
        }
    }

    /**
     * Get canonical date for plan type
     * @param {string} planType - Plan type
     * @param {Date} date - Target date
     * @returns {Date} Canonical date
     */
    static getCanonicalDate(planType, date) {
        const d = dayjs(date);
        
        switch (planType) {
            case 'year':
                return d.startOf('year').toDate();
            case 'month':
                return d.startOf('month').toDate();
            case 'week':
                return Utils.getWeekStart(date);
            case 'day':
                return date;
            default:
                return date;
        }
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if visible
     */
    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Smooth scroll to element
     * @param {HTMLElement} element - Element to scroll to
     */
    static scrollToElement(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }

    /**
     * Get current date/time string for display
     * @returns {string} Formatted current date/time
     */
    static getCurrentDateTime() {
        return dayjs().format('YYYY-MM-DD HH:mm:ss');
    }

    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     */
    static saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
        }
    }

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Loaded data or default value
     */
    static loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (err) {
            console.error('Failed to load from localStorage:', err);
            return defaultValue;
        }
    }
}