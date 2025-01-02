'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var http = require('http');
var require$$3 = require('fs');
var url = require('url');
var path = require('path');
var zlib = require('zlib');
var require$$4 = require('util');
var logger = require('./utils/logger.js');
var cache = require('./utils/cache.js');
var cors = require('./utils/cors.js');
var etag = require('./utils/etag.js');
var errorHandler = require('./utils/errorHandler.js');
var html = require('./utils/html.js');
var bundler = require('./utils/bundler.js');

const gzipAsync = require$$4.promisify(zlib.gzip);
class AeroSSR {
    config;
    logger;
    server;
    routes;
    middlewares = [];
    constructor(config = {}) {
        const corsOptions = typeof config.corsOrigins === 'string'
            ? { origins: config.corsOrigins }
            : config.corsOrigins || { origins: '*' };
        this.config = {
            port: config.port || 3000,
            cacheMaxAge: config.cacheMaxAge || 3600,
            corsOrigins: corsOptions,
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
        const middleware = this.middlewares[index];
        if (middleware) {
            await middleware(req, res, () => this.executeMiddlewares(req, res, index + 1));
        }
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
        if (this.config.compression && _req.headers['accept-encoding']?.includes('gzip')) {
            const compressed = await gzipAsync(bundle);
            res.setHeader('Content-Encoding', 'gzip');
            res.end(compressed);
        }
        else {
            res.end(bundle);
        }
    }
    async handleDefaultRequest(_req, res, pathname) {
        const htmlPath = path.join(__dirname, 'index.html');
        let html$1 = await require$$3.promises.readFile(htmlPath, 'utf-8');
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
//# sourceMappingURL=AeroSSR.js.map
