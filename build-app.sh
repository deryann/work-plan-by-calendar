#!/bin/bash

# 專案配置
PROJECT_NAME="work-plan-calendar"

# 獲取版本資訊
GIT_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
IMAGE_TAG="v$(date +%Y%m%d)"

# 檢查是否有未提交的變更
if git diff --quiet HEAD 2>/dev/null; then
    VERSION_SUFFIX=""
else
    VERSION_SUFFIX="-dev"
    echo "⚠️  Warning: 偵測到未提交的變更，版本標記為開發版本"
fi

# 完整版本標記
FULL_IMAGE_TAG="${IMAGE_TAG}${VERSION_SUFFIX}"

# 輸出版本資訊
echo "🚀 Building Docker image for ${PROJECT_NAME}"
echo "📦 PROJECT_NAME: $PROJECT_NAME"
echo "🏷️  IMAGE_TAG: $FULL_IMAGE_TAG"
echo "🔖 GIT_COMMIT_HASH: $GIT_COMMIT_HASH"
echo ""

# 建構 Docker 映像
echo "🔨 執行 Docker build 命令:"
echo "docker build -f Dockerfile --build-arg PROJECT_NAME=$PROJECT_NAME --build-arg IMAGE_TAG=$FULL_IMAGE_TAG --build-arg GIT_COMMIT_HASH=$GIT_COMMIT_HASH -t $PROJECT_NAME:$FULL_IMAGE_TAG ."

docker build -f Dockerfile \
    --build-arg PROJECT_NAME="$PROJECT_NAME" \
    --build-arg IMAGE_TAG="$FULL_IMAGE_TAG" \
    --build-arg GIT_COMMIT_HASH="$GIT_COMMIT_HASH" \
    -t "$PROJECT_NAME:$FULL_IMAGE_TAG" \
    -t "$PROJECT_NAME:latest" \
    .

# 檢查建構結果
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker 映像建構成功！"
    echo "📋 建構的映像:"
    echo "   • $PROJECT_NAME:$FULL_IMAGE_TAG"
    echo "   • $PROJECT_NAME:latest"
    echo ""
    echo "🚀 執行容器:"
    echo "   docker run -d -p 8000:8000 -v \$(pwd)/data:/app/data $PROJECT_NAME:$FULL_IMAGE_TAG"
    echo ""
    echo "🐳 或使用 Docker Compose:"
    echo "   docker-compose up -d"
else
    echo ""
    echo "❌ Docker 映像建構失敗！"
    exit 1
fi