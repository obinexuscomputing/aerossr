'use strict';

var AeroSSR = require('./AeroSSR.js');
var StaticFileMiddleware = require('./middlewares/StaticFileMiddleware.js');
var cache = require('./utils/cache.js');
var cors = require('./utils/cors.js');
var html = require('./utils/html.js');
var logger = require('./utils/logger.js');
var errorHandler = require('./utils/errorHandler.js');
var etag = require('./utils/etag.js');
var bundler = require('./utils/bundler.js');
var async = require('./utils/async.js');
var cookie = require('./utils/cookie.js');
var SecurityMiddleware = require('./middlewares/SecurityMiddleware.js');



exports.AeroSSR = AeroSSR.AeroSSR;
exports.StaticFileMiddleware = StaticFileMiddleware.StaticFileMiddleware;
exports.createCache = cache.createCache;
exports.normalizeCorsOptions = cors.normalizeCorsOptions;
exports.setCorsHeaders = cors.setCorsHeaders;
exports.injectMetaTags = html.injectMetaTags;
exports.Logger = logger.Logger;
exports.generateErrorPage = errorHandler.generateErrorPage;
exports.handleError = errorHandler.handleError;
exports.generateETag = etag.generateETag;
exports.generateBundle = bundler.generateBundle;
exports.minifyBundle = bundler.minifyBundle;
exports.resolveDependencies = bundler.resolveDependencies;
exports.ensureAsync = async.ensureAsync;
exports.isPromise = async.isPromise;
exports.areCookiesEnabled = cookie.areCookiesEnabled;
exports.deleteCookie = cookie.deleteCookie;
exports.getAllCookies = cookie.getAllCookies;
exports.getCookie = cookie.getCookie;
exports.setCookie = cookie.setCookie;
exports.SecurityMiddleware = SecurityMiddleware.SecurityMiddleware;
//# sourceMappingURL=index.js.map
