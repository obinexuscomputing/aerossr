'use strict';

var fs = require('fs/promises');
var path = require('path');
var util = require('util');
var zlib = require('zlib');
require('fs');
var etag = require('../utils/etag.cjs');

const gzipAsync = util.promisify(zlib.gzip);
class StaticFileMiddleware {
    constructor(options) {
        this.root = options.root;
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    async serveFile(filepath, stats, req, res) {
        const ext = path.extname(filepath).toLowerCase();
        const mimeType = this.getMimeType(ext);
        const etag$1 = this.etag ? etag.generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
        if (etag$1 && req.headers['if-none-match'] === etag$1) {
            res.writeHead(304);
            res.end();
            return;
        }
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': stats.mtime.toUTCString()
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
    middleware() {
        return async (_req, res, next) => {
            try {
                if (_req.method !== 'GET' && _req.method !== 'HEAD') {
                    return next();
                }
                const urlPath = path.normalize(decodeURIComponent(_req.url || '').split('?')[0]);
                if (this.dotFiles !== 'allow' && urlPath.split('/').some(p => p.startsWith('.'))) {
                    if (this.dotFiles === 'deny') {
                        res.writeHead(403);
                        res.end('Forbidden');
                        return;
                    }
                    return next();
                }
                const fullPath = path.join(this.root, urlPath);
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isDirectory()) {
                        for (const indexFile of this.index) {
                            const indexPath = path.join(fullPath, indexFile);
                            try {
                                const indexStats = await fs.stat(indexPath);
                                if (indexStats.isFile()) {
                                    await this.serveFile(indexPath, indexStats, _req, res);
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
                        await this.serveFile(fullPath, stats, _req, res);
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