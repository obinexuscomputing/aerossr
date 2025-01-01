'use strict';

const index = require('./types/index.cjs');
const cors = require('./utils/cors.cjs');
const async = require('./utils/async.cjs');
const cache = require('./utils/cache.cjs');
const html = require('./utils/html.cjs');
const logger = require('./utils/logger.cjs');



exports.isError = index.isError;
exports.normalizeCorsOptions = cors.normalizeCorsOptions;
exports.setCorsHeaders = cors.setCorsHeaders;
exports.ensureAsync = async.ensureAsync;
exports.isPromise = async.isPromise;
exports.createCache = cache.createCache;
exports.injectMetaTags = html.injectMetaTags;
exports.Logger = logger.Logger;
//# sourceMappingURL=index.cjs.map
