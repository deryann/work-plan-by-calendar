#!/bin/bash

# 增強版自動截圖腳本 - 包含多種設定狀態
# 使用 Google Chrome headless 模式拍攝不同設定狀態的截圖

SNAPSHOT_DIR="$(dirname "$0")"
BASE_URL="http://localhost:8000"
BROWSER_CMD="google-chrome"

echo "📸 開始拍攝工作計畫日曆系統完整截圖..."
echo "🌐 使用瀏覽器: $BROWSER_CMD"
echo "📁 儲存目錄: $SNAPSHOT_DIR"

# 函數：拍攝截圖
take_screenshot() {
    local url=$1
    local filename=$2
    local description=$3
    local delay=${4:-3}
    
    echo "📷 拍攝: $description"
    echo "   URL: $url"
    echo "   檔案: $filename"
    
    $BROWSER_CMD \
        --headless \
        --disable-gpu \
        --window-size=1920,1080 \
        --hide-scrollbars \
        --disable-dev-shm-usage \
        --no-sandbox \
        --screenshot="$SNAPSHOT_DIR/$filename" \
        "$url" \
        --virtual-time-budget=$((delay * 1000))
    
    if [ -f "$SNAPSHOT_DIR/$filename" ]; then
        echo "   ✅ 成功儲存: $filename"
        ls -lh "$SNAPSHOT_DIR/$filename" | awk '{print "   📊 檔案大小: " $5}'
    else
        echo "   ❌ 截圖失敗: $filename"
    fi
    echo
}

# 函數：套用設定並等待
apply_settings() {
    local settings=$1
    echo "🔧 套用設定: $settings"
    
    curl -s -X PUT "$BASE_URL/api/settings/ui" \
        -H "Content-Type: application/json" \
        -d "$settings" > /dev/null
    
    # 等待設定套用
    sleep 2
}

# 檢查伺服器狀態
echo "🔍 檢查伺服器狀態..."
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "❌ 伺服器未運行，請先啟動伺服器"
    exit 1
fi
echo "✅ 伺服器運行正常"
echo

# 1. 拍攝預設狀態 (全部顯示)
echo "🎬 場景 1: 預設狀態 - 全部面板顯示"
apply_settings '{
    "panels": {
        "left": {"year": true, "month": true, "week": true, "day": true},
        "right": {"year": true, "month": true, "week": true, "day": true}
    }
}'
take_screenshot "$BASE_URL" "01_default_all_visible.png" "預設狀態 - 全部面板顯示" 4

# 2. 拍攝設定測試頁面
echo "🎬 場景 2: 設定測試頁面"
take_screenshot "$BASE_URL/snapshot/settings_test.html" "02_settings_test_page.png" "設定測試頁面" 3

# 3. 最小化顯示 (只顯示週日計畫)
echo "🎬 場景 3: 最小化顯示"
apply_settings '{
    "panels": {
        "left": {"year": false, "month": false, "week": true, "day": true},
        "right": {"year": false, "month": false, "week": true, "day": true}
    }
}'
take_screenshot "$BASE_URL" "03_minimal_display.png" "最小化顯示 - 只顯示週日計畫" 4

# 4. 僅顯示當期面板
echo "🎬 場景 4: 僅顯示當期面板"
apply_settings '{
    "panels": {
        "left": {"year": false, "month": false, "week": false, "day": false},
        "right": {"year": true, "month": true, "week": true, "day": true}
    }
}'
take_screenshot "$BASE_URL" "04_current_only.png" "僅顯示當期面板" 4

# 5. 僅顯示歷史面板
echo "🎬 場景 5: 僅顯示歷史面板"
apply_settings '{
    "panels": {
        "left": {"year": true, "month": true, "week": true, "day": true},
        "right": {"year": false, "month": false, "week": false, "day": false}
    }
}'
take_screenshot "$BASE_URL" "05_history_only.png" "僅顯示歷史面板" 4

# 6. 只顯示年月計畫
echo "🎬 場景 6: 只顯示年月計畫"
apply_settings '{
    "panels": {
        "left": {"year": true, "month": true, "week": false, "day": false},
        "right": {"year": true, "month": true, "week": false, "day": false}
    }
}'
take_screenshot "$BASE_URL" "06_year_month_only.png" "只顯示年月計畫" 4

# 7. 左側最小，右側全顯示
echo "🎬 場景 7: 左側最小，右側全顯示"
apply_settings '{
    "panels": {
        "left": {"year": false, "month": false, "week": false, "day": true},
        "right": {"year": true, "month": true, "week": true, "day": true}
    }
}'
take_screenshot "$BASE_URL" "07_left_minimal_right_full.png" "左側最小，右側全顯示" 4

# 8. 拍攝增強版設定頁面
echo "🎬 場景 8: 增強版設定頁面"
take_screenshot "$BASE_URL/snapshot/settings_test.html" "08_enhanced_settings_page.png" "增強版設定頁面" 3

# 恢復預設設定
echo "🔄 恢復預設設定..."
curl -s -X POST "$BASE_URL/api/settings/reset" > /dev/null

# 生成截圖報告
echo "📊 生成截圖報告..."
cat > "$SNAPSHOT_DIR/screenshot_report.md" << EOF
# 工作計畫日曆系統 - 自動截圖報告

生成時間: $(date '+%Y-%m-%d %H:%M:%S')

## 截圖清單

| 檔案名稱 | 描述 | 檔案大小 |
|---------|------|----------|
EOF

for png_file in "$SNAPSHOT_DIR"/*.png; do
    if [ -f "$png_file" ]; then
        filename=$(basename "$png_file")
        size=$(ls -lh "$png_file" | awk '{print $5}')
        
        case "$filename" in
            "01_default_all_visible.png")
                desc="預設狀態 - 全部面板顯示"
                ;;
            "02_settings_test_page.png")
                desc="設定測試頁面"
                ;;
            "03_minimal_display.png")
                desc="最小化顯示 - 只顯示週日計畫"
                ;;
            "04_current_only.png")
                desc="僅顯示當期面板"
                ;;
            "05_history_only.png")
                desc="僅顯示歷史面板"
                ;;
            "06_year_month_only.png")
                desc="只顯示年月計畫"
                ;;
            "07_left_minimal_right_full.png")
                desc="左側最小，右側全顯示"
                ;;
            "08_enhanced_settings_page.png")
                desc="增強版設定頁面"
                ;;
            *)
                desc="其他截圖"
                ;;
        esac
        
        echo "| $filename | $desc | $size |" >> "$SNAPSHOT_DIR/screenshot_report.md"
    fi
done

cat >> "$SNAPSHOT_DIR/screenshot_report.md" << 'EOF'

## 手動截圖建議

以下功能需要手動操作截圖：

1. **設定 Modal 開啟狀態**
   - 點擊右上角設定按鈕 ⚙️
   - 截圖檔名: `09_settings_modal.png`

2. **設定選項修改過程**
   - 在設定 Modal 中勾選/取消勾選選項
   - 截圖檔名: `10_settings_changing.png`

3. **設定儲存成功訊息**
   - 點擊儲存後出現的成功提示
   - 截圖檔名: `11_save_success.png`

4. **快捷鍵說明 Modal**
   - 按 Ctrl+Shift+H 開啟
   - 截圖檔名: `12_hotkeys_modal.png`

5. **面板編輯模式**
   - 點擊任一面板進入編輯狀態
   - 截圖檔名: `13_panel_edit_mode.png`

6. **重新整理後狀態保持**
   - 設定面板狀態後按 F5 重新整理
   - 截圖檔名: `14_after_refresh.png`

## 截圖品質說明

- 解析度: 1920x1080
- 格式: PNG
- 瀏覽器: Google Chrome Headless
- 延遲: 3-4 秒確保頁面完全載入
EOF

echo "📋 截圖報告已生成: $SNAPSHOT_DIR/screenshot_report.md"
echo
echo "🎉 自動截圖完成！"
echo "📸 已生成 $(ls -1 "$SNAPSHOT_DIR"/*.png 2>/dev/null | wc -l) 張截圖"
echo "📁 所有截圖儲存在: $SNAPSHOT_DIR"
echo
echo "🔍 查看截圖:"
ls -la "$SNAPSHOT_DIR"/*.png 2>/dev/null || echo "   沒有找到 PNG 檔案"
echo
echo "📚 查看詳細報告: $SNAPSHOT_DIR/screenshot_report.md"