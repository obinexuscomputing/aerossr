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

var AeroSSR;
(function (AeroSSR) {
    class Core extends AeroSSR$1 {
    }
    AeroSSR.Core = Core;
    (function (Middleware) {
        class StaticFile extends StaticFileMiddleware {
        }
        Middleware.StaticFile = StaticFile;
    })(AeroSSR.Middleware || (AeroSSR.Middleware = {}));
    (function (Utils) {
        class LoggerUtil extends Logger {
        }
        Utils.LoggerUtil = LoggerUtil;
        Utils.Cache = {
            create: createCache
        };
        Utils.HTTP = {
            setCorsHeaders,
            generateETag
        };
        Utils.Error = {
            generatePage: generateErrorPage,
            handle: handleError
        };
        Utils.HTML = {
            injectMetaTags
        };
        Utils.Bundle = {
            generate: generateBundle
        };
    })(AeroSSR.Utils || (AeroSSR.Utils = {}));
})(AeroSSR || (AeroSSR = {}));

export { AeroSSR, AeroSSR$1 as AeroSSRBase, Logger, StaticFileMiddleware, createCache, AeroSSR$1 as default, generateBundle, generateETag, generateErrorPage, handleError, injectMetaTags, setCorsHeaders };
//# sourceMappingURL=index.js.map
