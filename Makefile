.PHONY: help build up down restart logs ps health backup restore update monitor clean

# 默認目標
.DEFAULT_GOAL := help

# 項目變數
PROJECT_NAME := work-plan-calendar
CONTAINER_NAME := work-plan-calendar
COMPOSE_FILE := docker-compose.yml

# 顏色輸出
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## 顯示此幫助信息
	@echo "$(BLUE)Work Plan Calendar - Docker 管理命令$(NC)"
	@echo ""
	@echo "$(GREEN)可用命令:$(NC)"
	@awk 'BEGIN {FS = ":.*##"; } /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)示例:$(NC)"
	@echo "  make build          # 構建 Docker 映像"
	@echo "  make up             # 啟動服務"
	@echo "  make logs           # 查看日誌"
	@echo "  make backup         # 備份數據"

build: ## 構建 Docker 映像
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker-compose -f $(COMPOSE_FILE) build

build-no-cache: ## 構建 Docker 映像（無緩存）
	@echo "$(BLUE)Building Docker image (no cache)...$(NC)"
	docker-compose -f $(COMPOSE_FILE) build --no-cache

up: ## 啟動服務（後台運行）
	@echo "$(BLUE)Starting services...$(NC)"
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)Service started at http://localhost:8000$(NC)"

down: ## 停止並移除容器
	@echo "$(BLUE)Stopping services...$(NC)"
	docker-compose -f $(COMPOSE_FILE) down

stop: ## 停止服務（不移除容器）
	@echo "$(BLUE)Stopping services...$(NC)"
	docker-compose -f $(COMPOSE_FILE) stop

start: ## 啟動已存在的容器
	@echo "$(BLUE)Starting services...$(NC)"
	docker-compose -f $(COMPOSE_FILE) start

restart: ## 重啟服務
	@echo "$(BLUE)Restarting services...$(NC)"
	docker-compose -f $(COMPOSE_FILE) restart

logs: ## 查看實時日誌
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-tail: ## 查看最近 100 行日誌
	docker-compose -f $(COMPOSE_FILE) logs --tail=100

ps: ## 查看服務狀態
	@docker-compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "$(GREEN)Container details:$(NC)"
	@docker inspect --format='Status: {{.State.Status}} | Health: {{.State.Health.Status}} | Started: {{.State.StartedAt}}' $(CONTAINER_NAME) 2>/dev/null || echo "Container not found"

health: ## 檢查服務健康狀態
	@echo "$(BLUE)Checking service health...$(NC)"
	@./scripts/docker-monitor.sh && echo "$(GREEN)✓ All checks passed$(NC)" || echo "$(RED)✗ Health check failed$(NC)"

stats: ## 查看資源使用情況
	@echo "$(BLUE)Resource usage:$(NC)"
	@docker stats --no-stream $(CONTAINER_NAME)

shell: ## 進入容器 shell
	docker-compose -f $(COMPOSE_FILE) exec $(PROJECT_NAME) bash

backup: ## 創建數據備份
	@echo "$(BLUE)Creating backup...$(NC)"
	@./scripts/docker-backup.sh
	@echo "$(GREEN)Backup completed$(NC)"

backup-list: ## 列出所有備份
	@echo "$(BLUE)Available backups:$(NC)"
	@ls -lh backups/*.tar.gz 2>/dev/null || echo "No backups found"

restore: ## 恢復數據（需要指定備份文件）
	@echo "$(BLUE)Available backups:$(NC)"
	@ls -1 backups/*.tar.gz 2>/dev/null || echo "No backups found"
	@echo ""
	@echo "$(YELLOW)Usage: ./scripts/docker-restore.sh <backup-file>$(NC)"

update: ## 更新服務到最新版本
	@echo "$(BLUE)Updating service...$(NC)"
	@./scripts/docker-update.sh
	@echo "$(GREEN)Update completed$(NC)"

update-no-backup: ## 更新服務（不備份）
	@echo "$(BLUE)Updating service (no backup)...$(NC)"
	@./scripts/docker-update.sh --no-backup
	@echo "$(GREEN)Update completed$(NC)"

clean: ## 清理未使用的 Docker 資源
	@echo "$(BLUE)Cleaning up Docker resources...$(NC)"
	docker system prune -f
	@echo "$(GREEN)Cleanup completed$(NC)"

clean-all: ## 清理所有 Docker 資源（包括映像）
	@echo "$(RED)WARNING: This will remove all unused Docker resources!$(NC)"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	docker system prune -a -f
	@echo "$(GREEN)Cleanup completed$(NC)"

dev-up: ## 啟動開發環境（掛載代碼目錄）
	@echo "$(BLUE)Starting development environment...$(NC)"
	@# 臨時修改 docker-compose.yml 以掛載開發目錄
	@sed -i.bak 's/# - \.\/backend/- \.\/backend/g; s/# - \.\/frontend/- \.\/frontend/g; s/# - \.\/static/- \.\/static/g' $(COMPOSE_FILE)
	@make up
	@echo "$(GREEN)Development environment started$(NC)"
	@echo "$(YELLOW)Note: Code changes will be reflected immediately$(NC)"

dev-down: ## 停止開發環境並恢復配置
	@make down
	@if [ -f $(COMPOSE_FILE).bak ]; then \
		mv $(COMPOSE_FILE).bak $(COMPOSE_FILE); \
		echo "$(GREEN)Configuration restored$(NC)"; \
	fi

prod-deploy: ## 生產環境部署（包含備份和更新）
	@echo "$(BLUE)Production deployment...$(NC)"
	@make backup
	@make update
	@make health
	@echo "$(GREEN)Production deployment completed$(NC)"

version: ## 顯示版本信息
	@echo "$(BLUE)Version information:$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec $(PROJECT_NAME) curl -s http://localhost:8000/api/version | jq . || echo "Service not running"

open: ## 在瀏覽器中打開應用
	@echo "$(BLUE)Opening application in browser...$(NC)"
	@command -v xdg-open > /dev/null && xdg-open http://localhost:8000 || \
	 command -v open > /dev/null && open http://localhost:8000 || \
	 echo "$(YELLOW)Please open http://localhost:8000 manually$(NC)"

docs: ## 在瀏覽器中打開 API 文檔
	@echo "$(BLUE)Opening API documentation...$(NC)"
	@command -v xdg-open > /dev/null && xdg-open http://localhost:8000/docs || \
	 command -v open > /dev/null && open http://localhost:8000/docs || \
	 echo "$(YELLOW)Please open http://localhost:8000/docs manually$(NC)"

test-connection: ## 測試服務連接
	@echo "$(BLUE)Testing service connection...$(NC)"
	@curl -s http://localhost:8000/api/health | jq . && echo "$(GREEN)✓ Service is accessible$(NC)" || echo "$(RED)✗ Service is not accessible$(NC)"

# 開發輔助命令
dev-install: ## 安裝本地開發依賴
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	python -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt

dev-run: ## 本地運行（不使用 Docker）
	@echo "$(BLUE)Running locally...$(NC)"
	. .venv/bin/activate && python start_server.py

# 監控命令
monitor-setup: ## 設置定期監控（cron）
	@echo "$(BLUE)Setting up monitoring...$(NC)"
	@echo "Adding cron job for monitoring..."
	@(crontab -l 2>/dev/null; echo "*/5 * * * * $(PWD)/scripts/docker-monitor.sh") | crontab -
	@echo "$(GREEN)Monitoring setup completed$(NC)"
	@echo "$(YELLOW)Monitor will run every 5 minutes$(NC)"

monitor-disable: ## 禁用定期監控
	@echo "$(BLUE)Disabling monitoring...$(NC)"
	@crontab -l 2>/dev/null | grep -v "docker-monitor.sh" | crontab -
	@echo "$(GREEN)Monitoring disabled$(NC)"

# 快速命令別名
init: build up ## 初始化並啟動服務

deploy: prod-deploy ## 部署（等同於 prod-deploy）

status: ps ## 查看狀態（等同於 ps）
