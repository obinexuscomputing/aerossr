import { Middleware } from "../types";
import { RouteHandler } from "../types";
import { RouteMetadata, Route } from "../types";

export class RouteBuilder {
    private _pattern: string;
    private _method: string;
    private _handler?: RouteHandler;
    private _middleware: Middleware[] = [];
    private _metadata?: RouteMetadata;
  
    constructor(pattern: string, method: string) {
      this._pattern = pattern;
      this._method = method;
    }
  
    handler(handler: RouteHandler): this {
      this._handler = handler;
      return this;
    }
  
    middleware(...middleware: Middleware[]): this {
      this._middleware.push(...middleware);
      return this;
    }
  
    metadata(metadata: RouteMetadata): this {
      this._metadata = metadata;
      return this;
    }
  
    build(): Route {
      if (!this._handler) {
        throw new Error('Route handler is required');
      }
  
      return {
        pattern: this._pattern,
        method: this._method,
        handler: this._handler,
        middleware: this._middleware,
        metadata: this._metadata
      };
    }
  }
  