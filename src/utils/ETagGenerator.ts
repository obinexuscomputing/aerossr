// src/utils/ETagGenerator.ts
import * as crypto from 'crypto';

export interface ETagOptions {
  weak?: boolean;
  algorithm?: 'md5' | 'sha1' | 'sha256';
  encoding?: 'hex' | 'base64';
}

export class ETagGenerator {
  private readonly defaultOptions: Required<ETagOptions>;
  private cache: Map<string, string>;
  private maxCacheSize: number;

  constructor(options: Partial<ETagOptions> = {}, maxCacheSize: number = 1000) {
    this.defaultOptions = {
      weak: false,
      algorithm: 'md5',
      encoding: 'hex',
      ...options
    };
    this.cache = new Map();
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Generates an ETag for the given content
   */
  public generate(content: string | Buffer, options: Partial<ETagOptions> = {}): string {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const cacheKey = this.getCacheKey(content, mergedOptions);

    // Check cache first
    const cachedETag = this.cache.get(cacheKey);
    if (cachedETag) {
      return cachedETag;
    }

    const hash = this.generateHash(content, mergedOptions);
    const etag = this.formatETag(hash, mergedOptions.weak);

    // Cache the result
    this.cacheETag(cacheKey, etag);

    return etag;
  }

  /**
   * Generates a hash for the given content
   */
  private generateHash(content: string | Buffer, options: Required<ETagOptions>): string {
    return crypto
      .createHash(options.algorithm)
      .update(content)
      .digest(options.encoding);
  }

  /**
   * Formats the hash as an ETag
   */
  private formatETag(hash: string, weak: boolean): string {
    return weak ? `W/"${hash}"` : `"${hash}"`;
  }

  /**
   * Generates a cache key for content and options
   */
  private getCacheKey(content: string | Buffer, options: Required<ETagOptions>): string {
    const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;
    return `${contentStr}:${JSON.stringify(options)}`;
  }

  /**
   * Caches an ETag with LRU eviction if needed
   */
  private cacheETag(key: string, etag: string): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, etag);
  }

  /**
   * Validates if a given string is a valid ETag
   */
  public isValid(etag: string): boolean {
    const strongPattern = /^"[a-f0-9]+?"$/;
    const weakPattern = /^W\/"[a-f0-9]+?"$/;
    return strongPattern.test(etag) || weakPattern.test(etag);
  }

  /**
   * Compares two ETags for equality
   */
  public compare(etag1: string, etag2: string): boolean {
    const normalize = (etag: string) => etag.replace(/^W\//, '');
    return normalize(etag1) === normalize(etag2);
  }

  /**
   * Clears the ETag cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Updates the maximum cache size
   */
  public setMaxCacheSize(size: number): void {
    this.maxCacheSize = size;
    while (this.cache.size > this.maxCacheSize) {
      // Remove oldest entries until we're under the limit
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Gets the current default options
   */
  public getDefaultOptions(): Required<ETagOptions> {
    return { ...this.defaultOptions };
  }

  /**
   * Updates the default options
   */
  public setDefaultOptions(options: Partial<ETagOptions>): void {
    Object.assign(this.defaultOptions, options);
  }
}

// Export singleton instance
export const etagGenerator = new ETagGenerator();