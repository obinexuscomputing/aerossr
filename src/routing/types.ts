import { IncomingMessage, ServerResponse } from 'http';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string>;
  next: () => Promise<void>;
}

export type RouteHandler = (context: RouteContext) => Promise<void>;
export type Middleware = (context: RouteContext, next: () => Promise<void>) => Promise<void>;

export interface RouteStrategy {
  matches(path: string, pattern: string): boolean;
  extractParams(path: string, pattern: string): Record<string, string>;
  extractQuery(url: string): Record<string, string>;
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
  responses?: Record<string, ResponseMetadata>;
}

export interface ParameterMetadata {
  type: string;
  required?: boolean;
  description?: string;
}

export interface ResponseMetadata {
  type: string;
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
