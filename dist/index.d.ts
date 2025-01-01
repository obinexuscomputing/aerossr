import { ServerResponse, IncomingMessage } from 'http';
export { IncomingMessage, ServerResponse } from 'http';

interface CacheStore<T> {
    get(key: string): T | undefined;
    set(key: string, value: T, ttl?: number): void;
    clear(): void;
    has(key: string): boolean;
    delete(key: string): boolean;
}
interface CacheOptions$1 {
    ttl?: number;
    maxSize?: number;
}
declare function createCache<T>(options?: CacheOptions$1): CacheStore<T>;

interface CorsOptions$1 {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
interface CorsOptions$1 extends CorsOptionsBase {
}
declare function setCorsHeaders(res: ServerResponse, options?: CorsOptions$1): void;
declare function normalizeCorsOptions(options: string | CorsOptions$1 | undefined): CorsOptions$1;

interface MetaTags$1 {
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
declare function injectMetaTags(html: string, meta?: MetaTags$1, defaultMeta?: MetaTags$1): string;

interface LoggerOptions {
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
    constructor(options?: LoggerOptions);
    private initializeLogFile;
    getLogPath(): string | null;
    private formatMessage;
    log(message: string): Promise<void>;
    logRequest(req: IncomingMessage): void;
    clear(): Promise<void>;
}

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

interface ETagOptions {
    weak?: boolean;
}
declare function generateETag(content: string | Buffer, options?: ETagOptions): string;

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

/**
 * Type guard to check if a value is a Promise
 */
declare function isPromise<T = unknown>(value: unknown): value is Promise<T>;
/**
 * Ensures a function returns a Promise
 */
declare function ensureAsync<T extends AnyFunction>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>>;

declare function setCookie(name: string, value: string, days: number): void;
declare function getCookie(name: string): string | null;
declare function deleteCookie(name: string): void;

interface CacheStoreBase<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    clear(): void;
}
interface CorsOptionsBase {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
interface MetaTagsBase {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
    [key: string]: string | undefined;
}
interface LoggerOptionsBase {
    logFilePath?: string | null;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
type RouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
type ErrorHandler = (error: Error, req: IncomingMessage, res: ServerResponse) => Promise<void>;
interface StaticFileOptions {
    root: string;
    maxAge?: number;
    index?: string[];
    dotFiles?: 'ignore' | 'allow' | 'deny';
    compression?: boolean;
    etag?: boolean;
    cacheSize?: number;
}
type StaticFileHandler = (req: IncomingMessage, res: ServerResponse, options: StaticFileOptions) => Promise<void>;
type BundleHandler = (req: IncomingMessage, res: ServerResponse, bundlePath: string) => Promise<void>;
type TemplateHandler = (req: IncomingMessage, res: ServerResponse, templatePath: string) => Promise<void>;
interface CacheOptions {
    maxSize?: number;
    ttl?: number;
}
type AnyFunction = (...args: any[]) => any;
interface AsyncOptions {
    timeout?: number;
    retries?: number;
    onRetry?: (error: Error, attempt: number) => void;
}
interface CorsOptions extends CorsOptionsBase {
}
interface MetaTags extends MetaTagsBase {
}
interface AeroSSRConfig {
    port?: number;
    cacheMaxAge?: number;
    corsOrigins?: string | CorsOptions;
    compression?: boolean;
    logFilePath?: string | null;
    bundleCache?: CacheStoreBase<string>;
    templateCache?: CacheStoreBase<string>;
    defaultMeta?: MetaTags;
}
interface AsyncResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
interface AsyncResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
type AsyncHandler<T> = (...args: any[]) => Promise<AsyncResult<T>>;
declare function isError(error: unknown): error is Error;

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';
type RequiredConfig = Required<AeroSSRConfig> & {
    corsOrigins: Required<CorsOptions>;
};

export { AeroSSRConfig, AnyFunction, AsyncHandler, AsyncOptions, AsyncResult, BundleHandler, CacheOptions, CacheStoreBase as CacheStore, CacheStoreBase, CorsOptionsBase as CorsOptions, CorsOptionsBase, CustomError, ETagOptions, ErrorHandler, ErrorPageOptions, HTTPMethod, Logger, LoggerOptionsBase as LoggerOptions, LoggerOptionsBase, MetaTagsBase as MetaTags, MetaTagsBase, Middleware, RequiredConfig, RouteHandler, StaticFileHandler, StaticFileOptions, TemplateHandler, createCache, deleteCookie, ensureAsync, generateBundle, generateETag, generateErrorPage, getCookie, handleError, injectMetaTags, isError, isPromise, minifyBundle, normalizeCorsOptions, resolveDependencies, setCookie, setCorsHeaders };