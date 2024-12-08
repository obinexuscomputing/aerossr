'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// Export the core class (main export)
class AeroSSR {
    config;
}
// Export middleware classes
class StaticFileMiddleware {
}
// Export utility functions
exports.Utils = void 0;
(function (Utils) {
    (function (Cache) {
    })(Utils.Cache || (Utils.Cache = {}));
    (function (HTTP) {
    })(Utils.HTTP || (Utils.HTTP = {}));
    (function (Error) {
    })(Utils.Error || (Utils.Error = {}));
    (function (HTML) {
    })(Utils.HTML || (Utils.HTML = {}));
    (function (Bundle) {
    })(Utils.Bundle || (Utils.Bundle = {}));
})(exports.Utils || (exports.Utils = {}));

exports.AeroSSR = AeroSSR;
exports.StaticFileMiddleware = StaticFileMiddleware;
exports.default = AeroSSR;
//# sourceMappingURL=index.cjs.map
