import { RouteStrategy } from "..";
export declare class DefaultRouteStrategy implements RouteStrategy {
    matches(path: string, pattern: string): boolean;
    extractParams(path: string, pattern: string): Record<string, string>;
    extractQuery(url: string): Record<string, string>;
}
//# sourceMappingURL=DefaultRouteBuilder.d.ts.map