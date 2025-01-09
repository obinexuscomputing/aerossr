/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var fs$1 = require('fs');
var fs = require('fs/promises');
var path = require('path');
var util = require('util');
var zlib = require('zlib');
require('../../utils/security/CorsManager.js');
var ETagGenerator = require('../../utils/security/ETagGenerator.js');

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

var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

const gzipAsync = util.promisify(zlib.gzip);
class StaticFileMiddleware {
    root;
    maxAge;
    index;
    dotFiles;
    compression;
    etag;
    headers;
    constructor(options) {
        this.root = path__namespace.resolve(options.root);
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
        this.headers = options.headers || {};
    }
    isDotFile(urlPath) {
        return urlPath.split('/').some(part => part.startsWith('.'));
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
            '.wasm': 'application/wasm'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    async handleFile(filepath, req, res) {
        try {
            const stats = await fs.stat(filepath);
            if (stats.isDirectory()) {
                for (const indexFile of this.index) {
                    const indexPath = path__namespace.join(filepath, indexFile);
                    try {
                        const indexStats = await fs.stat(indexPath);
                        if (indexStats.isFile()) {
                            await this.serveFile(indexPath, indexStats, req, res);
                            return true;
                        }
                    }
                    catch {
                        continue;
                    }
                }
                return false;
            }
            if (stats.isFile()) {
                await this.serveFile(filepath, stats, req, res);
                return true;
            }
            return false;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }
    async serveFile(filepath, stats, req, res) {
        const mimeType = this.getMimeType(path__namespace.extname(filepath).toLowerCase());
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': stats.mtime.toUTCString(),
            ...this.headers
        };
        if (this.etag) {
            const etag = ETagGenerator.generateETag(`${filepath}:${stats.mtime.toISOString()}`);
            headers['ETag'] = etag;
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304, headers);
                res.end();
                return;
            }
        }
        if (req.headers['if-modified-since']) {
            const ifModifiedSince = new Date(req.headers['if-modified-since']);
            if (ifModifiedSince.getTime() >= stats.mtime.getTime()) {
                res.writeHead(304, headers);
                res.end();
                return;
            }
        }
        // Handle range requests
        if (req.headers.range) {
            const range = req.headers.range.match(/bytes=(\d*)-(\d*)/);
            if (range) {
                const start = parseInt(range[1], 10);
                const end = range[2] ? parseInt(range[2], 10) : stats.size - 1;
                headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
                headers['Content-Length'] = String(end - start + 1);
                headers['Accept-Ranges'] = 'bytes';
                res.writeHead(206, headers);
                fs$1.createReadStream(filepath, { start, end }).pipe(res);
                return;
            }
        }
        // Handle compression
        if (this.compression &&
            this.isCompressible(mimeType) &&
            req.headers['accept-encoding']?.includes('gzip')) {
            headers['Content-Encoding'] = 'gzip';
            headers['Vary'] = 'Accept-Encoding';
            res.writeHead(200, headers);
            if (stats.size > 1024 * 1024) { // 1MB threshold
                fs$1.createReadStream(filepath).pipe(zlib.createGzip()).pipe(res);
            }
            else {
                const content = await fs.readFile(filepath);
                const compressed = await gzipAsync(content);
                res.end(compressed);
            }
            return;
        }
        // Regular file serving
        res.writeHead(200, headers);
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        if (stats.size > 1024 * 1024) { // 1MB threshold
            fs$1.createReadStream(filepath).pipe(res);
        }
        else {
            const content = await fs.readFile(filepath);
            res.end(content);
        }
    }
    middleware() {
        return async (req, res, next) => {
            try {
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                    await next();
                    return;
                }
                const urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
                const normalizedPath = path__namespace.normalize(urlPath);
                if (this.isDotFile(normalizedPath)) {
                    if (this.dotFiles === 'deny') {
                        res.writeHead(403, { 'Content-Type': 'text/plain' });
                        res.end('Forbidden');
                        return;
                    }
                    if (this.dotFiles === 'ignore') {
                        await next();
                        return;
                    }
                }
                const fullPath = path__namespace.join(this.root, normalizedPath);
                const relative = path__namespace.relative(this.root, fullPath);
                if (relative.includes('..') || path__namespace.isAbsolute(relative)) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Forbidden');
                    return;
                }
                const handled = await this.handleFile(fullPath, req, res);
                if (!handled) {
                    await next();
                }
            }
            catch (error) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        };
    }
}

exports.StaticFileMiddleware = StaticFileMiddleware;
//# sourceMappingURL=StaticFileMiddleware.js.map
