/// <reference types="node" />
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