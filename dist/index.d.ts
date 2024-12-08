import { IncomingMessage, ServerResponse, Server } from 'http';

declare class Logger {
    private logFilePath;
    constructor(options?: LoggerOptions);
    log(message: string): void;
    logRequest(req: IncomingMessage): void;
}

interface AeroSSRConfig$1 {
    port?: number;
    cacheMaxAge?: number;
    corsOrigins?: string;
    compression?: boolean;
    logFilePath?: string | null;
    bundleCache?: CacheStore$1<string>;
    templateCache?: CacheStore$1<string>;
    defaultMeta?: MetaTags$1;
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
interface MetaTags$1 {
    charset?: string;
    viewport?: string;
    description?: string;
    title?: string;
    [key: string]: string | undefined;
}
type RouteHandler$1 = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
type Middleware$1 = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;

declare function createCache<T>(): CacheStore$1<T>;

declare function setCorsHeaders(res: ServerResponse, origins?: string): void;

declare function generateETag(content: string | Buffer): string;

declare function generateErrorPage(statusCode: number, message: string): string;
declare function handleError(error: Error & {
    statusCode?: number;
}, req: IncomingMessage, res: ServerResponse): Promise<void>;

declare function injectMetaTags(html: string, meta?: MetaTags$1, defaultMeta?: MetaTags$1): string;

declare function resolveDependencies(filePath: string, deps?: Set<string>): Promise<Set<string>>;
declare function minifyBundle(code: string): string;
declare function generateBundle(projectPath: string, entryPoint: string): Promise<string>;

declare class StaticFileMiddleware {
    readonly root: string;
    readonly maxAge: number;
    readonly index: string[];
    readonly dotFiles: 'ignore' | 'allow' | 'deny';
    readonly compression: boolean;
    readonly etag: boolean;
    constructor(options: StaticFileOptions$1);
    private serveFile;
    private isCompressible;
    private getMimeType;
    middleware(): Middleware$1;
}

declare class AeroSSR {
    readonly config: Required<AeroSSRConfig$1>;
    readonly logger: Logger;
    server: Server | null;
    readonly routes: Map<string, RouteHandler$1>;
    readonly middlewares: Middleware$1[];
    constructor(config?: AeroSSRConfig$1);
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
}
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
type RouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;

export { AeroSSR, AeroSSRConfig, CacheStore, Logger, LoggerOptions, MetaTags, Middleware, RouteHandler, StaticFileMiddleware, StaticFileOptions, createCache, AeroSSR as default, generateBundle, generateETag, generateErrorPage, handleError, injectMetaTags, minifyBundle, resolveDependencies, setCorsHeaders };
