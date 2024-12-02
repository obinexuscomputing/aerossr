import { createServer } from 'http';
import { promises as fs } from 'fs';
import { parse as parseUrl } from 'url';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from './utils/logger';
import { createCache } from './utils/cache';
import { setCorsHeaders } from './utils/cors';
import { generateETag } from './utils/etag';
import { handleError } from './utils/errorHandler';
import { injectMetaTags } from './utils/html';
import { generateBundle } from './utils/bundler';
const gzipAsync = promisify(gzip);
export class AeroSSR {
    constructor(config = {}) {
        this.config = {
            port: config.port || 3000,
            cacheMaxAge: config.cacheMaxAge || 3600,
            corsOrigins: config.corsOrigins || '*',
            compression: config.compression !== false,
            logFilePath: config.logFilePath || null,
            bundleCache: config.bundleCache || createCache(),
            templateCache: config.templateCache || createCache(),
            defaultMeta: {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
                ...config.defaultMeta,
            },
        };
        this.logger = new Logger({ logFilePath: this.config.logFilePath });
        this.server = null;
        this.routes = new Map();
        this.middlewares = [];
    }
    use(middleware) {
        this.middlewares.push(middleware);
    }
    route(path, handler) {
        this.routes.set(path, handler);
    }
    clearCache() {
        this.config.bundleCache.clear();
        this.config.templateCache.clear();
    }
    async executeMiddlewares(req, res, index = 0) {
        if (index >= this.middlewares.length) {
            return;
        }
        await this.middlewares[index](req, res, () => this.executeMiddlewares(req, res, index + 1));
    }
    async handleRequest(_req, res) {
        try {
            this.logger.logRequest(_req);
            await this.executeMiddlewares(_req, res);
            const parsedUrl = parseUrl(_req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            if (_req.method === 'OPTIONS') {
                setCorsHeaders(res, this.config.corsOrigins);
                res.writeHead(204);
                res.end();
                return;
            }
            const routeHandler = this.routes.get(pathname);
            if (routeHandler) {
                await routeHandler(_req, res);
                return;
            }
            if (pathname === '/dist') {
                await this.handleDistRequest(_req, res, parsedUrl.query);
                return;
            }
            await this.handleDefaultRequest(_req, res, pathname);
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error('Unknown error'), _req, res);
        }
    }
    async handleDistRequest(_req, res, query) {
        const projectPath = query.projectPath || './';
        const entryPoint = query.entryPoint || 'main.js';
        const bundle = await generateBundle(projectPath, entryPoint);
        const etag = generateETag(bundle);
        if (_req.headers['if-none-match'] === etag) {
            res.writeHead(304);
            res.end();
            return;
        }
        setCorsHeaders(res, this.config.corsOrigins);
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
            'ETag': etag,
        });
        const acceptEncoding = _req.headers['accept-encoding'] || '';
        if (this.config.compression && acceptEncoding.includes('gzip')) {
            const compressed = await gzipAsync(bundle);
            res.setHeader('Content-Encoding', 'gzip');
            res.end(compressed);
        }
        else {
            res.end(bundle);
        }
    }
    async handleDefaultRequest(_req, res, pathname) {
        const htmlPath = join(__dirname, 'index.html');
        let html = await fs.readFile(htmlPath, 'utf-8');
        const meta = {
            title: `Page - ${pathname}`,
            description: `Content for ${pathname}`,
        };
        html = injectMetaTags(html, meta, this.config.defaultMeta);
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
        });
        res.end(html);
    }
    async start() {
        return new Promise((resolve) => {
            this.server = createServer((req, res) => this.handleRequest(req, res));
            this.server.listen(this.config.port, () => {
                this.logger.log(`AeroSSR server running on port ${this.config.port}`);
                resolve(this.server);
            });
        });
    }
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server?.close(() => {
                    this.logger.log('Server stopped');
                    this.server = null;
                    resolve();
                });
            });
        }
        return Promise.resolve();
    }
}
export default AeroSSR;
//# sourceMappingURL=AeroSSR.js.map