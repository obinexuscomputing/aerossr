import { AeroSSR } from '..';
import { Logger } from '../utils/Logger';
export interface MiddlewareConfig {
    name: string;
    path: string;
    options?: Record<string, unknown>;
}
export declare class AeroSSRCommands {
    private readonly logger;
    constructor(logger?: Logger);
    /**
     * Find the project root directory by looking for package.json
     */
    private findProjectRoot;
    /**
     * Create default project structure
     */
    private createProjectStructure;
    /**
     * Create default project files
     */
    private createProjectFiles;
    /**
     * Initialize a new AeroSSR project
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