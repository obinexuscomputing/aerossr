/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
import { CacheStoreBase } from '@/types';
import { Logger } from '@/utils';
export interface BundlerConfig {
    projectPath: string;
    bundleCache?: CacheStoreBase<string>;
    compression?: boolean;
    cacheMaxAge?: number;
    logger?: Logger;
}
export interface BundleOptions {
    minify?: boolean;
    sourceMap?: boolean;
    comments?: boolean;
    target?: 'server' | 'browser' | 'universal';
    hydration?: boolean;
    extensions?: string[];
    maxDepth?: number;
    ignorePatterns?: string[];
}
export interface BundleResult {
    code: string;
    map?: string;
    hydrationCode?: string;
    dependencies: Set<string>;
    hash: string;
}
export declare class UnifiedBundler {
    private readonly projectPath;
    private readonly bundleCache;
    private readonly compression;
    private readonly cacheMaxAge;
    private readonly logger?;
    private readonly defaultOptions;
    constructor(config: BundlerConfig);
    generateBootstrap(mainScript: string): string;
    handleDistRequest(req: IncomingMessage, res: ServerResponse, query: Record<string, string | string[] | undefined>): Promise<void>;
    generateBundle(entryPoint: string, options?: Partial<BundleOptions>): Promise<BundleResult>;
    private generateModuleSystem;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        keys: string[];
    };
    private generateHash;
    private resolveDependencies;
    private resolveFilePath;
    private minifyBundle;
}
//# sourceMappingURL=UnifiedBundler.d.ts.map