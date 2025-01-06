/// <reference types="node" />
/// <reference types="node" />
export interface ETagOptions {
    weak?: boolean;
    algorithm?: 'md5' | 'sha1' | 'sha256';
    encoding?: 'hex' | 'base64';
}
export declare class ETagGenerator {
    private readonly defaultOptions;
    private cache;
    private maxCacheSize;
    constructor(options?: Partial<ETagOptions>, maxCacheSize?: number);
    /**
     * Generates an ETag for the given content
     */
    generate(content: string | Buffer, options?: Partial<ETagOptions>): string;
    /**
     * Generates a hash for the given content
     */
    private generateHash;
    /**
     * Formats the hash as an ETag
     */
    private formatETag;
    /**
     * Generates a cache key for content and options
     */
    private getCacheKey;
    /**
     * Caches an ETag with LRU eviction if needed
     */
    private cacheETag;
    /**
     * Validates if a given string is a valid ETag
     */
    isValid(etag: string): boolean;
    /**
     * Compares two ETags for equality
     */
    compare(etag1: string, etag2: string): boolean;
    /**
     * Clears the ETag cache
     */
    clearCache(): void;
    /**
     * Gets cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
    };
    /**
     * Updates the maximum cache size
     */
    setMaxCacheSize(size: number): void;
    /**
     * Gets the current default options
     */
    getDefaultOptions(): Required<ETagOptions>;
    /**
     * Updates the default options
     */
    setDefaultOptions(options: Partial<ETagOptions>): void;
}
export declare const etagGenerator: ETagGenerator;
//# sourceMappingURL=ETagGenerator.d.ts.map