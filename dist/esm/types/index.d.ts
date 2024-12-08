/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { IncomingMessage, Server, ServerResponse } from 'http';
import { AeroSSRConfig, StaticFileOptions, LoggerOptions, CacheStore, MetaTags } from './types';
export { AeroSSRConfig, StaticFileOptions, LoggerOptions, CacheStore, MetaTags };
export declare class AeroSSR {
    constructor(config?: AeroSSRConfig);
    start(): Promise<Server>;
    stop(): Promise<void>;
    use(middleware: Middleware): void;
    route(path: string, handler: RouteHandler): void;
    readonly config: Required<AeroSSRConfig>;
}
export declare class StaticFileMiddleware {
    constructor(options: StaticFileOptions);
    middleware(): Middleware;
}
export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
export declare namespace Utils {
    namespace Cache {
        function create<T>(): CacheStore<T>;
    }
    namespace HTTP {
        function setCorsHeaders(res: ServerResponse, origins?: string): void;
        function generateETag(content: string | Buffer): string;
    }
    namespace Error {
        function generatePage(statusCode: number, message: string): string;
        function handle(error: Error & {
            statusCode?: number;
        }, req: IncomingMessage, res: ServerResponse): Promise<void>;
    }
    namespace HTML {
        function injectMetaTags(html: string, meta?: MetaTags, defaultMeta?: MetaTags): string;
    }
    namespace Bundle {
        function generate(projectPath: string, entryPoint: string): Promise<string>;
    }
}
export default AeroSSR;
//# sourceMappingURL=index.d.ts.map