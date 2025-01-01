'use strict';

const fs = require('fs/promises');
const path = require('path');
const util = require('util');
const zlib = require('zlib');
const etag = require('../utils/etag.cjs');

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

const path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

const gzipAsync = util.promisify(zlib.gzip);
class StaticFileMiddleware {
    root;
    maxAge;
    index;
    dotFiles;
    compression;
    etag;
    constructor(options) {
        this.root = options.root;
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    async serveFile(filepath, stats, req, res) {
        const mimeType = this.getMimeType(path__namespace.extname(filepath).toLowerCase());
        const etag$1 = this.etag ? etag.generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
        if (etag$1 && req.headers['if-none-match'] === etag$1) {
            res.writeHead(304);
            res.end();
            return;
        }
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': stats.mtime.toUTCString(),
        };
        if (etag$1) {
            headers['ETag'] = etag$1;
        }
        const content = await fs.readFile(filepath);
        if (this.compression && this.isCompressible(mimeType) && content.length > 1024) {
            const acceptEncoding = req.headers['accept-encoding'] || '';
            if (acceptEncoding.includes('gzip')) {
                const compressed = await gzipAsync(content);
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                res.writeHead(200, headers);
                res.end(compressed);
                return;
            }
        }
        res.writeHead(200, headers);
        res.end(content);
    }
    isDotFile(urlPath) {
        return urlPath.split('/').some(part => part.startsWith('.'));
    }
    handleDotFile(req, res, next) {
        if (this.dotFiles === 'allow') {
            return false; // Continue processing
        }
        if (this.dotFiles === 'deny') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return Promise.resolve();
        }
        // ignore - pass to next middleware
        return next();
    }
    isCompressible(mimeType) {
        return /^(text|application)\/(javascript|json|html|xml|css|plain)/.test(mimeType);
    }
    getMimeType(ext) {
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.woff': 'application/font-woff',
            '.ttf': 'application/font-ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'application/font-otf',
            '.wasm': 'application/wasm',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    middleware() {
        return async (req, res, next) => {
            try {
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                    return next();
                }
                const urlPath = path__namespace.normalize(decodeURIComponent(req.url || '').split('?')[0]);
                if (this.isDotFile(urlPath)) {
                    const dotFileResult = this.handleDotFile(req, res, next);
                    if (dotFileResult)
                        return dotFileResult;
                }
                const fullPath = path__namespace.join(this.root, urlPath);
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isDirectory()) {
                        for (const indexFile of this.index) {
                            const indexPath = path__namespace.join(fullPath, indexFile);
                            try {
                                const indexStats = await fs.stat(indexPath);
                                if (indexStats.isFile()) {
                                    await this.serveFile(indexPath, indexStats, req, res);
                                    return;
                                }
                            }
                            catch {
                                continue;
                            }
                        }
                        return next();
                    }
                    if (stats.isFile()) {
                        await this.serveFile(fullPath, stats, req, res);
                        return;
                    }
                }
                catch {
                    return next();
                }
            }
            catch (error) {
                return next();
            }
        };
    }
}

exports.StaticFileMiddleware = StaticFileMiddleware;
//# sourceMappingURL=StaticFileMiddleware.cjs.map
