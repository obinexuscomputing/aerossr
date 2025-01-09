import { AeroSSR } from '@/core/AeroSSR';
import { AeroSSRConfig, MiddlewareConfig } from '@/types/aerossr';
import { Logger } from '@/utils/logging';
interface InitOptions {
    projectPath: string;
    port: number;
    logPath: string;
}
export declare function configureMiddleware(app: AeroSSR, middlewareConfig: MiddlewareConfig): Promise<void>;
export declare function initializeMiddleware(options: InitOptions): Promise<AeroSSR>;
export declare function createAeroConfig(projectPath: string, logger: Logger, options?: Partial<AeroSSRConfig>): AeroSSRConfig;
export {};
//# sourceMappingURL=configureMiddleware.d.ts.map