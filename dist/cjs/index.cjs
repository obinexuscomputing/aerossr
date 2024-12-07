'use strict';

var StaticFileMiddleware = require('./middleware/StaticFileMiddleware.cjs');
var logger = require('./utils/logger.cjs');
var cache = require('./utils/cache.cjs');
var cors = require('./utils/cors.cjs');
var errorHandler = require('./utils/errorHandler.cjs');
var etag = require('./utils/etag.cjs');
var html = require('./utils/html.cjs');
var bundler = require('./utils/bundler.cjs');



exports.StaticFileMiddleware = StaticFileMiddleware.StaticFileMiddleware;
exports.Logger = logger.Logger;
exports.createCache = cache.createCache;
exports.setCorsHeaders = cors.setCorsHeaders;
exports.generateErrorPage = errorHandler.generateErrorPage;
exports.handleError = errorHandler.handleError;
exports.generateETag = etag.generateETag;
exports.injectMetaTags = html.injectMetaTags;
exports.generateBundle = bundler.generateBundle;
exports.minifyBundle = bundler.minifyBundle;
exports.resolveDependencies = bundler.resolveDependencies;
//# sourceMappingURL=index.cjs.map
