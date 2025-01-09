import { Middleware, RouteHandler, RouteMetadata, Route } from "./types";
export declare class RouteBuilder {
    private readonly pattern;
    private readonly method;
    private middlewares;
    private routeHandler?;
    private routeMetadata?;
    constructor(pattern: string, method: string);
    handler(fn: RouteHandler): this;
    use(...middleware: Middleware[]): this;
    metadata(meta: RouteMetadata): this;
    build(): Route;
}
//# sourceMappingURL=RouteBuilder.d.ts.map