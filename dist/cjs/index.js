'use strict';

var StaticFileMiddleware = require('./middleware/StaticFileMiddleware.js');
var logger = require('./utils/logger.js');
var cache = require('./utils/cache.js');
var cors = require('./utils/cors.js');
var errorHandler = require('./utils/errorHandler.js');
var etag = require('./utils/etag.js');
var html = require('./utils/html.js');
var bundler = require('./utils/bundler.js');



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
//# sourceMappingURL=index.js.map
