# Frontend Architecture: 本地與 Google Drive 同步功能

**Updated**: 2026-02-19

---

## 概覽

同步功能採用「**Overlay 面板**」形式，覆蓋在現有頁面上（z-index 高於設定 Modal）。
從設定頁面的 Google Drive 區塊點擊「同步管理」按鈕進入；切換至 Google Drive 模式時自動觸發。

---

## 新增 / 修改的檔案

```
static/js/
├── sync-panel.js              ← 新增：SyncPanel 主控制器（UI + 狀態管理 + API 呼叫）
├── api.js                     ← 修改：新增 compareSync() 和 executeSync() 方法
├── settings-modal.js          ← 修改：新增「同步管理」按鈕 + 切換模式自動觸發
└── app.js                     ← 修改：初始化 SyncPanel，暴露給 settings-modal 使用
```

---

## SyncPanel 元件樹（HTML 結構）

```
#sync-panel-overlay (fixed, full-screen, z-50)
└── .sync-panel-container (白底，flex column，max-h-screen)
    │
    ├── .sync-panel-header (flex row)
    │   ├── <h2> 本地 ↔ Google Drive 同步管理
    │   └── <button #sync-close-btn> ✕
    │
    ├── .sync-panel-toolbar (flex row, border-bottom)
    │   ├── <span #sync-last-compared> 上次比較：2026-02-19 10:05 ｜（或「尚未比較」）
    │   └── <button #sync-compare-btn> 🔄 比較檔案
    │       └── （比較中時：spinner + 禁用）
    │
    ├── #sync-summary-bar （比較前隱藏）
    │   ├── .summary-item.local-only  僅本地：N
    │   ├── .summary-item.cloud-only  僅雲端：M
    │   ├── .summary-item.different   不同：P
    │   └── .summary-item.same        相同：Q
    │       └── （點擊各項目等同點擊對應 Filter Tab）
    │
    ├── #sync-filter-tabs （比較前隱藏）
    │   ├── <button data-filter="all">       全部
    │   ├── <button data-filter="local_only"> 僅本地
    │   ├── <button data-filter="cloud_only"> 僅雲端
    │   ├── <button data-filter="different">  不同
    │   └── <button data-filter="same">       相同
    │
    ├── #sync-file-table-container (flex-1, overflow-y-auto)
    │   ├── （空白狀態）#sync-empty-state
    │   │   └── 點擊「比較檔案」開始比較
    │   │
    │   └── <table #sync-file-table>（比較後顯示）
    │       ├── <thead>
    │       │   └── 檔案路徑 ｜ 狀態 ｜ 本地時間 ｜ 雲端時間 ｜ 行數差異 ｜ 操作
    │       └── <tbody>
    │           └── （每列，由 renderFileRow() 產生）
    │               ├── .file-path     "Month/202602.md"
    │               ├── .status-badge  [僅本地] / [僅雲端] / [不同] / [相同]
    │               ├── .local-time    "2026-02-19 09:00" / "-"
    │               ├── .cloud-time    "2026-02-18 08:00" / "-"
    │               ├── .diff-stats    "+5 行" (綠) / "-4 行" (紅) / "-" / "50 行"
    │               └── .action-toggle
    │                   ├── LOCAL_ONLY:  [上傳] (active) [下載] [跳過]
    │                   ├── CLOUD_ONLY:  [上傳] [下載] (active) [跳過]
    │                   ├── DIFFERENT:   [上傳] [下載] [跳過] (active)
    │                   └── SAME:        「已同步」（不可操作）
    │
    └── #sync-panel-footer (border-top)
        ├── .sync-footer-summary
        │   └── 上傳 N 個・下載 M 個・跳過 P 個
        └── <button #sync-execute-btn> 執行同步
            └── （執行中：progress bar + 禁用）
```

---

## SyncPanel 類別設計（sync-panel.js）

```javascript
class SyncPanel {
    constructor(apiClient) {
        this.api = apiClient;
        this.state = {
            isVisible: false,
            isComparing: false,
            isSyncing: false,
            comparisonResult: null,        // SyncComparisonResult | null
            userSelections: new Map(),     // Map<filePath, 'upload'|'download'|'skip'>
            filter: 'all',
            syncProgress: null,            // { current, total } | null
            syncResult: null,              // SyncExecuteResult | null
        };
        this._bindDOM();
        this._bindEvents();
    }

    // === 生命週期 ===

    show(autoCompare = false) {
        // 顯示 Overlay
        // 若 autoCompare = true，自動呼叫 compareFiles()
    }

    hide() {
        // 若 isSyncing，提示確認再關閉
        // 隱藏 Overlay，重置臨時狀態
    }

    // === 核心操作 ===

    async compareFiles() {
        // 1. 設定 isComparing = true，更新 UI
        // 2. 呼叫 this.api.compareSync()
        // 3. 儲存 comparisonResult
        // 4. 初始化 userSelections（使用 suggested_action 作為預設值）
        // 5. 渲染表格
        // 6. 設定 isComparing = false
    }

    async executeSync() {
        // 1. 收集非 'skip' 的操作
        // 2. 設定 isSyncing = true，顯示 progress
        // 3. 呼叫 this.api.executeSync(operations)
        // 4. 顯示結果（成功/失敗摘要）
        // 5. 詢問是否重新比較
    }

    // === UI 更新 ===

    _renderTable() {
        // 根據 filter 和 comparisonResult 渲染表格
    }

    _renderFileRow(fileInfo) {
        // 渲染單列：狀態 badge、時間、diff stats、action toggle
        // diff stats 顯示規則：
        //   - DIFFERENT: "本地 X 行 / 雲端 Y 行" + "+N" (綠) / "-M" (紅)
        //   - LOCAL_ONLY: "本地 X 行 / -"
        //   - CLOUD_ONLY: "- / 雲端 Y 行"
        //   - SAME: "X 行"（兩邊相同）
    }

    _updateFooterSummary() {
        // 統計 userSelections 中各操作數量，更新 Footer 文字
    }

    _setFilter(filter) {
        // 更新 state.filter，重新渲染表格
    }

    _setUserSelection(filePath, action) {
        // 更新 userSelections，重新計算 Footer 統計
    }

    // === DOM 綁定 ===

    _bindDOM() {
        // 取得所有需要的 DOM 元素參考
    }

    _bindEvents() {
        // 綁定關閉按鈕、比較按鈕、執行按鈕、Filter Tabs 的事件
        // 以事件委派（event delegation）處理表格內的 action toggle 點擊
    }
}
```

---

## API 擴充（api.js）

在現有 `planAPI` 物件新增：

```javascript
const planAPI = {
    // ... 現有方法 ...

    /**
     * 比較本地與 Google Drive 的所有計畫檔案
     * @returns {Promise<SyncComparisonResult>}
     */
    compareSync: async () => {
        const response = await fetch('/api/sync/compare');
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '比較失敗');
        }
        return response.json();
    },

    /**
     * 執行同步操作
     * @param {Array<{file_path: string, action: 'upload'|'download'}>} operations
     * @returns {Promise<SyncExecuteResult>}
     */
    executeSync: async (operations) => {
        const response = await fetch('/api/sync/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operations }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '同步執行失敗');
        }
        return response.json();
    },
};
```

---

## 設定 Modal 整合（settings-modal.js）

### 新增「同步管理」按鈕

在 Google Drive 已連線狀態的 HTML 區塊新增：

```html
<!-- 位置：Google Drive 連線資訊下方 -->
<div id="sync-management-section" class="hidden">
    <button id="open-sync-panel-btn"
            class="btn-secondary w-full mt-2">
        📊 同步管理
    </button>
</div>
```

### 按鈕顯示條件

```javascript
// 在 settings-modal.js 的 updateGoogleAuthUI() 函式中：
function updateGoogleAuthUI(authStatus) {
    const syncSection = document.getElementById('sync-management-section');
    if (authStatus.status === 'connected') {
        syncSection.classList.remove('hidden');
    } else {
        syncSection.classList.add('hidden');
    }
}

// 綁定按鈕點擊
document.getElementById('open-sync-panel-btn')
    ?.addEventListener('click', () => window.syncPanel?.show());
```

### 切換至 Google Drive 模式時自動觸發

```javascript
// 在 settings-modal.js 的 handleStorageModeChange() 成功回調中：
async function handleStorageModeChange(newMode) {
    const result = await planAPI.updateStorageMode(newMode);
    if (result.ok) {
        // ... 現有的 UI 更新邏輯 ...

        // 新增：切換至 Google Drive 模式時，自動開啟同步面板
        if (newMode === 'google_drive') {
            window.syncPanel?.show(true);  // true = autoCompare
        }
    }
}
```

---

## 主應用初始化（app.js）

```javascript
// 在 WorkPlanApp 的 init() 方法中新增：

class WorkPlanApp {
    async init() {
        // ... 現有初始化 ...

        // 初始化同步面板
        this.syncPanel = new SyncPanel(planAPI);
        window.syncPanel = this.syncPanel;  // 全域存取（settings-modal 使用）
    }
}
```

---

## 樣式設計（TailwindCSS）

### Overlay 層級結構
```
z-index 層級（由低到高）：
- 主內容：z-0
- 設定 Modal：z-40（現有）
- 同步 Overlay：z-50（新增，蓋在設定 Modal 上方）
```

### 狀態 Badge 樣式
```
LOCAL_ONLY:  bg-blue-100 text-blue-700    「僅本地」
CLOUD_ONLY:  bg-purple-100 text-purple-700 「僅雲端」
DIFFERENT:   bg-yellow-100 text-yellow-700 「不同」
SAME:        bg-green-100 text-green-700   「已同步」
```

### Diff Stats 樣式
```
added_lines > 0:   text-green-600 font-medium  "+N 行"
removed_lines > 0: text-red-600 font-medium    "-M 行"
兩者皆 0 (DIFFERENT): text-yellow-600           "內容修改"
SAME:               text-gray-500               "N 行"
LOCAL/CLOUD ONLY:   text-gray-400 italic        "-"
```

### Action Toggle 按鈕組
```
未選中：border border-gray-300 text-gray-500
已選中（upload）：  bg-blue-600 text-white
已選中（download）：bg-purple-600 text-white
已選中（skip）：    bg-gray-400 text-white
已同步（SAME）：    text-gray-400 cursor-not-allowed
```

---

## 狀態轉換圖

```
[隱藏]
  ↓ show() / 切換至 Google Drive 模式
[顯示 - 空白狀態]
  ↓ compareFiles()
[比較中...] (isComparing = true)
  ↓ API 回傳
[顯示差異清單]
  ↓ 使用者調整操作選擇
  ↓ executeSync()
[同步執行中] (isSyncing = true)
  ↓ API 回傳
[顯示結果]
  ↓ 重新比較 or 關閉
[顯示差異清單] or [隱藏]
```

---

## 與現有元件的整合點

| 現有元件 | 整合方式 |
|---------|---------|
| `GoogleAuthManager` | 檢查 `isConnected()` 來決定按鈕是否顯示；監聽 `onStatusChange()` 更新 UI |
| `SettingsModal` | 新增按鈕入口；在儲存模式切換成功後觸發 `syncPanel.show(true)` |
| `WorkPlanApp` | 初始化 `SyncPanel` 並掛載至 `window.syncPanel` |
| `planAPI` | 新增 `compareSync` 和 `executeSync` 方法 |
