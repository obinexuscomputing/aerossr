/// <reference types="node" />
import { Server } from 'http';
import { AeroSSRConfig, Middleware, RouteHandler } from '..';

export declare class AeroSSR {
    private readonly config;
    private readonly logger;
    private server;
    private readonly routes;
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
}
export default AeroSSR;
//# sourceMappingURL=AeroSSR.d.ts.map