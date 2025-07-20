# 前端 UI/UX 設計規格

## 技術棧
- **HTML5** + **JavaScript (ES6+)**
- **CSS3** + **TailwindCSS**
- **Markdown 解析**: marked.js
- **語法高亮**: Prism.js 或 CodeMirror
- **日期處理**: Day.js

## 整體佈局設計

### 主要畫面結構
```
┌─────────────────────────────────────────────────┐
│                 Header                          │
├─────────────────┬───────────────────────────────┤
│                 │                               │
│   Left Panel    │        Right Panel            │
│  (History Plans)│     (Current Plans)           │
│                 │                               │
│                 │                               │
├─────────────────┼───────────────────────────────┤
│      Resize     │                               │
│      Handle     │                               │
└─────────────────┴───────────────────────────────┘
```

## 左側面板設計 (History Plans)

### 面板組成
- **4個摺疊面板**: 年、月、週、日計畫
- **預設狀態**: 顯示前一期計畫（前一年、前一月、前一週、前一日）

### 單一面板 (PlanPanel) 組件設計

#### 面板標題列 (Panel Header)
```html
<div class="panel-header bg-gray-100 p-3 flex items-center justify-between">
  <div class="flex items-center space-x-2">
    <!-- 摺疊按鈕 -->
    <button class="collapse-btn">
      <i class="icon-chevron-down"></i>
    </button>
    
    <!-- 前一期按鈕 -->
    <button class="nav-btn prev-btn" title="前一期">
      <i class="icon-chevron-left"></i>
    </button>
    
    <!-- 標題 -->
    <h3 class="panel-title font-semibold">2025-06 月度計畫</h3>
    
    <!-- 後一期按鈕 -->
    <button class="nav-btn next-btn" title="後一期">
      <i class="icon-chevron-right"></i>
    </button>
  </div>
  
  <div class="flex items-center space-x-2">
    <!-- 日期選擇器 -->
    <button class="date-picker-btn" title="選擇日期">
      <i class="icon-calendar"></i>
    </button>
    
    <!-- 複製按鈕 -->
    <button class="copy-btn" title="複製到當期計畫">
      <i class="icon-arrow-right"></i>
    </button>
    
    <!-- 預覽切換按鈕 -->
    <button class="preview-toggle-btn" title="預覽/編輯切換">
      <i class="icon-eye"></i>
    </button>
    
    <!-- 儲存按鈕 -->
    <button class="save-btn" title="儲存">
      <i class="icon-save"></i>
    </button>
  </div>
</div>
```

#### 面板內容區 (Panel Content)
```html
<div class="panel-content">
  <!-- 編輯模式 -->
  <div class="edit-mode">
    <textarea 
      class="markdown-editor font-mono text-sm w-full h-64 p-3 border"
      placeholder="輸入 Markdown 內容...">
    </textarea>
  </div>
  
  <!-- 預覽模式 -->
  <div class="preview-mode hidden">
    <div class="markdown-preview prose max-w-none p-3"></div>
  </div>
</div>
```

### 面板狀態管理

#### 摺疊狀態
- **最小化**: 僅顯示標題列
- **展開**: 顯示完整內容
- **記憶狀態**: 使用 localStorage 保存摺疊狀態

#### 編輯/預覽模式
- **編輯模式**: 顯示 Markdown 原始碼，支援語法高亮
- **預覽模式**: 顯示渲染後的 HTML
- **切換動畫**: 平滑過渡效果

## 右側面板設計 (Current Plans)

### 當期計畫顯示
- **4個固定面板**: 當前日期對應的年、月、週、日計畫
- **自動載入**: 根據當前日期自動載入對應計畫
- **即時編輯**: 直接編輯當期計畫內容

## 可重用組件設計

### 1. PlanPanel 組件
```javascript
class PlanPanel {
  constructor(options) {
    this.type = options.type;        // year|month|week|day
    this.date = options.date;        // 目標日期
    this.isCurrent = options.isCurrent || false;
    this.container = options.container;
    this.onSave = options.onSave;
    this.onCopy = options.onCopy;
    
    this.isCollapsed = false;
    this.isPreviewMode = false;
    this.content = '';
    
    this.init();
  }
  
  init() {
    this.render();
    this.bindEvents();
    this.loadContent();
  }
  
  render() {
    // 渲染面板 HTML
  }
  
  bindEvents() {
    // 綁定事件處理器
  }
  
  loadContent() {
    // 從 API 載入內容
  }
  
  saveContent() {
    // 儲存內容到後端
  }
  
  navigateToPrevious() {
    // 導航到前一期
  }
  
  navigateToNext() {
    // 導航到後一期
  }
  
  toggleCollapse() {
    // 切換摺疊狀態
  }
  
  togglePreview() {
    // 切換預覽/編輯模式
  }
  
  copyToCurrentPlan() {
    // 複製內容到當期計畫
  }
}
```

### 2. DatePicker 組件
```javascript
class DatePicker {
  constructor(options) {
    this.onDateSelect = options.onDateSelect;
    this.currentDate = options.currentDate;
  }
  
  show() {
    // 顯示日期選擇器
  }
  
  hide() {
    // 隱藏日期選擇器
  }
}
```

### 3. MarkdownEditor 組件
```javascript
class MarkdownEditor {
  constructor(options) {
    this.container = options.container;
    this.onChange = options.onChange;
    this.content = options.content || '';
    
    this.initCodeMirror();
  }
  
  initCodeMirror() {
    // 初始化 CodeMirror 編輯器
    // 配置 Markdown 語法高亮
  }
  
  getValue() {
    return this.editor.getValue();
  }
  
  setValue(content) {
    this.editor.setValue(content);
  }
}
```

## 佈局調整功能

### 左右側寬度調整
```html
<!-- 可拖拽的分隔線 -->
<div class="resize-handle bg-gray-300 w-1 cursor-col-resize hover:bg-gray-400"></div>
```

```javascript
class LayoutManager {
  constructor() {
    this.leftPanel = document.querySelector('.left-panel');
    this.rightPanel = document.querySelector('.right-panel');
    this.resizeHandle = document.querySelector('.resize-handle');
    
    this.bindResizeEvents();
  }
  
  bindResizeEvents() {
    // 實作拖拽調整寬度
  }
  
  collapseLeftPanel() {
    // 一鍵收縮左側面板
  }
  
  restoreLeftPanel() {
    // 還原左側面板寬度
  }
}
```

## CSS 樣式設計 (TailwindCSS)

### 主要 CSS 類別

#### 面板樣式
```css
.plan-panel {
  @apply border border-gray-200 rounded-lg shadow-sm mb-4;
}

.panel-header {
  @apply bg-gray-50 border-b border-gray-200 p-3 rounded-t-lg;
}

.panel-content {
  @apply p-0;
}

.markdown-editor {
  @apply font-mono text-sm border-0 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.markdown-preview {
  @apply prose prose-sm max-w-none p-4;
}
```

#### 按鈕樣式
```css
.nav-btn {
  @apply p-1 rounded hover:bg-gray-200 transition-colors;
}

.action-btn {
  @apply px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors;
}
```

#### 動畫效果
```css
.panel-collapse-transition {
  @apply transition-all duration-300 ease-in-out;
}

.preview-toggle-transition {
  @apply transition-opacity duration-200;
}
```

## 響應式設計

### 中等螢幕 (768px-1024px)
- 左側面板可摺疊為更小寬度
- 按鈕文字變為圖示

### 小螢幕 (<768px)
- 改為上下堆疊佈局
- 左側面板變為可摺疊的頂部導航
- 右側面板佔據主要空間

### 大螢幕 (>1200px)
- 更寬鬆的間距
- 更大的編輯區域

## 鍵盤快捷鍵

- `Ctrl + S`: 儲存當前編輯的面板
- `Ctrl + E`: 切換編輯/預覽模式
- `Ctrl + ]`: 摺疊/展開當前面板
- `Ctrl + ←/→`: 導航到前一期/後一期
- `Ctrl + \\`: 切換左側面板顯示/隱藏

## 使用者體驗設計

### 自動儲存
- 編輯內容後 3 秒無動作自動儲存
- 顯示儲存狀態指示器

### 載入狀態
- API 請求時顯示載入動畫
- 錯誤狀態顯示重試按鈕

### 內容選取複製
- 支援選取部分 Markdown 內容複製
- 提供複製整個面板內容的選項

### 深色模式支援
- 使用 TailwindCSS 的 `dark:` 前綴
- 提供明暗模式切換按鈕