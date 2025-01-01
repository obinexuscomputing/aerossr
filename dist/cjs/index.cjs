'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const logger = require('./utils/logger.cjs');
const cache = require('./utils/cache.cjs');
const cors = require('./utils/cors.cjs');
const etag = require('./utils/etag.cjs');
const errorHandler = require('./utils/errorHandler.cjs');
const html = require('./utils/html.cjs');
const bundler = require('./utils/bundler.cjs');
const cookie = require('./utils/cookie.cjs');
const AeroSSR = require('./AeroSSR.cjs');
const StaticFileMiddleware = require('./middlewares/StaticFileMiddleware.cjs');
const SecurityMiddleware = require('./middlewares/SecurityMiddleware.cjs');



exports.Logger = logger.Logger;
exports.createCache = cache.createCache;
exports.ensureAsync = cors.ensureAsync;
exports.isPromise = cors.isPromise;
exports.normalizeCorsOptions = cors.normalizeCorsOptions;
exports.setCorsHeaders = cors.setCorsHeaders;
exports.generateETag = etag.generateETag;
exports.generateErrorPage = errorHandler.generateErrorPage;
exports.handleError = errorHandler.handleError;
exports.injectMetaTags = html.injectMetaTags;
exports.generateBundle = bundler.generateBundle;
exports.minifyBundle = bundler.minifyBundle;
exports.resolveDependencies = bundler.resolveDependencies;
exports.deleteCookie = cookie.deleteCookie;
exports.getCookie = cookie.getCookie;
exports.setCookie = cookie.setCookie;
exports.AeroSSR = AeroSSR.AeroSSR;
exports.default = AeroSSR.AeroSSR;
exports.StaticFileMiddleware = StaticFileMiddleware.StaticFileMiddleware;
exports.SecurityMiddleware = SecurityMiddleware.SecurityMiddleware;
//# sourceMappingURL=index.cjs.map
