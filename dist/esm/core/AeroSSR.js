/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
import { createServer } from 'http';
import fs, { promises } from 'fs';
import { parse } from 'url';
import path__default, { join } from 'path';
import { Request } from '../http/request/Request.js';
import { Response } from '../http/response/Response.js';
import { Router } from '../routing/Router.js';
import { DefaultRouteStrategy } from '../routing/builders/DefaultRouteBuilder.js';
import { StaticFileMiddleware } from '../middleware/static/StaticFileMiddleware.js';
import { createCache } from '../utils/cache/CacheManager.js';
import { htmlManager } from '../utils/html/HtmlManager.js';
import { corsManager } from '../utils/security/CorsManager.js';
import { Logger } from '../utils/logging.js';
import { ErrorHandler } from '../utils/error.js';
import { etagGenerator } from '../utils/security/ETagGenerator.js';
import { DistRequestHandler } from '../handlers/DistRequestHandler.js';
import { AeroSSRBundler } from './bundler.js';

class AeroSSR {
    config;
    logger;
    bundler;
    distHandler;
    router;
    server = null;
    routes;
    middlewares;
    constructor(options = {}) {
        // Step 1: Initialize base configuration
        const baseConfig = this.initializeBaseConfig(options);
        // Step 2: Create required directories
        this.createRequiredDirectoriesSync(baseConfig.projectPath);
        // Step 3: Initialize logger early for error tracking
        this.logger = new Logger({
            logFilePath: baseConfig.logFilePath,
            ...baseConfig.loggerOptions
        });
        // Step 4: Initialize core components
        this.bundler = new AeroSSRBundler(baseConfig.projectPath);
        this.router = new Router(new DefaultRouteStrategy());
        this.routes = new Map();
        this.middlewares = [];
        // Step 5: Complete configuration with derived components
        this.config = this.initializeFullConfig(baseConfig, options);
        // Step 6: Initialize handlers
        this.distHandler = new DistRequestHandler(this.bundler, this.config, this.logger);
        // Step 7: Initialize static file handling
        this.initializeStaticFileHandling(options);
        // Step 8: Initialize CORS
        corsManager.updateDefaults(this.config.corsOrigins);
        // Step 9: Validate final configuration
        this.validateConfig();
    }
    initializeBaseConfig(options) {
        const projectPath = path__default.resolve(options.projectPath || process.cwd());
        return {
            projectPath,
            publicPath: path__default.resolve(projectPath, 'public'),
            port: options.port || 3000,
            compression: options.compression !== false,
            cacheMaxAge: options.cacheMaxAge || 3600,
            logFilePath: options.logFilePath || path__default.join(projectPath, 'logs', 'server.log'),
            loggerOptions: options.loggerOptions || {},
            corsOrigins: corsManager.normalizeCorsOptions(options.corsOrigins),
            defaultMeta: {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
                ...options.defaultMeta,
            },
        };
    }
    initializeFullConfig(baseConfig, options) {
        return {
            ...baseConfig,
            bundleCache: options.bundleCache || createCache(),
            templateCache: options.templateCache || createCache(),
            errorHandler: options.errorHandler || ErrorHandler.handleErrorStatic,
            staticFileHandler: options.staticFileHandler || this.handleDefaultRequest.bind(this),
            bundleHandler: this.distHandler.handleDistRequest.bind(this.distHandler),
        };
    }
    createRequiredDirectoriesSync(projectPath) {
        const requiredDirs = [
            path__default.join(projectPath, 'public'),
            path__default.join(projectPath, 'logs'),
            path__default.join(projectPath, 'src')
        ];
        for (const dir of requiredDirs) {
            try {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            }
            catch (error) {
                // We'll log this later once logger is initialized
                console.warn(`Failed to create directory ${dir}: ${error}`);
            }
        }
    }
    setupStaticFileHandling(options) {
        const staticOptions = {
            root: path__default.join(this.config.projectPath, options.root || 'public'),
            maxAge: options.maxAge || 86400,
            index: options.index || ['index.html'],
            dotFiles: options.dotFiles || 'ignore',
            compression: options.compression ?? this.config.compression,
            etag: options.etag !== false
        };
        const staticFileMiddleware = new StaticFileMiddleware(staticOptions);
        this.use(staticFileMiddleware.middleware());
    }
    initializeStaticFileHandling(options) {
        if (!options.staticFileOptions && !options.staticFileHandler) {
            const defaultStaticOptions = {
                root: 'public',
                maxAge: 86400,
                index: ['index.html'],
                dotFiles: 'ignore',
                compression: this.config.compression,
                etag: true
            };
            this.setupStaticFileHandling(defaultStaticOptions);
        }
        else if (options.staticFileOptions) {
            this.setupStaticFileHandling(options.staticFileOptions);
        }
    }
    validateConfig() {
        if (this.config.port < 0 || this.config.port > 65535) {
            throw new Error('Invalid port number');
        }
        if (this.config.cacheMaxAge < 0) {
            throw new Error('Cache max age cannot be negative');
        }
        if (typeof this.config.errorHandler !== 'function') {
            throw new Error('Error handler must be a function');
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
        this.router.add(this.router.route(path).handler(handler));
    }
    clearCache() {
        this.config.bundleCache.clear();
        this.config.templateCache.clear();
        this.bundler.clearCache();
    }
    createContext(rawReq, rawRes) {
        const req = new Request(rawReq);
        const res = new Response(rawRes);
        return {
            req,
            res,
            params: {},
            query: {},
            state: {},
        };
    }
    async executeMiddlewares(context) {
        // Early return if no middlewares
        if (this.middlewares.length === 0) {
            return;
        }
        const chain = [...this.middlewares];
        let index = 0;
        const next = async () => {
            const middleware = chain[index];
            if (!middleware) {
                return;
            }
            try {
                // Create new context with next function for current middleware
                const middlewareContext = {
                    ...context,
                    req: context.req.raw,
                    next: async () => {
                        index++;
                        await next();
                    }
                };
                // Execute current middleware
                await middleware(context.req.raw, context.res.raw, next);
            }
            catch (error) {
                const middlewareError = new Error(`Middleware execution failed: ${error instanceof Error ? error.message : String(error)}`);
                if (error instanceof Error) {
                    middlewareError.cause = error;
                    middlewareError.stack = error.stack;
                }
                throw middlewareError;
            }
        };
        // Start the middleware chain
        await next();
    }
    async handleRequest(rawReq, rawRes) {
        try {
            this.logger.log(`Request received: ${rawReq.method} ${rawReq.url}`);
            const context = this.createContext(rawReq, rawRes);
            // Handle CORS preflight
            if (context.req.method === 'OPTIONS') {
                corsManager.handlePreflight(context.res.raw);
                return;
            }
            // Set CORS headers
            corsManager.setCorsHeaders(context.res.raw);
            // Execute middleware chain
            await this.executeMiddlewares(context);
            const parsedUrl = parse(rawReq.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Special routes
            if (pathname === '/dist') {
                await this.handleBundle(context.req.raw, context.res.raw, parsedUrl.query);
                return;
            }
            // Route handling
            await this.router.handle(context.req.raw, context.res.raw);
        }
        catch (err) {
            const error = err;
            await ErrorHandler.handleErrorStatic(error, rawReq, rawRes, { logger: this.logger });
        }
    }
    async handleBundle(req, res, query) {
        try {
            const entryPoint = query.entryPoint || 'main.js';
            const bundle = await this.bundler.generateBundle(entryPoint, {
                minify: true,
                sourceMap: false
            });
            const etag = etagGenerator.generate(bundle.code);
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                res.end();
                return;
            }
            const headers = {
                'Content-Type': 'application/javascript',
                'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
                'ETag': etag,
            };
            if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
                const compressed = gzipAsync(bundle.code);
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
            const bundleError = new Error(`Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                bundleError.cause = error;
            }
            throw bundleError;
        }
    }
    async handleDistRequest(req, res) {
        await this.distHandler.handleDistRequest(req, res);
    }
    async handleDefaultRequest(req, res) {
        try {
            const parsedUrl = parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Template lookup
            const htmlPath = join(this.config.projectPath, 'public', 'index.html');
            let html = await promises.readFile(htmlPath, 'utf-8');
            // Meta tags
            const meta = {
                title: `Page - ${pathname}`,
                description: `Content for ${pathname}`,
                ...this.config.defaultMeta
            };
            // Inject meta tags
            html = htmlManager.injectMetaTags(html, meta);
            const headers = {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff'
            };
            if (!res.headersSent) {
                res.writeHead(200, headers);
            }
            res.end(html);
        }
        catch (error) {
            const requestError = new Error(`Default request handling failed: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                requestError.cause = error;
                requestError.stack = error.stack;
            }
            throw requestError;
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
        if (port < 0 || port > 65535) {
            throw new Error('Invalid port number');
        }
        this.config.port = port;
        this.start().catch(error => {
            this.logger.log(`Failed to start server: ${error.message}`);
        });
    }
}
function gzipAsync(code) {
    throw new Error('Function not implemented.');
}

export { AeroSSR, AeroSSR as default };
//# sourceMappingURL=AeroSSR.js.map
