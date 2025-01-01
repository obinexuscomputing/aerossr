import { Server } from 'http';
import { Logger } from '../utils/logger.js';
import { AeroSSRConfig, RouteHandler, Middleware } from '../types/index.js';

declare class AeroSSR {
    readonly config: Required<AeroSSRConfig>;
    readonly logger: Logger;
    server: Server | null;
    readonly routes: Map<string, RouteHandler>;
    readonly middlewares: Middleware[];
    constructor(config?: AeroSSRConfig);
    use(middleware: Middleware): void;
    route(path: string, handler: RouteHandler): void;
    clearCache(): void;
    private executeMiddlewares;
    private handleRequest;
    private handleDistRequest;
    private handleDefaultRequest;
    start(): Promise<Server>;
    stop(): Promise<void>;
}

export { AeroSSR, AeroSSR as default };
