import { AeroSSR } from '../';
export interface MiddlewareConfig {
    name: string;
    path: string;
    options?: Record<string, unknown>;
}
export declare function initializeSSR(directory: string): Promise<void>;
export declare function configureMiddleware(app: AeroSSR, config?: MiddlewareConfig): Promise<void>;
//# sourceMappingURL=commands.d.ts.map