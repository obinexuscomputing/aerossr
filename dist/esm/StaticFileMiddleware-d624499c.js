import { readFile, stat } from 'fs/promises';
import * as path from 'path';
import { p as promisify, a as generateETag } from './AeroSSR-78d66d5f.js';
import { gzip } from 'zlib';
import 'fs';

const gzipAsync = promisify(gzip);
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
        const mimeType = this.getMimeType(path.extname(filepath));
        const etag = this.etag ? generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
        if (etag && req.headers['if-none-match'] === etag) {
            res.writeHead(304);
            res.end();
            return;
        }
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': stats.mtime.toUTCString(),
        };
        if (etag) {
            headers['ETag'] = etag;
        }
        const content = await readFile(filepath);
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
    middleware() {
        return async (req, res, next) => {
            try {
                // Only handle GET and HEAD requests
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                    await next();
                    return;
                }
                const urlPath = path.normalize(decodeURIComponent(req.url || '').split('?')[0]);
                // Check for dotfiles
                if (this.isDotFile(urlPath)) {
                    const handled = await this.handleDotFile(req, res, next);
                    if (handled)
                        return;
                }
                const fullPath = path.join(this.root, urlPath);
                try {
                    const stats = await stat(fullPath);
                    if (stats.isDirectory()) {
                        // Try each index file
                        for (const indexFile of this.index) {
                            const indexPath = path.join(fullPath, indexFile);
                            try {
                                const indexStats = await stat(indexPath);
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
                }
                catch {
                    await next();
                    return;
                }
            }
            catch (error) {
                await next();
            }
        };
    }
}

export { StaticFileMiddleware as S };
//# sourceMappingURL=StaticFileMiddleware-d624499c.js.map
