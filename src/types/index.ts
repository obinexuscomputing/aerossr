import type { IncomingMessage, ServerResponse } from 'http';

// Core interfaces
export interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
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
  [key: string]: string | undefined;
}

export interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
  cacheSize?: number;
}

export interface LoggerOptions {
  logFilePath?: string | null;
}

// Main config interface
export interface AeroSSRConfig {
  port?: number;
  cacheMaxAge?: number;
  corsOrigins?: string | CorsOptions;
  compression?: boolean;
  logFilePath?: string | null;
  bundleCache?: CacheStore<string>;
  templateCache?: CacheStore<string>;
  defaultMeta?: MetaTags;
}

// Request handler types
export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
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

export type StaticFileHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  options: StaticFileOptions
) => Promise<void>;

export type ErrorHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  error: Error
) => Promise<void>;

// Utility type to ensure all required fields are present
export type RequiredAeroSSRConfig = Required<
  Omit<AeroSSRConfig, 'corsOrigins'> & {
    corsOrigins: CorsOptions;
  }
>;
