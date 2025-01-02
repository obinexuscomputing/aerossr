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
}
/**
 * Resolves all dependencies for a given file
 */
export declare function resolveDependencies(filePath: string, deps?: Set<string>, options?: DependencyOptions): Promise<Set<string>>;
/**
 * Minifies JavaScript code while preserving important structures
 */
export declare function minifyBundle(code: string): string;
/**
 * Generates a bundled JavaScript file from an entry point
 */
export declare function generateBundle(projectPath: string, entryPoint: string, options?: BundleOptions): Promise<string>;
//# sourceMappingURL=bundler.d.ts.map