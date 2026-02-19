/**
 * SyncPanel - 本地與 Google Drive 差異比較與同步面板
 *
 * 以 Overlay 形式覆蓋在現有頁面上，
 * 支援手動比較與自動觸發（切換至 Google Drive 模式時）。
 *
 * Feature: sync-files (Issue #19)
 */

class SyncPanel {
    constructor() {
        this.state = {
            isVisible: false,
            isComparing: false,
            isSyncing: false,
            comparisonResult: null,          // SyncComparisonResult | null
            userSelections: new Map(),       // Map<filePath, 'upload'|'download'|'skip'>
            filter: 'all',                   // 'all'|'local_only'|'cloud_only'|'different'|'same'
            syncProgress: null,              // { current, total } | null
            syncResult: null,                // SyncExecuteResult | null
            lastComparedAt: null,            // Date | null
        };

        this._overlay = null;
        this._init();
    }

    // ============================================================
    // 初始化
    // ============================================================

    _init() {
        this._createOverlay();
        this._bindEvents();
    }

    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'sync-panel-overlay';
        overlay.className = 'fixed inset-0 z-50 hidden';
        overlay.innerHTML = this._renderHTML();
        document.body.appendChild(overlay);
        this._overlay = overlay;
    }

    _renderHTML() {
        return `
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black bg-opacity-50"></div>

        <!-- 面板主體 -->
        <div class="absolute inset-4 md:inset-8 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <span class="text-xl">⇄</span>
                    <h2 class="text-lg font-semibold text-gray-800">本地 ↔ Google Drive 同步管理</h2>
                </div>
                <button id="sync-close-btn" class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Toolbar -->
            <div class="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <span id="sync-last-compared" class="text-sm text-gray-500">尚未比較</span>
                <button id="sync-compare-btn"
                        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span id="sync-compare-icon">🔄</span>
                    <span id="sync-compare-text">比較檔案</span>
                </button>
            </div>

            <!-- Summary Bar（比較前隱藏） -->
            <div id="sync-summary-bar" class="hidden flex-shrink-0 px-6 py-3 border-b border-gray-100 bg-blue-50">
                <div class="flex items-center gap-6 text-sm">
                    <button class="sync-filter-summary flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-medium" data-filter="local_only">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">僅本地</span>
                        <span id="summary-local-only">0</span>
                    </button>
                    <button class="sync-filter-summary flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-medium" data-filter="cloud_only">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">僅雲端</span>
                        <span id="summary-cloud-only">0</span>
                    </button>
                    <button class="sync-filter-summary flex items-center gap-1.5 text-yellow-700 hover:text-yellow-900 font-medium" data-filter="different">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 font-medium">不同</span>
                        <span id="summary-different">0</span>
                    </button>
                    <button class="sync-filter-summary flex items-center gap-1.5 text-green-700 hover:text-green-900 font-medium" data-filter="same">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">已同步</span>
                        <span id="summary-same">0</span>
                    </button>
                </div>
            </div>

            <!-- Filter Tabs（比較前隱藏） -->
            <div id="sync-filter-tabs" class="hidden flex-shrink-0 px-6 pt-3 border-b border-gray-100">
                <div class="flex gap-1">
                    <button class="sync-filter-tab px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors active" data-filter="all">全部</button>
                    <button class="sync-filter-tab px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors" data-filter="local_only">僅本地</button>
                    <button class="sync-filter-tab px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors" data-filter="cloud_only">僅雲端</button>
                    <button class="sync-filter-tab px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors" data-filter="different">不同</button>
                    <button class="sync-filter-tab px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors" data-filter="same">相同</button>
                </div>
            </div>

            <!-- 檔案表格 -->
            <div id="sync-table-container" class="flex-1 overflow-y-auto">
                <!-- 空白狀態 -->
                <div id="sync-empty-state" class="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                    <svg class="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                    </svg>
                    <p class="text-base font-medium">點擊「比較檔案」開始比較</p>
                    <p class="text-sm mt-1">將比較本地 data/ 目錄與 Google Drive 的所有計畫檔案</p>
                </div>

                <!-- 載入中狀態 -->
                <div id="sync-loading-state" class="hidden flex flex-col items-center justify-center h-full text-gray-500 py-16">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p class="text-base font-medium">正在比較檔案...</p>
                    <p class="text-sm text-gray-400 mt-1">使用 MD5 hash 比對本地與 Google Drive</p>
                </div>

                <!-- 結果表格 -->
                <div id="sync-result-container" class="hidden">
                    <!-- 無結果 -->
                    <div id="sync-no-result" class="hidden flex flex-col items-center justify-center py-12 text-gray-400">
                        <p class="text-sm">此篩選條件下沒有檔案</p>
                    </div>

                    <table id="sync-file-table" class="w-full text-sm">
                        <thead class="sticky top-0 bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-48">檔案路徑</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20">狀態</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-36">本地時間</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-36">雲端時間</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-28">行數差異</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">操作</th>
                            </tr>
                        </thead>
                        <tbody id="sync-table-body" class="divide-y divide-gray-100">
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div id="sync-footer" class="hidden flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <!-- 同步進度條（同步中顯示） -->
                <div id="sync-progress-bar" class="hidden mb-3">
                    <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>正在同步...</span>
                        <span id="sync-progress-text">0 / 0</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div id="sync-progress-fill" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>

                <!-- 同步結果（完成後顯示） -->
                <div id="sync-result-message" class="hidden text-sm mb-3"></div>

                <div class="flex items-center justify-between">
                    <div id="sync-footer-summary" class="text-sm text-gray-600">
                        <!-- 動態更新 -->
                    </div>
                    <button id="sync-execute-btn"
                            class="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        執行同步
                    </button>
                </div>
            </div>
        </div>
        `;
    }

    _bindEvents() {
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay.firstElementChild) {
                // 點擊背景遮罩關閉
                this.hide();
            }
        });

        this._overlay.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('#sync-close-btn');
            if (closeBtn) this.hide();

            const compareBtn = e.target.closest('#sync-compare-btn');
            if (compareBtn && !compareBtn.disabled) this.compareFiles();

            const executeBtn = e.target.closest('#sync-execute-btn');
            if (executeBtn && !executeBtn.disabled) this.executeSync();

            const filterTab = e.target.closest('.sync-filter-tab');
            if (filterTab) this._setFilter(filterTab.dataset.filter);

            const filterSummary = e.target.closest('.sync-filter-summary');
            if (filterSummary) this._setFilter(filterSummary.dataset.filter);

            const actionBtn = e.target.closest('[data-action-btn]');
            if (actionBtn) {
                const filePath = actionBtn.dataset.filePath;
                const action = actionBtn.dataset.action;
                this._setUserSelection(filePath, action);
            }

            // 點擊 DIFFERENT 列（非操作按鈕區域）→ 開啟 diff 對話框
            const diffRow = e.target.closest('[data-diff-path]');
            if (diffRow && !e.target.closest('[data-action-btn]')) {
                window.syncDiffModal?.open(diffRow.dataset.diffPath);
            }
        });

        // Escape 關閉
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isVisible) {
                this.hide();
            }
        });
    }

    // ============================================================
    // 生命週期
    // ============================================================

    show(autoCompare = false) {
        this.state.isVisible = true;
        this._overlay.classList.remove('hidden');

        if (autoCompare) {
            // 稍延遲讓面板動畫完成後再比較
            setTimeout(() => this.compareFiles(), 100);
        }
    }

    hide() {
        if (this.state.isSyncing) {
            if (!confirm('同步正在執行中，確定要關閉嗎？')) return;
        }
        this.state.isVisible = false;
        this._overlay.classList.add('hidden');
    }

    // ============================================================
    // 核心操作：比較
    // ============================================================

    async compareFiles() {
        if (this.state.isComparing) return;
        this.state.isComparing = true;
        this.state.comparisonResult = null;
        this.state.userSelections = new Map();
        this.state.filter = 'all';
        this.state.syncResult = null;

        this._showLoadingState();
        this._setCompareButtonLoading(true);

        try {
            const result = await window.planAPI.compareSync();
            this.state.comparisonResult = result;
            this.state.lastComparedAt = new Date();

            // 使用 suggested_action 作為預設選擇
            result.files.forEach(file => {
                this.state.userSelections.set(file.relative_path, file.suggested_action);
            });

            this._renderResult();
        } catch (error) {
            console.error('Compare failed:', error);
            this._showError(`比較失敗：${error.message}`);
        } finally {
            this.state.isComparing = false;
            this._setCompareButtonLoading(false);
            this._updateLastComparedTime();
        }
    }

    // ============================================================
    // 核心操作：執行同步
    // ============================================================

    async executeSync() {
        if (this.state.isSyncing || !this.state.comparisonResult) return;

        const operations = [];
        this.state.userSelections.forEach((action, filePath) => {
            if (action !== 'skip') {
                operations.push({ file_path: filePath, action });
            }
        });

        if (operations.length === 0) {
            alert('沒有需要執行的同步操作（所有檔案均設為跳過）');
            return;
        }

        this.state.isSyncing = true;
        this.state.syncProgress = { current: 0, total: operations.length };

        this._showSyncProgress();

        try {
            const result = await window.planAPI.executeSync(operations);
            this.state.syncResult = result;
            this._showSyncResult(result);
        } catch (error) {
            console.error('Sync execute failed:', error);
            this._showError(`同步執行失敗：${error.message}`);
        } finally {
            this.state.isSyncing = false;
            this._hideSyncProgress();
            this._updateExecuteButton();
        }
    }

    // ============================================================
    // UI：渲染
    // ============================================================

    _renderResult() {
        const result = this.state.comparisonResult;
        if (!result) return;

        // 更新統計摘要
        document.getElementById('summary-local-only').textContent = result.total_local_only;
        document.getElementById('summary-cloud-only').textContent = result.total_cloud_only;
        document.getElementById('summary-different').textContent = result.total_different;
        document.getElementById('summary-same').textContent = result.total_same;

        document.getElementById('sync-summary-bar').classList.remove('hidden');
        document.getElementById('sync-filter-tabs').classList.remove('hidden');
        document.getElementById('sync-empty-state').classList.add('hidden');
        document.getElementById('sync-loading-state').classList.add('hidden');
        document.getElementById('sync-result-container').classList.remove('hidden');
        document.getElementById('sync-footer').classList.remove('hidden');

        this._renderTable();
        this._updateFooterSummary();
        this._updateFilterTabs();
    }

    _renderTable() {
        const tbody = document.getElementById('sync-table-body');
        if (!tbody || !this.state.comparisonResult) return;

        const filter = this.state.filter;
        const files = this.state.comparisonResult.files.filter(f => {
            if (filter === 'all') return true;
            return f.status === filter;
        });

        const noResult = document.getElementById('sync-no-result');
        const table = document.getElementById('sync-file-table');

        if (files.length === 0) {
            noResult.classList.remove('hidden');
            table.classList.add('hidden');
            return;
        }

        noResult.classList.add('hidden');
        table.classList.remove('hidden');
        tbody.innerHTML = files.map(f => this._renderFileRow(f)).join('');
    }

    _renderFileRow(fileInfo) {
        const { relative_path, status, local_modified_at, cloud_modified_at, diff_stats } = fileInfo;
        const currentAction = this.state.userSelections.get(relative_path) || 'skip';

        const statusBadge = this._renderStatusBadge(status);
        const localTime = local_modified_at ? this._formatTime(local_modified_at) : '<span class="text-gray-300">—</span>';
        const cloudTime = cloud_modified_at ? this._formatTime(cloud_modified_at) : '<span class="text-gray-300">—</span>';
        const diffCell = this._renderDiffStats(status, diff_stats, fileInfo);
        const actionCell = this._renderActionToggle(relative_path, status, currentAction);

        // DIFFERENT 列加上 data-diff-path 使其可點擊開啟 diff 對話框
        const isDifferent = status === 'different';
        const diffAttr = isDifferent
            ? `data-diff-path="${this._escapeHtml(relative_path).replace(/"/g, '&quot;')}"`
            : '';
        const rowCursor = isDifferent ? 'cursor-pointer' : '';
        const rowTitle = isDifferent ? 'title="點擊查看詳細差異"' : '';

        return `
        <tr class="hover:bg-gray-50 transition-colors ${rowCursor}" ${diffAttr} ${rowTitle}>
            <td class="px-4 py-3 font-mono text-xs text-gray-700 align-middle">
                ${this._escapeHtml(relative_path)}
                ${isDifferent ? '<span class="ml-1 text-blue-400 text-[10px]">點擊查看差異 ↗</span>' : ''}
            </td>
            <td class="px-4 py-3 align-middle">${statusBadge}</td>
            <td class="px-4 py-3 text-xs text-gray-500 align-middle">${localTime}</td>
            <td class="px-4 py-3 text-xs text-gray-500 align-middle">${cloudTime}</td>
            <td class="px-4 py-3 align-middle">${diffCell}</td>
            <td class="px-4 py-3 align-middle">${actionCell}</td>
        </tr>
        `;
    }

    _renderStatusBadge(status) {
        const badges = {
            local_only:  '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium whitespace-nowrap">僅本地</span>',
            cloud_only:  '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium whitespace-nowrap">僅雲端</span>',
            different:   '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 font-medium">不同</span>',
            same:        '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">已同步</span>',
        };
        return badges[status] || status;
    }

    _renderDiffStats(status, diffStats, fileInfo) {
        if (status === 'same') {
            const lines = fileInfo.local_modified_at ? '—' : '—';
            return `<span class="text-xs text-gray-400">${lines}</span>`;
        }
        if (status === 'local_only') {
            return diffStats
                ? `<span class="text-xs text-gray-500">本地 ${diffStats.local_lines} 行</span>`
                : '<span class="text-xs text-gray-300">—</span>';
        }
        if (status === 'cloud_only') {
            return diffStats
                ? `<span class="text-xs text-gray-500">雲端 ${diffStats.cloud_lines} 行</span>`
                : '<span class="text-xs text-gray-300">—</span>';
        }
        if (status === 'different' && diffStats) {
            const addedPart = diffStats.added_lines > 0
                ? `<span class="text-green-600 font-medium">+${diffStats.added_lines}</span>`
                : '';
            const removedPart = diffStats.removed_lines > 0
                ? `<span class="text-red-600 font-medium">-${diffStats.removed_lines}</span>`
                : '';
            const lineInfo = `<span class="text-gray-400">(本地${diffStats.local_lines}/雲端${diffStats.cloud_lines}行)</span>`;
            const diff = [addedPart, removedPart].filter(Boolean).join(' ');
            return `<span class="text-xs flex flex-col gap-0.5">${diff || '<span class="text-yellow-600">內容修改</span>'} ${lineInfo}</span>`;
        }
        return '<span class="text-xs text-gray-300">—</span>';
    }

    _renderActionToggle(filePath, status, currentAction) {
        if (status === 'same') {
            return '<span class="text-xs text-gray-400 italic">已同步，無需操作</span>';
        }

        const escapedPath = this._escapeHtml(filePath).replace(/"/g, '&quot;');
        const btnBase = 'px-2.5 py-1 text-xs rounded font-medium border transition-colors';
        const activeUpload = currentAction === 'upload'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600';
        const activeDownload = currentAction === 'download'
            ? 'bg-purple-600 text-white border-purple-600'
            : 'bg-white text-gray-500 border-gray-300 hover:border-purple-400 hover:text-purple-600';
        const activeSkip = currentAction === 'skip'
            ? 'bg-gray-400 text-white border-gray-400'
            : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400';

        return `
        <div class="flex gap-1">
            <button class="${btnBase} ${activeUpload}"
                    data-action-btn data-file-path="${escapedPath}" data-action="upload"
                    title="上傳本地檔案至 Google Drive">↑ 上傳</button>
            <button class="${btnBase} ${activeDownload}"
                    data-action-btn data-file-path="${escapedPath}" data-action="download"
                    title="從 Google Drive 下載至本地">↓ 下載</button>
            <button class="${btnBase} ${activeSkip}"
                    data-action-btn data-file-path="${escapedPath}" data-action="skip"
                    title="跳過，保持不同步">✕ 跳過</button>
        </div>
        `;
    }

    // ============================================================
    // UI：狀態更新
    // ============================================================

    _showLoadingState() {
        document.getElementById('sync-empty-state').classList.add('hidden');
        document.getElementById('sync-loading-state').classList.remove('hidden');
        document.getElementById('sync-result-container').classList.add('hidden');
    }

    _showError(message) {
        document.getElementById('sync-loading-state').classList.add('hidden');
        document.getElementById('sync-empty-state').classList.remove('hidden');
        const emptyState = document.getElementById('sync-empty-state');
        emptyState.innerHTML = `
            <div class="text-red-500 text-base font-medium mb-2">比較失敗</div>
            <div class="text-sm text-gray-500">${this._escapeHtml(message)}</div>
            <button onclick="window.syncPanel && window.syncPanel.compareFiles()"
                    class="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                重試
            </button>
        `;
    }

    _setCompareButtonLoading(loading) {
        const btn = document.getElementById('sync-compare-btn');
        const icon = document.getElementById('sync-compare-icon');
        const text = document.getElementById('sync-compare-text');
        if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            icon.textContent = '⏳';
            text.textContent = '比較中...';
        } else {
            icon.textContent = '🔄';
            text.textContent = '比較檔案';
        }
    }

    _updateLastComparedTime() {
        const el = document.getElementById('sync-last-compared');
        if (el && this.state.lastComparedAt) {
            el.textContent = `上次比較：${this._formatTime(this.state.lastComparedAt.toISOString())}`;
        }
    }

    _updateFooterSummary() {
        const el = document.getElementById('sync-footer-summary');
        if (!el) return;

        let upload = 0, download = 0, skip = 0;
        this.state.userSelections.forEach(action => {
            if (action === 'upload') upload++;
            else if (action === 'download') download++;
            else skip++;
        });

        el.textContent = `上傳 ${upload} 個・下載 ${download} 個・跳過 ${skip} 個`;
        this._updateExecuteButton();
    }

    _updateExecuteButton() {
        const btn = document.getElementById('sync-execute-btn');
        if (!btn) return;
        const hasActions = [...this.state.userSelections.values()].some(a => a !== 'skip');
        btn.disabled = this.state.isSyncing || !hasActions;
    }

    _updateFilterTabs() {
        const tabs = this._overlay.querySelectorAll('.sync-filter-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.filter === this.state.filter;
            tab.className = `sync-filter-tab px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors ${
                isActive
                    ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
            }`;
        });
    }

    _showSyncProgress() {
        const bar = document.getElementById('sync-progress-bar');
        const executeBtn = document.getElementById('sync-execute-btn');
        const resultMsg = document.getElementById('sync-result-message');
        if (bar) bar.classList.remove('hidden');
        if (executeBtn) executeBtn.disabled = true;
        if (resultMsg) resultMsg.classList.add('hidden');
    }

    _hideSyncProgress() {
        const bar = document.getElementById('sync-progress-bar');
        if (bar) bar.classList.add('hidden');
    }

    _showSyncResult(result) {
        const el = document.getElementById('sync-result-message');
        if (!el) return;

        if (result.failed_count === 0) {
            el.innerHTML = `<span class="text-green-700 font-medium">✓ 同步完成！成功 ${result.success_count} 個操作</span>`;
        } else {
            const failedFiles = result.results
                .filter(r => !r.success)
                .map(r => `<li>${this._escapeHtml(r.file_path)}：${this._escapeHtml(r.error_message || '')}</li>`)
                .join('');
            el.innerHTML = `
                <div class="text-yellow-700 font-medium mb-1">⚠ 部分成功：成功 ${result.success_count} 個，失敗 ${result.failed_count} 個</div>
                <ul class="text-xs text-red-600 list-disc list-inside">${failedFiles}</ul>
            `;
        }

        el.classList.remove('hidden');

        // 同步完成後重新比較
        if (result.success_count > 0) {
            setTimeout(() => this.compareFiles(), 1500);
        }
    }

    // ============================================================
    // 狀態管理
    // ============================================================

    _setFilter(filter) {
        this.state.filter = filter;
        this._renderTable();
        this._updateFilterTabs();
    }

    _setUserSelection(filePath, action) {
        this.state.userSelections.set(filePath, action);
        // 重新渲染該列的 action toggle
        this._renderTable();
        this._updateFooterSummary();
    }

    // ============================================================
    // 工具方法
    // ============================================================

    _formatTime(isoString) {
        try {
            const d = new Date(isoString);
            return d.toLocaleString('zh-TW', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return isoString;
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
