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
  public injectMetaTags(html: string, meta: Partial<MetaTags> = {}, defaultMeta?: MetaTags): string {
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
 * Helper method to decode HTML entities
 */
private decodeHTMLEntities(str: string): string {
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent || str;
}

/**
 * Convert property name to camelCase
 */
private propertyNameToCamelCase(name: string): string {
  // Handle special cases first
  if (name.startsWith('og:')) {
    const ogProp = name.slice(3); // Remove 'og:'
    return 'og' + ogProp.charAt(0).toUpperCase() + ogProp.slice(1);
  }
  if (name.startsWith('twitter:')) {
    const twitterProp = name.slice(8); // Remove 'twitter:'
    return 'twitter' + twitterProp.charAt(0).toUpperCase() + twitterProp.slice(1);
  }
  
  // General kebab-case to camelCase conversion
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Extracts existing meta tags from HTML
 */
public extractMetaTags(html: string): MetaTags {
  const meta: MetaTags = {};
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    meta.title = this.decodeHTMLEntities(titleMatch[1]);
  }

  // Extract meta tags
  const metaTags = html.matchAll(/<meta\s+(?:[^>]*?\s+)?(?:name|property)="([^"]+)"[^>]*?content="([^"]+)"[^>]*>/g);
  
  for (const match of metaTags) {
    const [_, nameOrProperty, content] = match;
    if (!nameOrProperty || !content) continue;

    // Normalize property name
    const propertyName = this.propertyNameToCamelCase(nameOrProperty);
    
    // Decode content
    const decodedContent = this.decodeHTMLEntities(content);
    
    // Special handling for charset
    if (nameOrProperty === 'charset') {
      meta.charset = decodedContent;
      continue;
    }

    meta[propertyName] = decodedContent;
  }

  // Also check for charset in meta tag
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
  // Create a temporary div to decode entities
  const sanitizedMeta: MetaTags = Object.entries(meta).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      // First encode special characters, then decode entities
      acc[key] = this.decodeHTMLEntities(value.replace(/["<>]/g, (char) => {
        const entities: { [key: string]: string } = {
          '"': '&quot;',
          '<': '&lt;',
          '>': '&gt;'
        };
        return entities[char];
      }));
    }
    return acc;
  }, {} as MetaTags);

  return sanitizedMeta;
}
}

// Export singleton instance
export const htmlManager = new HTMLManager();