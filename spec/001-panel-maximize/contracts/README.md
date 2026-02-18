# API 合約

**功能**: 001-panel-maximize  
**日期**: 2025-10-24

## 說明

本功能為純前端 UI 互動功能，**不涉及任何後端 API 變更**。

## 後端 API 狀態

### 無變更的 API 端點

以下既有 API 端點完全不受本功能影響：

- `GET /api/plans/{plan_type}/{date}` - 取得計畫
- `POST /api/plans/{plan_type}/{date}` - 建立計畫
- `PUT /api/plans/{plan_type}/{date}` - 更新計畫
- `DELETE /api/plans/{plan_type}/{date}` - 刪除計畫
- `GET /api/plans/{plan_type}/{date}/previous` - 前一期計畫
- `GET /api/plans/{plan_type}/{date}/next` - 後一期計畫
- `GET /api/plans/all/{date}` - 指定日期所有計畫
- `POST /api/plans/copy` - 複製計畫內容
- `GET /api/plans/{plan_type}/{date}/exists` - 檢查計畫存在
- `GET /api/health` - 健康檢查

### 為何無需 API 變更

1. **純 UI 功能**: 面板最大化/恢復完全由前端 CSS 和 JavaScript 控制
2. **無資料儲存**: 不需要記錄使用者的最大化偏好（不跨 session 保留）
3. **無伺服器邏輯**: 所有邏輯在瀏覽器端執行，不需要伺服器參與

## 前端合約

雖然無後端 API 變更，但前端模組間有新的合約：

### PlanPanel ↔ LayoutManager 介面

```javascript
/**
 * PlanPanel 需要的 LayoutManager 介面
 */
interface LayoutManagerInterface {
    /**
     * 最大化指定面板
     * @param {PlanPanel} panel - 要最大化的面板實例
     * @returns {void}
     */
    maximizePanel(panel: PlanPanel): void;
    
    /**
     * 恢復正常檢視（所有面板可見）
     * @returns {void}
     */
    restoreNormalView(): void;
    
    /**
     * 檢查是否處於最大化模式
     * @returns {boolean} - true 表示有面板最大化
     */
    isInMaximizeMode(): boolean;
}
```

### LayoutManager 期望的 PlanPanel 屬性

```javascript
/**
 * LayoutManager 需要的 PlanPanel 介面
 */
interface PlanPanelInterface {
    /**
     * 面板的 DOM 元素
     * @type {HTMLElement}
     */
    panelElement: HTMLElement;
    
    /**
     * 面板是否處於最大化狀態
     * @type {boolean}
     */
    isMaximized: boolean;
}
```

### App.js 初始化合約

```javascript
/**
 * PlanPanel 建構參數擴充
 */
interface PlanPanelOptions {
    // ... 既有參數 ...
    
    /**
     * LayoutManager 實例參考
     * @type {LayoutManager}
     * @required 本功能需要此參數
     */
    layoutManager: LayoutManager;
}
```

## 測試合約

### 前端單元測試（若引入測試框架）

```javascript
/**
 * LayoutManager.maximizePanel() 測試合約
 */
describe('LayoutManager.maximizePanel()', () => {
    it('should add panel-maximized class to panel element', () => {
        // Given: 正常檢視模式
        // When: 呼叫 maximizePanel(panel)
        // Then: panel.panelElement 應有 .panel-maximized 類別
    });
    
    it('should set maximizedPanel property', () => {
        // Given: 正常檢視模式
        // When: 呼叫 maximizePanel(panel)
        // Then: layoutManager.maximizedPanel === panel
    });
    
    it('should hide other panels', () => {
        // Given: 4 個面板全部可見
        // When: 呼叫 maximizePanel(panel1)
        // Then: panel2, panel3, panel4 應有 .panel-hidden-by-maximize 類別
    });
});

/**
 * LayoutManager.restoreNormalView() 測試合約
 */
describe('LayoutManager.restoreNormalView()', () => {
    it('should remove panel-maximized class', () => {
        // Given: 面板已最大化
        // When: 呼叫 restoreNormalView()
        // Then: 所有元素應無 .panel-maximized 類別
    });
    
    it('should show all panels', () => {
        // Given: 3 個面板隱藏，1 個最大化
        // When: 呼叫 restoreNormalView()
        // Then: 所有面板應移除 .panel-hidden-by-maximize 類別
    });
    
    it('should reset maximizedPanel to null', () => {
        // Given: layoutManager.maximizedPanel !== null
        // When: 呼叫 restoreNormalView()
        // Then: layoutManager.maximizedPanel === null
    });
});
```

## 相依性

### 前端模組相依關係

```
app.js
  └─> LayoutManager (建立實例)
  └─> PlanPanel (建立實例，傳入 layoutManager)
        └─> LayoutManager (呼叫 maximizePanel/restoreNormalView)
```

### 無外部套件相依

本功能不引入任何新的外部套件，僅使用：
- 原生 JavaScript (ES6+)
- 原生 DOM API
- 現有的 `Utils` 工具類別（可選，用於防抖動）

## 總結

本功能的「合約」主要是前端模組間的介面定義，無涉及後端 API。所有互動都在瀏覽器端完成，符合「最小變更」原則。
