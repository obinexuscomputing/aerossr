/// <reference types="node" />
import { Server, IncomingMessage, ServerResponse } from 'http';
import { Request, Response } from '../http';
import { RouteHandler } from '@/routing';
import { AeroSSRConfig } from '@/types';
import { Logger } from '@/utils';
export declare class AeroSSR {
    readonly config: Required<AeroSSRConfig>;
    readonly logger: Logger;
    private readonly bundler;
    private readonly distHandler;
    private readonly router;
    server: Server | null;
    readonly routes: Map<string, RouteHandler>;
    private readonly middlewares;
    constructor(options?: Partial<AeroSSRConfig>);
    private initializeBaseConfig;
    private initializeFullConfig;
    private createRequiredDirectoriesSync;
    private setupStaticFileHandling;
    private initializeStaticFileHandling;
    private validateConfig;
    use(middleware: (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>): void;
    route(path: string, handler: RouteHandler): void;
    clearCache(): void;
    private createContext;
    private executeMiddlewares;
    private handleRequest;
    private handleBundle;
    handleDistRequest(req: Request, res: Response): Promise<void>;
    private handleDefaultRequest;
    start(): Promise<Server>;
    stop(): Promise<void>;
    listen(port: number): void;
}
export default AeroSSR;
//# sourceMappingURL=AeroSSR.d.ts.map