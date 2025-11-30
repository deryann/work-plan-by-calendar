# 前端程式碼重構建議書

## 專案概述

本專案為「工作計畫日曆系統」的前端，使用純 JavaScript (ES6+) 搭配 TailwindCSS CDN 建構。整體架構採用物件導向方式組織，包含 12 個 JavaScript 模組與 1 個主要 CSS 檔案。

---

## 📊 程式碼審查摘要

### 優點
1. **良好的模組化設計** - 每個功能獨立成 class（如 PlanPanel, SettingsManager, CalendarModal）
2. **統一的工具函數** - Utils 類別集中管理常用功能
3. **主題系統完善** - CSS 變數支援明暗主題切換
4. **事件驅動架構** - 透過回調函數實現元件間通訊
5. **漸進式功能** - 如 Google Drive 整合有良好的狀態管理

### 需改進項目
1. **無模組打包系統** - 直接使用 CDN 和全域變數
2. **重複程式碼** - 多處存在相似的 DOM 操作與事件綁定邏輯
3. **緊密耦合** - 部分元件直接依賴全域 `window` 物件
4. **缺乏型別檢查** - 純 JavaScript 無法在開發時期捕捉型別錯誤
5. **測試困難** - 無法輕易進行單元測試

---

## 🔧 重構建議

### 1. 架構升級 - 導入現代化建置工具

**優先級：高**

**現況問題：**
```html
<!-- 目前直接在 index.html 載入所有 JS -->
<script src="/static/js/utils.js"></script>
<script src="/static/js/api.js"></script>
<script src="/static/js/google-auth.js"></script>
<!-- ... 其他 10 個 JS 檔案 -->
```

**建議方案：**
```
frontend/
├── src/
│   ├── index.js           # 進入點
│   ├── components/        # 元件
│   │   ├── PlanPanel.js
│   │   ├── CalendarModal.js
│   │   └── ...
│   ├── services/          # 服務層
│   │   ├── api.js
│   │   └── googleAuth.js
│   ├── utils/             # 工具
│   │   └── index.js
│   └── styles/            # 樣式
│       └── main.css
├── package.json
└── vite.config.js         # 或 webpack.config.js
```

**優點：**
- 支援 ES Modules (import/export)
- Tree-shaking 移除未使用程式碼
- Hot Module Replacement (HMR) 開發體驗
- 自動壓縮與優化

---

### 2. 元件系統重構

**優先級：高**

**現況問題：** PlanPanel.js 單一檔案超過 1000 行，職責過多

```javascript
// 目前 PlanPanel 包含：
// - DOM 渲染
// - 事件綁定
// - API 呼叫
// - 狀態管理
// - Markdown 預覽
// - 拖拉調整大小
// - 最大化功能
```

**建議方案：** 拆分為更小的元件

```javascript
// components/PlanPanel/index.js
import { PanelHeader } from './PanelHeader.js';
import { PanelContent } from './PanelContent.js';
import { ResizeHandle } from './ResizeHandle.js';
import { usePlanState } from '../../hooks/usePlanState.js';

export class PlanPanel {
    constructor(options) {
        this.state = usePlanState(options);
        this.header = new PanelHeader(this);
        this.content = new PanelContent(this);
        this.resizeHandle = new ResizeHandle(this);
    }
}

// components/PlanPanel/PanelContent.js
export class PanelContent {
    constructor(panel) {
        this.panel = panel;
        this.editor = new MarkdownEditor(/* ... */);
        this.preview = new MarkdownPreview(/* ... */);
    }
}
```

---

### 3. 狀態管理統一化

**優先級：中高**

**現況問題：** 狀態分散在多處

```javascript
// app.js
this.currentDate = new Date();
this.panels = { history: {}, current: {} };

// settings-manager.js
this.currentSettings = null;

// plan-panel.js
this.isCollapsed = Utils.loadFromStorage(...);
this.isModified = false;
```

**建議方案：** 引入簡易狀態管理

```javascript
// store/index.js
class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Set();
    }

    getState() {
        return this.state;
    }

    setState(updater) {
        const newState = typeof updater === 'function' 
            ? updater(this.state) 
            : { ...this.state, ...updater };
        this.state = newState;
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

// store/appStore.js
export const appStore = new Store({
    currentDate: new Date(),
    panels: { history: {}, current: {} },
    settings: null,
    theme: 'light',
    storageMode: 'local'
});
```

---

### 4. API 層重構

**優先級：中**

**現況問題：**
```javascript
// 每個方法都有重複的錯誤處理
async getPlan(planType, date) {
    return await this.request(`/plans/${planType}/${date}`);
}

async createPlan(planType, date, content) {
    return await this.request(`/plans/${planType}/${date}`, {
        method: 'POST',
        body: JSON.stringify({ content })
    });
}
```

**建議方案：** 更簡潔的 API 設計

```javascript
// services/api/plans.js
class PlansAPI {
    constructor(client) {
        this.client = client;
        this.basePath = '/plans';
    }

    get(type, date) {
        return this.client.get(`${this.basePath}/${type}/${date}`);
    }

    create(type, date, content) {
        return this.client.post(`${this.basePath}/${type}/${date}`, { content });
    }

    update(type, date, content) {
        return this.client.put(`${this.basePath}/${type}/${date}`, { content });
    }

    delete(type, date) {
        return this.client.delete(`${this.basePath}/${type}/${date}`);
    }
}

// services/api/client.js
class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.interceptors = { request: [], response: [] };
    }

    async request(method, endpoint, data = null) {
        const config = { method, headers: { 'Content-Type': 'application/json' } };
        if (data) config.body = JSON.stringify(data);
        
        // 執行請求攔截器
        for (const interceptor of this.interceptors.request) {
            await interceptor(config);
        }

        const response = await fetch(`${this.baseURL}/api${endpoint}`, config);
        
        // 執行回應攔截器
        for (const interceptor of this.interceptors.response) {
            await interceptor(response);
        }

        if (!response.ok) throw new APIError(response);
        return response.json();
    }

    get(endpoint) { return this.request('GET', endpoint); }
    post(endpoint, data) { return this.request('POST', endpoint, data); }
    put(endpoint, data) { return this.request('PUT', endpoint, data); }
    delete(endpoint) { return this.request('DELETE', endpoint); }
}
```

---

### 5. 事件系統改進

**優先級：中**

**現況問題：** 使用多種方式處理事件

```javascript
// 使用 window.addEventListener
window.addEventListener('storage-mode-changed', (e) => {...});

// 使用自定義回調
this.settingsManager.onSettingsUpdated((settings) => {...});

// 直接 DOM 事件
element.addEventListener('click', () => {...});
```

**建議方案：** 統一事件匯流排

```javascript
// services/eventBus.js
class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        this.events.get(event)?.delete(callback);
    }

    emit(event, data) {
        this.events.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    }
}

export const eventBus = new EventBus();

// 定義事件常數
export const Events = {
    SETTINGS_UPDATED: 'settings:updated',
    STORAGE_MODE_CHANGED: 'storage:mode-changed',
    PLAN_SAVED: 'plan:saved',
    PLAN_LOADED: 'plan:loaded',
    DATE_CHANGED: 'date:changed',
    THEME_CHANGED: 'theme:changed'
};
```

---

### 6. CSS 架構優化

**優先級：中**

**現況問題：** 單一 1200+ 行的 CSS 檔案

**建議方案：** 採用 CSS 模組或 SCSS 架構

```
styles/
├── base/
│   ├── _reset.css
│   ├── _variables.css
│   └── _typography.css
├── components/
│   ├── _panel.css
│   ├── _modal.css
│   ├── _button.css
│   └── _editor.css
├── layouts/
│   ├── _header.css
│   └── _sidebar.css
├── themes/
│   ├── _light.css
│   └── _dark.css
├── utilities/
│   └── _helpers.css
└── main.css              # 入口，import 所有模組
```

**CSS 變數命名規範建議：**
```css
:root {
    /* 色彩系統 */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f3f4f6;
    --color-text-primary: #374151;
    --color-text-secondary: #64748b;
    --color-border-default: #e2e8f0;
    --color-accent: #3b82f6;
    
    /* 間距系統 */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    
    /* 字體大小 */
    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    
    /* 圓角 */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    
    /* 陰影 */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

### 7. TypeScript 遷移（選用）

**優先級：低（長期）**

**效益：**
- 型別安全，減少執行期錯誤
- IDE 更好的自動完成支援
- 重構更有信心

**示例轉換：**
```typescript
// types/index.ts
interface Plan {
    type: 'year' | 'month' | 'week' | 'day';
    date: string;
    content: string;
    title: string;
    created_at?: string;
    updated_at?: string;
}

interface PanelOptions {
    type: Plan['type'];
    date: Date;
    isCurrent: boolean;
    container: HTMLElement;
    layoutManager?: LayoutManager;
    settingsManager?: SettingsManager;
    onSave?: (type: string, date: Date, plan: Plan) => void;
    onNavigate?: (type: string, date: Date) => void;
}

// components/PlanPanel.ts
class PlanPanel {
    private type: Plan['type'];
    private date: Date;
    private isModified: boolean = false;
    
    constructor(options: PanelOptions) {
        this.type = options.type;
        this.date = new Date(options.date);
        // ...
    }
}
```

---

### 8. 效能優化建議

**優先級：中**

#### 8.1 虛擬滾動

若未來計畫列表變長，考慮實作虛擬滾動：

```javascript
class VirtualScroller {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.items = [];
        this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
        
        container.addEventListener('scroll', () => this.render());
    }

    setItems(items) {
        this.items = items;
        this.container.style.height = `${items.length * this.itemHeight}px`;
        this.render();
    }

    render() {
        const scrollTop = this.container.scrollTop;
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleCount, this.items.length);
        
        // 只渲染可見區域的項目
        // ...
    }
}
```

#### 8.2 Debounce 與 Throttle 使用

```javascript
// 目前已有，但可以更系統化
const optimizedHandlers = {
    resize: Utils.debounce(handleResize, 250),
    scroll: Utils.throttle(handleScroll, 100),
    input: Utils.debounce(handleInput, 300),
    search: Utils.debounce(handleSearch, 500)
};
```

#### 8.3 Lazy Loading

```javascript
// 延遲載入 Mermaid 和 Highlight.js
async function loadMarkdownLibraries() {
    const [marked, hljs, mermaid] = await Promise.all([
        import('marked'),
        import('highlight.js'),
        import('mermaid')
    ]);
    return { marked, hljs, mermaid };
}
```

---

### 9. 錯誤處理增強

**優先級：中**

**現況問題：** 錯誤處理分散且不一致

```javascript
// 各處有不同的錯誤處理方式
try {
    // ...
} catch (error) {
    console.error('Failed to...', error);
    Utils.showError(`錯誤訊息: ${error.message}`);
}
```

**建議方案：** 統一錯誤處理

```javascript
// services/errorHandler.js
class ErrorHandler {
    constructor() {
        this.handlers = new Map();
        this.setupGlobalHandler();
    }

    setupGlobalHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handle(event.reason);
        });

        window.addEventListener('error', (event) => {
            this.handle(event.error);
        });
    }

    register(errorType, handler) {
        this.handlers.set(errorType, handler);
    }

    handle(error) {
        // 根據錯誤類型分類處理
        if (error instanceof NetworkError) {
            this.handleNetworkError(error);
        } else if (error instanceof ValidationError) {
            this.handleValidationError(error);
        } else if (error instanceof AuthError) {
            this.handleAuthError(error);
        } else {
            this.handleGenericError(error);
        }

        // 記錄到監控系統（如有）
        this.logError(error);
    }

    handleNetworkError(error) {
        Utils.showError('網路連線失敗，請檢查您的網路');
    }

    handleAuthError(error) {
        Utils.showError('授權已過期，請重新登入');
        // 可能導向登入頁面
    }

    logError(error) {
        // 可整合 Sentry 或其他錯誤監控服務
        console.error('[ErrorHandler]', error);
    }
}

// 自定義錯誤類型
class NetworkError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'NetworkError';
        this.status = status;
    }
}

class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}
```

---

### 10. 測試架構

**優先級：低（但重要）**

**建議方案：** 引入測試框架

```javascript
// __tests__/utils.test.js
import { Utils } from '../src/utils';

describe('Utils', () => {
    describe('formatDate', () => {
        it('should format date to YYYY-MM-DD', () => {
            const date = new Date('2025-01-15');
            expect(Utils.formatDate(date)).toBe('2025-01-15');
        });
    });

    describe('debounce', () => {
        it('should debounce function calls', async () => {
            const fn = jest.fn();
            const debounced = Utils.debounce(fn, 100);
            
            debounced();
            debounced();
            debounced();
            
            expect(fn).not.toHaveBeenCalled();
            
            await new Promise(r => setTimeout(r, 150));
            
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });
});

// __tests__/api.test.js
import { PlanAPI } from '../src/services/api';

describe('PlanAPI', () => {
    let api;

    beforeEach(() => {
        api = new PlanAPI('http://localhost:8000');
        global.fetch = jest.fn();
    });

    it('should get plan by type and date', async () => {
        const mockPlan = { type: 'day', content: 'test' };
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockPlan)
        });

        const result = await api.getPlan('day', '2025-01-15');
        
        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:8000/api/plans/day/2025-01-15',
            expect.any(Object)
        );
        expect(result).toEqual(mockPlan);
    });
});
```

---

## 📋 重構優先順序

| 優先級 | 項目 | 預估工時 | 影響範圍 |
|--------|------|----------|----------|
| 🔴 高 | 導入建置工具 (Vite) | 2-3 天 | 全專案 |
| 🔴 高 | 元件拆分 (PlanPanel) | 3-4 天 | 核心功能 |
| 🟠 中高 | 狀態管理統一 | 2-3 天 | 全專案 |
| 🟡 中 | API 層重構 | 1-2 天 | 資料層 |
| 🟡 中 | 事件系統改進 | 1-2 天 | 元件通訊 |
| 🟡 中 | CSS 架構優化 | 2-3 天 | 樣式 |
| 🟡 中 | 效能優化 | 1-2 天 | 使用體驗 |
| 🟡 中 | 錯誤處理增強 | 1 天 | 穩定性 |
| 🟢 低 | TypeScript 遷移 | 5-7 天 | 全專案 |
| 🟢 低 | 測試架構 | 2-3 天 | 品質保證 |

---

## 🚀 建議執行步驟

### 第一階段：基礎現代化（1-2 週）
1. 設定 Vite 或 webpack 建置環境
2. 將現有 JS 檔案改為 ES Modules
3. 設定 CSS 預處理器（PostCSS/SCSS）

### 第二階段：核心重構（2-3 週）
1. 實作簡易狀態管理
2. 重構 PlanPanel 元件
3. 統一事件系統
4. API 層改進

### 第三階段：優化與測試（1-2 週）
1. 效能優化
2. 錯誤處理增強
3. 建立測試框架與基本測試

### 第四階段：進階改進（長期）
1. TypeScript 漸進遷移
2. 完善測試覆蓋率
3. 導入 UI 元件庫（如有需要）

---

## 📝 總結

本專案目前的程式碼品質尚可，具備基本的模組化設計。但為了長期維護性和擴展性，建議優先導入現代化建置工具，並逐步重構元件架構。重構過程中應保持功能穩定，採用漸進式方式進行，避免一次性大規模修改造成的風險。

---

*文件建立日期：2025-11-30*  
*審查範圍：frontend/index.html, static/js/*.js, static/css/main.css*
