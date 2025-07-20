#!/usr/bin/env python3
# Test data generator for work plan calendar system

import os
import sys
from datetime import datetime, date, timedelta
from pathlib import Path

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.date_calculator import DateCalculator
from backend.models import PlanType


class TestDataGenerator:
    def __init__(self, base_dir="data"):
        self.base_dir = Path(base_dir)
        self.create_directories()

    def create_directories(self):
        """建立資料目錄結構"""
        for subdir in ["Year", "Month", "Week", "Day"]:
            (self.base_dir / subdir).mkdir(parents=True, exist_ok=True)

    def generate_all_test_data(self):
        """產生所有測試資料"""
        print("開始產生測試資料...")
        
        # 年度計畫
        self.generate_year_plans([2024, 2025])
        
        # 月度計畫
        self.generate_month_plans(["2025-06", "2025-07"])
        
        # 週計畫 (2025年7月的週計畫)
        self.generate_july_week_plans()
        
        # 日計畫
        self.generate_day_plans([
            date(2025, 7, 1),
            date(2025, 7, 2),
            date(2025, 7, 3)
        ])
        
        print("測試資料產生完成！")

    def generate_year_plans(self, years):
        """產生年度計畫"""
        for year in years:
            content = self.get_year_content(year)
            filename = f"{year}.md"
            file_path = self.base_dir / "Year" / filename
            self.write_file(file_path, content)
            print(f"已生成年度計畫: {filename}")

    def generate_month_plans(self, months):
        """產生月度計畫"""
        for month_str in months:
            year, month = map(int, month_str.split('-'))
            content = self.get_month_content(year, month)
            filename = f"{year:04d}{month:02d}.md"
            file_path = self.base_dir / "Month" / filename
            self.write_file(file_path, content)
            print(f"已生成月度計畫: {filename}")

    def generate_july_week_plans(self):
        """產生2025年7月的週計畫"""
        # Get all weeks in July 2025
        july_start = date(2025, 7, 1)
        july_end = date(2025, 7, 31)
        
        current_date = july_start
        weeks_generated = set()
        
        while current_date <= july_end:
            week_start = DateCalculator.get_week_start(current_date)
            week_start_str = week_start.strftime('%Y%m%d')
            
            if week_start_str not in weeks_generated:
                content = self.get_week_content(week_start)
                filename = f"{week_start_str}.md"
                file_path = self.base_dir / "Week" / filename
                self.write_file(file_path, content)
                print(f"已生成週計畫: {filename}")
                weeks_generated.add(week_start_str)
            
            current_date += timedelta(days=7)

    def generate_day_plans(self, dates):
        """產生日計畫"""
        for target_date in dates:
            content = self.get_day_content(target_date)
            filename = f"{target_date.strftime('%Y%m%d')}.md"
            file_path = self.base_dir / "Day" / filename
            self.write_file(file_path, content)
            print(f"已生成日計畫: {filename}")

    def write_file(self, file_path, content):
        """寫入檔案"""
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding='utf-8')
        except Exception as e:
            print(f"寫入檔案失敗 {file_path}: {str(e)}")

    def get_year_content(self, year):
        """取得年度計畫內容"""
        if year == 2024:
            return """# 2024 年度計畫

## 年度目標
- **技術成長**: 深入學習全端開發技術棧
- **專案交付**: 完成 3 個重要系統開發
- **團隊合作**: 提升跨部門協作效率
- **個人發展**: 取得相關技術認證

## 重點專案

### Q1 - 用戶管理系統重構
- 技術棧：React + Node.js + PostgreSQL  
- 預期完成時間：3月底
- 成功指標：效能提升50%，用戶體驗改善

### Q2 - 數據分析平台建設
- 技術棧：Python + FastAPI + MongoDB
- 預期完成時間：6月底  
- 成功指標：支援即時數據處理

### Q3 - 移動端應用開發
- 技術棧：React Native + Firebase
- 預期完成時間：9月底
- 成功指標：iOS/Android 雙平台上線

### Q4 - DevOps 流程優化
- 重點：CI/CD pipeline, 容器化部署
- 預期完成時間：12月底
- 成功指標：部署效率提升80%

## 學習計畫
- **前端技術**: React 18, TypeScript, TailwindCSS
- **後端技術**: FastAPI, GraphQL, 微服務架構  
- **資料庫**: PostgreSQL 進階功能, Redis 快取策略
- **雲服務**: AWS/Azure 服務深度應用
"""
        else:  # 2025
            return """# 2025 年度計畫

## 年度主題：技術領導與創新

### 核心目標
- **技術架構**: 建立可擴展的微服務架構
- **團隊領導**: 帶領 5-8 人技術團隊  
- **產品創新**: 推出 2 個創新產品功能
- **技術分享**: 在技術社群發表 4 次演講

## 重點領域

### 1. 架構設計與最佳實踐
- 微服務架構設計模式
- 分散式系統設計
- 效能監控與優化
- 安全性設計原則

### 2. 新興技術探索
- AI/ML 在產品中的應用
- WebAssembly 技術評估
- 邊緣運算解決方案
- 區塊鏈技術可行性研究

### 3. 團隊與流程
- 敏捷開發流程優化
- 程式碼品質提升
- 技術債務管理
- 知識分享與文件化

## 季度里程碑

### Q1: 基礎架構建設
- 完成微服務基礎架構
- 建立監控與警報系統
- 團隊技能提升計畫

### Q2: 產品功能創新  
- AI 功能原型開發
- 用戶體驗優化
- 效能基準測試

### Q3: 擴展與優化
- 水平擴展架構
- 自動化測試覆蓋率90%+
- 產品國際化準備

### Q4: 總結與規劃
- 年度技術回顧
- 下年度技術策略
- 團隊成長評估
"""

    def get_month_content(self, year, month):
        """取得月度計畫內容"""
        if year == 2025 and month == 6:
            return """# 2025-06 月度計畫

## 本月重點
完成微服務架構基礎建設，為 Q2 產品功能開發做準備

## 具體目標

### 技術開發 (60%)
- **API Gateway 建置**: 完成統一的 API 入口設計
- **服務註冊中心**: 實作服務發現機制  
- **配置管理**: 建立集中式配置管理系統
- **監控系統**: 部署 Prometheus + Grafana

### 團隊協作 (25%)
- **程式碼審查制度**: 建立 PR 審查標準
- **技術分享會**: 每週內部技術交流
- **文件規範**: 制定 API 文件標準

### 學習成長 (15%)
- **Docker 進階**: 容器編排與優化
- **Kubernetes**: 基礎概念與實作
- **微服務設計模式**: 閱讀相關技術書籍

## 每週安排

### 第一週 (6/1-6/7)
- 設計 API Gateway 架構
- 評估服務網格解決方案
- 團隊技術棧討論會議

### 第二週 (6/8-6/14)  
- 實作 API Gateway 核心功能
- 建立服務註冊中心
- 容器化現有服務

### 第三週 (6/15-6/21)
- 配置管理系統開發
- 監控系統部署與配置
- 程式碼審查流程建立

### 第四週 (6/22-6/28)
- 整合測試與調優
- 文件撰寫與整理
- 月度總結與下月規劃
"""
        else:  # 2025-07
            return """# 2025-07 月度計畫

## 本月主題：產品功能創新月

### 核心目標
- 完成 AI 推薦功能原型
- 優化用戶介面體驗
- 建立 A/B 測試框架

## 重點項目

### 1. AI 推薦系統 (40%)
- **數據收集**: 用戶行為數據分析
- **演算法選型**: 協同過濾 vs 深度學習
- **模型訓練**: 建立推薦模型 pipeline
- **API 整合**: 推薦服務 API 開發

### 2. 前端體驗優化 (35%)
- **效能優化**: 頁面載入速度提升50%
- **互動設計**: 新的 UI 組件庫
- **響應式設計**: 移動端體驗改善
- **無障礙功能**: WCAG 2.1 AA 標準

### 3. 測試與監控 (25%)
- **A/B 測試平台**: 功能開關與實驗追蹤
- **用戶分析**: 埋點數據收集分析  
- **錯誤監控**: Sentry 錯誤追蹤整合
- **效能監控**: Core Web Vitals 監控

## 每週里程碑

### 第一週 (7/1-7/7)
- AI 模型架構設計完成
- 前端組件庫 v2.0 設計稿確認
- A/B 測試平台需求分析

### 第二週 (7/8-7/14)
- 推薦演算法原型完成
- 新 UI 組件開發 50%
- 測試平台基礎架構

### 第三週 (7/15-7/21)  
- AI 服務 API 整合測試
- UI 組件庫完成度 80%
- A/B 測試首次實驗

### 第四週 (7/22-7/28)
- 功能整合測試
- 效能與體驗驗收  
- 月度成果展示

## 風險與應對
- **AI 模型準確度**: 準備多種演算法方案
- **前端相容性**: 跨瀏覽器測試
- **效能影響**: 監控與快速回滾機制
"""

    def get_week_content(self, week_start):
        """取得週計畫內容"""
        week_end = week_start + timedelta(days=6)
        week_title = f"{week_start.strftime('%Y-%m-%d')}~{week_end.strftime('%Y-%m-%d')}"
        
        # Different content based on the week
        if week_start.strftime('%Y-%m-%d') == '2025-06-29':
            return f"""# {week_title} 週計畫

## 本週主題：新月度啟動週

### 主要目標
1. 完成 6 月專案收尾工作
2. 啟動 7 月 AI 推薦系統開發
3. 團隊技術方案確認

## 每日安排

### 週日 6/29
- 休息調整，準備新週開始

### 週一 6/30  
- **上午**: 6月專案總結會議
- **下午**: AI 推薦系統技術調研
- **晚上**: 整理月度總結報告

### 週二 7/1
- **上午**: 數據分析需求討論
- **下午**: 機器學習框架選型評估  
- **晚上**: 技術文件閱讀

### 週三 7/2
- **上午**: 推薦演算法原型設計
- **下午**: 數據 pipeline 架構規劃
- **晚上**: 程式碼審查與優化

### 週四 7/3
- **上午**: 團隊技術分享會
- **下午**: AI 模型開發環境建置
- **晚上**: 學習深度學習理論

### 週五 7/4
- **上午**: 週度進度檢討
- **下午**: 下週工作規劃
- **晚上**: 個人技能提升時間

### 週六 7/5  
- **上午**: 開源專案貢獻
- **下午**: 技術部落格撰寫
- **晚上**: 休息與娛樂
"""
        else:
            return f"""# {week_title} 週計畫

## 本週重點：AI 推薦系統核心開發

### 週目標
- 完成推薦演算法核心邏輯
- 建立訓練數據處理 pipeline  
- 整合第一版推薦 API

## 技術任務分解

### 數據處理模組
- [x] 用戶行為數據清洗
- [ ] 特徵工程腳本開發
- [ ] 數據預處理 pipeline

### 演算法實作
- [ ] 協同過濾演算法實作
- [ ] 深度學習模型嘗試
- [ ] 模型評估指標設計

### API 服務
- [ ] FastAPI 服務架構
- [ ] 推薦接口設計
- [ ] 快取策略實作

## 每日執行計畫

### 週一 - 數據基礎建設
- 09:00-12:00: 數據清洗腳本開發
- 14:00-17:00: 特徵工程邏輯設計
- 19:00-21:00: 機器學習理論複習

### 週二 - 演算法原型
- 09:00-12:00: 協同過濾演算法實作
- 14:00-17:00: 模型訓練腳本
- 19:00-21:00: 程式碼審查與重構

### 週三 - 深度學習探索  
- 09:00-12:00: TensorFlow/PyTorch 評估
- 14:00-17:00: 神經網路模型設計
- 19:00-21:00: 模型效果分析

### 週四 - API 服務開發
- 09:00-12:00: FastAPI 服務架構
- 14:00-17:00: 推薦接口實作
- 19:00-21:00: 單元測試撰寫

### 週五 - 整合測試
- 09:00-12:00: 端到端測試
- 14:00-17:00: 效能優化
- 19:00-21:00: 週度總結

## 學習目標
- 深入理解推薦系統原理
- 熟練掌握機器學習 pipeline
- 提升 Python 數據處理能力
"""

    def get_day_content(self, target_date):
        """取得日計畫內容"""
        date_str = target_date.strftime('%Y-%m-%d')
        
        if date_str == '2025-07-01':
            return """# 2025-07-01 日計畫

## 今日主題：AI 推薦系統專案啟動

### 核心任務
1. **需求分析會議** (重要且緊急)
2. **技術調研完成** (重要不緊急)  
3. **開發環境準備** (不重要但緊急)

## 時間安排

### 上午時段 (09:00-12:00)
#### 09:00-10:30 | 跨部門需求討論會議
- **參與者**: 產品經理、數據分析師、前端工程師
- **議程**:
  - 推薦系統功能需求確認
  - 數據源與權限討論
  - 預期效果與指標定義
- **輸出**: 需求文件 v1.0

#### 10:30-10:45 | 休息時間

#### 10:45-12:00 | 技術方案調研
- **機器學習框架比較**:
  - TensorFlow vs PyTorch vs Scikit-learn
  - 性能、學習曲線、社群支援評估
- **推薦演算法選型**:
  - 協同過濾 (User-based, Item-based)
  - 內容過濾 (Content-based)
  - 混合式推薦 (Hybrid)

### 下午時段 (14:00-18:00)
#### 14:00-15:30 | 數據探索分析
- **用戶行為數據**:
  - 點擊、瀏覽、購買數據分析
  - 用戶畫像特徵分析
  - 數據品質評估
- **商品特徵數據**:
  - 類別、標籤、屬性分析
  - 價格、評分分佈
  - 缺失值處理策略

#### 15:30-15:45 | 休息時間

#### 15:45-17:00 | 開發環境建置
- **Python 環境**:
  - 虛擬環境建立 (conda/venv)
  - 相關套件安裝 (pandas, numpy, sklearn, tensorflow)
  - Jupyter Notebook 配置
- **數據庫連接**:
  - PostgreSQL 連接測試
  - 數據權限確認
  - 查詢效能基準測試

#### 17:00-18:00 | 原型設計
- **演算法原型**:
  - 簡單協同過濾實作
  - 基礎推薦邏輯驗證
  - 小規模數據測試

### 晚上時段 (19:00-21:00) - 可選
#### 19:00-20:00 | 技術學習
- **推薦系統理論**:
  - 閱讀經典論文摘要
  - Netflix, Amazon 推薦系統案例研究
  - 冷啟動問題解決方案

#### 20:00-21:00 | 明日準備
- **任務規劃**:
  - 明日開發任務分解
  - 所需資源準備
  - 風險點識別

## 成功指標
- [ ] 需求文件完成並獲得確認
- [ ] 技術方案選擇並形成文件
- [ ] 開發環境搭建完成
- [ ] 第一版演算法原型運行成功

## 潛在風險與應對
- **數據權限延遲**: 提前與 DBA 溝通，準備測試數據
- **技術選型分歧**: 準備 POC 展示說服
- **環境配置問題**: 準備 Docker 方案作為備選

## 學習收穫
- 對推薦系統有了更深入的理解
- 熟悉了數據分析的基本流程  
- 提升了跨部門溝通協調能力

## 明日重點
1. 開始協同過濾演算法實作
2. 數據預處理 pipeline 開發
3. 團隊技術分享會準備
"""
        elif date_str == '2025-07-02':
            return """# 2025-07-02 日計畫

## 今日主題：協同過濾演算法實作

### 優先任務
1. **協同過濾核心演算法開發** (高優先級)
2. **數據預處理模組完善** (中優先級)
3. **程式碼審查與重構** (中優先級)

## 詳細執行計畫

### 上午時段 (09:00-12:00)
#### 09:00-10:30 | User-based 協同過濾實作
```python
# 目標：實作基於用戶的協同過濾演算法
class UserBasedCF:
    def calculate_similarity(self, user1, user2):
        # 計算用戶相似度 (cosine similarity)
        pass
    
    def find_similar_users(self, target_user, top_k=10):
        # 找出最相似的 k 個用戶
        pass
    
    def recommend_items(self, target_user, num_recommendations=5):
        # 基於相似用戶生成推薦
        pass
```

**具體工作**:
- 相似度計算函數實作 (cosine, pearson)
- 用戶相似度矩陣建立
- 推薦生成邏輯實作

#### 10:30-10:45 | 休息時間

#### 10:45-12:00 | Item-based 協同過濾實作
```python  
# 目標：實作基於物品的協同過濾演算法
class ItemBasedCF:
    def calculate_item_similarity(self, item1, item2):
        # 計算物品相似度
        pass
    
    def build_item_similarity_matrix(self):
        # 建立物品相似度矩陣
        pass
    
    def recommend_by_items(self, user_profile, num_recommendations=5):
        # 基於用戶歷史物品推薦相似物品
        pass
```

### 下午時段 (14:00-18:00)
#### 14:00-15:30 | 數據預處理優化
- **數據清洗增強**:
  - 異常值檢測與處理
  - 缺失值填充策略優化
  - 數據標準化處理
- **特徵工程**:
  - 用戶活躍度特徵
  - 物品流行度特徵
  - 時間序列特徵提取

#### 15:30-15:45 | 休息時間

#### 15:45-17:00 | 演算法測試與驗證
- **單元測試撰寫**:
  - 相似度計算正確性測試
  - 推薦結果合理性檢查
  - 邊界條件處理測試
- **小規模數據驗證**:
  - 100 用戶 x 50 物品測試集
  - 推薦準確度初步評估
  - 運算效能基準測試

#### 17:00-18:00 | 程式碼審查與重構
- **程式碼品質提升**:
  - 函數拆分與模組化
  - 變數命名優化
  - 註釋與文件完善
- **效能優化**:
  - 向量化計算應用
  - 記憶體使用優化
  - 快取機制考量

### 晚上時段 (19:00-21:00)
#### 19:00-20:00 | 技術分享準備
- **明日分享會準備**:
  - 協同過濾演算法原理整理
  - 實作過程與挑戰總結
  - Demo 展示準備

#### 20:00-21:00 | 深度學習調研
- **神經網路推薦系統**:
  - AutoEncoder 在推薦系統中的應用
  - Neural Collaborative Filtering 論文閱讀
  - TensorFlow Recommenders 框架調研

## 技術難點與解決方案

### 1. 稀疏矩陣處理
**問題**: 用戶-物品評分矩陣極度稀疏，影響相似度計算
**解決方案**: 使用 scipy.sparse 矩陣，優化記憶體使用

### 2. 計算效能優化
**問題**: 全量用戶相似度計算時間複雜度高
**解決方案**: 分塊計算 + 相似度閾值過濾

### 3. 冷啟動問題
**問題**: 新用戶/新物品缺乏歷史數據
**解決方案**: 結合內容特徵，設計混合推薦策略

## 今日學習重點
- 協同過濾演算法的數學原理
- 稀疏矩陣運算的 Python 實作技巧
- 推薦系統評估指標 (Precision, Recall, NDCG)

## 完成指標
- [ ] User-based CF 基礎版本完成
- [ ] Item-based CF 基礎版本完成  
- [ ] 單元測試覆蓋率 > 80%
- [ ] 小規模測試數據驗證通過
- [ ] 明日技術分享材料準備完成

## 遇到的挑戰
1. **相似度計算精度**: 發現餘弦相似度在某些情況下表現不佳
2. **計算效能**: 全量計算耗時過長，需要優化策略
3. **評估指標**: 離線評估與線上效果的差異

## 明日計畫
1. 團隊技術分享會主講
2. 深度學習推薦模型調研
3. 推薦效果評估框架設計
"""
        else:  # 2025-07-03
            return """# 2025-07-03 日計畫

## 今日主題：技術分享與深度學習探索

### 重要事件
- **10:00-11:00**: 團隊技術分享會（主講）
- **15:00-16:00**: 與數據科學團隊交流會議

### 核心任務
1. **技術分享會執行** (最高優先級)
2. **深度學習推薦模型調研** (高優先級)
3. **推薦效果評估框架設計** (中優先級)

## 時間安排

### 上午時段 (09:00-12:00)
#### 09:00-10:00 | 分享會最終準備
- **簡報檢查**:
  - 演算法原理圖表確認
  - 程式碼 Demo 測試
  - Q&A 問題準備
- **技術 Demo 環境**:
  - Jupyter Notebook 運行測試
  - 演算法執行時間確認
  - 結果視覺化準備

#### 10:00-11:00 | 技術分享會主講
**主題**: "協同過濾演算法實作與最佳化"

**分享大綱**:
1. **推薦系統概述** (10分鐘)
   - 推薦系統的商業價值
   - 主要演算法分類
   - 協同過濾的優勢與限制

2. **協同過濾實作詳解** (30分鐘)
   - User-based vs Item-based 比較
   - 相似度計算方法
   - 程式碼實作展示
   - 效能優化技巧

3. **實際應用與挑戰** (15分鐘)
   - 稀疏性問題處理
   - 冷啟動解決方案
   - 可擴展性考量

4. **Q&A 與討論** (5分鐘)

#### 11:00-12:00 | 分享後討論與改進
- **收集回饋**:
  - 團隊成員建議整理
  - 技術改進點記錄
  - 後續合作機會討論
- **演算法優化**:
  - 根據討論優化程式碼
  - 新的實作思路記錄

### 下午時段 (14:00-18:00)
#### 14:00-15:00 | 深度學習理論複習
- **神經網路基礎**:
  - 反向傳播演算法復習
  - 梯度下降優化方法
  - 正則化技術 (Dropout, Batch Norm)
- **推薦系統相關論文**:
  - "Neural Collaborative Filtering" 精讀
  - "Deep Learning for Recommender Systems" 調研
  - 工業界應用案例分析

#### 15:00-16:00 | 與數據科學團隊交流
**會議議程**:
- **數據特徵討論**:
  - 可用特徵維度分析
  - 特徵工程最佳實踐
  - 數據品質評估標準
- **模型選型建議**:
  - 傳統 ML vs 深度學習權衡
  - 計算資源與效果平衡
  - A/B 測試設計建議

#### 16:00-17:30 | 深度學習模型調研
- **TensorFlow Recommenders 探索**:
  - 框架特點與優勢
  - 內建模型類型了解
  - 快速上手教程實作
- **PyTorch 推薦系統方案**:
  - pytorch-geometric 圖神經網路
  - 自訂模型架構設計
  - 訓練 pipeline 建立

#### 17:30-18:00 | 評估框架設計
- **離線評估指標**:
  - Precision@K, Recall@K 實作
  - NDCG (Normalized Discounted Cumulative Gain)
  - Coverage, Diversity 指標設計
- **評估數據集劃分**:
  - 時間序列劃分策略
  - 交叉驗證在推薦系統中的應用
  - 負樣本採樣策略

### 晚上時段 (19:00-21:00)
#### 19:00-20:00 | Neural CF 實作嘗試
```python
# 目標：實作基礎的 Neural Collaborative Filtering
import tensorflow as tf

class NeuralCF(tf.keras.Model):
    def __init__(self, num_users, num_items, embedding_dim=50, hidden_dims=[128, 64]):
        super().__init__()
        self.user_embedding = tf.keras.layers.Embedding(num_users, embedding_dim)
        self.item_embedding = tf.keras.layers.Embedding(num_items, embedding_dim)
        
        # MLP layers
        self.mlp_layers = []
        for dim in hidden_dims:
            self.mlp_layers.append(tf.keras.layers.Dense(dim, activation='relu'))
        
        self.output_layer = tf.keras.layers.Dense(1, activation='sigmoid')
    
    def call(self, inputs):
        user_ids, item_ids = inputs
        user_vec = self.user_embedding(user_ids)
        item_vec = self.item_embedding(item_ids)
        
        # 向量拼接
        concat_vec = tf.concat([user_vec, item_vec], axis=-1)
        
        # MLP 前向傳播
        x = concat_vec
        for layer in self.mlp_layers:
            x = layer(x)
        
        return self.output_layer(x)
```

#### 20:00-21:00 | 明日計畫與整理
- **週度進度回顧**:
  - 已完成任務檢查
  - 未完成任務分析
  - 時間分配效率評估
- **明日重點確認**:
  - 深度學習模型訓練
  - API 服務架構設計
  - 效能基準測試準備

## 今日亮點成果

### 技術分享會成功要素
1. **清晰的邏輯結構**: 從原理到實作到應用
2. **實際程式碼展示**: 讓抽象概念具體化
3. **互動式討論**: 鼓勵團隊成員提問與交流

### 深度學習新認識
1. **Neural CF 的優勢**: 能學習非線性用戶-物品互動
2. **嵌入層的重要性**: 將稀疏 ID 轉換為稠密表示
3. **端到端學習**: 特徵工程與模型訓練一體化

## 學習收穫

### 技術方面
- 深入理解了神經網路在推薦系統中的應用
- 掌握了 TensorFlow 2.x 的基本用法
- 了解了工業界推薦系統的實際挑戰

### 軟技能方面
- 提升了技術演講與表達能力
- 學會了如何將複雜技術概念簡化傳達
- 增強了跨團隊協作與溝通技巧

## 遇到的挑戰與解決

### 1. 技術分享準備時間不足
**問題**: 前一天準備分享材料時間緊張
**解決**: 提前規劃，分散準備時間

### 2. 深度學習框架選擇困難
**問題**: TensorFlow vs PyTorch 選擇糾結
**解決**: 實際動手試用，比較開發體驗

### 3. 團隊技術水平差異
**問題**: 分享內容深度難以把握
**解決**: 分層次講解，照顧不同背景同事

## 明日目標
1. 完成 Neural CF 基礎模型訓練
2. 設計推薦 API 服務架構
3. 開始效能與準確度對比測試

## 本週回顧
- **完成度**: 80% (超出預期)
- **最大收穫**: 對推薦系統有了全面認識
- **需要改進**: 時間管理與任務優先級排序
"""


if __name__ == "__main__":
    generator = TestDataGenerator()
    generator.generate_all_test_data()