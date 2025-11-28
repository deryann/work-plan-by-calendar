// Calendar Quick View Modal component

class CalendarModal {
    constructor(app) {
        this.app = app; // Reference to WorkPlanApp
        this.modal = document.getElementById('calendar-modal');
        this.gridElement = document.getElementById('calendar-grid');
        this.monthYearElement = document.getElementById('calendar-month-year');
        this.isVisible = false;
        this.currentDate = new Date();
        this.plansCache = {}; // Cache for plan existence data

        this.init();
    }

    /**
     * Initialize modal event listeners
     */
    init() {
        if (!this.modal) {
            console.error('Calendar modal element not found');
            return;
        }

        this.bindEvents();
        this.bindGlobalKeyboard();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button
        const closeBtn = document.getElementById('calendar-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Previous month button
        const prevBtn = document.getElementById('calendar-prev-month');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.navigateMonth(-1);
            });
        }

        // Next month button
        const nextBtn = document.getElementById('calendar-next-month');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.navigateMonth(1);
            });
        }

        // Today button
        const todayBtn = document.getElementById('calendar-today');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.goToToday();
            });
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Keyboard navigation in modal
        document.addEventListener('keydown', (e) => {
            if (this.isVisible) {
                if (e.key === 'Escape') {
                    this.hide();
                } else if (e.key === 'ArrowLeft') {
                    this.navigateMonth(-1);
                } else if (e.key === 'ArrowRight') {
                    this.navigateMonth(1);
                }
            }
        });
    }

    /**
     * Bind global keyboard shortcut (Ctrl+K / Cmd+K)
     */
    bindGlobalKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * Show the modal
     */
    async show() {
        if (!this.modal) return;

        this.isVisible = true;
        this.currentDate = this.app ? new Date(this.app.currentDate) : new Date();

        this.modal.classList.remove('hidden');
        this.modal.setAttribute('aria-hidden', 'false');

        await this.renderCalendar();
    }

    /**
     * Hide the modal
     */
    hide() {
        if (!this.modal) return;

        this.isVisible = false;
        this.modal.classList.add('hidden');
        this.modal.setAttribute('aria-hidden', 'true');
    }

    /**
     * Toggle modal visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Navigate to previous or next month
     */
    async navigateMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        await this.renderCalendar();
    }

    /**
     * Go to today
     */
    async goToToday() {
        this.currentDate = this.app ? new Date(this.app.currentDate) : new Date();
        await this.renderCalendar();
    }

    /**
     * Render the calendar
     */
    async renderCalendar() {
        if (!this.gridElement) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Update month/year display
        this.updateMonthYearDisplay(year, month);

        // Get plan existence data for this month
        const plansData = await this.fetchMonthPlans(year, month);

        // Generate calendar HTML
        const calendarHTML = this.generateCalendarHTML(year, month, plansData);
        this.gridElement.innerHTML = calendarHTML;

        // Bind click events to date cells
        this.bindDateCellEvents();
    }

    /**
     * Update month/year display
     */
    updateMonthYearDisplay(year, month) {
        if (!this.monthYearElement) return;

        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                           '7月', '8月', '9月', '10月', '11月', '12月'];

        this.monthYearElement.textContent = `${year}年 ${monthNames[month]}`;
    }

    /**
     * Fetch plan existence data for a month
     */
    async fetchMonthPlans(year, month) {
        const cacheKey = `${year}-${month}`;

        // Return cached data if available
        if (this.plansCache[cacheKey]) {
            return this.plansCache[cacheKey];
        }

        try {
            // Get first and last day of the month
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);

            // Extend to cover the visible calendar (previous/next month days)
            const calendarStart = new Date(firstDay);
            calendarStart.setDate(calendarStart.getDate() - firstDay.getDay());

            const calendarEnd = new Date(lastDay);
            calendarEnd.setDate(calendarEnd.getDate() + (6 - lastDay.getDay()));

            // Fetch plan existence data
            const plansData = await planAPI.getPlansExistence(
                Utils.formatDate(calendarStart),
                Utils.formatDate(calendarEnd)
            );

            // Cache the result
            this.plansCache[cacheKey] = plansData;

            return plansData;
        } catch (error) {
            console.error('Failed to fetch plans data:', error);
            return {};
        }
    }

    /**
     * Generate calendar HTML
     */
    generateCalendarHTML(year, month, plansData) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        let html = '<div class="grid grid-cols-7 gap-2">';

        // Weekday headers
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        for (const day of weekdays) {
            html += `<div class="text-center font-semibold text-gray-600 py-2">${day}</div>`;
        }

        // Previous month's trailing days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const date = new Date(year, month - 1, day);
            html += this.renderDayCell(date, true, plansData);
        }

        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            html += this.renderDayCell(date, false, plansData);
        }

        // Next month's leading days
        const totalCells = startDayOfWeek + daysInMonth;
        const remainingCells = Math.ceil(totalCells / 7) * 7 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(year, month + 1, day);
            html += this.renderDayCell(date, true, plansData);
        }

        html += '</div>';
        return html;
    }

    /**
     * Render a single day cell
     */
    renderDayCell(date, isOtherMonth, plansData) {
        const dateStr = Utils.formatDate(date);
        const dayPlans = plansData[dateStr] || {};

        const isToday = this.isToday(date);
        const isCurrentMonth = !isOtherMonth;

        // Determine cell styling
        let cellClass = 'calendar-day-cell relative p-3 rounded-lg border transition-all cursor-pointer ';
        cellClass += isCurrentMonth ? 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md ' : 'bg-gray-50 border-gray-100 text-gray-400 ';
        cellClass += isToday ? 'ring-2 ring-blue-500 ' : '';

        // Generate plan indicators
        const indicators = this.renderPlanIndicators(dayPlans);

        return `
            <div class="${cellClass}" data-date="${dateStr}" title="點擊跳轉到 ${dateStr}">
                <div class="text-right font-medium ${isToday ? 'text-blue-600 font-bold' : ''}">${date.getDate()}</div>
                <div class="flex justify-center items-center space-x-1 mt-2 min-h-[12px]">
                    ${indicators}
                </div>
            </div>
        `;
    }

    /**
     * Render plan indicators (colored dots)
     */
    renderPlanIndicators(dayPlans) {
        let html = '';

        // Year plan - Blue
        if (dayPlans.year) {
            html += '<div class="w-2 h-2 rounded-full bg-blue-500" title="年計劃"></div>';
        }

        // Month plan - Green
        if (dayPlans.month) {
            html += '<div class="w-2 h-2 rounded-full bg-green-500" title="月計劃"></div>';
        }

        // Week plan - Yellow
        if (dayPlans.week) {
            html += '<div class="w-2 h-2 rounded-full bg-yellow-500" title="週計劃"></div>';
        }

        // Day plan - Red
        if (dayPlans.day) {
            html += '<div class="w-2 h-2 rounded-full bg-red-500" title="日計劃"></div>';
        }

        return html;
    }

    /**
     * Check if a date is today
     */
    isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    /**
     * Bind click events to date cells
     */
    bindDateCellEvents() {
        const dayCells = this.gridElement.querySelectorAll('.calendar-day-cell');

        dayCells.forEach(cell => {
            cell.addEventListener('click', () => {
                const dateStr = cell.getAttribute('data-date');
                if (dateStr) {
                    this.onDateClick(dateStr);
                }
            });
        });
    }

    /**
     * Handle date cell click
     */
    async onDateClick(dateStr) {
        try {
            const date = Utils.parseDate(dateStr);

            // Close the calendar modal
            this.hide();

            // Navigate to the selected date in the main app
            if (this.app && typeof this.app.setCurrentDate === 'function') {
                await this.app.setCurrentDate(date);
                Utils.showSuccess(`已跳轉到 ${dateStr}`);
            }
        } catch (error) {
            console.error('Failed to navigate to date:', error);
            Utils.showError(`跳轉失敗: ${error.message}`);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.plansCache = {};
    }
}

// Export for use in other modules
window.CalendarModal = CalendarModal;
