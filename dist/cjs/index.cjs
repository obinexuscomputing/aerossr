'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var AeroSSR = require('./AeroSSR.cjs');
var StaticFileMiddleware = require('./middleware/StaticFileMiddleware.cjs');
var logger = require('./utils/logger.cjs');
var cache = require('./utils/cache.cjs');
var cors = require('./utils/cors.cjs');
var etag = require('./utils/etag.cjs');
var errorHandler = require('./utils/errorHandler.cjs');
var html = require('./utils/html.cjs');
var bundler = require('./utils/bundler.cjs');

exports.AeroSSR = void 0;
(function (AeroSSR$1) {
    class Core extends AeroSSR.AeroSSR {
    }
    AeroSSR$1.Core = Core;
    (function (Middleware) {
        class StaticFile extends StaticFileMiddleware.StaticFileMiddleware {
        }
        Middleware.StaticFile = StaticFile;
    })(AeroSSR$1.Middleware || (AeroSSR$1.Middleware = {}));
    (function (Utils) {
        class LoggerUtil extends logger.Logger {
        }
        Utils.LoggerUtil = LoggerUtil;
        Utils.Cache = {
            create: cache.createCache
        };
        Utils.HTTP = {
            setCorsHeaders: cors.setCorsHeaders,
            generateETag: etag.generateETag
        };
        Utils.Error = {
            generatePage: errorHandler.generateErrorPage,
            handle: errorHandler.handleError
        };
        Utils.HTML = {
            injectMetaTags: html.injectMetaTags
        };
        Utils.Bundle = {
            generate: bundler.generateBundle
        };
    })(AeroSSR$1.Utils || (AeroSSR$1.Utils = {}));
})(exports.AeroSSR || (exports.AeroSSR = {}));

exports.AeroSSRBase = AeroSSR.AeroSSR;
exports.default = AeroSSR.AeroSSR;
exports.StaticFileMiddleware = StaticFileMiddleware.StaticFileMiddleware;
exports.Logger = logger.Logger;
exports.createCache = cache.createCache;
exports.setCorsHeaders = cors.setCorsHeaders;
exports.generateETag = etag.generateETag;
exports.generateErrorPage = errorHandler.generateErrorPage;
exports.handleError = errorHandler.handleError;
exports.injectMetaTags = html.injectMetaTags;
exports.generateBundle = bundler.generateBundle;
exports.minifyBundle = bundler.minifyBundle;
exports.resolveDependencies = bundler.resolveDependencies;
//# sourceMappingURL=index.cjs.map
