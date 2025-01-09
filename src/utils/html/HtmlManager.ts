// src/utils/html/HTMLManager.ts
import { MetaTags } from '../../types';

export class HTMLManager {
  private defaultMeta: Required<MetaTags>;

  constructor(defaultMeta: Partial<MetaTags> = {}) {
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
  public setDefaultMeta(meta: Partial<MetaTags>): void {
    this.defaultMeta = {
      ...this.defaultMeta,
      ...meta
    };
  }

  /**
   * Gets current default meta tags
   */
  public getDefaultMeta(): Required<MetaTags> {
    return { ...this.defaultMeta };
  }

  /**
   * Formats a meta tag based on type and content
   */
  private formatMetaTag(key: string, value: string): string {
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
  public injectMetaTags(html: string, meta: Partial<MetaTags> = {}): string {
    const finalMeta: Required<MetaTags> = {
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
  public validateMetaTags(meta: Partial<MetaTags>): boolean {
    const validations: Record<string, (value: string) => boolean> = {
      title: (value: string) => value.length <= 60,
      description: (value: string) => value.length <= 160,
      keywords: (value: string) => value.split(',').length <= 10,
      ogImage: (value: string) => /^https?:\/\/.+/.test(value),
      twitterImage: (value: string) => /^https?:\/\/.+/.test(value)
    };

    return Object.entries(meta).every(([key, value]) => {
      if (!value || typeof value !== 'string') return true;
      const validator = validations[key];
      return validator ? validator(value) : true;
    });
  }

  /**
   * Sanitizes meta tag content
   */
  private sanitizeContent(content: string): string {
    return content
      .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
      .replace(/"/g, '&quot;')  // Escape quotes
      .replace(/&/g, '&amp;')   // Escape ampersands
      .replace(/</g, '&lt;')    // Escape less than
      .replace(/>/g, '&gt;')    // Escape greater than
      .trim();
  }

  /**
   * Helper method to decode HTML entities
   */
  private decodeHTMLEntities(str: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  }

  /**
   * Convert property name to camelCase
   */
  private propertyNameToCamelCase(name: string): string {
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
  public extractMetaTags(html: string): MetaTags {
    const meta: MetaTags = {};
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      meta.title = this.decodeHTMLEntities(titleMatch[1]);
    }

    const metaTagPattern = /<meta\s+(?:[^>]*?\s+)?(?:name|property)="([^"]+)"[^>]*?content="([^"]+)"[^>]*>/g;
    let match: RegExpExecArray | null;
    
    while ((match = metaTagPattern.exec(html)) !== null) {
      const [_, nameOrProperty, content] = match;
      if (!nameOrProperty || !content) continue;

      const propertyName = this.propertyNameToCamelCase(nameOrProperty);
      const decodedContent = this.decodeHTMLEntities(content);
      
      if (nameOrProperty === 'charset') {
        meta.charset = decodedContent;
      } else {
        meta[propertyName as keyof MetaTags] = decodedContent;
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
  public createMetaTags(meta: Partial<MetaTags>): MetaTags {
    return Object.entries(meta).reduce((acc, [key, value]) => {
      if (value !== undefined && typeof value === 'string') {
        const sanitized = this.sanitizeContent(value);
        acc[key as keyof MetaTags] = this.decodeHTMLEntities(sanitized);
      }
      return acc;
    }, {} as MetaTags);
  }

  /**
   * Generates complete HTML document with meta tags
   */
  public generateHTML(content: string, meta: Partial<MetaTags> = {}): string {
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
export const htmlManager = new HTMLManager();