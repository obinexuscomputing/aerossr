import { IncomingMessage, ServerResponse, Server } from 'http';

interface LoggerOptions$1 {
    logFilePath?: string | null;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    maxFileSize?: number;
    maxFiles?: number;
    format?: 'json' | 'text';
}
declare class Logger {
    private logFilePath;
    private readonly options;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: LoggerOptions$1);
    private initializeLogFile;
    getLogPath(): string | null;
    private formatMessage;
    log(message: string): Promise<void>;
    logRequest(req: IncomingMessage): void;
    clear(): Promise<void>;
}

interface CacheStore$2<T> {
    get(key: string): T | undefined;
    set(key: string, value: T, ttl?: number): void;
    clear(): void;
    has(key: string): boolean;
    delete(key: string): boolean;
}
interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
declare function createCache<T>(options?: CacheOptions): CacheStore$2<T>;

interface CorsOptions$1 {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
declare function setCorsHeaders(res: ServerResponse, options?: CorsOptions$1): void;

interface ETagOptions {
    weak?: boolean;
}
declare function generateETag(content: string | Buffer, options?: ETagOptions): string;

interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
}
interface ErrorPageOptions {
    styles?: string;
    showStack?: boolean;
    showDetails?: boolean;
}
declare function generateErrorPage(statusCode: number, message: string, error?: CustomError, options?: ErrorPageOptions): string;
declare function handleError(error: CustomError, req: IncomingMessage, res: ServerResponse): Promise<void>;

interface MetaTags$2 {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
    keywords?: string;
    author?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    [key: string]: string | undefined;
}
declare function injectMetaTags(html: string, meta?: MetaTags$2, defaultMeta?: MetaTags$2): string;

interface DependencyOptions {
    extensions?: string[];
    maxDepth?: number;
    ignorePatterns?: string[];
}
/**
 * Resolves all dependencies for a given file
 */
declare function resolveDependencies(filePath: string, deps?: Set<string>, options?: DependencyOptions, depth?: number): Promise<Set<string>>;
/**
 * Minifies JavaScript code while preserving string contents
 */
declare function minifyBundle(code: string): string;
/**
 * Generates a bundled JavaScript file from an entry point
 */
declare function generateBundle(projectPath: string, entryPoint: string): Promise<string>;

interface AeroSSRConfig$1 {
    port?: number;
    cacheMaxAge?: number;
    corsOrigins?: CorsOptions;
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
interface CorsOptions {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
interface MetaTags$1 {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
    [key: string]: string | undefined;
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
type Middleware$1 = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
type RouteHandler$1 = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

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

declare class SecurityMiddleware {
    /**
     * CSRF Protection Middleware
     */
    static csrfProtection(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Rate Limiting Middleware
     */
    static rateLimit(limit: number, windowMs: number): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    /**
     * Security Headers Middleware
     */
    static securityHeaders(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Input Sanitization Middleware
     */
    static sanitizeInput(req: IncomingMessage, res: ServerResponse): Promise<void>;
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

export { AeroSSR, AeroSSRConfig, CacheOptions, CacheStore, CorsOptions$1 as CorsOptions, CustomError, ETagOptions, ErrorPageOptions, Logger, LoggerOptions, MetaTags, Middleware, RouteHandler, SecurityMiddleware, StaticFileMiddleware, StaticFileOptions, createCache, AeroSSR as default, generateBundle, generateETag, generateErrorPage, handleError, injectMetaTags, minifyBundle, resolveDependencies, setCorsHeaders };
