import { Server, IncomingMessage, ServerResponse } from 'http';
import { CorsOptions, CacheStore, MetaTags } from './types';

export interface AeroSSRConfig {
  port?: number;
  compression?: boolean;
  corsOrigins?: { origins: string };
  cacheMaxAge?: number;
  logFilePath?: string | null;
  logger?: Logger;
}

export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;

export interface MiddlewareOptions {
  name: string;
  path: string;
  options?: string;
}

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;


export declare class AeroSSR {
  public readonly config: Required<AeroSSRConfig>;
  public readonly logger: Logger;
  public server: Server | null;
  public readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];

  constructor(config?: AeroSSRConfig);

  public use(middleware: Middleware): void;
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
export type BundleHandler = (req: IncomingMessage, res: ServerResponse, query: Record<string, string | string[] | undefined>) => Promise<void>;

export default AeroSSR;