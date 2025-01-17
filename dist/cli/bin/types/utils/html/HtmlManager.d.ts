import { MetaTags } from "@/types";
export declare class HTMLManager {
    private defaultMeta;
    constructor(defaultMeta?: Partial<MetaTags>);
    /**
     * Updates default meta tags
     */
    setDefaultMeta(meta: Partial<MetaTags>): void;
    /**
     * Gets current default meta tags
     */
    getDefaultMeta(): Required<MetaTags>;
    /**
     * Formats a meta tag based on type and content
     */
    private formatMetaTag;
    /**
     * Injects meta tags into HTML
     */
    injectMetaTags(html: string, meta?: Partial<MetaTags>): string;
    /**
     * Validates meta tags structure
     */
    validateMetaTags(meta: Partial<MetaTags>): boolean;
    /**
     * Sanitizes meta tag content
     */
    private sanitizeContent;
    /**
     * Helper method to decode HTML entities
     */
    private decodeHTMLEntities;
    /**
     * Convert property name to camelCase
     */
    private propertyNameToCamelCase;
    /**
     * Extracts existing meta tags from HTML
     */
    extractMetaTags(html: string): MetaTags;
    /**
     * Creates meta tags object with sanitized values
     */
    createMetaTags(meta: Partial<MetaTags>): MetaTags;
    /**
     * Generates complete HTML document with meta tags
     */
    generateHTML(content: string, meta?: Partial<MetaTags>): string;
}
export declare const htmlManager: HTMLManager;
//# sourceMappingURL=HtmlManager.d.ts.map