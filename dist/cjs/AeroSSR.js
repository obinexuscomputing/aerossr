/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var http = require('http');
var fs = require('fs');
var url = require('url');
var path = require('path');
var zlib = require('zlib');
var util = require('util');
var Logger = require('./utils/Logger.js');
var CacheManager = require('./utils/CacheManager.js');
var CorsManager = require('./utils/CorsManager.js');
var ETagGenerator = require('./utils/ETagGenerator.js');
var ErrorHandler = require('./utils/ErrorHandler.js');
var HtmlManager = require('./utils/HtmlManager.js');
var Bundler = require('./utils/Bundler.js');

const gzipAsync = util.promisify(zlib.gzip);
class AeroSSR {
    config;
    logger;
    bundler;
    server;
    routes;
    middlewares;
    constructor(options = {}) {
        // Initialize base configuration first
        const baseConfig = {
            projectPath: options.projectPath || process.cwd(),
            port: options.port || 3000,
            compression: options.compression !== false,
            cacheMaxAge: options.cacheMaxAge || 3600,
            logFilePath: options.logFilePath || null,
            loggerOptions: options.loggerOptions || {},
            corsOrigins: CorsManager.corsManager.normalizeCorsOptions(options.corsOrigins),
            defaultMeta: {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
                ...options.defaultMeta,
            },
        };
        // Complete configuration with derived components
        this.config = {
            ...baseConfig,
            bundleCache: options.bundleCache || CacheManager.createCache(),
            templateCache: options.templateCache || CacheManager.createCache(),
            errorHandler: options.errorHandler || ErrorHandler.ErrorHandler.handleError,
            staticFileHandler: options.staticFileHandler || this.handleDefaultRequest.bind(this),
            bundleHandler: options.bundleHandler || this.handleDistRequest.bind(this),
        };
        // Initialize core components
        this.logger = new Logger.Logger({
            logFilePath: this.config.logFilePath,
            ...this.config.loggerOptions
        });
        this.bundler = new Bundler.AeroSSRBundler(this.config.projectPath);
        this.server = null;
        this.routes = new Map();
        this.middlewares = [];
        // Update CORS manager defaults
        CorsManager.corsManager.updateDefaults(this.config.corsOrigins);
        // Validate configuration
        this.validateConfig();
    }
    validateConfig() {
        if (this.config.port < 0 || this.config.port > 65535) {
            throw new Error('Invalid port number');
        }
        if (this.config.cacheMaxAge < 0) {
            throw new Error('Cache max age cannot be negative');
        }
    }
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        this.middlewares.push(middleware);
    }
    route(path, handler) {
        if (typeof path !== 'string' || !path) {
            throw new Error('Route path must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Route handler must be a function');
        }
        this.routes.set(path, handler);
    }
    clearCache() {
        this.config.bundleCache.clear();
        this.config.templateCache.clear();
        this.bundler.clearCache();
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
            // Handle CORS preflight
            if (req.method === 'OPTIONS') {
                CorsManager.corsManager.handlePreflight(res, this.config.corsOrigins);
                return;
            }
            // Set CORS headers
            CorsManager.corsManager.setCorsHeaders(res, this.config.corsOrigins);
            // Execute middleware chain
            await this.executeMiddlewares(req, res);
            const parsedUrl = url.parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Route handling
            const routeHandler = this.routes.get(pathname);
            if (routeHandler) {
                await routeHandler(req, res);
                return;
            }
            // Special routes
            if (pathname === '/dist') {
                await this.handleDistRequest(req, res, parsedUrl.query);
                return;
            }
            // Default handler
            await this.handleDefaultRequest(req, res);
        }
        catch (error) {
            await ErrorHandler.ErrorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), req, res);
        }
    }
    async handleDistRequest(req, res, query) {
        try {
            const entryPoint = query.entryPoint || 'main.js';
            // Generate bundle
            const bundle = await this.bundler.generateBundle(entryPoint, {
                minify: true,
                sourceMap: false
            });
            // Generate ETag
            const etag = ETagGenerator.etagGenerator.generate(bundle.code);
            // Handle conditional requests
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                res.end();
                return;
            }
            // Set headers
            const headers = {
                'Content-Type': 'application/javascript',
                'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
                'ETag': etag,
            };
            // Handle compression
            if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
                const compressed = await gzipAsync(bundle.code);
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                res.writeHead(200, headers);
                res.end(compressed);
            }
            else {
                res.writeHead(200, headers);
                res.end(bundle.code);
            }
        }
        catch (error) {
            throw new Error(`Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async handleDefaultRequest(req, res) {
        try {
            const parsedUrl = url.parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Template lookup
            const htmlPath = path.join(this.config.projectPath, 'index.html');
            let html = await fs.promises.readFile(htmlPath, 'utf-8');
            // Meta tags
            const meta = {
                title: `Page - ${pathname}`,
                description: `Content for ${pathname}`,
            };
            // Inject meta tags
            html = HtmlManager.htmlManager.injectMetaTags(html, meta, this.config.defaultMeta);
            // Set response
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff'
            });
            res.end(html);
        }
        catch (error) {
            throw new Error(`Default request handling failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = http.createServer((req, res) => this.handleRequest(req, res));
                this.server.on('error', (error) => {
                    this.logger.log(`Server error: ${error.message}`);
                    reject(error);
                });
                this.server.listen(this.config.port, () => {
                    this.logger.log(`Server is running on port ${this.config.port}`);
                    resolve(this.server);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async stop() {
        if (!this.server) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.server?.close(() => {
                this.logger.log('Server stopped');
                this.server = null;
                resolve();
            });
        });
    }
    listen(port) {
        if (port < 0 || port > 65535) {
            throw new Error('Invalid port number');
        }
        this.config.port = port;
        this.start().catch(error => {
            this.logger.log(`Failed to start server: ${error.message}`);
        });
    }
}

exports.AeroSSR = AeroSSR;
exports.default = AeroSSR;
//# sourceMappingURL=AeroSSR.js.map
