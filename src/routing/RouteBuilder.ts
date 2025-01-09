// src/routing/types.ts
import { IncomingMessage, ServerResponse } from 'http';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  state: Record<string, unknown>;
  next: () => Promise<void>;
}

export type RouteHandler = (context: RouteContext) => Promise<void>;
export type Middleware = (context: RouteContext) => Promise<void>;

export interface RouteStrategy {
  matches(path: string, pattern: string): boolean;
  extractParams(path: string, pattern: string): Record<string, string>;
  extractQuery(url: string): Record<string, string | string[]>;
}

export interface Route {
  pattern: string;
  method: string;
  handler: RouteHandler;
  middleware: Middleware[];
  metadata?: RouteMetadata;
}

export interface RouteMetadata {
  description?: string;
  tags?: string[];
  parameters?: Record<string, ParameterMetadata>;
}

export interface ParameterMetadata {
  type: string;
  required?: boolean;
  description?: string;
}

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

export interface RouteObserver {
  onRouteMatched(route: Route): void;
  onRouteExecuted(route: Route, duration: number): void;
  onRouteError(route: Route, error: Error): void;
}

// src/routing/RouteBuilder.ts
export class RouteBuilder {
  private readonly pattern: string;
  private readonly method: string;
  private middlewares: Middleware[] = [];
  private routeHandler?: RouteHandler;
  private routeMetadata?: RouteMetadata;

  constructor(pattern: string, method: string) {
    this.pattern = pattern;
    this.method = method.toUpperCase();
  }

  public handler(fn: RouteHandler): this {
    this.routeHandler = fn;
    return this;
  }

  public use(...middleware: Middleware[]): this {
    this.middlewares.push(...middleware);
    return this;
  }

  public metadata(meta: RouteMetadata): this {
    this.routeMetadata = meta;
    return this;
  }

  public build(): Route {
    if (!this.routeHandler) {
      throw new Error('Route handler is required');
    }

    return {
      pattern: this.pattern,
      method: this.method,
      handler: this.routeHandler,
      middleware: this.middlewares,
      metadata: this.routeMetadata
    };
  }
}