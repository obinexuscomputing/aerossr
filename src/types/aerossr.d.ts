import { Server, IncomingMessage, ServerResponse } from 'http';
import { Logger } from '@/utils/logging';
import type { CacheStoreBase } from './cache';
import type { CorsOptions } from './cors';
import type { ErrorHandler } from './error';
import type { StaticFileOptions } from './static';

// Base Interfaces
export interface CacheStore<T> {
  size: number;
  get(key: string): T | undefined;
  set(key: string, value: T, options?: CacheOptions): void;
  clear(): void;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

export interface CorsOptions {
  origins?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface MetaTags {
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

export interface LoggerOptions {
  logFilePath?: string | null;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  maxFileSize?: number;
  maxFiles?: number;
}

// Response Types
export interface ResponseMetadata {
  statusCode: number;
  headers?: Record<string, string>;
  description?: string;
  contentType?: string;
  schema?: unknown;
}

export interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
  headers?: Record<string, string>;
  port?: number;
}

// Core AeroSSR Types
export interface AeroSSRConfig {
  logFilePath?: string;
  logger: Logger;
  bundleCache?: CacheStoreBase<string>;
  templateCache?: CacheStoreBase<string>;
  cacheMaxAge?: number;
  logFilePath: string | null;
  logger?: Logger;
  bundleCache?: CacheStore<string>;
  staticFileHandler?: typeof StaticFileHandler;
  defaultMeta?: MetaTags;
  loggerOptions?: LoggerOptions;
  staticFileOptions?: StaticFileOptions;
  errorHandler?: ErrorHandler;
  staticFileHandler?: StaticFileHandler;
  bundleHandler?: BundleHandler;
}

// Middleware Types
export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;

export interface MiddlewareOptions {
  name: string;
  path: string;
  options?: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
}

// Handler Types
export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;

export type ErrorHandler = (
  error: Error,
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;

export type StaticFileHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  options: StaticFileOptions
) => Promise<void>;

export type BundleHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  query: Record<string, string | string[] | undefined>
) => Promise<void>;

// Logger Interface
export interface Logger {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
  logRequest(req: IncomingMessage): void;
  clear(): Promise<void>;
}

// AeroSSR Class Definition
export declare class AeroSSR {
  public readonly config: Required<AeroSSRConfig>;
  public readonly logger: Logger;
  public server: Server | null;
  public readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];

  constructor(config?: AeroSSRConfig);

  public use(middleware: Middleware, options?: MiddlewareOptions): void;
  public route(path: string, handler: RouteHandler): void;
  public clearCache(): void;
  public start(): Promise<Server>;
  public stop(): Promise<void>;
  public listen(port: number): void;

  private executeMiddlewares(
    req: IncomingMessage,
    res: ServerResponse,
    index?: number
  ): Promise<void>;

  private handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void>;

  private handleDistRequest(
    req: IncomingMessage,
    res: ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): Promise<void>;

  private handleDefaultRequest(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string
  ): Promise<void>;
}

// Required Configuration Type
export type RequiredConfig = Required<AeroSSRConfig> & {
  corsOrigins: Required<CorsOptions>;
};

// Export default
export default AeroSSR;