'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var logger = require('./utils/logger.cjs');
var cache = require('./utils/cache.cjs');
var cors = require('./utils/cors.cjs');
var etag = require('./utils/etag.cjs');
var errorHandler = require('./utils/errorHandler.cjs');
var html = require('./utils/html.cjs');
var bundler = require('./utils/bundler.cjs');
var StaticFileMiddleware = require('./middleware/StaticFileMiddleware.cjs');
var AeroSSR = require('./AeroSSR.cjs');



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
exports.StaticFileMiddleware = StaticFileMiddleware.StaticFileMiddleware;
exports.AeroSSR = AeroSSR.AeroSSR;
exports.default = AeroSSR.AeroSSR;
//# sourceMappingURL=index.cjs.map
