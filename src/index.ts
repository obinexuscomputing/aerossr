import { IncomingMessage, Server, ServerResponse } from 'http';

// Define and export base types
export interface AeroSSRConfig {
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

export interface CacheStore<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    clear(): void;
}

export interface StaticFileOptions {
    root: string;
    maxAge?: number;
    index?: string[];
    dotFiles?: 'ignore' | 'allow' | 'deny';
    compression?: boolean;
    etag?: boolean;
}

export interface LoggerOptions {
    logFilePath?: string | null;
}

export interface MetaTags {
    charset?: string;
    viewport?: string;
    description?: string;
    title?: string;
    [key: string]: string | undefined;
}

export type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse
) => Promise<void> | void;

export type Middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>
) => Promise<void>;

// Export utilities
export * from './utils/logger';
export * from './utils/cache';
export * from './utils/cors';
export * from './utils/etag';
export * from './utils/errorHandler';
export * from './utils/html';
export * from './utils/bundler';

// Export middleware
export * from './middleware';

// Export AeroSSR class
export { AeroSSR } from './AeroSSR';

// Set default export to AeroSSR class
export { AeroSSR as default } from './AeroSSR';