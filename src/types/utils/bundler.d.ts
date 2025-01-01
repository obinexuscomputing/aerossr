export declare function resolveDependencies(filePath: string, deps?: Set<string>): Promise<Set<string>>;
export declare function minifyBundle(code: string): string;
export declare function generateBundle(projectPath: string, entryPoint: string): Promise<string>;
