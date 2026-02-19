/**
 * SyncDiffModal - 本地與 Google Drive 單一檔案差異對話框
 *
 * 點擊 SyncPanel 中 DIFFERENT 狀態的檔案列後開啟，
 * 以左右並排方式顯示本地與雲端內容差異（紅/綠底色標示）。
 *
 * Feature: sync-files diff view
 */

class SyncDiffModal {
    constructor() {
        this._modal = null;
        this._currentFilePath = null;
        this._init();
    }

    // ============================================================
    // 初始化
    // ============================================================

    _init() {
        const modal = document.createElement('div');
        modal.id = 'sync-diff-modal';
        modal.className = 'fixed inset-0 z-60 hidden';
        modal.style.zIndex = '60';  // 高於 SyncPanel 的 z-50
        modal.innerHTML = this._renderHTML();
        document.body.appendChild(modal);
        this._modal = modal;
        this._bindEvents();
    }

    _renderHTML() {
        return `
        <!-- 背景遮罩 -->
        <div id="sync-diff-backdrop" class="absolute inset-0 bg-black bg-opacity-60"></div>

        <!-- 對話框主體 -->
        <div class="absolute inset-2 md:inset-6 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">

            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="text-gray-400 text-sm flex-shrink-0">差異檢視</span>
                    <code id="diff-file-path" class="text-sm font-mono text-blue-700 truncate"></code>
                </div>
                <button id="sync-diff-close-btn"
                        class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-200">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- 圖例 -->
            <div class="flex items-center gap-5 px-5 py-2 border-b border-gray-100 bg-white flex-shrink-0 text-xs text-gray-600">
                <span class="flex items-center gap-1.5">
                    <span class="inline-block w-4 h-3.5 rounded bg-red-100 border border-red-300"></span>
                    僅本地有（已刪除）
                </span>
                <span class="flex items-center gap-1.5">
                    <span class="inline-block w-4 h-3.5 rounded bg-green-100 border border-green-300"></span>
                    僅雲端有（新增中）
                </span>
                <span class="flex items-center gap-1.5">
                    <span class="inline-block w-4 h-3.5 rounded bg-white border border-gray-300"></span>
                    兩端相同
                </span>
            </div>

            <!-- 欄位標題（sticky） -->
            <div class="grid grid-cols-2 border-b border-gray-200 flex-shrink-0">
                <div class="px-5 py-2 text-sm font-semibold text-gray-700 bg-red-50 border-r border-gray-200 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                    本地
                </div>
                <div class="px-5 py-2 text-sm font-semibold text-gray-700 bg-green-50 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                    Google Drive
                </div>
            </div>

            <!-- 載入中 -->
            <div id="diff-loading" class="hidden flex-1 flex items-center justify-center">
                <div class="text-center text-gray-400">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p class="text-sm">正在載入檔案內容...</p>
                </div>
            </div>

            <!-- 錯誤 -->
            <div id="diff-error" class="hidden flex-1 flex items-center justify-center">
                <div class="text-center text-red-500">
                    <p class="text-base font-medium mb-1">載入失敗</p>
                    <p id="diff-error-message" class="text-sm text-gray-500"></p>
                </div>
            </div>

            <!-- Diff 內容（左右並排，同步捲動） -->
            <div id="diff-content" class="hidden flex-1 grid grid-cols-2 overflow-hidden">
                <!-- 左欄：本地 -->
                <div id="diff-local-col" class="overflow-y-auto border-r border-gray-200 font-mono text-xs leading-5"></div>
                <!-- 右欄：雲端 -->
                <div id="diff-cloud-col" class="overflow-y-auto font-mono text-xs leading-5"></div>
            </div>
        </div>
        `;
    }

    _bindEvents() {
        // 關閉按鈕
        this._modal.addEventListener('click', (e) => {
            if (e.target.id === 'sync-diff-backdrop') this.close();
            if (e.target.closest('#sync-diff-close-btn')) this.close();
        });

        // Escape 關閉
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this._modal.classList.contains('hidden')) {
                this.close();
            }
        });

        // 同步左右捲動
        const localCol = this._modal.querySelector('#diff-local-col');
        const cloudCol = this._modal.querySelector('#diff-cloud-col');
        if (localCol && cloudCol) {
            localCol.addEventListener('scroll', () => {
                cloudCol.scrollTop = localCol.scrollTop;
            });
            cloudCol.addEventListener('scroll', () => {
                localCol.scrollTop = cloudCol.scrollTop;
            });
        }
    }

    // ============================================================
    // 公開 API
    // ============================================================

    async open(filePath) {
        this._currentFilePath = filePath;
        this._modal.classList.remove('hidden');
        this._modal.querySelector('#diff-file-path').textContent = filePath;

        this._showState('loading');

        try {
            const result = await window.planAPI.getSyncDiff(filePath);
            this._renderDiff(result.local_content, result.cloud_content);
            this._showState('content');
        } catch (err) {
            this._modal.querySelector('#diff-error-message').textContent = err.message || '未知錯誤';
            this._showState('error');
        }
    }

    close() {
        this._modal.classList.add('hidden');
        this._currentFilePath = null;
        // 清空內容（避免殘留舊資料）
        this._modal.querySelector('#diff-local-col').innerHTML = '';
        this._modal.querySelector('#diff-cloud-col').innerHTML = '';
    }

    // ============================================================
    // Diff 計算（LCS 演算法）
    // ============================================================

    /**
     * 計算兩組行陣列的差異 chunks
     * @param {string[]} localLines
     * @param {string[]} cloudLines
     * @returns {Array<{type: 'equal'|'delete'|'insert'|'replace', localLines: string[], cloudLines: string[]}>}
     */
    _computeDiff(localLines, cloudLines) {
        // Myers diff 簡化版：先計算 LCS，再產生 diff chunks
        const lcs = this._lcs(localLines, cloudLines);
        const chunks = [];

        let li = 0;  // localLines index
        let ci = 0;  // cloudLines index
        let lcsIdx = 0;

        while (li < localLines.length || ci < cloudLines.length) {
            // 收集連續的 equal 行
            const equalLocal = [];
            const equalCloud = [];
            while (
                lcsIdx < lcs.length &&
                li < localLines.length &&
                ci < cloudLines.length &&
                localLines[li] === lcs[lcsIdx] &&
                cloudLines[ci] === lcs[lcsIdx]
            ) {
                equalLocal.push(localLines[li]);
                equalCloud.push(cloudLines[ci]);
                li++;
                ci++;
                lcsIdx++;
            }
            if (equalLocal.length > 0) {
                chunks.push({ type: 'equal', localLines: equalLocal, cloudLines: equalCloud });
            }

            // 收集連續的刪除（local 有，cloud 沒有）
            const deletedLines = [];
            while (li < localLines.length && (lcsIdx >= lcs.length || localLines[li] !== lcs[lcsIdx])) {
                deletedLines.push(localLines[li]);
                li++;
            }

            // 收集連續的新增（cloud 有，local 沒有）
            const insertedLines = [];
            while (ci < cloudLines.length && (lcsIdx >= lcs.length || cloudLines[ci] !== lcs[lcsIdx])) {
                insertedLines.push(cloudLines[ci]);
                ci++;
            }

            if (deletedLines.length > 0 && insertedLines.length > 0) {
                chunks.push({ type: 'replace', localLines: deletedLines, cloudLines: insertedLines });
            } else if (deletedLines.length > 0) {
                chunks.push({ type: 'delete', localLines: deletedLines, cloudLines: [] });
            } else if (insertedLines.length > 0) {
                chunks.push({ type: 'insert', localLines: [], cloudLines: insertedLines });
            }
        }

        return chunks;
    }

    /**
     * 計算兩個字串陣列的最長公共子序列（LCS）
     * 為避免大檔案效能問題，限制最大行數
     */
    _lcs(a, b) {
        const MAX_LINES = 500;
        const aSlice = a.slice(0, MAX_LINES);
        const bSlice = b.slice(0, MAX_LINES);
        const m = aSlice.length;
        const n = bSlice.length;

        // dp[i][j] = length of LCS of a[0..i-1] and b[0..j-1]
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (aSlice[i - 1] === bSlice[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // 回溯找出 LCS 內容
        const result = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (aSlice[i - 1] === bSlice[j - 1]) {
                result.unshift(aSlice[i - 1]);
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        // 若超過行數限制，附加剩餘行（視為相同，避免截斷顯示）
        if (a.length > MAX_LINES) {
            result.push(...a.slice(MAX_LINES));
        }
        return result;
    }

    // ============================================================
    // 渲染
    // ============================================================

    _renderDiff(localContent, cloudContent) {
        const localLines = localContent.split('\n');
        const cloudLines = cloudContent.split('\n');
        const chunks = this._computeDiff(localLines, cloudLines);

        const localHtml = [];
        const cloudHtml = [];
        let localLineNum = 1;
        let cloudLineNum = 1;

        for (const chunk of chunks) {
            switch (chunk.type) {
                case 'equal':
                    for (const line of chunk.localLines) {
                        localHtml.push(this._line(localLineNum++, line, 'equal'));
                        cloudHtml.push(this._line(cloudLineNum++, line, 'equal'));
                    }
                    break;

                case 'delete':
                    // 本地有、雲端沒有 → 左欄紅底，右欄空白佔位
                    for (const line of chunk.localLines) {
                        localHtml.push(this._line(localLineNum++, line, 'delete'));
                        cloudHtml.push(this._emptyLine());
                    }
                    break;

                case 'insert':
                    // 雲端有、本地沒有 → 右欄綠底，左欄空白佔位
                    for (const line of chunk.cloudLines) {
                        localHtml.push(this._emptyLine());
                        cloudHtml.push(this._line(cloudLineNum++, line, 'insert'));
                    }
                    break;

                case 'replace': {
                    // 兩邊都有但不同：逐行對齊顯示，較短的一邊補空白
                    const maxLen = Math.max(chunk.localLines.length, chunk.cloudLines.length);
                    for (let idx = 0; idx < maxLen; idx++) {
                        if (idx < chunk.localLines.length) {
                            localHtml.push(this._line(localLineNum++, chunk.localLines[idx], 'delete'));
                        } else {
                            localHtml.push(this._emptyLine());
                        }
                        if (idx < chunk.cloudLines.length) {
                            cloudHtml.push(this._line(cloudLineNum++, chunk.cloudLines[idx], 'insert'));
                        } else {
                            cloudHtml.push(this._emptyLine());
                        }
                    }
                    break;
                }
            }
        }

        this._modal.querySelector('#diff-local-col').innerHTML = localHtml.join('');
        this._modal.querySelector('#diff-cloud-col').innerHTML = cloudHtml.join('');
    }

    _line(lineNum, content, type) {
        const bgClass = {
            equal:  'bg-white',
            delete: 'bg-red-50',
            insert: 'bg-green-50',
        }[type] || 'bg-white';

        const borderClass = {
            equal:  '',
            delete: 'border-l-2 border-red-300',
            insert: 'border-l-2 border-green-400',
        }[type] || '';

        const numClass = {
            equal:  'text-gray-300',
            delete: 'text-red-300',
            insert: 'text-green-400',
        }[type] || 'text-gray-300';

        const prefix = type === 'delete' ? '−' : type === 'insert' ? '+' : ' ';
        const prefixColor = type === 'delete' ? 'text-red-400' : type === 'insert' ? 'text-green-500' : 'text-gray-300';

        return `<div class="flex items-start min-h-[20px] ${bgClass} ${borderClass} hover:brightness-95">
            <span class="w-10 flex-shrink-0 text-right pr-2 select-none ${numClass} text-[10px] pt-px">${lineNum}</span>
            <span class="w-4 flex-shrink-0 text-center select-none ${prefixColor} font-bold">${prefix}</span>
            <span class="flex-1 whitespace-pre-wrap break-all pr-2">${this._escapeHtml(content)}</span>
        </div>`;
    }

    _emptyLine() {
        return `<div class="flex items-start min-h-[20px] bg-gray-50 opacity-40">
            <span class="w-10 flex-shrink-0"></span>
            <span class="w-4 flex-shrink-0"></span>
            <span class="flex-1"></span>
        </div>`;
    }

    // ============================================================
    // 工具方法
    // ============================================================

    _showState(state) {
        const loading = this._modal.querySelector('#diff-loading');
        const error = this._modal.querySelector('#diff-error');
        const content = this._modal.querySelector('#diff-content');
        loading.classList.toggle('hidden', state !== 'loading');
        error.classList.toggle('hidden', state !== 'error');
        content.classList.toggle('hidden', state !== 'content');
        // diff-content 需要是 grid，不能是 hidden block
        if (state === 'content') {
            content.style.display = 'grid';
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
