"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AeroSSR = void 0;
const http_1 = require("http");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const zlib_1 = require("zlib");
const util_1 = require("util");
const logger_1 = require("./utils/logger");
const cache_1 = require("./utils/cache");
const cors_1 = require("./utils/cors");
const etag_1 = require("./utils/etag");
const errorHandler_1 = require("./utils/errorHandler");
const html_1 = require("./utils/html");
const bundler_1 = require("./utils/bundler");
const gzipAsync = (0, util_1.promisify)(zlib_1.gzip);
class AeroSSR {
    constructor(config = {}) {
        this.config = {
            port: config.port || 3000,
            cacheMaxAge: config.cacheMaxAge || 3600,
            corsOrigins: config.corsOrigins || '*',
            compression: config.compression !== false,
            logFilePath: config.logFilePath || null,
            bundleCache: config.bundleCache || (0, cache_1.createCache)(),
            templateCache: config.templateCache || (0, cache_1.createCache)(),
            defaultMeta: {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
                ...config.defaultMeta,
            },
        };
        this.logger = new logger_1.Logger({ logFilePath: this.config.logFilePath });
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
            const parsedUrl = (0, url_1.parse)(_req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            if (_req.method === 'OPTIONS') {
                (0, cors_1.setCorsHeaders)(res, this.config.corsOrigins);
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
            await (0, errorHandler_1.handleError)(error instanceof Error ? error : new Error('Unknown error'), _req, res);
        }
    }
    async handleDistRequest(_req, res, query) {
        const projectPath = query.projectPath || './';
        const entryPoint = query.entryPoint || 'main.js';
        const bundle = await (0, bundler_1.generateBundle)(projectPath, entryPoint);
        const etag = (0, etag_1.generateETag)(bundle);
        if (_req.headers['if-none-match'] === etag) {
            res.writeHead(304);
            res.end();
            return;
        }
        (0, cors_1.setCorsHeaders)(res, this.config.corsOrigins);
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
        const htmlPath = (0, path_1.join)(__dirname, 'index.html');
        let html = await fs_1.promises.readFile(htmlPath, 'utf-8');
        const meta = {
            title: `Page - ${pathname}`,
            description: `Content for ${pathname}`,
        };
        html = (0, html_1.injectMetaTags)(html, meta, this.config.defaultMeta);
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
        });
        res.end(html);
    }
    async start() {
        return new Promise((resolve) => {
            this.server = (0, http_1.createServer)((req, res) => this.handleRequest(req, res));
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
exports.AeroSSR = AeroSSR;
exports.default = AeroSSR;
//# sourceMappingURL=AeroSSR.js.map