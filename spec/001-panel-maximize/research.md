# 研究報告：面板最大化切換

**功能**: 001-panel-maximize  
**日期**: 2025-10-24  
**階段**: Phase 0 - 大綱與研究

## 研究目標

本研究旨在確定實作面板最大化切換功能的最佳技術方案，重點關注：
1. 雙擊事件偵測的最佳實踐
2. CSS 動畫與效能優化
3. 狀態管理策略
4. 與現有程式碼的整合方式

## 研究發現

### 1. 雙擊事件偵測

**決策**: 使用原生 `dblclick` 事件搭配防抖動 (debounce) 機制

**理由**:
- JavaScript 原生支援 `dblclick` 事件，無需自行實作計時邏輯
- 瀏覽器已處理雙擊時間閾值（通常 300-500ms）
- 相容性佳，支援桌面和觸控裝置

**考慮的替代方案**:
- **手動實作雙擊偵測**（記錄兩次 `click` 事件間隔）：複雜度高，需自行處理跨瀏覽器時間閾值差異
- **使用第三方函式庫**（如 Hammer.js）：引入額外依賴，對於簡單的雙擊需求過於重量級

**實作細節**:
```javascript
// 在 PlanPanel 類別中新增
bindDoubleClickEvent() {
    this.headerElement.addEventListener('dblclick', (e) => {
        e.preventDefault(); // 防止文字選取
        this.toggleMaximize();
    });
}
```

**觸控裝置支援**:
- `dblclick` 事件在行動裝置上對應 double tap 手勢
- iOS Safari 和 Android Chrome 原生支援
- 無需額外程式碼

### 2. CSS 動畫與效能優化

**決策**: 使用 CSS `transition` 搭配 `transform` 和 `opacity` 屬性

**理由**:
- `transform` 和 `opacity` 觸發 GPU 加速，效能最佳
- CSS transition 比 JavaScript 動畫效能好且程式碼更簡潔
- 符合憲法要求的 ≥ 50fps 動畫效能

**考慮的替代方案**:
- **JavaScript 動畫**（requestAnimationFrame）：更靈活但效能較差，程式碼複雜度高
- **CSS animation**（@keyframes）：適合複雜動畫序列，但本功能僅需簡單的展開/縮小，transition 即可滿足

**實作細節**:
```css
/* 在 main.css 中新增 */
.plan-panel {
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.panel-maximized {
    position: fixed !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100% !important;
    height: 100vh !important;
    z-index: 1000;
    margin: 0;
}

.panel-hidden-by-maximize {
    display: none !important;
}
```

**效能考量**:
- 使用 `cubic-bezier(0.4, 0.0, 0.2, 1)` 加速曲線（Material Design 標準）提供流暢感
- 避免動畫 `width`/`height` 屬性（觸發 reflow），改用 `transform: scale()`
- 動畫時間 300ms 符合人類感知最佳反應時間（< 400ms）

### 3. 狀態管理策略

**決策**: 在 LayoutManager 中集中管理最大化狀態

**理由**:
- LayoutManager 已負責版面配置管理（左右面板切換、視窗縮放）
- 集中管理避免狀態分散在多個類別中
- 便於處理與現有 `isLeftPanelCollapsed` 狀態的互動

**考慮的替代方案**:
- **在 PlanPanel 中管理**：每個面板獨立管理自己的最大化狀態，但難以確保「同時最多一個面板最大化」的約束
- **全域狀態管理**（如 Redux-like pattern）：對於簡單功能過於複雜

**實作細節**:
```javascript
// 在 LayoutManager 類別中新增
class LayoutManager {
    constructor() {
        // ... 現有程式碼 ...
        this.maximizedPanel = null; // 當前最大化的面板
    }

    maximizePanel(panel) {
        // 如果已有面板最大化，先恢復
        if (this.maximizedPanel && this.maximizedPanel !== panel) {
            this.restorePanel(this.maximizedPanel);
        }
        
        this.maximizedPanel = panel;
        panel.panelElement.classList.add('panel-maximized');
        
        // 隱藏其他面板
        this.hideOtherPanels(panel);
    }

    restoreNormalView() {
        if (this.maximizedPanel) {
            this.maximizedPanel.panelElement.classList.remove('panel-maximized');
            this.showAllPanels();
            this.maximizedPanel = null;
        }
    }
}
```

**狀態保留**:
- 面板內部狀態（編輯模式、內容、捲動位置）由 PlanPanel 類別本身管理，無需特別處理
- 使用 `display: none` 隱藏面板時，DOM 元素保留，所有狀態自然保留

### 4. 與現有程式碼的整合

**決策**: 最小化修改現有程式碼，透過新增方法和 CSS 類別實現

**修改清單**:

**static/css/main.css**:
- 新增 `.panel-maximized` 類別
- 新增 `.panel-hidden-by-maximize` 類別
- 新增 `.panel-maximized .panel-header` 樣式（視覺提示）

**static/js/plan-panel.js**:
- 新增 `toggleMaximize()` 方法
- 新增 `bindDoubleClickEvent()` 方法
- 在 `init()` 中呼叫 `bindDoubleClickEvent()`

**static/js/layout-manager.js**:
- 新增 `maximizedPanel` 屬性
- 新增 `maximizePanel(panel)` 方法
- 新增 `restoreNormalView()` 方法
- 新增 `hideOtherPanels(panel)` 方法
- 新增 `showAllPanels()` 方法
- 修改 `toggleLeftPanel()` - 檢查是否有面板最大化，若有則忽略或先恢復

**static/js/app.js**:
- 在初始化時傳遞 `layoutManager` 參考給每個 `PlanPanel` 實例

**相容性考量**:
- 與現有面板摺疊功能相容：最大化時忽略左側面板切換，或自動恢復後再執行
- 與鍵盤快捷鍵相容：Ctrl+\\ 在最大化狀態下可選擇忽略或先恢復
- 與響應式設計相容：視窗縮放時 CSS 自動調整

### 5. 視覺提示設計

**決策**: 使用標題列背景色變化 + tooltip

**理由**:
- 背景色變化提供即時視覺回饋，無需使用者主動探索
- Tooltip 提供明確的操作指示
- 符合現有 UI 設計語言

**實作細節**:
```css
.panel-maximized .panel-header {
    background-color: var(--color-accent) !important;
    cursor: pointer;
}

.panel-maximized .panel-header::after {
    content: '再次雙擊以恢復正常檢視';
    position: absolute;
    right: 10px;
    font-size: 0.875rem;
    opacity: 0.8;
}
```

### 6. 邊界情況處理

**快速連續點擊**:
- `dblclick` 事件天然防抖，無需額外處理
- 若使用者快速點擊超過 2 次，僅觸發一次雙擊事件

**視窗縮放**:
- CSS 使用百分比和 viewport 單位（`100vh`, `100vw`）自動適應
- 監聽 `resize` 事件無需額外處理（CSS 自動調整）

**與摺疊功能衝突**:
```javascript
// 在 toggleMaximize() 中
toggleMaximize() {
    // 如果面板已摺疊，先展開
    if (this.isCollapsed) {
        this.toggleCollapse();
    }
    
    // 再執行最大化切換
    if (this.isMaximized) {
        this.layoutManager.restoreNormalView();
    } else {
        this.layoutManager.maximizePanel(this);
    }
}
```

## 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|-----|------|---------|
| 觸控裝置雙擊誤觸 | 中 | 使用原生 `dblclick` 事件，瀏覽器已優化觸控閾值 |
| 動畫效能在低階裝置 | 低 | 使用 GPU 加速屬性（transform, opacity），測試低階裝置 |
| 與現有功能衝突 | 中 | 詳細審查 LayoutManager 和 PlanPanel 互動邏輯 |
| 狀態保留失敗 | 高 | 使用 `display: none` 而非移除 DOM，保留所有狀態 |

## 最佳實踐參考

1. **Google Material Design** - 動畫時間和加速曲線標準
2. **MDN Web Docs** - `dblclick` 事件相容性和最佳實踐
3. **現有程式碼** - `LayoutManager` 的面板切換動畫實作
4. **憲法原則** - 效能要求（< 200ms, ≥ 50fps）

## 結論

本研究確認了面板最大化功能的實作方案：
- ✅ 使用原生 `dblclick` 事件，簡單可靠
- ✅ CSS transition 動畫，效能優異
- ✅ 在 LayoutManager 集中管理狀態，邏輯清晰
- ✅ 最小化修改現有程式碼，風險可控
- ✅ 透過 CSS 類別切換實現，易於維護和回退

所有技術決策符合憲法要求，無需引入新依賴，預計實作時間 4-6 小時（包含測試）。
