import { CacheStoreBase } from '@/types';
export interface DependencyOptions {
    extensions?: string[];
    maxDepth?: number;
    ignorePatterns?: string[];
    baseDir?: string;
}
export interface BundleOptions extends DependencyOptions {
    minify?: boolean;
    sourceMap?: boolean;
    comments?: boolean;
    target?: 'server' | 'browser' | 'universal';
    hydration?: boolean;
}
export interface BundleResult {
    code: string;
    map?: string;
    hydrationCode?: string;
    dependencies: Set<string>;
    hash: string;
}
export interface BundlerOptions extends BundleOptions {
    bundleCache?: CacheStoreBase<string>;
    templateCache?: CacheStoreBase<string>;
}
export declare class AeroSSRBundler {
    private readonly projectPath;
    private readonly bundleCache;
    private readonly templateCache;
    private readonly defaultOptions;
    constructor(projectPath: string, options?: BundlerOptions);
    private generateHash;
    private resolveFilePath;
    private resolveDependencies;
    private minifyBundle;
    private generateHydrationCode;
    private generateModuleSystem;
    generateBundle(entryPoint: string, options?: Partial<BundleOptions>): Promise<BundleResult>;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}
//# sourceMappingURL=Bundler.d.ts.map