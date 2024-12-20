'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const _358ffb17b88ee30aa9bdb7b3080dba = require('./_virtual/358ffb17b88ee30aa9bdb7b3080dba.cjs');
const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const logger = require('./utils/logger.cjs');
const cache = require('./utils/cache.cjs');
const cors = require('./utils/cors.cjs');
const etag = require('./utils/etag.cjs');
const errorHandler = require('./utils/errorHandler.cjs');
const html = require('./utils/html.cjs');
const bundler = require('./utils/bundler.cjs');

const gzipAsync = util.promisify(zlib.gzip);
class AeroSSR {
    config;
    logger;
    server;
    routes;
    middlewares = [];
    constructor(config = {}) {
        this.config = {
            port: config.port || 3000,
            cacheMaxAge: config.cacheMaxAge || 3600,
            corsOrigins: config.corsOrigins || '*',
            compression: config.compression !== false,
            logFilePath: config.logFilePath || null,
            bundleCache: config.bundleCache || cache.createCache(),
            templateCache: config.templateCache || cache.createCache(),
            defaultMeta: {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
                ...config.defaultMeta,
            },
        };
        this.logger = new logger.Logger({ logFilePath: this.config.logFilePath });
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
            const parsedUrl = url.parse(_req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            if (_req.method === 'OPTIONS') {
                cors.setCorsHeaders(res, this.config.corsOrigins);
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
            await errorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), _req, res);
        }
    }
    async handleDistRequest(_req, res, query) {
        const projectPath = query.projectPath || './';
        const entryPoint = query.entryPoint || 'main.js';
        const bundle = await bundler.generateBundle(projectPath, entryPoint);
        const etag$1 = etag.generateETag(bundle);
        if (_req.headers['if-none-match'] === etag$1) {
            res.writeHead(304);
            res.end();
            return;
        }
        cors.setCorsHeaders(res, this.config.corsOrigins);
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
            'ETag': etag$1,
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
        const htmlPath = path.join(_358ffb17b88ee30aa9bdb7b3080dba.default, 'index.html');
        let html$1 = await fs.promises.readFile(htmlPath, 'utf-8');
        const meta = {
            title: `Page - ${pathname}`,
            description: `Content for ${pathname}`,
        };
        html$1 = html.injectMetaTags(html$1, meta, this.config.defaultMeta);
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
        });
        res.end(html$1);
    }
    async start() {
        return new Promise((resolve) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));
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
//# sourceMappingURL=AeroSSR.cjs.map
