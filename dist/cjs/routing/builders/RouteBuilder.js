/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class RouteBuilder {
    _pattern;
    _method;
    _handler;
    _middleware = [];
    _metadata;
    constructor(pattern, method) {
        this._pattern = pattern;
        this._method = method;
    }
    handler(handler) {
        this._handler = handler;
        return this;
    }
    middleware(...middleware) {
        this._middleware.push(...middleware);
        return this;
    }
    metadata(metadata) {
        this._metadata = metadata;
        return this;
    }
    build() {
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

exports.RouteBuilder = RouteBuilder;
//# sourceMappingURL=RouteBuilder.js.map
