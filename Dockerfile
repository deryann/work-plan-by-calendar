ARG IMAGE_TAG
ARG GIT_COMMIT_HASH
ARG PROJECT_NAME=work-plan-calendar

# 建構階段
FROM python:3.11-slim AS builder

ARG IMAGE_TAG
ARG GIT_COMMIT_HASH
ARG PROJECT_NAME

WORKDIR /build

# 安裝建構工具
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements
COPY requirements.txt .

# 建立虛擬環境並安裝相依套件
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 最終階段
FROM python:3.11-slim

ARG IMAGE_TAG
ARG GIT_COMMIT_HASH
ARG PROJECT_NAME

WORKDIR /app

# 安裝 curl 用於健康檢查
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 從建構階段複製虛擬環境
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 設定 ENV 變數
ENV IMAGE_TAG=${IMAGE_TAG}
ENV GIT_COMMIT_HASH=${GIT_COMMIT_HASH}
ENV PROJECT_NAME=${PROJECT_NAME}
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 輸出版本資訊
RUN echo "PROJECT_NAME: ${PROJECT_NAME}" && \
    echo "IMAGE_TAG: ${IMAGE_TAG}" && \
    echo "GIT_COMMIT_HASH: ${GIT_COMMIT_HASH}"

# 複製應用程式檔案
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY static/ ./static/
COPY snapshot/ ./snapshot/
COPY start_server.py .
COPY generate_test_data.py .

# 建立 data 目錄 (將由外部掛載)
RUN mkdir -p /app/data

# 建立非 root 使用者
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# 暴露連接埠
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health')" || exit 1

# 啟動應用程式
CMD ["python", "start_server.py"]