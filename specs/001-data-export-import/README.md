# 資料匯出/匯入功能

## 📋 功能概述

此功能提供完整的工作計畫資料匯出與匯入能力,支援:
- ✅ 一鍵匯出所有資料為 ZIP 壓縮檔
- ✅ ZIP 檔案格式驗證 (結構、檔名、星期日檢查)
- ✅ 安全匯入 (Zip Slip 防護、原子性操作、自動回滾)
- ✅ 使用者友善的錯誤/警告訊息

## 🚀 快速開始

### 匯出資料

1. 點擊右上角「⚙️ 設定」圖示
2. 在「資料管理」區塊點擊「匯出資料」
3. 系統會自動下載 `export_data_YYYYMMDD_HHMMSS.zip`

**檔案結構**:
```
export_data_20251025_143022.zip
├── data/
│   ├── Day/
│   │   ├── 20251001.md
│   │   └── ...
│   ├── Week/
│   │   ├── 20250929.md  # 必須是星期日
│   │   └── ...
│   ├── Month/
│   │   ├── 202510.md
│   │   └── ...
│   └── Year/
│       ├── 2024.md
│       └── 2025.md
```

### 匯入資料

1. 點擊右上角「⚙️ 設定」圖示
2. 在「資料管理」區塊點擊「選擇檔案匯入」
3. 選擇要匯入的 ZIP 檔案
4. 系統會自動:
   - ✅ 驗證檔案格式和結構
   - ✅ 顯示驗證結果 (錯誤/警告)
   - ✅ 詢問確認 (若驗證通過)
   - ✅ 執行匯入 (備份→匯入→清理 or 回滾)
   - ✅ 自動重新整理頁面

## 📐 技術規格

### API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/export/create` | POST | 建立匯出 ZIP 檔案 |
| `/api/export/download/{filename}` | GET | 下載匯出的 ZIP |
| `/api/import/validate` | POST | 驗證上傳的 ZIP 檔案 |
| `/api/import/execute` | POST | 執行資料匯入 |

詳細 API 規格請參考:
- [export-api.yaml](./contracts/export-api.yaml)
- [import-api.yaml](./contracts/import-api.yaml)

### 資料模型

請參考 [data-model.md](./data-model.md)

## 🔒 安全性

### Zip Slip 防護

使用 `Path.resolve()` 驗證解壓路徑:
```python
resolved_path = member_path.resolve()
target_resolved = target_dir.resolve()

if not str(resolved_path).startswith(str(target_resolved)):
    raise SecurityError(f"偵測到 Zip Slip 攻擊: {member}")
```

### 檔名安全

下載端點使用正則驗證檔名:
```python
if not re.match(r'^export_data_\d{8}_\d{6}\.zip$', filename):
    raise HTTPException(status_code=400)
```

## 🎯 驗證規則

### 1. 檔案大小
- 上限: 100MB
- 超過會回傳 `ErrorType.SIZE` 錯誤

### 2. 目錄結構
- 必須包含: `Day/`, `Week/`, `Month/`, `Year/`
- 缺少任何目錄會回傳 `ErrorType.STRUCTURE` 錯誤

### 3. 檔名格式

| 目錄 | 格式 | 範例 |
|------|------|------|
| Day | `YYYYMMDD.md` | `20251025.md` |
| Week | `YYYYMMDD.md` (必須是星期日) | `20251019.md` |
| Month | `YYYYMM.md` | `202510.md` |
| Year | `YYYY.md` | `2025.md` |

### 4. 星期日檢查
- Week 目錄的檔案必須以星期日日期命名
- 使用 `datetime.weekday() == 6` 驗證
- 錯誤範例: `20251020.md` (星期一) → `ErrorType.WEEKDAY`

## 🔄 原子性操作

匯入流程確保原子性:
1. **驗證**: 先驗證檔案格式,失敗則中斷
2. **備份**: 備份當前 `backend/data` 至 `/tmp/backup_data_*`
3. **清空**: 刪除現有 `backend/data`
4. **匯入**: 解壓 ZIP 檔案到 `backend/data`
5. **成功**: 刪除備份和臨時檔案
6. **失敗**: 從備份還原並清理

```python
try:
    backup_path = backup_current_data()
    # ... 執行匯入
    shutil.rmtree(backup_path)  # 成功後清理
except Exception:
    restore_backup(backup_path)  # 失敗則回滾
    raise
```

## 📊 效能指標

| 操作 | 目標 | 實測 |
|------|------|------|
| 匯出 (1000 檔案) | < 3s | ✅ |
| 驗證 (1000 檔案) | < 5s | ✅ |
| 匯入 (1000 檔案) | < 10s | ✅ |
| 下載回應時間 | < 100ms | ✅ |

## 🧪 測試

### 後端測試
```bash
cd /home/dev/projects/work-plan-by-calendar
source .venv/bin/activate
pytest tests/test_data_export_service.py -v
```

### 手動測試檢查清單
請參考 [manual-test-results.md](./checklists/manual-test-results.md)

## 📝 變更記錄

### v1.0.0 (2025-10-25)
- ✅ Phase 1: 環境驗證
- ✅ Phase 2: 核心模型建立
- ✅ Phase 3: 匯出功能實作
- ✅ Phase 4: 驗證功能實作
- ✅ Phase 5: 匯入執行實作
- ✅ Phase 6: 資料顯示驗證
- ✅ Phase 7: 最終優化和文件

詳細任務清單請參考 [tasks.md](./tasks.md)

## 🐛 已知問題

無

## 📚 相關文件

- [功能規格](./spec.md)
- [實作計畫](./plan.md)
- [資料模型](./data-model.md)
- [API 規格](./contracts/)
- [快速開始](./quickstart.md)
- [任務清單](./tasks.md)

## 👥 貢獻者

- 開發: GitHub Copilot + Claude Sonnet 4.5
- 測試: 手動測試 + pytest

## 📄 授權

遵循專案主要授權
