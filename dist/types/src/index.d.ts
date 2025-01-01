import { A as AnyFunction, S as StaticFileOptions, M as Middleware } from '../AeroSSR-bdf4f9b2.js';
export { a as AeroSSR, g as AeroSSRConfig, h as AsyncHandler, f as AsyncOptions, e as AsyncResult, B as BundleHandler, C as CacheStore, C as CacheStoreBase, b as CorsOptions, b as CorsOptionsBase, E as ErrorHandler, H as HTTPMethod, j as Logger, L as LoggerOptions, L as LoggerOptionsBase, c as MetaTags, c as MetaTagsBase, i as RequiredConfig, R as RouteHandler, d as StaticFileHandler, T as TemplateHandler } from '../AeroSSR-bdf4f9b2.js';
import { CorsOptionsBase } from '@/types';
import { ServerResponse, IncomingMessage } from 'http';
export { IncomingMessage, ServerResponse } from 'http';

interface CacheStore<T> {
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
declare function createCache<T>(options?: CacheOptions): CacheStore<T>;

interface CorsOptions {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
interface CorsOptions extends CorsOptionsBase {
}
declare function setCorsHeaders(res: ServerResponse, options?: CorsOptions): void;
declare function normalizeCorsOptions(options: string | CorsOptions | undefined): CorsOptions;

interface MetaTags {
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
declare function injectMetaTags(html: string, meta?: MetaTags, defaultMeta?: MetaTags): string;

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
    baseDir?: string;
}
interface BundleOptions extends DependencyOptions {
    minify?: boolean;
    sourceMap?: boolean;
    comments?: boolean;
}
/**
 * Resolves all dependencies for a given file
 */
declare function resolveDependencies(filePath: string, deps?: Set<string>, options?: DependencyOptions): Promise<Set<string>>;
/**
 * Minifies JavaScript code while preserving important structures
 */
declare function minifyBundle(code: string): string;
/**
 * Generates a bundled JavaScript file from an entry point
 */
declare function generateBundle(projectPath: string, entryPoint: string, options?: BundleOptions): Promise<string>;

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

declare class StaticFileMiddleware {
    readonly root: string;
    readonly maxAge: number;
    readonly index: string[];
    readonly dotFiles: 'ignore' | 'allow' | 'deny';
    readonly compression: boolean;
    readonly etag: boolean;
    constructor(options: StaticFileOptions);
    private isDotFile;
    private handleDotFile;
    private isCompressible;
    private getMimeType;
    private serveFile;
    middleware(): Middleware;
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

export { AnyFunction, BundleOptions, CacheOptions, CustomError, DependencyOptions, ETagOptions, ErrorPageOptions, Middleware, SecurityMiddleware, StaticFileMiddleware, StaticFileOptions, createCache, deleteCookie, ensureAsync, generateBundle, generateETag, generateErrorPage, getCookie, handleError, injectMetaTags, isPromise, minifyBundle, normalizeCorsOptions, resolveDependencies, setCookie, setCorsHeaders };
