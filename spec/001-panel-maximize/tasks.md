# 任務清單：面板最大化切換

**輸入**: 設計文件來自 `/specs/001-panel-maximize/`
**前置條件**: plan.md (必要), spec.md (必要 - 使用者故事), research.md, data-model.md, contracts/

<!--
  語言要求：任務描述應使用繁體中文 (zh-TW) 以提高清晰度
  依據憲法原則 V。技術術語和檔案路徑視需要使用英文。
-->

**測試**: 本功能透過手動測試驗證（專案無前端測試框架）

**組織**: 任務依使用者故事分組，以實現每個故事的獨立實作和測試

## 格式：`[ID] [P?] [Story] 描述`

- **[P]**: 可並行執行（不同檔案，無相依性）
- **[Story]**: 任務所屬的使用者故事（例如 US1, US2, US3）
- 描述中包含確切的檔案路徑

## 路徑慣例

- **Web 應用程式**: 本專案採用 `backend/`, `frontend/`, `static/` 結構
- 前端修改位於 `static/css/` 和 `static/js/`
- 後端無修改（純前端功能）

---

## Phase 1: 設置（共用基礎設施）

**目的**: 專案初始化和基本結構（本功能無需額外設置）

> **注意**: 本功能為純前端功能，在現有專案基礎上進行，無需額外設置步驟。

---

## Phase 2: 基礎（阻塞性前置條件）

**目的**: 必須在任何使用者故事實作前完成的核心基礎設施

> **注意**: 本功能為純前端功能，在現有架構上擴充，無阻塞性基礎工作。可直接進入使用者故事實作。

**檢查點**: 基礎就緒 - 使用者故事實作現在可以開始

---

## Phase 3: 使用者故事 1 - 單一面板放大檢視 (優先級: P1) 🎯 MVP

**目標**: 實作面板雙擊最大化和恢復功能，使用者可專注於單一計畫層級

**獨立測試**: 在任一面板標題上雙擊應看到該面板擴展至全螢幕，其他面板隱藏；再次雙擊應恢復所有面板正常顯示

### 使用者故事 1 的實作

- [ ] T001 [P] [US1] 在 static/css/main.css 新增面板最大化相關 CSS 樣式（.panel-maximized, .panel-hidden-by-maximize）
- [ ] T002 [P] [US1] 在 static/js/layout-manager.js 的 constructor 中新增 maximizedPanel 屬性初始化
- [ ] T003 [US1] 在 static/js/layout-manager.js 實作 maximizePanel(panel) 方法
- [ ] T004 [US1] 在 static/js/layout-manager.js 實作 restoreNormalView() 方法
- [ ] T005 [US1] 在 static/js/layout-manager.js 實作 hideOtherPanels(panel) 輔助方法
- [ ] T006 [US1] 在 static/js/layout-manager.js 實作 showAllPanels() 輔助方法
- [ ] T007 [US1] 在 static/js/layout-manager.js 實作 isInMaximizeMode() 檢查方法
- [ ] T008 [P] [US1] 在 static/js/plan-panel.js 的 constructor 中新增 isMaximized 和 layoutManager 屬性
- [ ] T009 [US1] 在 static/js/plan-panel.js 實作 bindDoubleClickEvent() 方法
- [ ] T010 [US1] 在 static/js/plan-panel.js 實作 toggleMaximize() 方法
- [ ] T011 [US1] 在 static/js/plan-panel.js 實作 performMaximizeToggle() 方法
- [ ] T012 [US1] 在 static/js/plan-panel.js 的 bindEvents() 方法中呼叫 bindDoubleClickEvent()
- [ ] T013 [US1] 在 static/js/app.js 初始化 LayoutManager 並傳遞給每個 PlanPanel 實例
- [ ] T014 [US1] 手動測試：測試年計畫面板雙擊最大化和恢復
- [ ] T015 [US1] 手動測試：測試月計畫面板雙擊最大化和恢復
- [ ] T016 [US1] 手動測試：測試週計畫面板雙擊最大化和恢復
- [ ] T017 [US1] 手動測試：測試日計畫面板雙擊最大化和恢復
- [ ] T018 [US1] 手動測試：驗證其他面板在最大化時正確隱藏
- [ ] T019 [US1] 手動測試：驗證快速連續雙擊（5次）無閃爍或錯誤

**檢查點**: 此時使用者故事 1 應完全可用且可獨立測試

---

## Phase 4: 使用者故事 2 - 最大化狀態視覺提示 (優先級: P2)

**目標**: 提供清楚的視覺提示告知使用者當前處於最大化模式及如何恢復

**獨立測試**: 觸發任一面板最大化後，檢查標題列視覺樣式變化、tooltip 顯示、游標樣式

### 使用者故事 2 的實作

- [ ] T020 [P] [US2] 在 static/css/main.css 新增最大化面板標題列的視覺樣式（漸層背景、陰影效果）
- [ ] T021 [P] [US2] 在 static/css/main.css 新增 .panel-maximized .panel-header::after 偽元素顯示「雙擊恢復」提示
- [ ] T022 [P] [US2] 在 static/css/main.css 設定最大化面板標題列的 cursor: pointer 樣式
- [ ] T023 [US2] 在 static/js/plan-panel.js 的 toggleMaximize() 或 performMaximizeToggle() 中更新標題列 title 屬性為「再次雙擊以恢復正常檢視」
- [ ] T024 [US2] 手動測試：驗證最大化面板標題列背景色與正常狀態不同
- [ ] T025 [US2] 手動測試：驗證滑鼠懸停在最大化面板標題列時顯示 tooltip
- [ ] T026 [US2] 手動測試：驗證滑鼠移至最大化面板標題列時游標變為 pointer

**檢查點**: 此時使用者故事 1 和 2 應同時運作且可獨立驗證

---

## Phase 5: 使用者故事 3 - 保留面板功能狀態 (優先級: P3)

**目標**: 確保面板在最大化和恢復之間切換時保留所有內部狀態

**獨立測試**: 在面板中進行操作（輸入文字、捲動、切換模式）後執行最大化/恢復，驗證狀態保留

### 使用者故事 3 的實作

- [ ] T027 [US3] 在 static/css/main.css 確保 .panel-hidden-by-maximize 使用 display: none（而非移除 DOM）以保留狀態
- [ ] T028 [US3] 在 static/js/layout-manager.js 的 maximizePanel() 中確認不移除或重建 DOM 元素
- [ ] T029 [US3] 在 static/js/plan-panel.js 的 toggleMaximize() 中處理摺疊狀態：若面板已摺疊則先展開
- [ ] T030 [US3] 在 static/js/plan-panel.js 確保最大化切換不觸發 content reload 或 state reset
- [ ] T031 [US3] 手動測試：在編輯模式輸入文字後最大化/恢復，驗證內容保留
- [ ] T032 [US3] 手動測試：捲動面板內容後最大化/恢復，驗證捲動位置保留
- [ ] T033 [US3] 手動測試：在預覽模式下最大化/恢復，驗證模式保留
- [ ] T034 [US3] 手動測試：摺疊面板後雙擊標題，驗證先展開再最大化的行為

**檢查點**: 所有使用者故事現在應獨立運作且狀態保留完整

---

## Phase 6: 完善與跨領域關注

**目的**: 影響多個使用者故事的改進和邊界情況處理

- [ ] T035 [P] 在 static/js/layout-manager.js 的 toggleLeftPanel() 中新增檢查：若處於最大化模式則先恢復或忽略
- [ ] T036 [P] 新增視窗 resize 事件處理（CSS 已使用 100vh/100vw，應自動適應，驗證即可）
- [ ] T037 跨瀏覽器相容性測試：Chrome, Firefox, Safari, Edge
- [ ] T038 觸控裝置測試：iPad/Android 平板雙擊手勢
- [ ] T039 觸控裝置測試：iPhone/Android 手機雙擊手勢
- [ ] T040 效能測試：測量雙擊到視覺變化完成的時間（目標 < 200ms）
- [ ] T041 效能測試：檢查動畫流暢度（目標 ≥ 50fps）
- [ ] T042 記憶體測試：長時間使用後檢查無記憶體洩漏
- [ ] T043 [P] 在 specs/001-panel-maximize/checklists/ 建立 manual-test-results.md 記錄測試結果
- [ ] T044 [P] 更新 README.md 新增面板最大化功能說明（若需要）
- [ ] T045 程式碼審查：檢查所有新增程式碼符合 ES6+ 標準和 JSDoc 註解
- [ ] T046 程式碼審查：驗證函數複雜度 ≤ 15、函數長度 ≤ 50 行
- [ ] T047 執行 quickstart.md 中的完整測試檢查清單驗證

---

## 相依性與執行順序

### 階段相依性

- **設置 (Phase 1)**: 無相依性 - 本功能跳過（已有專案基礎）
- **基礎 (Phase 2)**: 無相依性 - 本功能跳過（純前端擴充）
- **使用者故事 (Phase 3+)**: 可立即開始，各故事間相依性低
  - US1 可獨立開始（MVP）
  - US2 依賴 US1（需要最大化功能運作）
  - US3 依賴 US1（需要最大化功能運作）
- **完善 (Phase 6)**: 依賴所有使用者故事完成

### 使用者故事相依性

- **使用者故事 1 (P1)**: 無相依性 - MVP，優先實作
- **使用者故事 2 (P2)**: 依賴 US1 的最大化功能，但可獨立測試視覺提示
- **使用者故事 3 (P3)**: 依賴 US1 的最大化功能，但可獨立測試狀態保留

### 每個使用者故事內部

- **US1**: CSS 樣式和 LayoutManager 方法可並行 → PlanPanel 方法 → app.js 整合 → 測試
- **US2**: CSS 視覺樣式可並行新增 → 測試
- **US3**: 狀態保留邏輯 → 摺疊互動處理 → 測試

### 並行機會

#### Phase 3 內部（使用者故事 1）

```bash
# 可同時執行的任務：
並行組 1:
  - T001 新增 CSS 樣式
  - T002 新增 LayoutManager 屬性
  - T008 新增 PlanPanel 屬性

並行組 2 (依賴組 1):
  - T003 實作 maximizePanel()
  - T004 實作 restoreNormalView()
  - T005 實作 hideOtherPanels()
  - T006 實作 showAllPanels()
  - T007 實作 isInMaximizeMode()

並行組 3 (依賴組 1):
  - T009 實作 bindDoubleClickEvent()
  - T010 實作 toggleMaximize()
  - T011 實作 performMaximizeToggle()
```

#### Phase 4 內部（使用者故事 2）

```bash
# 可同時執行的任務：
並行組 1:
  - T020 新增標題列視覺樣式
  - T021 新增提示文字偽元素
  - T022 設定游標樣式
```

#### Phase 6（完善階段）

```bash
# 可同時執行的任務：
並行組 1:
  - T035 處理左側面板切換互動
  - T043 建立測試結果文件
  - T044 更新 README
```

---

## 並行範例：使用者故事 1

```bash
# 同時啟動使用者故事 1 的並行任務：
任務: "在 static/css/main.css 新增面板最大化相關 CSS 樣式"
任務: "在 static/js/layout-manager.js 的 constructor 中新增 maximizedPanel 屬性"
任務: "在 static/js/plan-panel.js 的 constructor 中新增 isMaximized 和 layoutManager 屬性"

# 等待上述完成後，同時啟動 LayoutManager 方法實作：
任務: "實作 maximizePanel(panel) 方法"
任務: "實作 restoreNormalView() 方法"
任務: "實作 hideOtherPanels(panel) 方法"
任務: "實作 showAllPanels() 方法"
任務: "實作 isInMaximizeMode() 方法"
```

---

## 實作策略

### MVP 優先（僅使用者故事 1）

1. 跳過 Phase 1 和 2（已有專案基礎）
2. 完成 Phase 3：使用者故事 1（T001-T019）
3. **停止並驗證**: 獨立測試使用者故事 1
4. 若就緒可部署/展示基本最大化功能

### 漸進式交付

1. 跳過設置和基礎 → 專案基礎已就緒
2. 新增使用者故事 1 → 獨立測試 → 部署/展示（MVP！）
3. 新增使用者故事 2 → 獨立測試 → 部署/展示（改善 UX）
4. 新增使用者故事 3 → 獨立測試 → 部署/展示（完整功能）
5. 完善階段 → 跨裝置和效能驗證
6. 每個故事新增價值而不破壞先前故事

### 單人開發策略

1. 完成使用者故事 1（T001-T019）
2. 驗證 MVP 功能正常
3. 完成使用者故事 2（T020-T026）
4. 驗證視覺提示改善
5. 完成使用者故事 3（T027-T034）
6. 驗證狀態保留完整
7. 完成完善階段（T035-T047）
8. 全面測試和文件更新

---

## 檢查點總結

### ✅ 使用者故事 1 完成檢查點

- [ ] 可在任一面板標題雙擊觸發最大化
- [ ] 最大化面板佔據全螢幕，其他面板隱藏
- [ ] 再次雙擊可恢復所有面板正常顯示
- [ ] 4 個面板（年/月/週/日）均可獨立測試
- [ ] 快速連續雙擊無閃爍或錯誤

### ✅ 使用者故事 2 完成檢查點

- [ ] 最大化面板標題列有明顯視覺變化
- [ ] 滑鼠懸停顯示 tooltip「再次雙擊以恢復正常檢視」
- [ ] 游標移至標題列時顯示 pointer 樣式
- [ ] 視覺提示直覺且易於理解

### ✅ 使用者故事 3 完成檢查點

- [ ] 編輯模式和內容在最大化/恢復後保留
- [ ] 捲動位置在最大化/恢復後保留
- [ ] 預覽模式在最大化/恢復後保留
- [ ] 摺疊面板雙擊可正確處理（先展開再最大化）

### ✅ 完善階段完成檢查點

- [ ] 所有跨瀏覽器測試通過
- [ ] 觸控裝置雙擊手勢正常運作
- [ ] 效能指標達標（< 200ms 響應，≥ 50fps 動畫）
- [ ] 無記憶體洩漏
- [ ] 程式碼符合憲法品質標準
- [ ] 測試結果已記錄

---

## 注意事項

- [P] 任務 = 不同檔案，無相依性，可並行執行
- [Story] 標籤將任務映射到特定使用者故事以便追溯
- 每個使用者故事應可獨立完成和測試
- 在每個檢查點停止以獨立驗證故事
- 本功能無自動化測試，所有驗證透過手動測試
- 提交程式碼：每個任務或邏輯組完成後提交
- 避免：模糊任務、同一檔案衝突、破壞獨立性的跨故事相依

---

## 任務統計

- **總任務數**: 47
- **使用者故事 1 (MVP)**: 19 個任務
- **使用者故事 2**: 7 個任務
- **使用者故事 3**: 8 個任務
- **完善階段**: 13 個任務
- **並行機會**: 約 15 個任務可並行執行（標記 [P]）
- **預估時間**: 
  - MVP (US1): 2-3 小時
  - US2: 0.5-1 小時
  - US3: 0.5-1 小時
  - 完善: 1-2 小時
  - **總計**: 4-7 小時（包含測試）
