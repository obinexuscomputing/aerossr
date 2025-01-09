/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class RouteBuilder {
    pattern;
    method;
    middlewares = [];
    routeHandler;
    routeMetadata;
    constructor(pattern, method) {
        this.pattern = pattern;
        this.method = method.toUpperCase();
    }
    handler(fn) {
        this.routeHandler = fn;
        return this;
    }
    use(...middleware) {
        this.middlewares.push(...middleware);
        return this;
    }
    metadata(meta) {
        this.routeMetadata = meta;
        return this;
    }
    build() {
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

exports.RouteBuilder = RouteBuilder;
//# sourceMappingURL=RouteBuilder.js.map
