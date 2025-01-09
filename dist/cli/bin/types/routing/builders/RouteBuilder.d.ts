import { Middleware } from "../types";
import { RouteHandler } from "../types";
import { RouteMetadata, Route } from "../types";
export declare class RouteBuilder {
    private _pattern;
    private _method;
    private _handler?;
    private _middleware;
    private _metadata?;
    constructor(pattern: string, method: string);
    handler(handler: RouteHandler): this;
    middleware(...middleware: Middleware[]): this;
    metadata(metadata: RouteMetadata): this;
    build(): Route;
}
//# sourceMappingURL=RouteBuilder.d.ts.map