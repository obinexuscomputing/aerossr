import { IncomingMessage, ServerResponse } from 'http';

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

 interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

 interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
  cacheSize?: number;
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

 interface LoggerOptions {
  logFilePath?: string | null;
}

 interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

 interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
  cacheSize?: number;
}

 interface ErrorResponse extends Error {
  statusCode?: number;
}
