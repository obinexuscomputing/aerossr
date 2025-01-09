import { RouteStrategy } from "..";

export class DefaultRouteStrategy implements RouteStrategy {
  matches(path: string, pattern: string): boolean {
    const pathParts = path.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    return patternParts.every((part, i) => {
      if (part.startsWith(':')) {
        return true; // Parameter matches anything
      }
      return part === pathParts[i];
    });
  }

  extractParams(path: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};
    const pathParts = path.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);

    patternParts.forEach((part, i) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1).replace('?', ''); // Remove : and optional ?
        params[paramName] = pathParts[i];
      }
    });

    return params;
  }

  extractQuery(url: string): Record<string, string> {
    const queryParams: Record<string, string> = {};
    const queryIndex = url.indexOf('?');
    
    if (queryIndex === -1) {
      return queryParams;
    }

    const queryString = url.slice(queryIndex + 1);
    const searchParams = new URLSearchParams(queryString);
    
    for (const [key, value] of searchParams.entries()) {
      queryParams[key] = value;
    }

    return queryParams;
  }
}