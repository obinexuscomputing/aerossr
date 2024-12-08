'use strict';

const crypto = require('crypto');

function _interopNamespaceDefault(e) {
    const n = Object.create(null);
    if (e) {
        for (const k in e) {
            if (k !== 'default') {
                const d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        }
    }
    n.default = e;
    return Object.freeze(n);
}

const crypto__namespace = /*#__PURE__*/_interopNamespaceDefault(crypto);

function generateETag(content) {
    return crypto__namespace.createHash('md5').update(content).digest('hex');
}

exports.generateETag = generateETag;
//# sourceMappingURL=etag.cjs.map
