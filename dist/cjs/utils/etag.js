/*!
 * @obinexuscomputing/aerossr v0.1.0
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
'use strict';

var crypto = require('crypto');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var crypto__namespace = /*#__PURE__*/_interopNamespaceDefault(crypto);

function generateETag(content, options = {}) {
    const hash = crypto__namespace.createHash('md5').update(content).digest('hex');
    return options.weak ? `W/"${hash}"` : `"${hash}"`;
}

exports.generateETag = generateETag;
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=etag.js.map
