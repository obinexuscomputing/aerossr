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
export declare namespace AeroSSR {
    class Core extends AeroSSRBase {
    }
    namespace Middleware {
        class StaticFile extends StaticFileMiddleware {
        }
    }
    namespace Utils {
        class LoggerUtil extends Logger {
        }
        const Cache: {
            create: typeof createCache;
        };
        const HTTP: {
            setCorsHeaders: typeof setCorsHeaders;
            generateETag: typeof generateETag;
        };
        const Error: {
            generatePage: typeof generateErrorPage;
            handle: typeof handleError;
        };
        const HTML: {
            injectMetaTags: typeof injectMetaTags;
        };
        const Bundle: {
            generate: typeof generateBundle;
        };
    }
}
export { AeroSSRBase, StaticFileMiddleware, Logger, createCache, setCorsHeaders, generateETag, generateErrorPage, handleError, injectMetaTags, generateBundle };
export default AeroSSRBase;
export * from './middleware/index';
export * from './utils/index';
//# sourceMappingURL=index.d.ts.map