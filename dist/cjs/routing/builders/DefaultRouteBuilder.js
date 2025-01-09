/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class DefaultRouteStrategy {
    matches(path, pattern) {
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
    extractParams(path, pattern) {
        const params = {};
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
    extractQuery(url) {
        const queryParams = {};
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

exports.DefaultRouteStrategy = DefaultRouteStrategy;
//# sourceMappingURL=DefaultRouteBuilder.js.map
