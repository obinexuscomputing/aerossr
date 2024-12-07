import { AeroSSR as AeroSSRBase } from './AeroSSR';
import { StaticFileMiddleware } from './middleware/StaticFileMiddleware';
import { Logger } from './utils/logger';
import { createCache } from './utils/cache';
import { setCorsHeaders } from './utils/cors';
import { generateETag } from './utils/etag';
import { generateErrorPage, handleError } from './utils/errorHandler';
import { injectMetaTags } from './utils/html';
import { generateBundle } from './utils/bundler';
export type { AeroSSRConfig, CacheStore, StaticFileOptions, RouteHandler, Middleware, LoggerOptions, ErrorResponse, MetaTags } from './types/index';
export declare const AeroSSR: {
    readonly Core: typeof AeroSSRBase;
    readonly Middleware: {
        readonly StaticFile: typeof StaticFileMiddleware;
    };
    readonly Utils: {
        readonly Logger: typeof Logger;
        readonly Cache: {
            readonly create: typeof createCache;
        };
        readonly HTTP: {
            readonly setCorsHeaders: typeof setCorsHeaders;
            readonly generateETag: typeof generateETag;
        };
        readonly Error: {
            readonly generatePage: typeof generateErrorPage;
            readonly handle: typeof handleError;
        };
        readonly HTML: {
            readonly injectMetaTags: typeof injectMetaTags;
        };
        readonly Bundle: {
            readonly generate: typeof generateBundle;
        };
    };
};
export { StaticFileMiddleware, Logger, createCache, setCorsHeaders, generateETag, generateErrorPage, handleError, injectMetaTags, generateBundle };
export default AeroSSRBase;
export * from './middleware/index';
export * from './utils/index';
//# sourceMappingURL=index.d.ts.map