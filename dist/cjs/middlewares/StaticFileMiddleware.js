/*!
 * @obinexuscomputing/aerossr v0.1.0
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
'use strict';

var fs = require('fs');
var fs$1 = require('fs/promises');
var path = require('path');
var util = require('util');
var zlib = require('zlib');
var etag = require('../utils/etag.js');

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
    constructor(options) {
        this.root = options.root;
        this.maxAge = options.maxAge || 86400; // Default 24 hours
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    isDotFile(urlPath) {
        return urlPath.split('/').some(part => part.startsWith('.'));
    }
    async handleDotFile(_req, res, next) {
        if (this.dotFiles === 'allow') {
            return false; // Continue processing
        }
        if (this.dotFiles === 'deny') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return true;
        }
        // ignore - pass to next middleware
        await next();
        return true;
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
    async serveFile(filepath, stats, req, res) {
        const mimeType = this.getMimeType(path__namespace.extname(filepath).toLowerCase());
        const lastModified = stats.mtime.toUTCString();
        // Handle conditional requests
        const ifModifiedSince = req.headers['if-modified-since'];
        const ifNoneMatch = req.headers['if-none-match'];
        const etag$1 = this.etag ? etag.generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
        if (etag$1 && ifNoneMatch === etag$1 ||
            (ifModifiedSince && new Date(ifModifiedSince).getTime() >= stats.mtime.getTime())) {
            res.writeHead(304);
            res.end();
            return;
        }
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': lastModified,
        };
        if (etag$1) {
            headers['ETag'] = etag$1;
        }
        // Handle compression for suitable files
        if (this.compression && this.isCompressible(mimeType) && stats.size > 1024) {
            const acceptEncoding = req.headers['accept-encoding'] || '';
            if (acceptEncoding.includes('gzip')) {
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                res.writeHead(200, headers);
                // Use streaming for large files
                if (stats.size > 1024 * 1024) { // 1MB threshold
                    const stream = fs.createReadStream(filepath).pipe(zlib.createGzip());
                    stream.pipe(res);
                    return;
                }
                else {
                    // Use buffer compression for smaller files
                    const content = await fs$1.readFile(filepath);
                    const compressed = await gzipAsync(content);
                    res.end(compressed);
                    return;
                }
            }
        }
        // Serve uncompressed
        res.writeHead(200, headers);
        if (stats.size > 1024 * 1024) { // 1MB threshold
            fs.createReadStream(filepath).pipe(res);
        }
        else {
            const content = await fs$1.readFile(filepath);
            res.end(content);
        }
    }
    middleware() {
        return async (_req, res, next) => {
            try {
                // Check request method
                if (_req.method !== 'GET' && _req.method !== 'HEAD') {
                    await next();
                    return;
                }
                // Safely handle URL parsing
                const rawUrl = _req.url ?? '';
                const queryIndex = rawUrl.indexOf('?');
                const urlWithoutQuery = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
                const decodedUrl = decodeURIComponent(urlWithoutQuery);
                const urlPath = path__namespace.normalize(decodedUrl);
                // Security check for dotfiles
                if (this.isDotFile(urlPath)) {
                    const handled = await this.handleDotFile(_req, res, next);
                    if (handled)
                        return;
                }
                // Prevent directory traversal
                const fullPath = path__namespace.join(this.root, urlPath);
                if (!fullPath.startsWith(this.root)) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                try {
                    const stats = await fs$1.stat(fullPath);
                    if (stats.isDirectory()) {
                        for (const indexFile of this.index) {
                            const indexPath = path__namespace.join(fullPath, indexFile);
                            try {
                                const indexStats = await fs$1.stat(indexPath);
                                if (indexStats.isFile()) {
                                    await this.serveFile(indexPath, indexStats, _req, res);
                                    return;
                                }
                            }
                            catch {
                                continue;
                            }
                        }
                        await next();
                        return;
                    }
                    if (stats.isFile()) {
                        await this.serveFile(fullPath, stats, _req, res);
                        return;
                    }
                    await next();
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        await next();
                    }
                    else {
                        throw error;
                    }
                }
            }
            catch (error) {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        };
    }
}

exports.StaticFileMiddleware = StaticFileMiddleware;
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=StaticFileMiddleware.js.map
