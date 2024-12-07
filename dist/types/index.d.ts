import { IncomingMessage, ServerResponse } from 'http';
import { StaticFileOptions as StaticFileOptions$1, Middleware as Middleware$1, CacheStore as CacheStore$1 } from '@/types';

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
type RouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
interface LoggerOptions {
    logFilePath?: string | null;
}
interface ErrorResponse extends Error {
    statusCode?: number;
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
    constructor(options: StaticFileOptions$1);
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

declare function createCache<T>(): CacheStore$1<T>;

declare function setCorsHeaders(res: ServerResponse, origins?: string): void;

declare function generateErrorPage(statusCode: number, message: string): string;
declare function handleError(error: Error & {
    statusCode?: number;
}, _req: IncomingMessage, res: ServerResponse): Promise<void>;

declare function generateETag(content: string | Buffer): string;

interface MetaTags {
    charset?: string;
    viewport?: string;
    description?: string;
    title?: string;
    [key: string]: string | undefined;
}
declare function injectMetaTags(html: string, meta?: MetaTags, defaultMeta?: MetaTags): string;

declare function resolveDependencies(filePath: string, deps?: Set<string>): Promise<Set<string>>;
declare function minifyBundle(code: string): string;
declare function generateBundle(projectPath: string, entryPoint: string): Promise<string>;

export { AeroSSRConfig, CacheStore, CachedContent, ErrorResponse, Logger, LoggerOptions, MetaTags, Middleware, RouteHandler, StaticFileMiddleware, StaticFileOptions, createCache, generateBundle, generateETag, generateErrorPage, handleError, injectMetaTags, minifyBundle, resolveDependencies, setCorsHeaders };
