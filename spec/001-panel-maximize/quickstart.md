# 快速入門：面板最大化切換

**功能**: 001-panel-maximize  
**日期**: 2025-10-24  
**目標讀者**: 開發者

## 功能概述

面板最大化切換功能允許使用者透過雙擊任一計畫面板（年/月/週/日）的標題列，將該面板擴展至全螢幕，同時隱藏其他面板。再次雙擊可恢復所有面板的正常顯示。

## 5 分鐘快速實作指南

### 步驟 1：新增 CSS 樣式 (2 分鐘)

編輯 `static/css/main.css`，在檔案末尾新增：

```css
/* ========== 面板最大化樣式 ========== */

/* 最大化面板樣式 */
.panel-maximized {
    position: fixed !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100% !important;
    height: 100vh !important;
    max-height: 100vh !important;
    z-index: 1000;
    margin: 0 !important;
    padding: 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* 最大化面板的標題列樣式 */
.panel-maximized .panel-header {
    background: linear-gradient(135deg, 
        var(--color-accent) 0%, 
        var(--color-primary) 100%) !important;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 被隱藏的面板 */
.panel-hidden-by-maximize {
    display: none !important;
}

/* 最大化提示文字 */
.panel-maximized .panel-header::after {
    content: '雙擊恢復';
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    opacity: 0.7;
    color: var(--color-text-secondary);
    pointer-events: none;
}
```

### 步驟 2：擴充 LayoutManager 類別 (1 分鐘)

編輯 `static/js/layout-manager.js`，在 `constructor()` 中新增：

```javascript
constructor() {
    // ... 現有程式碼 ...
    
    // 新增：最大化狀態管理
    this.maximizedPanel = null;
}
```

在類別末尾新增以下方法：

```javascript
/**
 * 最大化指定面板
 * @param {PlanPanel} panel - 要最大化的面板實例
 */
maximizePanel(panel) {
    // 如果已有其他面板最大化，先恢復
    if (this.maximizedPanel && this.maximizedPanel !== panel) {
        this.restoreNormalView();
    }
    
    this.maximizedPanel = panel;
    panel.isMaximized = true;
    panel.panelElement.classList.add('panel-maximized');
    
    // 隱藏其他面板
    this.hideOtherPanels(panel);
}

/**
 * 恢復正常檢視（所有面板可見）
 */
restoreNormalView() {
    if (this.maximizedPanel) {
        this.maximizedPanel.isMaximized = false;
        this.maximizedPanel.panelElement.classList.remove('panel-maximized');
        this.maximizedPanel = null;
    }
    
    // 顯示所有面板
    this.showAllPanels();
}

/**
 * 隱藏除了最大化面板外的所有面板
 * @param {PlanPanel} maximizedPanel - 最大化的面板
 */
hideOtherPanels(maximizedPanel) {
    document.querySelectorAll('.plan-panel').forEach(panelEl => {
        if (panelEl !== maximizedPanel.panelElement) {
            panelEl.classList.add('panel-hidden-by-maximize');
        }
    });
}

/**
 * 顯示所有面板
 */
showAllPanels() {
    document.querySelectorAll('.plan-panel').forEach(panelEl => {
        panelEl.classList.remove('panel-hidden-by-maximize');
    });
}

/**
 * 檢查是否處於最大化模式
 * @returns {boolean}
 */
isInMaximizeMode() {
    return this.maximizedPanel !== null;
}
```

### 步驟 3：擴充 PlanPanel 類別 (1 分鐘)

編輯 `static/js/plan-panel.js`，在 `constructor()` 中新增：

```javascript
constructor(options) {
    // ... 現有程式碼 ...
    
    // 新增：最大化狀態
    this.isMaximized = false;
    this.layoutManager = options.layoutManager; // 需從 app.js 傳入
}
```

在 `bindEvents()` 方法中新增雙擊事件：

```javascript
bindEvents() {
    // ... 現有程式碼 ...
    
    // 新增：標題列雙擊事件
    this.bindDoubleClickEvent();
}

/**
 * 綁定雙擊事件
 */
bindDoubleClickEvent() {
    if (!this.headerElement) return;
    
    this.headerElement.addEventListener('dblclick', (e) => {
        e.preventDefault(); // 防止文字選取
        this.toggleMaximize();
    });
}

/**
 * 切換最大化狀態
 */
toggleMaximize() {
    // 如果面板已摺疊，先展開
    if (this.isCollapsed) {
        this.toggleCollapse();
        // 給予時間讓展開動畫完成
        setTimeout(() => this.performMaximizeToggle(), 350);
    } else {
        this.performMaximizeToggle();
    }
}

/**
 * 執行最大化切換
 */
performMaximizeToggle() {
    if (!this.layoutManager) {
        console.warn('LayoutManager not initialized for panel maximize');
        return;
    }
    
    if (this.isMaximized) {
        this.layoutManager.restoreNormalView();
    } else {
        this.layoutManager.maximizePanel(this);
    }
}
```

### 步驟 4：更新 app.js 初始化 (1 分鐘)

編輯 `static/js/app.js`，找到建立 PlanPanel 實例的地方，新增 `layoutManager` 參數：

```javascript
// 初始化 LayoutManager（如果尚未初始化）
const layoutManager = new LayoutManager();

// 建立 PlanPanel 實例時傳入 layoutManager
const yearPanel = new PlanPanel({
    type: 'year',
    date: currentDate,
    isCurrent: true,
    container: document.getElementById('year-panel-container'),
    layoutManager: layoutManager,  // 新增此行
    onSave: handleSave,
    onCopy: handleCopy,
    onNavigate: handleNavigate
});

// 對其他面板 (month, week, day) 重複相同操作
```

## 測試檢查清單

實作完成後，執行以下測試：

### 基本功能測試
- [ ] 雙擊年計畫標題，面板最大化
- [ ] 再次雙擊，恢復正常檢視
- [ ] 重複測試月計畫、週計畫、日計畫
- [ ] 檢查其他面板是否正確隱藏

### 狀態保留測試
- [ ] 在編輯模式下輸入文字，最大化後恢復，文字保留
- [ ] 捲動面板內容，最大化後恢復，捲動位置保留
- [ ] 切換到預覽模式，最大化後恢復，模式保留

### 邊界情況測試
- [ ] 快速連續雙擊（5 次），無閃爍或錯誤
- [ ] 縮放瀏覽器視窗（最大化狀態下），面板適應新尺寸
- [ ] 摺疊的面板雙擊，先展開再最大化

### 跨裝置測試
- [ ] 桌面瀏覽器（Chrome, Firefox, Safari）
- [ ] 平板裝置（觸控雙擊）
- [ ] 手機裝置（觸控雙擊）

## 常見問題

### Q: 動畫不流暢怎麼辦？
A: 確認 CSS transition 使用 `transform` 和 `opacity` 而非 `width`/`height`。檢查是否有其他 CSS 規則覆蓋 transition 設定。

### Q: 雙擊後文字被選取？
A: 確認在 `dblclick` 事件處理中呼叫了 `e.preventDefault()`。

### Q: 觸控裝置無法觸發？
A: 原生 `dblclick` 事件在行動裝置上對應 double tap，應自動支援。若仍無法觸發，檢查是否有其他觸控事件監聽器干擾。

### Q: 最大化後其他功能（如左側面板切換）不正常？
A: 在 `LayoutManager.toggleLeftPanel()` 中新增檢查：
```javascript
toggleLeftPanel() {
    // 如果處於最大化模式，先恢復
    if (this.isInMaximizeMode()) {
        this.restoreNormalView();
    }
    
    // ... 原有程式碼 ...
}
```

## 除錯提示

### 檢查狀態一致性

在瀏覽器 Console 中執行：

```javascript
// 檢查 layoutManager 狀態
console.log('Maximized panel:', window.layoutManager?.maximizedPanel);

// 檢查 DOM 狀態
console.log('Maximized in DOM:', document.querySelectorAll('.panel-maximized').length);

// 檢查隱藏面板數量
console.log('Hidden panels:', document.querySelectorAll('.panel-hidden-by-maximize').length);
```

### 效能監控

測量動畫效能：

```javascript
// 在 toggleMaximize() 開始處
const startTime = performance.now();

// 在動畫結束後（300ms）
setTimeout(() => {
    const endTime = performance.now();
    console.log(`Maximize animation took ${endTime - startTime}ms`);
}, 300);
```

## 回退計畫

如果功能有問題需要緊急回退：

1. **移除 CSS 類別**：刪除或註解掉 `main.css` 中的 `.panel-maximized` 相關樣式
2. **移除事件監聽**：註解掉 `bindDoubleClickEvent()` 呼叫
3. **清除狀態**：在 Console 中執行：
   ```javascript
   document.querySelectorAll('.panel-maximized').forEach(el => 
       el.classList.remove('panel-maximized')
   );
   ```

## 下一步

實作完成並測試通過後，建議：
1. 建立手動測試檢查表文件
2. 更新使用者文件（README 或線上說明）
3. 考慮新增鍵盤快捷鍵（如 F11 切換最大化）作為後續改進
4. 收集使用者回饋，評估是否需要調整動畫時間或視覺提示

## 預估時間

- **實作**: 1 小時
- **測試**: 1-2 小時
- **除錯**: 0.5-1 小時
- **總計**: 2.5-4 小時
