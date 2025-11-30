<!--
SYNC IMPACT REPORT
==================
Version Change: 1.1.0 → 1.2.0
Action: Add Minimal Change Principle for brownfield project

Modified Principles: N/A
Added Sections:
  - VI. Minimal Change Principle (Brownfield Project Discipline)
  
Removed Sections: N/A

Templates Status:
  ✅ plan-template.md - No changes required (Complexity Tracking already covers violation justification)
  ✅ spec-template.md - No changes required
  ✅ tasks-template.md - No changes required
  ✅ checklist-template.md - No changes required
  ✅ README.md - No changes required

Follow-up TODOs: 
  - All changes MUST evaluate impact on existing functionality before implementation
  - Refactoring MUST be isolated from feature changes
  - Large-scale changes MUST be justified in Complexity Tracking section
-->

# Work Plan Calendar System Constitution

## Core Principles

### I. Code Quality First

**Code MUST be maintainable, readable, and idiomatic.**

- All Python code MUST follow PEP 8 style guidelines
- All JavaScript code MUST follow ES6+ modern standards
- Maximum function complexity: 15 cyclomatic complexity
- Maximum function length: 50 lines (excluding comments/whitespace)
- Meaningful variable/function names required (no single letters except loop iterators)
- Code duplication exceeding 6 lines MUST be refactored into reusable functions
- All public APIs MUST include type hints (Python) or JSDoc comments (JavaScript)
- Dead code and commented-out code MUST be removed before commit

**Rationale**: The calendar system manages critical user planning data. Poor code quality leads to bugs that disrupt user workflows, making the system unreliable. Maintainability ensures long-term sustainability as features grow.

### II. Testing Standards

**Tests MUST verify correctness at contract, integration, and edge-case levels.**

- All API endpoints MUST have contract tests validating request/response schemas
- All user stories MUST have integration tests covering happy path scenarios
- Critical business logic (date calculations, plan navigation) MUST have unit tests
- Edge cases MUST be tested: boundary dates (year/month/week transitions), empty plans, concurrent saves
- Test coverage target: minimum 80% for backend services, 70% for frontend components
- Tests MUST be independent and runnable in any order
- Test failures MUST provide clear diagnostic messages indicating what failed and why
- Mock external dependencies; do not require filesystem writes in unit tests (use temp directories)

**Rationale**: Calendar date calculations are notoriously error-prone (leap years, week boundaries, timezone handling). User trust depends on correct plan retrieval and storage. Comprehensive tests prevent data loss and calculation errors.

### III. User Experience Consistency

**User interactions MUST be predictable, accessible, and error-tolerant.**

- All user actions MUST provide immediate visual feedback (loading states, save confirmations)
- Error messages MUST be user-friendly, actionable, and never expose stack traces
- Keyboard shortcuts MUST work consistently across all panels (Ctrl+S saves, Ctrl+E toggles edit/preview)
- Responsive design breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- All interactive elements MUST have accessible labels and ARIA attributes
- Auto-save MUST trigger 3 seconds after last keystroke; manual save MUST be instant
- Plan navigation (previous/next) MUST preserve context (same plan type, edit state)
- Loading states MUST appear for operations exceeding 200ms
- Markdown rendering MUST be consistent between editor preview and saved view

**Rationale**: Users rely on this system daily for planning critical work. Inconsistent behavior or confusing errors disrupt their workflow and reduce trust. Accessibility ensures all users can benefit from the system.

### IV. Performance Requirements

**System MUST respond quickly and handle reasonable scale without degradation.**

- API response time: <100ms p50, <300ms p95 for plan CRUD operations
- Frontend rendering: Initial page load <1.5s, subsequent navigations <500ms
- Auto-save debounce: 3 seconds (prevent excessive API calls during typing)
- Markdown rendering: <200ms for plans up to 10,000 characters
- Backend MUST handle 50 concurrent users without degradation
- File I/O operations MUST use async patterns to prevent blocking
- Database queries (if added) MUST use indexes on date fields
- Memory usage: Backend <200MB per process, frontend <50MB heap per session
- No memory leaks: Long-running sessions (8+ hours) MUST not accumulate memory

**Rationale**: A slow planning tool disrupts focus and productivity. Users often switch rapidly between dates and plan types during review sessions. Performance degradation makes the system frustrating to use.

### V. Language Standardization

**All specifications, plans, and user-facing documentation MUST be written in Traditional Chinese (zh-TW).**

- All feature specifications (spec.md files) MUST use Traditional Chinese
- All implementation plans (plan.md files) MUST use Traditional Chinese
- All user stories, requirements, and acceptance criteria MUST be in Traditional Chinese
- User-facing documentation sections in README MUST remain in Traditional Chinese
- Code comments explaining business logic SHOULD use Traditional Chinese for clarity
- Technical terms MAY use English where Traditional Chinese equivalents are uncommon (e.g., "API", "JSON", "Markdown")
- Error messages shown to users MUST be in Traditional Chinese
- UI labels, buttons, and interface text MUST be in Traditional Chinese
- Developer-focused content (code, variable names, function names, git commits) MUST use English

**Rationale**: This system is designed for Traditional Chinese-speaking users managing their work plans. Consistency in language ensures all stakeholders (users, product managers, developers) can understand specifications and plans without translation overhead. Mixing languages in specifications creates confusion and reduces accessibility for non-technical stakeholders reviewing requirements.

### VI. Minimal Change Principle (Brownfield Discipline)

**對棕地專案的任何變更 MUST 遵循最小影響範圍原則。**

- 所有變更 MUST 優先考慮對現有程式碼的最小侵入性
- 新功能 MUST 通過擴展（extension）而非修改（modification）現有程式碼來實現
- 重構（refactoring）MUST 與功能變更分離，不得在同一個 commit 中混合
- 修改現有檔案時 MUST 保留原有的程式碼風格和架構模式
- 刪除現有程式碼 MUST 提供明確的理由和影響評估
- 跨多個檔案的變更 MUST 在 plan.md 的 Complexity Tracking 中說明必要性
- API 變更 MUST 保持向後相容性，或提供明確的遷移路徑
- 資料庫/檔案結構變更 MUST 包含遷移策略和回滾計畫

**變更範圍分級**：

| 變更等級 | 影響範圍 | 審查要求 |
|---------|---------|---------|
| **微型** | 單一函數/方法內部調整 | 標準 code review |
| **小型** | 單一檔案內多處修改 | 標準 code review + 測試驗證 |
| **中型** | 2-5 個檔案的協調變更 | 詳細說明 + 影響評估 |
| **大型** | 超過 5 個檔案或跨層變更 | 架構討論 + Complexity Tracking 必填 |

**禁止行為**：

- 禁止「順便」重構與功能無關的程式碼
- 禁止未經討論的大規模程式碼風格統一
- 禁止在 bug 修復中夾帶功能增強
- 禁止移除「看起來沒用」但未經確認的程式碼
- 禁止變更未被新功能直接使用的 API 簽名

**例外處理**：

若必須進行大範圍變更，MUST 在 plan.md 中記錄：
1. 為何最小變更方案不可行
2. 影響範圍的完整清單（受影響的檔案、函數、測試）
3. 回滾策略
4. 增量實施計畫（如可能）

**Rationale**: 棕地專案已有運行中的功能和使用者依賴。大範圍變更增加引入回歸 bug 的風險，且難以追蹤問題來源。最小變更原則確保每次修改都是可控的、可追蹤的、可回滾的，保護現有系統的穩定性。

## Performance Targets

### Backend Performance

- **Endpoint Latency**:
  - GET /api/plans/{type}/{date}: <50ms p50, <150ms p95
  - POST/PUT /api/plans/{type}/{date}: <100ms p50, <250ms p95
  - DELETE operations: <75ms p50, <200ms p95
  - Navigation endpoints (previous/next): <80ms p50, <200ms p95

- **Throughput**: Minimum 100 requests/second on single instance
- **File Operations**: Markdown file read/write <30ms per operation
- **Concurrency**: Support 50 concurrent API requests without queuing

### Frontend Performance

- **Initial Load**: <1.5s for first meaningful paint
- **Interactions**: <100ms response to user clicks
- **Rendering**: <200ms to render markdown preview
- **Auto-save**: Debounce 3s, network request <150ms
- **Navigation**: <500ms to load and render new plan view

### Resource Limits

- **Backend Memory**: <200MB per FastAPI worker process
- **Frontend Memory**: <50MB JavaScript heap per browser session
- **Bundle Size**: JavaScript <150KB gzipped, CSS <30KB gzipped
- **API Payload**: Maximum 1MB per plan document

## Development Workflow

### Code Review Requirements

- All changes MUST be reviewed by at least one other developer
- Reviews MUST verify compliance with all four core principles
- Automated tests MUST pass before review approval
- Linting and formatting checks MUST pass (flake8 for Python, ESLint for JavaScript)

### Quality Gates

- **Pre-commit**: Formatting and linting checks pass
- **Pre-push**: All tests pass locally
- **CI Pipeline**: Tests, linting, type checking, coverage validation
- **Pre-deployment**: Integration tests pass, performance benchmarks met

### Feature Development Process

1. Specification: Define user stories, requirements, success criteria
2. Planning: Technical design, task breakdown, dependency analysis
3. Test Design: Write failing tests for contracts and integration scenarios
4. Implementation: Write code to pass tests, refactor for quality
5. Validation: Verify all principles, run full test suite, performance check
6. Documentation: Update README, API docs, inline comments

### Documentation Standards

- All API endpoints MUST be documented in OpenAPI/Swagger format
- All JavaScript modules MUST have file-level JSDoc comments explaining purpose
- Complex algorithms (especially date calculations) MUST have inline comments explaining logic
- README MUST be kept current with setup instructions, architecture overview, and feature list

## Governance

This constitution supersedes all other development practices. Any deviation from these principles MUST be explicitly justified and documented in the implementation plan's Complexity Tracking section.

### Amendment Process

- Amendments MUST include rationale for the change
- Version number MUST be incremented following semantic versioning:
  - MAJOR: Principle removal or redefinition (backward incompatible)
  - MINOR: New principle or section added
  - PATCH: Clarifications, wording improvements
- Amendments MUST trigger updates to affected templates and command files
- All stakeholders MUST be notified of constitutional changes

### Compliance Verification

- All pull requests MUST include a Constitution Compliance section verifying adherence
- Code reviews MUST explicitly check for principle violations
- CI/CD pipeline MUST enforce automated compliance (tests, linting, coverage)
- Quarterly audits MUST review codebase for accumulated technical debt

### Exception Handling

Violations MUST be justified in the implementation plan with:
- Why the principle cannot be followed
- Simpler alternative considered and rejected
- Mitigation plan to minimize impact
- Future refactoring plan to eliminate violation

**Version**: 1.2.0 | **Ratified**: 2025-10-24 | **Last Amended**: 2025-11-30
