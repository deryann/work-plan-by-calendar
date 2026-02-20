// Settings Data Section - handles data import/export functionality

class SettingsDataSection {
    constructor() {
        this.bindEvents();
    }

    /**
     * Bind import/export event listeners
     */
    bindEvents() {
        // Export button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.handleExport();
            });
        }

        // Import button
        const importBtn = document.getElementById('import-data-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('import-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }

        // Import file input
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleImport(e.target.files[0]);
                }
            });
        }
    }

    /**
     * Handle data export
     */
    async handleExport() {
        try {
            Utils.showLoading('正在匯出資料...');

            const result = await window.planAPI.exportData();

            Utils.showSuccess(`成功匯出 ${result.file_count} 個檔案`);

            // Trigger download
            window.planAPI.downloadExport(result.filename);

        } catch (error) {
            console.error('Export failed:', error);
            Utils.showError('匯出失敗: ' + error.message);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Handle data import
     */
    async handleImport(file) {
        if (!file) {
            Utils.showError('請選擇要匯入的 ZIP 檔案');
            return;
        }

        try {
            Utils.showLoading('正在驗證檔案...');

            // 呼叫驗證 API
            const validation = await window.planAPI.validateImport(file);

            Utils.hideLoading();

            // 如果有錯誤,顯示錯誤訊息並中斷
            if (!validation.is_valid) {
                const errorMessages = validation.errors.map(err =>
                    `• ${err.message}`
                ).join('\n');

                Utils.showError(
                    `驗證失敗,發現 ${validation.errors.length} 個錯誤:\n\n${errorMessages}\n\n請修正後重新上傳。`
                );
                return;
            }

            // 如果有警告,顯示但不中斷
            if (validation.warnings && validation.warnings.length > 0) {
                const warningMessages = validation.warnings.map(warn =>
                    `• ${warn.message}`
                ).join('\n');

                console.warn('驗證警告:', warningMessages);
            }

            // 驗證通過,詢問是否繼續匯入
            const confirmMessage = `驗證通過!\n\n` +
                `檔案數量: ${validation.file_count} 個\n` +
                (validation.warnings?.length > 0 ? `警告: ${validation.warnings.length} 個\n` : '') +
                `\n確定要匯入這些資料嗎?\n(將覆蓋現有的同名檔案)`;

            if (!confirm(confirmMessage)) {
                Utils.showError('已取消匯入');
                return;
            }

            // 執行匯入
            Utils.showLoading('正在匯入資料...');

            const importResult = await window.planAPI.executeImport(file);

            Utils.hideLoading();
            Utils.showSuccess(
                `${importResult.message}\n\n` +
                `匯入時間: ${new Date(importResult.imported_at).toLocaleString('zh-TW')}`
            );

            // 重新整理頁面以顯示新資料
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            Utils.hideLoading();
            Utils.showError(`匯入失敗: ${error.message}`);
            console.error('Import error:', error);
        }
    }
}

window.SettingsDataSection = SettingsDataSection;
