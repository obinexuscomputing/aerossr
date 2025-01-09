import { IncomingMessage, ServerResponse } from "http";
import { Route, RouteStrategy, RouteObserver, RouteMatch, RouteContext } from "./types";
import { DefaultRouteStrategy } from "./builders/DefaultRouteBuilder";
import { RouteBuilder } from "./builders/RouteBuilder";

export class Router {
    private routes: Route[] = [];
    private strategy: RouteStrategy;
    private observers: RouteObserver[] = [];
  
    constructor(strategy: RouteStrategy = new DefaultRouteStrategy()) {
      this.strategy = strategy;
    }
  
    addObserver(observer: RouteObserver): void {
      this.observers.push(observer);
    }
  
    removeObserver(observer: RouteObserver): void {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    }
  
    route(pattern: string, method: string = 'GET'): RouteBuilder {
      return new RouteBuilder(pattern, method);
    }
  
    get(pattern: string): RouteBuilder {
      return this.route(pattern, 'GET');
    }
  
    post(pattern: string): RouteBuilder {
      return this.route(pattern, 'POST');
    }
  
    put(pattern: string): RouteBuilder {
      return this.route(pattern, 'PUT');
    }
  
    delete(pattern: string): RouteBuilder {
      return this.route(pattern, 'DELETE');
    }
  
    add(route: Route): void {
      this.routes.push(route);
    }
  
    group(prefix: string, callback: (router: Router) => void): void {
      const subRouter = new Router(this.strategy);
      callback(subRouter);
      
      // Add sub-routes with prefix
      subRouter.routes.forEach(route => {
        this.add({
          ...route,
          pattern: prefix + route.pattern
        });
      });
    }
  
    match(path: string, method: string): RouteMatch | undefined {
      const route = this.routes.find(route => {
        return route.method === method && this.strategy.matches(path, route.pattern);
      });
      if (route) {
        return {
          route,
          params: this.strategy.extractParams(path, route.pattern)
        };
      }
      return undefined;
    }
  
    async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const url = req.url || '/';
      const method = req.method || 'GET';
      const path = url.split('?')[0];
  
      const match = this.match(path, method);
      if (!match) {
        throw new Error(`No route found for ${method} ${path}`);
      }
  
      const { route, params } = match;
      this.notifyObservers('matched', route);
  
      const startTime = Date.now();
      const query = this.strategy.extractQuery(url);
  
      const context: RouteContext = {
        req,
        res,
        params,
        query,
        next: async () => {} // Will be replaced in middleware chain
      };
  
      try {
        // Execute middleware chain
        const middlewares = [...route.middleware];
        let index = 0;
  
        const next = async (): Promise<void> => {
          if (index < middlewares.length) {
            const middleware = middlewares[index++];
            await middleware(context, next);
          } else {
            await route.handler(context);
          }
        };
  
        context.next = next;
        await next();
  
        const duration = Date.now() - startTime;
        this.notifyObservers('executed', route, duration);
      } catch (error) {
        this.notifyObservers('error', route, error);
        throw error;
      }
    }
  
    private notifyObservers(event: 'matched' | 'executed' | 'error', route: Route, data?: any): void {
      this.observers.forEach(observer => {
        switch (event) {
          case 'matched':
            observer.onRouteMatched(route);
            break;
          case 'executed':
            observer.onRouteExecuted(route, data);
            break;
          case 'error':
            observer.onRouteError(route, data);
            break;
        }
      });
    }
  }