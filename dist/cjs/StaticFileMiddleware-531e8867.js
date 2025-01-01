'use strict';

var require$$3 = require('fs');
var fs = require('fs/promises');
var path = require('path');
var AeroSSR = require('./AeroSSR-7fe0f7ff.js');
var zlib = require('zlib');

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

const gzipAsync = AeroSSR.promisify(zlib.gzip);
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
    async handleDotFile(req, res, next) {
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
        const etag = this.etag ? AeroSSR.generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
        if (etag && ifNoneMatch === etag ||
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
        if (etag) {
            headers['ETag'] = etag;
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
                    const stream = require$$3.createReadStream(filepath).pipe(zlib.createGzip());
                    stream.pipe(res);
                    return;
                }
                else {
                    // Use buffer compression for smaller files
                    const content = await fs.readFile(filepath);
                    const compressed = await gzipAsync(content);
                    res.end(compressed);
                    return;
                }
            }
        }
        // Serve uncompressed
        res.writeHead(200, headers);
        if (stats.size > 1024 * 1024) { // 1MB threshold
            require$$3.createReadStream(filepath).pipe(res);
        }
        else {
            const content = await fs.readFile(filepath);
            res.end(content);
        }
    }
    middleware() {
        return async (req, res, next) => {
            try {
                // Only handle GET and HEAD requests
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                    await next();
                    return;
                }
                const urlPath = path__namespace.normalize(decodeURIComponent(req.url || '').split('?')[0]);
                // Security check for dotfiles
                if (this.isDotFile(urlPath)) {
                    const handled = await this.handleDotFile(req, res, next);
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
                    const stats = await fs.stat(fullPath);
                    if (stats.isDirectory()) {
                        // Try each index file
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
                        await next();
                        return;
                    }
                    if (stats.isFile()) {
                        await this.serveFile(fullPath, stats, req, res);
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
//# sourceMappingURL=StaticFileMiddleware-531e8867.js.map
