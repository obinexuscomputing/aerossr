'use strict';

const require$$3 = require('fs');
const path = require('path');
const require$$4 = require('util');
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

const gzipAsync = require$$4.promisify(zlib.gzip);
class StaticFileMiddleware {
    root;
    maxAge;
    index;
    dotFiles;
    compression;
    etag;
    options;
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
        const content = await require$$3.promises.readFile(filepath);
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
    getMimeType(filePath) {
        const ext = path__namespace.extname(filePath).toLowerCase();
        switch (ext) {
            case '.html':
                return 'text/html';
            case '.js':
                return 'application/javascript';
            case '.css':
                return 'text/css';
            case '.png':
                return 'image/png';
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.svg':
                return 'image/svg+xml';
            case '.json':
                return 'application/json';
            default:
                return 'application/octet-stream';
        }
    }
    async statFile(filePath) {
        try {
            return await require$$3.promises.stat(filePath);
        }
        catch {
            return null;
        }
    }
    middleware() {
        return async (req, res, next) => {
            try {
                const requestedPath = path__namespace.join(this.options.root, decodeURIComponent(req.url || '/'));
                let resolvedPath = path__namespace.resolve(requestedPath);
                if (!resolvedPath.startsWith(this.options.root)) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                if (!this.options.allowDotfiles && path__namespace.basename(resolvedPath).startsWith('.')) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                let stat = await this.statFile(resolvedPath);
                if (!stat) {
                    const indexFile = path__namespace.join(resolvedPath, this.options.defaultFile || 'index.html');
                    stat = await this.statFile(indexFile);
                    if (stat) {
                        resolvedPath = indexFile;
                    }
                    else {
                        next();
                        return;
                    }
                }
                if (stat.isDirectory()) {
                    next();
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': this.getMimeType(resolvedPath),
                    'Cache-Control': this.options.cacheControl,
                    'Last-Modified': stat.mtime.toUTCString(),
                });
                const stream = require$$3.createReadStream(resolvedPath);
                stream.pipe(res);
            }
            catch (error) {
                console.error('StaticFileMiddleware error:', error);
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        };
    }
}

exports.StaticFileMiddleware = StaticFileMiddleware;
//# sourceMappingURL=StaticFileMiddleware.cjs.map
