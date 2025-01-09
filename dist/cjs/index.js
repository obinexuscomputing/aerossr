/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var AeroSSR = require('./core/AeroSSR.js');
var Request = require('./http/request/Request.js');
var Response = require('./http/response/Response.js');
var DefaultRouteBuilder = require('./routing/builders/DefaultRouteBuilder.js');
var RouteBuilder = require('./routing/builders/RouteBuilder.js');
var Router = require('./routing/Router.js');
var SecurityMiddleware = require('./middleware/security/SecurityMiddleware.js');
var StaticFileMiddleware = require('./middleware/static/StaticFileMiddleware.js');
var bundler = require('./utils/bundler.js');
var error = require('./utils/error.js');
var logging = require('./utils/logging.js');
var CookieManager = require('./utils/security/CookieManager.js');
var CorsManager = require('./utils/security/CorsManager.js');
var ETagGenerator = require('./utils/security/ETagGenerator.js');

// Export version
const VERSION = '0.1.1';

exports.AeroSSR = AeroSSR.AeroSSR;
exports.Request = Request.Request;
exports.Response = Response.Response;
exports.RouteStrategy = DefaultRouteBuilder.DefaultRouteStrategy;
exports.RouteBuilder = RouteBuilder.RouteBuilder;
exports.Router = Router.Router;
exports.SecurityMiddleware = SecurityMiddleware.SecurityMiddleware;
exports.StaticFileMiddleware = StaticFileMiddleware.StaticFileMiddleware;
exports.AeroSSRBundler = bundler.AeroSSRBundler;
exports.ErrorHandler = error.ErrorHandler;
exports.Logger = logging.Logger;
exports.CookieManager = CookieManager.CookieManager;
exports.cookieManager = CookieManager.cookieManager;
exports.CORSManager = CorsManager.CORSManager;
exports.corsManager = CorsManager.corsManager;
exports.ETagGenerator = ETagGenerator.ETagGenerator;
exports.etagGenerator = ETagGenerator.etagGenerator;
exports.generateETag = ETagGenerator.generateETag;
exports.VERSION = VERSION;
//# sourceMappingURL=index.js.map
