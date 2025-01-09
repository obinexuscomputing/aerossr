/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var url = require('url');

class Request {
    raw;
    params;
    query;
    path;
    method;
    body;
    constructor(req, params = {}) {
        this.raw = req;
        this.params = params;
        this.method = req.method || 'GET';
        const parsedUrl = url.parse(req.url || '/', true);
        this.path = parsedUrl.pathname || '/';
        this.query = parsedUrl.query;
    }
    header(name) {
        const value = this.raw.headers[name.toLowerCase()];
        return value;
    }
    get headers() {
        return this.raw.headers;
    }
    accepts(type) {
        const accept = this.header('accept');
        if (!accept)
            return false;
        return typeof accept === 'string' ?
            accept.includes(type) || accept.includes('*/*') :
            accept.some(h => h.includes(type) || h.includes('*/*'));
    }
}

exports.Request = Request;
//# sourceMappingURL=Request.js.map
