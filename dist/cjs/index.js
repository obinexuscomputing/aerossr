/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var AeroSSR = require('./core/AeroSSR.js');
var DistRequestHandler = require('./handlers/DistRequestHandler.js');
var UnifiedBundler = require('./core/UnifiedBundler.js');
var Request = require('./http/request/Request.js');
var Response = require('./http/response/Response.js');
var DefaultRouteBuilder = require('./routing/builders/DefaultRouteBuilder.js');
var RouteBuilder = require('./routing/builders/RouteBuilder.js');
var Router = require('./routing/Router.js');
var SecurityMiddleware = require('./middleware/security/SecurityMiddleware.js');
var StaticFileMiddleware = require('./middleware/static/StaticFileMiddleware.js');
var logging = require('./utils/logging.js');
var error = require('./utils/error.js');
require('./utils/security/CorsManager.js');
var ETagGenerator = require('./utils/security/ETagGenerator.js');

// Export version
const VERSION = '0.1.1';

exports.AeroSSR = AeroSSR.AeroSSR;
exports.DistRequestHandler = DistRequestHandler.DistRequestHandler;
exports.UnifiedBundler = UnifiedBundler.UnifiedBundler;
exports.Request = Request.Request;
exports.Response = Response.Response;
exports.RouteStrategy = DefaultRouteBuilder.DefaultRouteStrategy;
exports.RouteBuilder = RouteBuilder.RouteBuilder;
exports.Router = Router.Router;
exports.SecurityMiddleware = SecurityMiddleware.SecurityMiddleware;
exports.StaticFileMiddleware = StaticFileMiddleware.StaticFileMiddleware;
exports.Logger = logging.Logger;
exports.ErrorHandler = error.ErrorHandler;
exports.etagGenerator = ETagGenerator.etagGenerator;
exports.VERSION = VERSION;
//# sourceMappingURL=index.js.map
