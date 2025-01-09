import { Server, IncomingMessage, ServerResponse } from 'http';
import { Logger } from '@/utils/logging';
import { CacheStoreBase } from './cache';
import { CorsOptions } from './cors';
import { ErrorHandler } from './error';
import { StaticFileOptions } from './static';

export interface AeroSSRConfig {
  // Required properties
  projectPath: string;
  publicPath: string;
  logger: Logger;

  // Optional properties with defaults
  port?: number;
  compression?: boolean;
  cacheMaxAge?: number;
  logFilePath?: string;
  loggerOptions?: object;
  corsOrigins?: string | CorsOptions;
  bundleCache?: CacheStoreBase<string>;
  templateCache?: CacheStoreBase<string>;
  
  // Optional handlers and middleware
  errorHandler?: ErrorHandler;
  staticFileOptions?: StaticFileOptions;
  bundleHandler?: BundleHandler;
  staticFileHandler?: StaticFileHandler;
  
  // Optional metadata
  defaultMeta?: {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
    [key: string]: string | undefined;
  };
}

// Handler Types
export type RouteHandler = (
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

// Middleware Types
export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;

export interface MiddlewareConfig {
  name: string;
  path: string;
  options?: Record<string, unknown>;
}

export declare class AeroSSR {
  public readonly config: Required<AeroSSRConfig>;
  public readonly logger: Logger;
  public server: Server | null;
  public readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];

  constructor(config: AeroSSRConfig);

  public use(middleware: Middleware): void;
  public route(path: string, handler: RouteHandler): void;
  public clearCache(): void;
  public start(): Promise<Server>;
  public stop(): Promise<void>;
  public listen(port: number): void;
}

export interface AeroSSRInstance {
  server: Server;
  logger: Logger;
  config: Required<AeroSSRConfig>;
}

