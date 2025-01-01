interface DependencyOptions {
    extensions?: string[];
    maxDepth?: number;
    ignorePatterns?: string[];
    baseDir?: string;
}
interface BundleOptions extends DependencyOptions {
    minify?: boolean;
    sourceMap?: boolean;
    comments?: boolean;
}
/**
 * Resolves all dependencies for a given file
 */
declare function resolveDependencies(filePath: string, deps?: Set<string>, options?: DependencyOptions): Promise<Set<string>>;
/**
 * Minifies JavaScript code while preserving important structures
 */
declare function minifyBundle(code: string): string;
/**
 * Generates a bundled JavaScript file from an entry point
 */
declare function generateBundle(projectPath: string, entryPoint: string, options?: BundleOptions): Promise<string>;

export { BundleOptions, DependencyOptions, generateBundle, minifyBundle, resolveDependencies };
