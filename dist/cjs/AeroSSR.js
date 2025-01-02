'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var http = require('http');
var fs = require('fs');
var url = require('url');
var path = require('path');
var zlib = require('zlib');
var util = require('util');
var logger = require('./utils/logger.js');
var cache = require('./utils/cache.js');
var cors = require('./utils/cors.js');
var etag = require('./utils/etag.js');
var errorHandler = require('./utils/errorHandler.js');
var html = require('./utils/html.js');
var bundler = require('./utils/bundler.js');

const gzipAsync = util.promisify(zlib.gzip);
class AeroSSR {
    config;
    logger;
    server;
    routes;
    middlewares;
    constructor(config = {}) {
        const corsOptions = typeof config.corsOrigins === 'string'
            ? { origins: config.corsOrigins }
            : config.corsOrigins || { origins: '*' };
        this.config = {
            loggerOptions: config.loggerOptions || {},
            errorHandler: config.errorHandler || errorHandler.handleError,
            staticFileHandler: config.staticFileHandler || this.handleDefaultRequest.bind(this),
            bundleHandler: config.bundleHandler || this.handleDistRequest.bind(this),
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
        const chain = [...this.middlewares];
        let currentIndex = index;
        const next = async () => {
            const middleware = chain[currentIndex];
            if (middleware) {
                currentIndex++;
                await middleware(req, res, next);
            }
        };
        await next();
    }
    async handleRequest(req, res) {
        try {
            this.logger.log(`Request received: ${req.method} ${req.url}`);
            await this.executeMiddlewares(req, res);
            const parsedUrl = url.parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            if (req.method === 'OPTIONS') {
                cors.setCorsHeaders(res, this.config.corsOrigins);
                res.writeHead(204);
                res.end();
                return;
            }
            const routeHandler = this.routes.get(pathname);
            if (routeHandler) {
                await routeHandler(req, res);
                return;
            }
            if (pathname === '/dist') {
                await this.handleDistRequest(req, res, parsedUrl.query);
                return;
            }
            await this.handleDefaultRequest(req, res);
        }
        catch (error) {
            await errorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), req, res);
        }
    }
    async handleDistRequest(req, res, query) {
        const projectPath = query.projectPath || './';
        const entryPoint = query.entryPoint || 'main.js';
        const bundle = await bundler.generateBundle(projectPath, entryPoint);
        const etag$1 = etag.generateETag(bundle);
        if (req.headers['if-none-match'] === etag$1) {
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
        if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
            const compressed = await gzipAsync(bundle);
            res.setHeader('Content-Encoding', 'gzip');
            res.end(compressed);
        }
        else {
            res.end(bundle);
        }
    }
    async handleDefaultRequest(req, res) {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '/';
        const htmlPath = path.join(__dirname, 'index.html');
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
                this.logger.log(`Server is running on port ${this.config.port}`);
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
    listen(port) {
        this.config.port = port;
        this.start().catch(error => {
            this.logger.log(`Failed to start server: ${error.message}`);
        });
    }
}

exports.AeroSSR = AeroSSR;
exports.default = AeroSSR;
//# sourceMappingURL=AeroSSR.js.map
