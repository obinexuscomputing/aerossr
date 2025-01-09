// src/routing/types.ts
import { IncomingMessage, ServerResponse } from 'http';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  next: () => Promise<void>;
  state: Record<string, unknown>;
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
  schema?: unknown;
}

export interface ResponseMetadata {
  statusCode: number;
  description?: string;
  contentType?: string;
  schema?: unknown;
  headers?: Record<string, string>;
}

export interface Route {
  pattern: string;
  method: string;
  handler: RouteHandler;
  middleware: Middleware[];
  metadata?: RouteMetadata;
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

export interface RouteStrategy {
  matches(path: string, pattern: string): boolean;
  extractParams(path: string, pattern: string): Record<string, string>;
  extractQuery(url: string): Record<string, string | string[]>;
}

export type RouteHandler = (context: RouteContext) => Promise<void>;
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>, ...args: any[]) => Promise<void>;
