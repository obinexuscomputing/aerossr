/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class HTMLManager {
    defaultMeta;
    constructor(defaultMeta = {}) {
        this.defaultMeta = {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1.0',
            title: '',
            description: '',
            keywords: '',
            author: '',
            ogTitle: '',
            ogDescription: '',
            ogImage: '',
            twitterCard: 'summary',
            twitterTitle: '',
            twitterDescription: '',
            twitterImage: '',
            ...defaultMeta
        };
    }
    /**
     * Updates default meta tags
     */
    setDefaultMeta(meta) {
        this.defaultMeta = {
            ...this.defaultMeta,
            ...meta
        };
    }
    /**
     * Gets current default meta tags
     */
    getDefaultMeta() {
        return { ...this.defaultMeta };
    }
    /**
     * Formats a meta tag based on type and content
     */
    formatMetaTag(key, value) {
        if (key === 'title') {
            return `<title>${this.sanitizeContent(value)}</title>`;
        }
        if (key.startsWith('og')) {
            return `<meta property="og:${key.slice(2).toLowerCase()}" content="${this.sanitizeContent(value)}">`;
        }
        if (key.startsWith('twitter')) {
            return `<meta name="twitter:${key.slice(7).toLowerCase()}" content="${this.sanitizeContent(value)}">`;
        }
        if (key === 'charset') {
            return `<meta charset="${this.sanitizeContent(value)}">`;
        }
        return `<meta name="${key}" content="${this.sanitizeContent(value)}">`;
    }
    /**
     * Injects meta tags into HTML
     */
    injectMetaTags(html, meta = {}) {
        const finalMeta = {
            ...this.defaultMeta,
            ...meta
        };
        const metaTags = Object.entries(finalMeta)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([key, value]) => this.formatMetaTag(key, String(value)))
            .join('\n    ');
        return html.replace('</head>', `    ${metaTags}\n  </head>`);
    }
    /**
     * Validates meta tags structure
     */
    validateMetaTags(meta) {
        const validations = {
            title: (value) => value.length <= 60,
            description: (value) => value.length <= 160,
            keywords: (value) => value.split(',').length <= 10,
            ogImage: (value) => /^https?:\/\/.+/.test(value),
            twitterImage: (value) => /^https?:\/\/.+/.test(value)
        };
        return Object.entries(meta).every(([key, value]) => {
            if (!value || typeof value !== 'string')
                return true;
            const validator = validations[key];
            return validator ? validator(value) : true;
        });
    }
    /**
     * Sanitizes meta tag content
     */
    sanitizeContent(content) {
        return content
            .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
            .replace(/"/g, '&quot;') // Escape quotes
            .replace(/&/g, '&amp;') // Escape ampersands
            .replace(/</g, '&lt;') // Escape less than
            .replace(/>/g, '&gt;') // Escape greater than
            .trim();
    }
    /**
     * Helper method to decode HTML entities
     */
    decodeHTMLEntities(str) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    }
    /**
     * Convert property name to camelCase
     */
    propertyNameToCamelCase(name) {
        if (name.startsWith('og:')) {
            const ogProp = name.slice(3);
            return 'og' + ogProp.charAt(0).toUpperCase() + ogProp.slice(1);
        }
        if (name.startsWith('twitter:')) {
            const twitterProp = name.slice(8);
            return 'twitter' + twitterProp.charAt(0).toUpperCase() + twitterProp.slice(1);
        }
        return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    /**
     * Extracts existing meta tags from HTML
     */
    extractMetaTags(html) {
        const meta = {};
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            meta.title = this.decodeHTMLEntities(titleMatch[1]);
        }
        const metaTagPattern = /<meta\s+(?:[^>]*?\s+)?(?:name|property)="([^"]+)"[^>]*?content="([^"]+)"[^>]*>/g;
        let match;
        while ((match = metaTagPattern.exec(html)) !== null) {
            const [_, nameOrProperty, content] = match;
            if (!nameOrProperty || !content)
                continue;
            const propertyName = this.propertyNameToCamelCase(nameOrProperty);
            const decodedContent = this.decodeHTMLEntities(content);
            if (nameOrProperty === 'charset') {
                meta.charset = decodedContent;
            }
            else {
                meta[propertyName] = decodedContent;
            }
        }
        const charsetMatch = html.match(/<meta\s+charset="([^"]+)"[^>]*>/i);
        if (charsetMatch) {
            meta.charset = this.decodeHTMLEntities(charsetMatch[1]);
        }
        return meta;
    }
    /**
     * Creates meta tags object with sanitized values
     */
    createMetaTags(meta) {
        return Object.entries(meta).reduce((acc, [key, value]) => {
            if (value !== undefined && typeof value === 'string') {
                const sanitized = this.sanitizeContent(value);
                acc[key] = this.decodeHTMLEntities(sanitized);
            }
            return acc;
        }, {});
    }
    /**
     * Generates complete HTML document with meta tags
     */
    generateHTML(content, meta = {}) {
        const baseHTML = `
<!DOCTYPE html>
<html>
<head>
</head>
<body>
  ${content}
</body>
</html>`;
        return this.injectMetaTags(baseHTML, meta);
    }
}
// Export singleton instance
const htmlManager = new HTMLManager();

exports.HTMLManager = HTMLManager;
exports.htmlManager = htmlManager;
//# sourceMappingURL=HtmlManager.js.map
