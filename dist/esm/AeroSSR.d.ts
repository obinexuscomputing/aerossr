/// <reference types="node" />
import { Server } from 'http';
import { Logger } from './utils/logger';
import { AeroSSRConfig, Middleware, RouteHandler } from './types';
export declare class AeroSSR {
    readonly config: Required<AeroSSRConfig>;
    readonly logger: Logger;
    server: Server | null;
    readonly routes: Map<string, RouteHandler>;
    private readonly middlewares;
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
    listen(port: number): void;
}
export default AeroSSR;
//# sourceMappingURL=AeroSSR.d.ts.map