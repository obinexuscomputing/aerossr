import { IncomingMessage, ServerResponse } from 'http';
export { IncomingMessage, ServerResponse } from 'http';

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

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';
type RequiredConfig = Required<AeroSSRConfig> & {
    corsOrigins: Required<CorsOptions>;
};

export { AeroSSRConfig, AnyFunction, AsyncHandler, AsyncOptions, AsyncResult, BundleHandler, CacheStoreBase, CorsOptions, CorsOptionsBase, ErrorHandler, HTTPMethod, LoggerOptionsBase, MetaTags, MetaTagsBase, Middleware, RequiredConfig, RouteHandler, StaticFileHandler, StaticFileOptions, TemplateHandler };
