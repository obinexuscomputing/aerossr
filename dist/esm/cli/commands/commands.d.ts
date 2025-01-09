import { AeroSSR } from '@/types';
import { Logger } from '@/utils';
export interface MiddlewareConfig {
    name: string;
    path: string;
    options?: Record<string, unknown>;
}
export interface ProjectStructure {
    public: string;
    logs: string;
    config: string;
    styles: string;
    dist: string;
}
export declare class AeroSSRCommands {
    private readonly logger;
    private readonly defaultHeaders;
    constructor(logger?: Logger);
    /**
     * Find the project root directory
     */
    private findProjectRoot;
    /**
     * Verify directory exists or create it
     */
    private ensureDirectory;
    /**
     * Create project directory structure
     */
    private createProjectStructure;
    /**
     * Create default project files
     */
    private createProjectFiles;
    /**
     * Initialize new AeroSSR project
     */
    initializeProject(directory: string): Promise<void>;
    /**
     * Create logging middleware
     */
    private createLoggingMiddleware;
    /**
     * Create error handling middleware
     */
    private createErrorMiddleware;
    /**
     * Validate middleware module exports
     */
    private validateMiddlewareExports;
    /**
     * Load custom middleware
     */
    private loadCustomMiddleware;
    /**
     * Configure middleware for AeroSSR instance
     */
    configureMiddleware(app: AeroSSR, config?: MiddlewareConfig): Promise<void>;
    /**
     * Clean up project resources
     */
    cleanup(): Promise<void>;
}
export declare const aeroCommands: AeroSSRCommands;
//# sourceMappingURL=commands.d.ts.map