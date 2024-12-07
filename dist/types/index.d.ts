import { IncomingMessage, ServerResponse, Server } from 'http';

interface AeroSSRConfig {
    port?: number;
    cacheMaxAge?: number;
    corsOrigins?: string;
    compression?: boolean;
    logFilePath?: string | null;
    bundleCache?: CacheStore<string>;
    templateCache?: CacheStore<string>;
    defaultMeta?: {
        title?: string;
        description?: string;
        charset?: string;
        viewport?: string;
        [key: string]: string | undefined;
    };
}
interface MetaTags {
    charset?: string;
    viewport?: string;
    description?: string;
    title?: string;
    [key: string]: string | undefined;
}
interface CacheStore<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    clear(): void;
}
interface StaticFileOptions {
    root: string;
    maxAge?: number;
    index?: string[];
    dotFiles?: 'ignore' | 'allow' | 'deny';
    compression?: boolean;
    etag?: boolean;
    cacheSize?: number;
}
type RouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
interface LoggerOptions {
    logFilePath?: string | null;
}
interface ErrorResponse extends Error {
    statusCode?: number;
}

declare class AeroSSR$1 {
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

interface CachedContent {
    content: Buffer;
    headers: Record<string, string>;
    encoding?: string;
}
declare class StaticFileMiddleware {
    private readonly root;
    private readonly maxAge;
    private readonly index;
    private readonly dotFiles;
    private readonly compression;
    private readonly etag;
    constructor(options: StaticFileOptions);
    private serveFile;
    private isCompressible;
    private getMimeType;
    middleware(): Middleware;
}

declare class Logger {
    private logFilePath;
    constructor(options?: LoggerOptions);
    log(message: string): void;
    logRequest(req: IncomingMessage): void;
}

declare function createCache<T>(): CacheStore<T>;

declare function setCorsHeaders(res: ServerResponse, origins?: string): void;

declare function generateETag(content: string | Buffer): string;

declare function generateErrorPage(statusCode: number, message: string): string;
declare function handleError(error: Error & {
    statusCode?: number;
}, _req: IncomingMessage, res: ServerResponse): Promise<void>;

declare function injectMetaTags(html: string, meta?: MetaTags, defaultMeta?: MetaTags): string;

declare function resolveDependencies(filePath: string, deps?: Set<string>): Promise<Set<string>>;
declare function minifyBundle(code: string): string;
declare function generateBundle(projectPath: string, entryPoint: string): Promise<string>;

declare namespace AeroSSR {
    class Core extends AeroSSR$1 {
    }
    namespace Middleware {
        class StaticFile extends StaticFileMiddleware {
        }
    }
    namespace Utils {
        class LoggerUtil extends Logger {
        }
        const Cache: {
            create: typeof createCache;
        };
        const HTTP: {
            setCorsHeaders: typeof setCorsHeaders;
            generateETag: typeof generateETag;
        };
        const Error: {
            generatePage: typeof generateErrorPage;
            handle: typeof handleError;
        };
        const HTML: {
            injectMetaTags: typeof injectMetaTags;
        };
        const Bundle: {
            generate: typeof generateBundle;
        };
    }
}

export { AeroSSR, AeroSSR$1 as AeroSSRBase, AeroSSRConfig, CacheStore, CachedContent, ErrorResponse, Logger, LoggerOptions, MetaTags, Middleware, RouteHandler, StaticFileMiddleware, StaticFileOptions, createCache, AeroSSR$1 as default, generateBundle, generateETag, generateErrorPage, handleError, injectMetaTags, minifyBundle, resolveDependencies, setCorsHeaders };
