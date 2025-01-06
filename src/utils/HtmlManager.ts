// src/utils/HTMLManager.ts
import { MetaTags } from '../types';

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
  public injectMetaTags(html: string, meta: Partial<MetaTags> = {}): string {
    const finalMeta: MetaTags = {
      ...this.defaultMeta,
      ...meta
    };

    const metaTags = Object.entries(finalMeta)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => this.formatMetaTag(key, value as string))
      .join('\n    ');

    return html.replace('</head>', `    ${metaTags}\n  </head>`);
  }

  /**
   * Validates meta tags structure
   */
  public validateMetaTags(meta: Partial<MetaTags>): boolean {
    // Basic validation rules
    const validations = {
      title: (value: string) => value.length <= 60,
      description: (value: string) => value.length <= 160,
      keywords: (value: string) => value.split(',').length <= 10,
      ogImage: (value: string) => /^https?:\/\/.+/.test(value),
      twitterImage: (value: string) => /^https?:\/\/.+/.test(value)
    };

    return Object.entries(meta).every(([key, value]) => {
      if (!value) return true;
      if (validations[key as keyof typeof validations]) {
        return validations[key as keyof typeof validations](value);
      }
      return true;
    });
  }

  /**
   * Sanitizes meta tag content
   */
  private sanitizeContent(content: string): string {
    return content
      .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags while preserving content
      .replace(/"/g, '&quot;')  // Escape quotes
      .trim();
  }

  /**
   * Creates meta tags object with sanitized values
   */
  public createMetaTags(meta: Partial<MetaTags>): MetaTags {
    return Object.entries(meta).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = this.sanitizeContent(value);
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

  /**
   * Extracts existing meta tags from HTML
   */
  public extractMetaTags(html: string): MetaTags {
    const meta: MetaTags = {};
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
        let name: string | undefined;
        
        if (propertyMatch) {
          // Handle OpenGraph tags
          name = propertyMatch[1].replace('og:', 'og');
        } else if (nameMatch) {
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
export const htmlManager = new HTMLManager();