#!/bin/bash

# 工作計畫日曆系統截圖腳本
# 需要安裝 chromium-browser 或 google-chrome

SNAPSHOT_DIR="$(dirname "$0")"
BASE_URL="http://localhost:8000"
BROWSER_CMD=""

# 檢查可用的瀏覽器
if command -v google-chrome &> /dev/null; then
    BROWSER_CMD="google-chrome"
elif command -v chromium-browser &> /dev/null; then
    BROWSER_CMD="chromium-browser"
elif command -v chromium &> /dev/null; then
    BROWSER_CMD="chromium"
else
    echo "❌ 未找到支援的瀏覽器 (chrome/chromium)"
    echo "請安裝 Google Chrome 或 Chromium"
    exit 1
fi

echo "📸 開始拍攝工作計畫日曆系統截圖..."
echo "🌐 使用瀏覽器: $BROWSER_CMD"
echo "📁 儲存目錄: $SNAPSHOT_DIR"

# 函數：拍攝截圖
take_screenshot() {
    local url=$1
    local filename=$2
    local description=$3
    local delay=${4:-2}
    
    echo "📷 拍攝: $description"
    echo "   URL: $url"
    echo "   檔案: $filename"
    
    $BROWSER_CMD \
        --headless \
        --disable-gpu \
        --window-size=1920,1080 \
        --hide-scrollbars \
        --screenshot="$SNAPSHOT_DIR/$filename" \
        "$url" \
        --virtual-time-budget=$((delay * 1000))
    
    if [ -f "$SNAPSHOT_DIR/$filename" ]; then
        echo "   ✅ 成功儲存: $filename"
    else
        echo "   ❌ 截圖失敗: $filename"
    fi
    echo
}

# 檢查伺服器是否運行
echo "🔍 檢查伺服器狀態..."
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "❌ 伺服器未運行，請先啟動伺服器："
    echo "   cd /home/deryann/projects/work-plan-by-calendar"
    echo "   python3 start_server.py"
    exit 1
fi

echo "✅ 伺服器運行正常"
echo

# 開始拍攝截圖
take_screenshot "$BASE_URL" "01_main_interface.png" "主界面" 3

# 注意：以下截圖需要 JavaScript 互動，headless 模式可能無法正確捕捉
echo "⚠️  注意: 以下功能截圖需要手動操作"
echo "   1. 設定 Modal - 需要點擊設定按鈕"
echo "   2. 面板狀態變化 - 需要修改設定後截圖"
echo "   3. 快捷鍵 Modal - 需要按 Ctrl+Shift+H"
echo
echo "建議使用瀏覽器手動截圖這些互動功能"

# 建立一個 HTML 測試頁面來展示不同設定狀態
echo "📝 建立測試頁面..."

cat > "$SNAPSHOT_DIR/test_settings.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>設定測試頁面</title>
    <script>
        async function applySettings(settings) {
            try {
                const response = await fetch('/api/settings/ui', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                if (response.ok) {
                    console.log('Settings applied:', settings);
                    // 重新載入主頁面來顯示效果
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                }
            } catch (error) {
                console.error('Error applying settings:', error);
            }
        }

        // 測試不同的設定組合
        const testConfigs = {
            all_visible: {
                panels: {
                    left: { year: true, month: true, week: true, day: true },
                    right: { year: true, month: true, week: true, day: true }
                }
            },
            minimal: {
                panels: {
                    left: { year: false, month: false, week: true, day: true },
                    right: { year: false, month: false, week: true, day: true }
                }
            },
            only_current: {
                panels: {
                    left: { year: false, month: false, week: false, day: true },
                    right: { year: true, month: true, week: true, day: true }
                }
            }
        };

        function setConfig(name) {
            applySettings(testConfigs[name]);
        }
    </script>
</head>
<body>
    <h1>設定測試頁面</h1>
    <p>點擊以下按鈕套用不同的設定，然後截圖：</p>
    <button onclick="setConfig('all_visible')">全部顯示</button>
    <button onclick="setConfig('minimal')">最小顯示</button>
    <button onclick="setConfig('only_current')">僅當期</button>
    <p><a href="/">回到主頁面</a></p>
</body>
</html>
EOF

echo "✅ 已建立測試頁面: $BASE_URL/snapshot/test_settings.html"
echo
echo "🎯 截圖完成建議："
echo "   1. 開啟瀏覽器到: $BASE_URL"
echo "   2. 使用測試頁面: $BASE_URL/snapshot/test_settings.html"
echo "   3. 手動截圖各種設定狀態"
echo "   4. 截圖檔案請儲存到: $SNAPSHOT_DIR"
echo
echo "📚 詳細說明請參考: $SNAPSHOT_DIR/README.md"