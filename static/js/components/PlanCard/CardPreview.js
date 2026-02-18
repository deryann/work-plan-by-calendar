// CardPreview component - renders collapsed preview text from markdown content

class CardPreview {
    /**
     * Extract plain text preview from markdown content
     * @param {string} markdownContent - Raw markdown content
     * @param {number} maxChars - Maximum characters to show
     * @returns {string} Plain text preview
     */
    static getPreview(markdownContent, maxChars = 120) {
        if (!markdownContent || !markdownContent.trim()) {
            return '（尚無內容）';
        }

        const stripped = markdownContent
            .replace(/^#+\s+.*$/gm, '')        // Remove headings
            .replace(/```[\s\S]*?```/g, '')     // Remove code blocks
            .replace(/\*\*(.*?)\*\*/g, '$1')    // Remove bold
            .replace(/\*(.*?)\*/g, '$1')        // Remove italic
            .replace(/`(.*?)`/g, '$1')          // Remove inline code
            .replace(/!\[.*?\]\(.*?\)/g, '')    // Remove images
            .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // Links -> text
            .replace(/^[-*+]\s+/gm, '- ')      // Normalize list markers
            .replace(/^\d+\.\s+/gm, '- ')       // Normalize numbered lists
            .replace(/^>\s+/gm, '')              // Remove blockquote markers
            .replace(/\n+/g, ' / ')              // Join lines with separator
            .replace(/\s+/g, ' ')                // Normalize whitespace
            .trim();

        if (!stripped || stripped === '/') {
            return '（尚無內容）';
        }

        return stripped.length > maxChars
            ? stripped.substring(0, maxChars) + '...'
            : stripped;
    }

    /**
     * Render preview element
     * @param {string} content - Markdown content
     * @returns {string} HTML string
     */
    static render(content) {
        const previewText = CardPreview.getPreview(content);
        return `<div class="card-preview" style="color: var(--color-text-secondary); font-size: 0.8125rem; padding: 0 0.75rem 0.625rem 0.75rem; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHtml(previewText)}</div>`;
    }
}

window.CardPreview = CardPreview;
