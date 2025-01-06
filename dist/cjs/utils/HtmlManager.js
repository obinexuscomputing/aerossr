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
            return `<title>${value}</title>`;
        }
        if (key.startsWith('og')) {
            return `<meta property="og:${key.slice(2).toLowerCase()}" content="${value}">`;
        }
        if (key.startsWith('twitter')) {
            return `<meta name="twitter:${key.slice(7).toLowerCase()}" content="${value}">`;
        }
        if (key === 'charset') {
            return `<meta charset="${value}">`;
        }
        return `<meta name="${key}" content="${value}">`;
    }
    /**
     * Injects meta tags into HTML
     */
    injectMetaTags(html, meta = {}, defaultMeta) {
        const finalMeta = {
            ...this.defaultMeta,
            ...meta
        };
        const metaTags = Object.entries(finalMeta)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([key, value]) => this.formatMetaTag(key, value))
            .join('\n    ');
        return html.replace('</head>', `    ${metaTags}\n  </head>`);
    }
    /**
     * Validates meta tags structure
     */
    validateMetaTags(meta) {
        // Basic validation rules
        const validations = {
            title: (value) => value.length <= 60,
            description: (value) => value.length <= 160,
            keywords: (value) => value.split(',').length <= 10,
            ogImage: (value) => /^https?:\/\/.+/.test(value),
            twitterImage: (value) => /^https?:\/\/.+/.test(value)
        };
        return Object.entries(meta).every(([key, value]) => {
            if (!value)
                return true;
            if (validations[key]) {
                return validations[key](value);
            }
            return true;
        });
    }
    /**
     * Sanitizes meta tag content
     */
    sanitizeContent(content) {
        return content
            .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags while preserving content
            .replace(/"/g, '&quot;') // Escape quotes
            .trim();
    }
    /**
     * Creates meta tags object with sanitized values
     */
    createMetaTags(meta) {
        return Object.entries(meta).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = this.sanitizeContent(value);
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
    /**
     * Extracts existing meta tags from HTML
     */
    extractMetaTags(html) {
        const meta = {};
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            meta.title = titleMatch[1];
        }
        const metaRegex = /<meta[^>]+>/g;
        const matches = html.match(metaRegex) || [];
        matches.forEach(match => {
            const nameMatch = match.match(/name="([^"]+)"/);
            const propertyMatch = match.match(/property="([^"]+)"/);
            const contentMatch = match.match(/content="([^"]+)"/);
            if (contentMatch) {
                let name;
                if (propertyMatch) {
                    // Handle OpenGraph tags
                    name = propertyMatch[1].replace('og:', 'og');
                }
                else if (nameMatch) {
                    // Handle Twitter and other meta tags
                    name = nameMatch[1].replace('twitter:', 'twitter');
                }
                if (name) {
                    // Convert kebab-case to camelCase for property names
                    const propertyName = name.replace(/-([a-z])/g, g => g[1].toUpperCase());
                    meta[propertyName] = contentMatch[1];
                }
            }
        });
        return meta;
    }
}
// Export singleton instance
const htmlManager = new HTMLManager();

exports.HTMLManager = HTMLManager;
exports.htmlManager = htmlManager;
//# sourceMappingURL=HtmlManager.js.map
