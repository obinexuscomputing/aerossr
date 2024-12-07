'use strict';

function setCorsHeaders(res, origins = '*') {
    res.setHeader('Access-Control-Allow-Origin', origins);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
}

exports.setCorsHeaders = setCorsHeaders;
//# sourceMappingURL=cors.cjs.map
