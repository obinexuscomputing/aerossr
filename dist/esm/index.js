import { AeroSSR as AeroSSR$1 } from './AeroSSR.js';
import { StaticFileMiddleware } from './middleware/StaticFileMiddleware.js';
import { Logger } from './utils/logger.js';
import { createCache } from './utils/cache.js';
import { setCorsHeaders } from './utils/cors.js';
import { generateETag } from './utils/etag.js';
import { generateErrorPage, handleError } from './utils/errorHandler.js';
import { injectMetaTags } from './utils/html.js';
import { generateBundle } from './utils/bundler.js';
export { minifyBundle, resolveDependencies } from './utils/bundler.js';

// Create the base namespace with its implementations
const AeroSSR = {
    Core: AeroSSR$1,
    Middleware: {
        StaticFile: StaticFileMiddleware
    },
    Utils: {
        Logger,
        Cache: {
            create: createCache
        },
        HTTP: {
            setCorsHeaders,
            generateETag
        },
        Error: {
            generatePage: generateErrorPage,
            handle: handleError
        },
        HTML: {
            injectMetaTags
        },
        Bundle: {
            generate: generateBundle
        }
    }
};

export { AeroSSR, Logger, StaticFileMiddleware, createCache, AeroSSR$1 as default, generateBundle, generateETag, generateErrorPage, handleError, injectMetaTags, setCorsHeaders };
//# sourceMappingURL=index.js.map
