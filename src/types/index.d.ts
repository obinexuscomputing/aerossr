import type { IncomingMessage, ServerResponse } from 'http';

// Core Storage Interfaces
export interface CacheStore<T> {
  size: number;
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

// HTTP/Server Types
export type HTTPMethod = 
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE'
  | 'CONNECT';

// Middleware Types
export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;

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

// Configuration Interfaces
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
  [key: string]: string | undefined;
}

export interface LoggerOptions {
  logFilePath?: string | null;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  maxFileSize?: number;
  maxFiles?: number;
}

export interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
  headers?: Record<string, string>;
}

// Utility Types
export interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface AsyncOptions {
  timeout?: number;
  retries?: number;
  backoff?: 'fixed' | 'exponential';
  backoffDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

// Handler Types
export type StaticFileHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  options: StaticFileOptions
) => Promise<void>;

export type BundleHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  bundlePath: string
) => Promise<void>;

export type TemplateHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  templatePath: string
) => Promise<void>;

// Main Configuration Interface
export interface AeroSSRConfig {
  projectPath: string;
  port?: number;
  cacheMaxAge?: number;
  corsOrigins?: string | CorsOptions;
  compression?: boolean;
  logFilePath?: string | null;
  bundleCache?: CacheStore<string>;
  templateCache?: CacheStore<string>;
  defaultMeta?: MetaTags;
  loggerOptions?: LoggerOptions;
  staticFileOptions?: StaticFileOptions;
  errorHandler?: ErrorHandler;
  staticFileHandler?: StaticFileHandler;
  bundleHandler?: BundleHandler;
}

// Required Configuration Type
export type RequiredConfig = Required<AeroSSRConfig> & {
  corsOrigins: Required<CorsOptions>;
};

// Re-export Node.js types
export {
  IncomingMessage,
  ServerResponse
} from 'http';

// Export utility type for function parameters
export type AnyFunction = (...args: any[]) => any;


export * from './aerossr';
export type { default as AeroSSR } from './aerossr';
export * from './cache';
export * from './error';
// Core types
export type {
  IncomingMessage,
  ServerResponse,
  Server
} from 'http';

// Utility types
export type AnyFunction = (...args: any[]) => any;

export type HTTPMethod = 
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE'
  | 'CONNECT';