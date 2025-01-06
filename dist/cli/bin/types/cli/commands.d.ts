import { AeroSSR } from '../';
export interface MiddlewareConfig {
    name: string;
    path: string;
    options?: Record<string, unknown>;
}
/**
 * Initialize a new AeroSSR project structure
 */
export declare function initializeSSR(directory: string): Promise<void>;
/**
 * Configure middleware for the AeroSSR instance
 */
export declare function configureMiddleware(app: AeroSSR, config?: MiddlewareConfig): Promise<void>;
//# sourceMappingURL=commands.d.ts.map