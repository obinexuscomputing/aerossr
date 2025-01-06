/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
import { createServer } from 'http';
import { promises } from 'fs';
import { parse } from 'url';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from './utils/Logger.js';
import { createCache } from './utils/CacheManager.js';
import { corsManager } from './utils/CorsManager.js';
import { etagGenerator } from './utils/ETagGenerator.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { htmlManager } from './utils/HtmlManager.js';
import { AeroSSRBundler } from './utils/Bundler.js';

// src/AeroSSR.ts
const gzipAsync = promisify(gzip);
class AeroSSR {
    config;
    logger;
    bundler;
    server;
    routes;
    middlewares;
    constructor(config = {}) {
        // Normalize CORS options
        const corsOptions = corsManager.normalizeCorsOptions(config.corsOrigins);
        this.config = {
            loggerOptions: config.loggerOptions || {},
            errorHandler: config.errorHandler || ErrorHandler.handleError,
            staticFileHandler: config.staticFileHandler || this.handleDefaultRequest.bind(this),
            bundleHandler: config.bundleHandler || this.handleDistRequest.bind(this),
            port: config.port || 3000,
            cacheMaxAge: config.cacheMaxAge || 3600,
            corsOrigins: corsOptions,
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
        this.bundler = new AeroSSRBundler();
        this.server = null;
        this.routes = new Map();
        this.middlewares = [];
        // Update CORS manager defaults with configuration
        corsManager.updateDefaults(this.config.corsOrigins);
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
            // Handle CORS preflight requests
            if (req.method === 'OPTIONS') {
                corsManager.handlePreflight(res, this.config.corsOrigins);
                return;
            }
            // Set CORS headers for regular requests
            corsManager.setCorsHeaders(res, this.config.corsOrigins);
            // Execute middleware chain
            await this.executeMiddlewares(req, res);
            const parsedUrl = parse(req.url || '', true);
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
            // Default request handler
            await this.handleDefaultRequest(req, res);
        }
        catch (error) {
            await ErrorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), req, res);
        }
    }
    async handleDistRequest(req, res, query) {
        try {
            const projectPath = query.projectPath || './';
            const entryPoint = query.entryPoint || 'main.js';
            // Generate bundle
            const bundle = await this.bundler.generateBundle(entryPoint, {
                minify: true,
                sourceMap: false
            });
            // Generate ETag
            const etag = etagGenerator.generate(bundle.code);
            // Handle conditional requests
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                res.end();
                return;
            }
            // Set response headers
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
            const parsedUrl = parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Read and process HTML template
            const htmlPath = join(__dirname, 'index.html');
            let html = await promises.readFile(htmlPath, 'utf-8');
            // Generate meta tags
            const meta = {
                title: `Page - ${pathname}`,
                description: `Content for ${pathname}`,
            };
            // Inject meta tags
            html = htmlManager.injectMetaTags(html, meta, this.config.defaultMeta);
            // Set response headers
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
                this.server = createServer((req, res) => this.handleRequest(req, res));
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
        this.config.port = port;
        this.start().catch(error => {
            this.logger.log(`Failed to start server: ${error.message}`);
        });
    }
}

export { AeroSSR, AeroSSR as default };
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=AeroSSR.js.map
