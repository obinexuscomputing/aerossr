/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
import { createReadStream } from 'fs';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { gzip, createGzip } from 'zlib';
import { promisify } from 'util';
import '../utils/CorsManager.js';
import '../utils/HtmlManager.js';
import { etagGenerator } from '../utils/ETagGenerator.js';
import 'crypto';
import '../utils/AsyncUtils.js';

const gzipAsync = promisify(gzip);
class StaticFileMiddleware {
    root;
    maxAge;
    index;
    dotFiles;
    compression;
    etag;
    constructor(options) {
        this.root = path.resolve(options.root);
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    async handleFile(filePath, req, res) {
        try {
            const stats = await stat(filePath);
            if (stats.isFile()) {
                await this.serveFile(filePath, stats, req, res);
                return true;
            }
            if (stats.isDirectory()) {
                for (const indexFile of this.index) {
                    const indexPath = path.join(filePath, indexFile);
                    try {
                        const indexStats = await stat(indexPath);
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
                const normalizedPath = path.normalize(urlPath);
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
                const fullPath = path.join(this.root, normalizedPath);
                const relative = path.relative(this.root, fullPath);
                if (relative.includes('..') || path.isAbsolute(relative)) {
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
        try {
            const mimeType = this.getMimeType(path.extname(filepath));
            const lastModified = stats.mtime.toUTCString();
            // Generate ETag using file size and modification time
            const etagContent = `${stats.size}-${stats.mtime.getTime()}`;
            const etag = this.etag ? etagGenerator.generate(etagContent, {
                weak: true,
                algorithm: 'sha1' // Use SHA1 for better collision resistance
            }) : null;
            // Handle conditional requests
            const ifModifiedSince = req.headers['if-modified-since'];
            const ifNoneMatch = req.headers['if-none-match'];
            const isNotModified = ((etag && ifNoneMatch && etagGenerator.compare(etag, ifNoneMatch)) ||
                (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime));
            if (isNotModified) {
                res.writeHead(304, {
                    'Cache-Control': `public, max-age=${this.maxAge}`,
                    'Last-Modified': lastModified,
                    'ETag': etag
                });
                res.end();
                return;
            }
            // Setup response headers
            const headers = {
                'Content-Type': mimeType,
                'Content-Length': stats.size.toString(),
                'Cache-Control': `public, max-age=${this.maxAge}`,
                'Last-Modified': lastModified,
                'X-Content-Type-Options': 'nosniff' // Security header
            };
            if (etag) {
                headers['ETag'] = etag;
            }
            // Determine if compression should be used
            const acceptEncoding = req.headers['accept-encoding'];
            const shouldCompress = this.compression &&
                this.isCompressible(mimeType) &&
                acceptEncoding?.includes('gzip') &&
                stats.size > 1024; // Only compress files larger than 1KB
            if (shouldCompress) {
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                delete headers['Content-Length']; // Remove content length as it will change after compression
            }
            res.writeHead(200, headers);
            // Handle HEAD requests
            if (req.method === 'HEAD') {
                res.end();
                return;
            }
            // Serve file content
            if (stats.size > 1024 * 1024) { // 1MB threshold for streaming
                await this.serveStreamedContent(filepath, shouldCompress, res);
            }
            else {
                await this.serveBufferedContent(filepath, shouldCompress, res);
            }
        }
        catch (error) {
            // Log error and cleanup
            console.error('Error serving file:', error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
            else {
                res.end();
            }
        }
    }
    /**
     * Serves file content using streams
     */
    async serveStreamedContent(filepath, shouldCompress, res) {
        return new Promise((resolve, reject) => {
            const fileStream = createReadStream(filepath);
            const handleError = (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
                else {
                    res.end();
                }
                reject(error);
            };
            if (shouldCompress) {
                const gzipStream = createGzip({
                    level: 6,
                    memLevel: 8 // Increased memory for better compression
                });
                fileStream
                    .on('error', handleError)
                    .pipe(gzipStream)
                    .on('error', handleError)
                    .pipe(res)
                    .on('finish', resolve)
                    .on('error', handleError);
            }
            else {
                fileStream
                    .pipe(res)
                    .on('finish', resolve)
                    .on('error', handleError);
            }
            // Handle client disconnect
            res.on('close', () => {
                fileStream.destroy();
            });
        });
    }
    /**
     * Serves file content using buffers
     */
    async serveBufferedContent(filepath, shouldCompress, res) {
        try {
            const content = await readFile(filepath);
            if (shouldCompress) {
                const compressed = await gzipAsync(content);
                res.end(compressed);
            }
            else {
                res.end(content);
            }
        }
        catch (error) {
            throw new Error(`Failed to serve buffered content: ${error instanceof Error ? error.message : String(error)}`);
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

export { StaticFileMiddleware };
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=StaticFileMiddleware.js.map
