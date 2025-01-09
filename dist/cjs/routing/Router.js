/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var RouteBuilder = require('./RouteBuilder.js');

class Router {
    routes = [];
    strategy;
    observers = [];
    constructor(strategy) {
        this.strategy = strategy;
    }
    addObserver(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }
    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1);
        }
    }
    route(pattern, method = 'GET') {
        return new RouteBuilder.RouteBuilder(pattern, method);
    }
    get(pattern) {
        return this.route(pattern, 'GET');
    }
    post(pattern) {
        return this.route(pattern, 'POST');
    }
    put(pattern) {
        return this.route(pattern, 'PUT');
    }
    delete(pattern) {
        return this.route(pattern, 'DELETE');
    }
    add(routeBuilder) {
        const route = routeBuilder.build();
        this.routes.push(route);
    }
    group(prefix, callback) {
        const subRouter = new Router(this.strategy);
        callback(subRouter);
        subRouter.routes.forEach(route => {
            this.routes.push({
                ...route,
                pattern: prefix + route.pattern
            });
        });
    }
    match(path, method) {
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
    async handle(req, res) {
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
        const context = {
            req,
            res,
            params,
            query,
            state: {},
            next: async () => { } // Will be replaced
        };
        const startTime = Date.now();
        try {
            // Setup middleware chain
            const chain = [...route.middleware];
            let chainIndex = 0;
            const executeChain = async () => {
                if (chainIndex < chain.length) {
                    const middleware = chain[chainIndex++];
                    await middleware(context.req, context.res, context.next);
                    await executeChain();
                }
                else {
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
        }
        catch (error) {
            // Handle and propagate errors
            const routeError = error instanceof Error ? error : new Error(String(error));
            this.notifyObservers('error', route, routeError);
            throw routeError;
        }
    }
    notifyObservers(event, route, data) {
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
            }
            catch (error) {
                console.error('Observer notification failed:', error);
            }
        });
    }
}

exports.Router = Router;
//# sourceMappingURL=Router.js.map
