/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
'use strict';

var fs$1 = require('fs');
var fs = require('fs/promises');
var path = require('path');
var zlib = require('zlib');
var util = require('util');
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
        this.root = path__namespace.resolve(options.root);
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    async handleFile(filePath, req, res) {
        try {
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                await this.serveFile(filePath, stats, req, res);
                return true;
            }
            if (stats.isDirectory()) {
                for (const indexFile of this.index) {
                    const indexPath = path__namespace.join(filePath, indexFile);
                    try {
                        const indexStats = await fs.stat(indexPath);
                        if (indexStats.isFile()) {
                            await this.serveFile(indexPath, indexStats, req, res);
                            return true;
                        }
                    }
                    catch (error) {
                        if (error.code !== 'ENOENT') {
                            throw error;
                        }
                    }
                }
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
        return false;
    }
    middleware() {
        return async (req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                await next();
                return;
            }
            try {
                const urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
                const normalizedPath = path__namespace.normalize(urlPath);
                // Check for dot files
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
                // Resolve full path
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
    isDotFile(urlPath) {
        return urlPath.split('/').some(part => part.startsWith('.') && part !== '.' && part !== '..');
    }
    async serveFile(filepath, stats, req, res) {
        const mimeType = this.getMimeType(path__namespace.extname(filepath));
        const lastModified = stats.mtime.toUTCString();
        const etag$1 = this.etag ? etag.generateETag(`${stats.size}-${stats.mtime.getTime()}`) : null;
        // Handle conditional requests
        const ifModifiedSince = req.headers['if-modified-since'];
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && etag$1 && ifNoneMatch === etag$1) {
            res.writeHead(304);
            res.end();
            return;
        }
        if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
            res.writeHead(304);
            res.end();
            return;
        }
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': lastModified
        };
        if (etag$1) {
            headers['ETag'] = etag$1;
        }
        const acceptEncoding = req.headers['accept-encoding'];
        const shouldCompress = this.compression &&
            this.isCompressible(mimeType) &&
            acceptEncoding?.includes('gzip');
        if (shouldCompress) {
            headers['Content-Encoding'] = 'gzip';
            headers['Vary'] = 'Accept-Encoding';
        }
        res.writeHead(200, headers);
        // HEAD requests should only return headers
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        // Handle file serving
        if (stats.size > 1024 * 1024) { // 1MB threshold
            const stream = fs$1.createReadStream(filepath);
            if (shouldCompress) {
                const gzipStream = zlib.createGzip();
                stream
                    .on('error', () => res.end())
                    .pipe(gzipStream)
                    .on('error', () => res.end())
                    .pipe(res);
            }
            else {
                stream
                    .on('error', () => res.end())
                    .pipe(res);
            }
        }
        else {
            try {
                const content = await fs.readFile(filepath);
                if (shouldCompress) {
                    const compressed = await gzipAsync(content);
                    res.end(compressed);
                }
                else {
                    res.end(content);
                }
            }
            catch (error) {
                res.end();
            }
        }
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
        return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
    }
}

exports.StaticFileMiddleware = StaticFileMiddleware;
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=StaticFileMiddleware.js.map
