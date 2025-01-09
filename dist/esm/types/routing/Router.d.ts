/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { RouteStrategy } from ".";
import { RouteBuilder } from "./RouteBuilder";
import { RouteObserver, RouteMatch } from "./types";
export declare class Router {
    private routes;
    private readonly strategy;
    private readonly observers;
    constructor(strategy: RouteStrategy);
    addObserver(observer: RouteObserver): void;
    removeObserver(observer: RouteObserver): void;
    route(pattern: string, method?: string): RouteBuilder;
    get(pattern: string): RouteBuilder;
    post(pattern: string): RouteBuilder;
    put(pattern: string): RouteBuilder;
    delete(pattern: string): RouteBuilder;
    add(routeBuilder: RouteBuilder): void;
    group(prefix: string, callback: (router: Router) => void): void;
    match(path: string, method: string): RouteMatch | undefined;
    handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
    private notifyObservers;
}
//# sourceMappingURL=Router.d.ts.map