// Date picker component for work plan calendar system

class DatePicker {
    constructor(options = {}) {
        this.onDateSelect = options.onDateSelect || (() => {});
        this.currentDate = options.currentDate || new Date();
        this.container = options.container;
        this.triggerElement = options.triggerElement;
        
        this.isVisible = false;
        this.pickerElement = null;
        
        this.init();
    }

    /**
     * Initialize date picker
     */
    init() {
        this.createPicker();
        this.bindEvents();
    }

    /**
     * Create date picker HTML
     */
    createPicker() {
        this.pickerElement = document.createElement('div');
        this.pickerElement.className = 'date-picker absolute bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 hidden';
        this.pickerElement.style.minWidth = '280px';
        
        this.render();
        
        // Append to container or body
        if (this.container) {
            this.container.appendChild(this.pickerElement);
        } else {
            document.body.appendChild(this.pickerElement);
        }
    }

    /**
     * Render calendar HTML
     */
    render() {
        const date = dayjs(this.currentDate);
        const year = date.year();
        const month = date.month();
        
        // Get first day of month and number of days
        const firstDay = dayjs().year(year).month(month).date(1);
        const lastDay = firstDay.endOf('month');
        const daysInMonth = lastDay.date();
        const startingDayOfWeek = firstDay.day(); // 0 = Sunday
        
        // Generate calendar HTML
        this.pickerElement.innerHTML = `
            <div class="date-picker-header flex items-center justify-between mb-4">
                <button class="prev-month-btn p-1 rounded transition-colors" type="button" style="color: var(--color-text);" onmouseover="this.style.backgroundColor='var(--color-secondary)'" onmouseout="this.style.backgroundColor='transparent'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                
                <div class="month-year-display flex items-center space-x-2">
                    <select class="month-select text-sm border rounded px-2 py-1" style="border-color: var(--color-border); background-color: var(--color-primary); color: var(--color-text);">
                        ${this.generateMonthOptions(month)}
                    </select>
                    <select class="year-select text-sm border rounded px-2 py-1" style="border-color: var(--color-border); background-color: var(--color-primary); color: var(--color-text);">
                        ${this.generateYearOptions(year)}
                    </select>
                </div>
                
                <button class="next-month-btn p-1 rounded transition-colors" type="button" style="color: var(--color-text);" onmouseover="this.style.backgroundColor='var(--color-secondary)'" onmouseout="this.style.backgroundColor='transparent'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>
            
            <div class="date-picker-calendar">
                <!-- Day headers -->
                <div class="grid grid-cols-7 gap-1 mb-2">
                    <div class="text-center text-xs font-medium text-gray-500 p-2">日</div>
                    <div class="text-center text-xs font-medium text-gray-500 p-2">一</div>
                    <div class="text-center text-xs font-medium text-gray-500 p-2">二</div>
                    <div class="text-center text-xs font-medium text-gray-500 p-2">三</div>
                    <div class="text-center text-xs font-medium text-gray-500 p-2">四</div>
                    <div class="text-center text-xs font-medium text-gray-500 p-2">五</div>
                    <div class="text-center text-xs font-medium text-gray-500 p-2">六</div>
                </div>
                
                <!-- Calendar days -->
                <div class="grid grid-cols-7 gap-1">
                    ${this.generateCalendarDays(year, month, daysInMonth, startingDayOfWeek)}
                </div>
            </div>
            
            <div class="date-picker-footer mt-4 flex justify-between items-center">
                <button class="today-btn text-sm text-blue-600 hover:text-blue-800" type="button">
                    今天
                </button>
                <button class="close-btn text-sm text-gray-600 hover:text-gray-800" type="button">
                    關閉
                </button>
            </div>
        `;
    }

    /**
     * Generate month options
     */
    generateMonthOptions(currentMonth) {
        const months = [
            '一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'
        ];
        
        return months.map((month, index) => 
            `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${month}</option>`
        ).join('');
    }

    /**
     * Generate year options
     */
    generateYearOptions(currentYear) {
        const startYear = currentYear - 10;
        const endYear = currentYear + 10;
        const options = [];
        
        for (let year = startYear; year <= endYear; year++) {
            options.push(
                `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
            );
        }
        
        return options.join('');
    }

    /**
     * Generate calendar days
     */
    generateCalendarDays(year, month, daysInMonth, startingDayOfWeek) {
        const today = dayjs();
        const currentDate = dayjs(this.currentDate);
        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push('<div class="p-2"></div>');
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = dayjs().year(year).month(month).date(day);
            const isToday = date.isSame(today, 'day');
            const isSelected = date.isSame(currentDate, 'day');
            
            let classes = 'p-2 text-center text-sm cursor-pointer rounded hover:bg-blue-100';
            
            if (isToday) {
                classes += ' bg-blue-500 text-white hover:bg-blue-600';
            } else if (isSelected) {
                classes += ' bg-blue-200 text-blue-800';
            }
            
            days.push(
                `<div class="${classes}" data-date="${date.format('YYYY-MM-DD')}">${day}</div>`
            );
        }
        
        return days.join('');
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Month/year navigation
        this.pickerElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('prev-month-btn') || e.target.closest('.prev-month-btn')) {
                this.previousMonth();
            } else if (e.target.classList.contains('next-month-btn') || e.target.closest('.next-month-btn')) {
                this.nextMonth();
            } else if (e.target.classList.contains('today-btn')) {
                this.selectToday();
            } else if (e.target.classList.contains('close-btn')) {
                this.hide();
            } else if (e.target.dataset.date) {
                this.selectDate(e.target.dataset.date);
            }
        });

        // Month/year select changes
        this.pickerElement.addEventListener('change', (e) => {
            if (e.target.classList.contains('month-select') || e.target.classList.contains('year-select')) {
                this.updateCalendar();
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.pickerElement.contains(e.target) && 
                (!this.triggerElement || !this.triggerElement.contains(e.target))) {
                this.hide();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Show date picker
     */
    show(triggerElement) {
        if (triggerElement) {
            this.triggerElement = triggerElement;
            this.positionNear(triggerElement);
        }
        
        this.pickerElement.classList.remove('hidden');
        this.isVisible = true;
    }

    /**
     * Hide date picker
     */
    hide() {
        this.pickerElement.classList.add('hidden');
        this.isVisible = false;
    }

    /**
     * Position picker near trigger element
     */
    positionNear(element) {
        const rect = element.getBoundingClientRect();
        const pickerRect = this.pickerElement.getBoundingClientRect();
        
        let top = rect.bottom + window.scrollY + 5;
        let left = rect.left + window.scrollX;
        
        // Adjust if picker would go off screen
        if (left + pickerRect.width > window.innerWidth) {
            left = window.innerWidth - pickerRect.width - 10;
        }
        
        if (top + pickerRect.height > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - pickerRect.height - 5;
        }
        
        this.pickerElement.style.position = 'absolute';
        this.pickerElement.style.top = `${top}px`;
        this.pickerElement.style.left = `${left}px`;
    }

    /**
     * Previous month
     */
    previousMonth() {
        const date = dayjs(this.currentDate).subtract(1, 'month');
        this.currentDate = date.toDate();
        this.render();
    }

    /**
     * Next month
     */
    nextMonth() {
        const date = dayjs(this.currentDate).add(1, 'month');
        this.currentDate = date.toDate();
        this.render();
    }

    /**
     * Update calendar based on select values
     */
    updateCalendar() {
        const monthSelect = this.pickerElement.querySelector('.month-select');
        const yearSelect = this.pickerElement.querySelector('.year-select');
        
        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        
        this.currentDate = dayjs().year(year).month(month).date(1).toDate();
        this.render();
    }

    /**
     * Select today
     */
    selectToday() {
        this.selectDate(dayjs().format('YYYY-MM-DD'));
    }

    /**
     * Select specific date
     */
    selectDate(dateString) {
        const date = dayjs(dateString).toDate();
        this.currentDate = date;
        this.onDateSelect(date);
        this.hide();
    }

    /**
     * Set current date
     */
    setDate(date) {
        this.currentDate = new Date(date);
        if (this.isVisible) {
            this.render();
        }
    }

    /**
     * Get current date
     */
    getDate() {
        return this.currentDate;
    }

    /**
     * Destroy date picker
     */
    destroy() {
        if (this.pickerElement) {
            this.pickerElement.remove();
        }
    }
}

// Export for use in other modules
window.DatePicker = DatePicker;