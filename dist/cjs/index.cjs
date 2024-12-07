'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var AeroSSR$1 = require('./AeroSSR.cjs');
var StaticFileMiddleware = require('./middleware/StaticFileMiddleware.cjs');
var logger = require('./utils/logger.cjs');
var cache = require('./utils/cache.cjs');
var cors = require('./utils/cors.cjs');
var etag = require('./utils/etag.cjs');
var errorHandler = require('./utils/errorHandler.cjs');
var html = require('./utils/html.cjs');
var bundler = require('./utils/bundler.cjs');

// Create the base namespace with its implementations
const AeroSSR = {
    Core: AeroSSR$1.AeroSSR,
    Middleware: {
        StaticFile: StaticFileMiddleware.StaticFileMiddleware
    },
    Utils: {
        Logger: logger.Logger,
        Cache: {
            create: cache.createCache
        },
        HTTP: {
            setCorsHeaders: cors.setCorsHeaders,
            generateETag: etag.generateETag
        },
        Error: {
            generatePage: errorHandler.generateErrorPage,
            handle: errorHandler.handleError
        },
        HTML: {
            injectMetaTags: html.injectMetaTags
        },
        Bundle: {
            generate: bundler.generateBundle
        }
    }
};

exports.default = AeroSSR$1.AeroSSR;
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
exports.AeroSSR = AeroSSR;
//# sourceMappingURL=index.cjs.map
