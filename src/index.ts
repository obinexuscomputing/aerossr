import { IncomingMessage, Server, ServerResponse } from 'http';

// Import and re-export all types
export * from './types';
// Export the AeroSSR class implementation
export * from './AeroSSR';
// Export utilities
export * from './utils';

// Export middleware
export * from './middleware';

// Import and re-export types
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

// Export main AeroSSR class
export { AeroSSR } from './AeroSSR';

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

// Export default

// Default export should be the AeroSSR class itself, not AeroSSR.Core
export { AeroSSR as default } from './AeroSSR';