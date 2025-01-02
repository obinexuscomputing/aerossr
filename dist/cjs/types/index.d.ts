/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from 'http';
export interface CacheStoreBase<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    clear(): void;
}
export interface CorsOptionsBase {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
export interface MetaTagsBase {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
    [key: string]: string | undefined;
}
export interface LoggerOptionsBase {
    logFilePath?: string | null;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
export type ErrorHandler = (error: Error, req: IncomingMessage, res: ServerResponse) => Promise<void>;
export interface StaticFileOptions {
    root: string;
    maxAge?: number;
    index?: string[];
    dotFiles?: 'ignore' | 'allow' | 'deny';
    compression?: boolean;
    etag?: boolean;
}
export type StaticFileHandler = (req: IncomingMessage, res: ServerResponse, options: StaticFileOptions) => Promise<void>;
export type BundleHandler = (req: IncomingMessage, res: ServerResponse, bundlePath: string) => Promise<void>;
export type TemplateHandler = (req: IncomingMessage, res: ServerResponse, templatePath: string) => Promise<void>;
export type AnyFunction = (...args: any[]) => any;
export interface AsyncResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
export interface AsyncOptions {
    timeout?: number;
    retries?: number;
    onRetry?: (error: Error, attempt: number) => void;
}
export interface CorsOptions extends CorsOptionsBase {
}
export interface MetaTags extends MetaTagsBase {
}
export interface LoggerOptions extends LoggerOptionsBase {
}
export interface AeroSSRConfig {
    port?: number;
    cacheMaxAge?: number;
    corsOrigins?: string | CorsOptions;
    compression?: boolean;
    logFilePath?: string | null;
    bundleCache?: CacheStoreBase<string>;
    templateCache?: CacheStoreBase<string>;
    defaultMeta?: MetaTags;
}
export interface AsyncResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
export type AsyncHandler<T> = (...args: any[]) => Promise<AsyncResult<T>>;
export type { ServerResponse, IncomingMessage } from 'http';
export * from '../utils/cache';
export * from '../utils/cors';
export * from '../utils/html';
export * from '../utils/logger';
export * from '../utils/errorHandler';
export * from '../utils/etag';
export * from '../utils/bundler';
export * from '../utils/async';
export * from '../utils/cookie';
export * from '../utils/async';
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';
export type RequiredConfig = Required<AeroSSRConfig> & {
    corsOrigins: Required<CorsOptions>;
};
//# sourceMappingURL=index.d.ts.map