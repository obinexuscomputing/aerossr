import { IncomingMessage, Server, ServerResponse } from 'http';
import { AeroSSRConfig, StaticFileOptions, LoggerOptions, CacheStore, MetaTags } from './types';

// Export the types
export { AeroSSRConfig, StaticFileOptions, LoggerOptions, CacheStore, MetaTags };

// Export the core class (main export)
export class AeroSSR {
    constructor(config?: AeroSSRConfig);
    start(): Promise<Server>;
    stop(): Promise<void>;
    use(middleware: Middleware): void;
    route(path: string, handler: RouteHandler): void;
    readonly config: Required<AeroSSRConfig>;
}

// Export middleware classes
export class StaticFileMiddleware {
    constructor(options: StaticFileOptions);
    middleware(): Middleware;
}

// Export type definitions
export type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse
) => Promise<void> | void;

export type Middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>
) => Promise<void>;

// Export utility functions
export namespace Utils {
    export namespace Cache {
        export function create<T>(): CacheStore<T>;
    }
    
    export namespace HTTP {
        export function setCorsHeaders(res: ServerResponse, origins?: string): void;
        export function generateETag(content: string | Buffer): string;
    }
    
    export namespace Error {
        export function generatePage(statusCode: number, message: string): string;
        export function handle(error: Error & { statusCode?: number }, req: IncomingMessage, res: ServerResponse): Promise<void>;
    }
    
    export namespace HTML {
        export function injectMetaTags(html: string, meta?: MetaTags, defaultMeta?: MetaTags): string;
    }
    
    export namespace Bundle {
        export function generate(projectPath: string, entryPoint: string): Promise<string>;
    }
}

// Make AeroSSR the default export
export default AeroSSR;