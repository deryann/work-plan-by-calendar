/**
 * About Modal Component
 * Displays application version information and logo
 */
class AboutModal {
    constructor() {
        this.modal = null;
        this.versionData = null;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
        this.loadVersionInfo();
    }

    createModal() {
        const modalHTML = `
            <div id="aboutModal" class="fixed inset-0 bg-opacity-50 hidden z-50 flex items-center justify-center" style="background-color: rgba(0,0,0,0.5);">
                <div class="rounded-lg shadow-xl max-w-md w-full mx-4" style="background-color: var(--color-primary);">
                    <div class="px-6 py-4 border-b" style="border-color: var(--color-border);">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-medium" style="color: var(--color-text);">關於 Work Planner</h3>
                            <button id="closeAboutModal" style="color: var(--color-text-secondary);" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-secondary)'">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="px-6 py-4">
                        <div class="text-center mb-4">
                            <img src="/static/png/work_planner.png" alt="Work Planner" class="mx-auto w-32 h-40 object-cover rounded-lg shadow-md">
                        </div>
                        <div class="space-y-3">
                            <div class="text-center">
                                <h4 class="text-xl font-semibold mb-2" style="color: var(--color-text);">Work Plan Calendar</h4>
                                <p class="text-sm" style="color: var(--color-text-secondary);">階層式工作計畫管理系統</p>
                            </div>
                            <div class="border-t pt-3" style="border-color: var(--color-border);">
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                    <div style="color: var(--color-text-secondary);">專案名稱:</div>
                                    <div id="projectName" class="font-medium" style="color: var(--color-text);">載入中...</div>
                                    
                                    <div style="color: var(--color-text-secondary);">版本:</div>
                                    <div id="appVersion" class="font-medium" style="color: var(--color-text);">載入中...</div>
                                    
                                    <div style="color: var(--color-text-secondary);">版本編號:</div>
                                    <div id="commitHash" class="font-mono text-xs" style="color: var(--color-text-secondary);">載入中...</div>
                                    
                                    <div style="color: var(--color-text-secondary);">建構時間:</div>
                                    <div id="buildTime" class="text-xs" style="color: var(--color-text-secondary);">載入中...</div>
                                </div>
                            </div>
                            <div class="border-t pt-3" style="border-color: var(--color-border);">
                                <div class="text-xs text-center" style="color: var(--color-text-secondary);">
                                    <p>支援 年/月/週/日 階層式計畫管理</p>
                                    <p>快速編輯與預覽 Markdown 格式內容</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('aboutModal');
    }

    bindEvents() {
        // Close modal events
        const closeBtn = document.getElementById('closeAboutModal');
        closeBtn?.addEventListener('click', () => this.hide());
        
        // Click outside to close
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    async loadVersionInfo() {
        try {
            const response = await fetch('/api/version');
            if (response.ok) {
                this.versionData = await response.json();
                this.updateVersionDisplay();
            } else {
                console.warn('Failed to load version info:', response.status);
                this.showDefaultVersion();
            }
        } catch (error) {
            console.error('Error loading version info:', error);
            this.showDefaultVersion();
        }
    }

    updateVersionDisplay() {
        const elements = {
            projectName: document.getElementById('projectName'),
            appVersion: document.getElementById('appVersion'),
            commitHash: document.getElementById('commitHash'),
            buildTime: document.getElementById('buildTime')
        };

        if (this.versionData) {
            elements.projectName.textContent = this.versionData.project_name || 'work-plan-calendar';
            elements.appVersion.textContent = this.versionData.version || 'dev';
            elements.commitHash.textContent = this.versionData.commit_hash || 'dev';
            elements.buildTime.textContent = this.versionData.build_time || '開發版本';
        }
    }

    showDefaultVersion() {
        const elements = {
            projectName: document.getElementById('projectName'),
            appVersion: document.getElementById('appVersion'),
            commitHash: document.getElementById('commitHash'),
            buildTime: document.getElementById('buildTime')
        };

        elements.projectName.textContent = 'work-plan-calendar';
        elements.appVersion.textContent = 'dev';
        elements.commitHash.textContent = 'dev';
        elements.buildTime.textContent = '開發版本';
    }

    show() {
        this.modal?.classList.remove('hidden');
        // Reload version info when showing
        this.loadVersionInfo();
    }

    hide() {
        this.modal?.classList.add('hidden');
    }

    toggle() {
        if (this.modal?.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }
}

// Initialize About Modal when DOM is loaded
let aboutModal = null;

document.addEventListener('DOMContentLoaded', () => {
    aboutModal = new AboutModal();
});

// Export for use by other modules
window.AboutModal = AboutModal;