import { Middleware, RouteHandler, RouteMetadata, Route } from "./types";


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