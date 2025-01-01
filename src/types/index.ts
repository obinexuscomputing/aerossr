// types/index.ts
import type { IncomingMessage, ServerResponse } from 'http';

// Core Base Interfaces
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

// Core Type Definitions
export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;

export type ErrorHandler = (
  error: Error,
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;

// File Handling Types
export interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
  cacheSize?: number;
}

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

// Main Configuration Interfaces
export interface CacheOptions {
  maxSize?: number;
  ttl?: number;
}

export interface CorsOptions extends CorsOptionsBase {}

export interface MetaTags extends MetaTagsBase {}

export interface LoggerOptions extends LoggerOptionsBase {}

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

// Utility Types
export interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export type AsyncHandler<T> = (...args: any[]) => Promise<AsyncResult<T>>;

// Type Guards
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return Boolean(
    value && 
    typeof value === 'object' && 
    'then' in value && 
    typeof value.then === 'function'
  );
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Re-export utility types
export type { ServerResponse, IncomingMessage } from 'http';
export * from '../utils/cache';
export * from '../utils/cors';
export * from '../utils/html';
export * from '../utils/logger';

// Create union type for all possible HTTP methods
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

// Create RequiredConfig type with all required fields
export type RequiredConfig = Required<AeroSSRConfig> & {
  corsOrigins: Required<CorsOptions>;
};