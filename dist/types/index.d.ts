import { IncomingMessage, ServerResponse, Server } from 'http';

interface AeroSSRConfig {
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

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void> | void;


type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;

interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

declare class AeroSSR {
    private readonly config;
    private readonly logger;
    private server;
    private readonly routes;
    private readonly middlewares;
    constructor(config?: AeroSSRConfig);
    use(middleware: Middleware): void;
    route(path: string, handler: RouteHandler): void;
    clearCache(): void;
    private executeMiddlewares;
    private handleRequest;
    private handleDistRequest;
    private handleDefaultRequest;
    start(): Promise<Server>;
    stop(): Promise<void>;
}

export { AeroSSR as default };
