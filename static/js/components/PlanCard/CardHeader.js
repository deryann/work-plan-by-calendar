// CardHeader component - simplified header for focused layout cards

class CardHeader {
    constructor(card) {
        this.card = card;
        this.element = null;
    }

    /**
     * Get plan type display name
     */
    getTypeName() {
        const names = {
            day: '今日計畫',
            week: '本週計畫',
            month: '本月計畫',
            year: '年度計畫'
        };
        return names[this.card.type] || '計畫';
    }

    /**
     * Get date display text
     */
    getDateDisplay() {
        const d = dayjs(this.card.date);
        switch (this.card.type) {
            case 'day':
                return d.format('MM/DD');
            case 'week': {
                const weekEnd = Utils.getWeekEnd(this.card.date);
                return `${d.format('MM/DD')}~${dayjs(weekEnd).format('MM/DD')}`;
            }
            case 'month':
                return d.format('YYYY-MM');
            case 'year':
                return d.format('YYYY');
            default:
                return '';
        }
    }

    /**
     * Render header HTML
     */
    render() {
        const isExpanded = this.card.isExpanded;
        const chevronRotation = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';

        return `
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 0.75rem; cursor: pointer; user-select: none; background: var(--color-secondary); border-bottom: ${isExpanded ? '1px solid var(--color-border)' : 'none'}; border-radius: ${isExpanded ? '0.5rem 0.5rem 0 0' : '0.5rem'}; transition: background 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1;">
                    <!-- Status indicator -->
                    <span class="status-indicator panel-status-saved" style="width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0;"></span>

                    <!-- Type name -->
                    <span style="font-weight: 600; font-size: 0.875rem; color: var(--color-title-text); white-space: nowrap;">${this.getTypeName()}</span>

                    <!-- Date display -->
                    <span style="font-size: 0.8125rem; color: var(--color-text-secondary); white-space: nowrap;">${this.getDateDisplay()}</span>
                </div>

                <div style="display: flex; align-items: center; gap: 0.375rem; flex-shrink: 0;">
                    <!-- Compare button -->
                    <button class="card-compare-btn nav-btn" title="比較歷史" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;" onclick="event.stopPropagation()">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        <span class="hidden sm:inline">比較</span>
                    </button>

                    <!-- Expand/Collapse chevron -->
                    <svg class="card-chevron" style="width: 1rem; height: 1rem; color: var(--color-text-secondary); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); transform: ${chevronRotation};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        `;
    }

    /**
     * Bind events to the rendered header
     */
    bindEvents(cardElement) {
        this.element = cardElement.querySelector('.card-header');

        // Click header to toggle expand/collapse
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('.card-compare-btn')) return;
            this.card.toggleExpand();
        });

        // Compare button
        const compareBtn = cardElement.querySelector('.card-compare-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.card.openHistory();
            });
        }

        // Double-click for focus mode
        this.element.addEventListener('dblclick', (e) => {
            if (e.target.closest('.card-compare-btn')) return;
            e.preventDefault();
            this.card.toggleFocusMode();
        });
    }

    /**
     * Update status indicator
     */
    updateStatus(status) {
        const indicator = this.card.cardElement.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator panel-status-${status}`;
        }
    }

    /**
     * Update chevron rotation
     */
    updateChevron(isExpanded) {
        const chevron = this.card.cardElement.querySelector('.card-chevron');
        if (chevron) {
            chevron.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
        }
        // Update header border
        if (this.element) {
            this.element.style.borderBottom = isExpanded ? '1px solid var(--color-border)' : 'none';
            this.element.style.borderRadius = isExpanded ? '0.5rem 0.5rem 0 0' : '0.5rem';
        }
    }

    /**
     * Update date display
     */
    updateDateDisplay() {
        const dateEl = this.card.cardElement.querySelector('.card-header span:nth-child(3)');
        if (dateEl) {
            dateEl.textContent = this.getDateDisplay();
        }
    }
}

window.CardHeader = CardHeader;
