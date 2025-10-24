# 資料模型：面板最大化切換

**功能**: 001-panel-maximize  
**日期**: 2025-10-24  
**階段**: Phase 1 - 設計與合約

## 概述

本功能為純前端 UI 互動功能，不涉及後端資料模型或 API 變更。以下定義前端狀態管理的資料結構。

## 前端狀態模型

### 1. LayoutManager 狀態擴充

LayoutManager 類別需新增以下狀態屬性：

```javascript
/**
 * LayoutManager 類別狀態擴充
 */
class LayoutManager {
    /**
     * @property {PlanPanel|null} maximizedPanel - 當前最大化的面板實例
     * 規則：同時最多只有一個面板可處於最大化狀態
     * 值：null（無面板最大化）或 PlanPanel 實例
     */
    maximizedPanel: PlanPanel | null;
    
    /**
     * @property {boolean} isInMaximizeMode - 系統是否處於最大化模式
     * 衍生屬性：this.maximizedPanel !== null
     */
    get isInMaximizeMode(): boolean {
        return this.maximizedPanel !== null;
    }
}
```

### 2. PlanPanel 狀態擴充

PlanPanel 類別需新增以下狀態屬性：

```javascript
/**
 * PlanPanel 類別狀態擴充
 */
class PlanPanel {
    /**
     * @property {boolean} isMaximized - 此面板是否處於最大化狀態
     * 規則：當 layoutManager.maximizedPanel === this 時為 true
     */
    isMaximized: boolean;
    
    /**
     * @property {LayoutManager} layoutManager - LayoutManager 實例參考
     * 用途：呼叫全域版面配置方法（maximizePanel, restoreNormalView）
     */
    layoutManager: LayoutManager;
}
```

### 3. DOM 狀態映射

前端狀態透過 CSS 類別反映在 DOM 上：

```javascript
/**
 * DOM 元素狀態類別
 */
interface DOMState {
    /**
     * 最大化面板的 CSS 類別
     * 元素：.plan-panel
     * 類別：panel-maximized
     * 效果：position: fixed, z-index: 1000, 佔滿視窗
     */
    'panel-maximized': {
        element: HTMLElement; // .plan-panel
        conditions: {
            isMaximized: true
        }
    };
    
    /**
     * 被隱藏面板的 CSS 類別
     * 元素：.plan-panel
     * 類別：panel-hidden-by-maximize
     * 效果：display: none
     */
    'panel-hidden-by-maximize': {
        element: HTMLElement; // .plan-panel
        conditions: {
            isInMaximizeMode: true,
            isNotMaximizedPanel: true
        }
    };
}
```

## 狀態轉換

### 狀態圖

```
[正常模式]
  所有面板可見
  layoutManager.maximizedPanel = null
  所有 panel.isMaximized = false
  
  ↓ 使用者雙擊面板 A 標題
  
[最大化模式 - 面板 A]
  面板 A 可見（最大化）
  面板 B, C, D 隱藏
  layoutManager.maximizedPanel = Panel A
  Panel A.isMaximized = true
  Panel B/C/D.isMaximized = false
  
  ↓ 使用者再次雙擊面板 A 標題
  
[正常模式]
  所有面板恢復可見
  layoutManager.maximizedPanel = null
  所有 panel.isMaximized = false
```

### 轉換規則

```javascript
/**
 * 狀態轉換邏輯
 */
const stateTransitions = {
    /**
     * 轉換 1：正常 → 最大化
     * 觸發：使用者雙擊任一面板標題（在正常模式下）
     */
    normalToMaximize: {
        precondition: 'layoutManager.maximizedPanel === null',
        action: 'layoutManager.maximizePanel(clickedPanel)',
        postcondition: 'layoutManager.maximizedPanel === clickedPanel'
    },
    
    /**
     * 轉換 2：最大化 → 正常
     * 觸發：使用者雙擊最大化面板的標題
     */
    maximizeToNormal: {
        precondition: 'layoutManager.maximizedPanel === clickedPanel',
        action: 'layoutManager.restoreNormalView()',
        postcondition: 'layoutManager.maximizedPanel === null'
    },
    
    /**
     * 轉換 3：切換最大化面板（邊界情況）
     * 觸發：使用者雙擊另一個面板標題（在最大化模式下）
     * 注意：規格未明確要求此行為，建議先恢復正常再最大化新面板
     */
    switchMaximizedPanel: {
        precondition: 'layoutManager.maximizedPanel !== null && layoutManager.maximizedPanel !== clickedPanel',
        action: [
            'layoutManager.restoreNormalView()',
            'layoutManager.maximizePanel(clickedPanel)'
        ],
        postcondition: 'layoutManager.maximizedPanel === clickedPanel'
    }
};
```

## 狀態持久化

### LocalStorage 策略

```javascript
/**
 * 狀態持久化（可選功能）
 * 注意：規格未要求保存最大化狀態，建議預設不持久化
 */
const storageKeys = {
    /**
     * 不持久化最大化狀態
     * 理由：使用者每次進入頁面都應看到完整的四個面板
     * 最大化是臨時性的專注模式，不應跨 session 保留
     */
    // 'maximized-panel-type': null  // 不儲存
};
```

## 資料驗證規則

```javascript
/**
 * 狀態一致性驗證（用於除錯和測試）
 */
const invariants = {
    /**
     * 不變條件 1：最多一個面板最大化
     */
    atMostOneMaximized: () => {
        const maximizedPanels = document.querySelectorAll('.panel-maximized');
        return maximizedPanels.length <= 1;
    },
    
    /**
     * 不變條件 2：最大化面板不能同時被隱藏
     */
    maximizedNotHidden: () => {
        const maximized = document.querySelector('.panel-maximized');
        if (maximized) {
            return !maximized.classList.contains('panel-hidden-by-maximize');
        }
        return true;
    },
    
    /**
     * 不變條件 3：layoutManager 狀態與 DOM 一致
     */
    stateMatchesDOM: (layoutManager) => {
        const maximizedInDOM = document.querySelector('.panel-maximized');
        const maximizedInState = layoutManager.maximizedPanel?.panelElement;
        return maximizedInDOM === maximizedInState;
    }
};
```

## 效能考量

### 狀態變更頻率

```javascript
/**
 * 狀態變更頻率分析
 */
const performanceMetrics = {
    /**
     * 雙擊事件頻率
     * 預期：低頻操作（每分鐘 < 5 次）
     * 影響：無效能問題，可直接操作 DOM
     */
    doubleClickFrequency: 'low',
    
    /**
     * DOM 重排（reflow）成本
     * 操作：新增/移除 CSS 類別
     * 成本：中等（觸發 reflow 但範圍有限）
     * 優化：使用 CSS transition 平滑過渡
     */
    domReflowCost: 'medium',
    
    /**
     * 記憶體佔用
     * 新增狀態：1 個物件參考（maximizedPanel）
     * 成本：可忽略（< 1KB）
     */
    memoryFootprint: 'negligible'
};
```

## 錯誤處理

### 狀態不一致處理

```javascript
/**
 * 錯誤恢復策略
 */
const errorRecovery = {
    /**
     * 多個面板同時有 .panel-maximized 類別
     * 恢復：移除所有 .panel-maximized，重置 layoutManager.maximizedPanel
     */
    multipleMaximized: () => {
        document.querySelectorAll('.panel-maximized')
            .forEach(el => el.classList.remove('panel-maximized'));
        layoutManager.maximizedPanel = null;
    },
    
    /**
     * layoutManager.maximizedPanel 參考的面板不存在
     * 恢復：重置 layoutManager.maximizedPanel
     */
    orphanedReference: () => {
        if (layoutManager.maximizedPanel && 
            !document.contains(layoutManager.maximizedPanel.panelElement)) {
            layoutManager.maximizedPanel = null;
        }
    }
};
```

## 總結

本功能的資料模型極為簡單：
- **狀態屬性**: 僅 1 個（`layoutManager.maximizedPanel`）
- **衍生狀態**: 透過 CSS 類別反映在 DOM
- **狀態轉換**: 3 種明確定義的轉換
- **持久化**: 無（不跨 session 保留）
- **驗證**: 3 個不變條件確保一致性

此設計符合「最小變更」原則，僅擴充現有類別，無需新增額外的資料結構或狀態管理框架。
