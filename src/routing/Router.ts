import { IncomingMessage, ServerResponse } from "http";
import { RouteStrategy } from ".";
import { RouteBuilder } from "./RouteBuilder";
import { Route, RouteObserver, RouteMatch, RouteContext } from "./types";

export class Router {
  private routes: Route[] = [];
  private readonly strategy: RouteStrategy;
  private readonly observers: RouteObserver[] = [];

  constructor(strategy: RouteStrategy) {
    this.strategy = strategy;
  }

  public addObserver(observer: RouteObserver): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  public removeObserver(observer: RouteObserver): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  public route(pattern: string, method: string = 'GET'): RouteBuilder {
    return new RouteBuilder(pattern, method);
  }

  public get(pattern: string): RouteBuilder {
    return this.route(pattern, 'GET');
  }

  public post(pattern: string): RouteBuilder {
    return this.route(pattern, 'POST');
  }

  public put(pattern: string): RouteBuilder {
    return this.route(pattern, 'PUT');
  }

  public delete(pattern: string): RouteBuilder {
    return this.route(pattern, 'DELETE');
  }

  public add(routeBuilder: RouteBuilder): void {
    const route = routeBuilder.build();
    this.routes.push(route);
  }

  public group(prefix: string, callback: (router: Router) => void): void {
    const subRouter = new Router(this.strategy);
    callback(subRouter);
    
    subRouter.routes.forEach(route => {
      this.routes.push({
        ...route,
        pattern: prefix + route.pattern
      });
    });
  }

  public match(path: string, method: string): RouteMatch | undefined {
    for (const route of this.routes) {
      if (route.method === method && this.strategy.matches(path, route.pattern)) {
        return {
          route,
          params: this.strategy.extractParams(path, route.pattern)
        };
      }
    }
    return undefined;
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || '/';
    const method = req.method || 'GET';
    const path = url.split('?')[0];

    // Find matching route
    const match = this.match(path, method);
    if (!match) {
      throw new Error(`No route found for ${method} ${path}`);
    }

    const { route, params } = match;
    this.notifyObservers('matched', route);

    // Create context
    const query = this.strategy.extractQuery(url);
    const context: RouteContext = {
      req,
      res,
      params,
      query,
      state: {},
      next: async () => {} // Will be replaced
    };

    const startTime = Date.now();

    try {
      // Setup middleware chain
      const chain = [...route.middleware];
      let chainIndex = 0;

      const executeChain = async (): Promise<void> => {
        if (chainIndex < chain.length) {
          const middleware = chain[chainIndex++];
          await middleware(context.req, context.res, context.next);
          await executeChain();
        } else {
          await route.handler(context);
        }
      };

      // Replace context.next with chain executor
      context.next = executeChain;
      
      // Start execution
      await executeChain();

      // Record duration and notify
      const duration = Date.now() - startTime;
      this.notifyObservers('executed', route, duration);
    } catch (error) {
      // Handle and propagate errors
      const routeError = error instanceof Error ? error : new Error(String(error));
      this.notifyObservers('error', route, routeError);
      throw routeError;
    }
  }

  private notifyObservers(event: 'matched' | 'executed' | 'error', route: Route, data?: number | Error): void {
    this.observers.forEach(observer => {
      try {
        switch (event) {
          case 'matched':
            observer.onRouteMatched(route);
            break;
          case 'executed':
            if (typeof data === 'number') {
              observer.onRouteExecuted(route, data);
            }
            break;
          case 'error':
            if (data instanceof Error) {
              observer.onRouteError(route, data);
            }
            break;
        }
      } catch (error) {
        console.error('Observer notification failed:', error);
      }
    });
  }
}