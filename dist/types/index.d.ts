/// <reference types="node" />
import { IncomingMessage, ServerResponse, Server } from 'http';

interface AeroSSRConfig$1 {
    port?: number;
    cacheMaxAge?: number;
    corsOrigins?: string;
    compression?: boolean;
    logFilePath?: string | null;
    bundleCache?: CacheStore$1<string>;
    templateCache?: CacheStore$1<string>;
    defaultMeta?: {
        title?: string;
        description?: string;
        charset?: string;
        viewport?: string;
        [key: string]: string | undefined;
    };
}
interface CacheStore$1<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    clear(): void;
}
interface StaticFileOptions$1 {
    root: string;
    maxAge?: number;
    index?: string[];
    dotFiles?: 'ignore' | 'allow' | 'deny';
    compression?: boolean;
    etag?: boolean;
    cacheSize?: number;
}
interface LoggerOptions$1 {
    logFilePath?: string | null;
}

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
type RouteHandler$1 = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
type Middleware$1 = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
interface LoggerOptions {
    logFilePath?: string | null;
}

interface MetaTags {
    charset?: string;
    viewport?: string;
    description?: string;
    title?: string;
    [key: string]: string | undefined;
}

declare class StaticFileMiddleware {
    readonly root: string;
    readonly maxAge: number;
    readonly index: string[];
    readonly dotFiles: 'ignore' | 'allow' | 'deny';
    readonly compression: boolean;
    readonly etag: boolean;
    constructor(options: StaticFileOptions);
    private serveFile;
    private isCompressible;
    private getMimeType;
    middleware(): Middleware$1;
}

declare class Logger {
    private logFilePath;
    constructor(options?: LoggerOptions);
    log(message: string): void;
    logRequest(req: IncomingMessage): void;
}

declare class AeroSSR$1 {
    readonly config: Required<AeroSSRConfig>;
    readonly logger: Logger;
    server: Server | null;
    readonly routes: Map<string, RouteHandler$1>;
    readonly middlewares: Middleware$1[];
    constructor(config?: AeroSSRConfig);
    use(middleware: Middleware$1): void;
    route(path: string, handler: RouteHandler$1): void;
    clearCache(): void;
    private executeMiddlewares;
    private handleRequest;
    private handleDistRequest;
    private handleDefaultRequest;
    start(): Promise<Server>;
    stop(): Promise<void>;
}

type RouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
declare namespace AeroSSR {
    class Core {
        constructor(config?: AeroSSRConfig$1);
        start(): Promise<Server>;
        stop(): Promise<void>;
        use(middleware: Middleware): void;
        route(path: string, handler: RouteHandler): void;
        readonly config: Required<AeroSSRConfig$1>;
    }
    namespace Middleware {
        class StaticFile {
            constructor(options: StaticFileOptions$1);
            middleware(): Middleware;
        }
    }
    namespace Utils {
        class Logger {
            constructor(options?: LoggerOptions$1);
            log(message: string): void;
            logRequest(req: IncomingMessage): void;
        }
        namespace Cache {
            function create<T>(): CacheStore$1<T>;
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
}

declare const _default: typeof AeroSSR.Core;

export { AeroSSR$1 as AeroSSR, AeroSSRConfig$1 as AeroSSRConfig, CacheStore$1 as CacheStore, LoggerOptions$1 as LoggerOptions, MetaTags, Middleware, RouteHandler, StaticFileMiddleware, StaticFileOptions$1 as StaticFileOptions, _default as default };
