/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
import { createServer } from 'http';
import { promises } from 'fs';
import { parse } from 'url';
import path__default from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from './utils/Logger.js';
import { createCache } from './utils/CacheManager.js';
import { corsManager } from './utils/CorsManager.js';
import { etagGenerator } from './utils/ETagGenerator.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { htmlManager } from './utils/HtmlManager.js';
import { AeroSSRBundler } from './utils/Bundler.js';
import { StaticFileMiddleware } from './middlewares/StaticFileMiddleware.js';

const gzipAsync = promisify(gzip);
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
            projectPath: path__default.resolve(options.projectPath || process.cwd()),
            publicPath: path__default.resolve(options.projectPath || process.cwd(), 'public'),
            port: options.port || 3000,
            compression: options.compression !== false,
            cacheMaxAge: options.cacheMaxAge || 3600,
            logFilePath: options.logFilePath || path__default.join(process.cwd(), 'logs', 'server.log'),
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
        this.createRequiredDirectories(baseConfig.projectPath);
        // Complete configuration with derived components
        this.config = {
            ...baseConfig,
            bundleCache: options.bundleCache || createCache(),
            templateCache: options.templateCache || createCache(),
            errorHandler: options.errorHandler || ErrorHandler.handleError,
            staticFileHandler: options.staticFileHandler || this.handleDefaultRequest.bind(this),
            bundleHandler: options.bundleHandler || this.handleDistRequest.bind(this),
        };
        // Initialize core components
        this.logger = new Logger({
            logFilePath: this.config.logFilePath,
            ...this.config.loggerOptions
        });
        this.bundler = new AeroSSRBundler(this.config.projectPath);
        this.server = null;
        this.routes = new Map();
        this.middlewares = [];
        // Set up default static file handling
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
        // Update CORS manager defaults
        corsManager.updateDefaults(this.config.corsOrigins);
        // Validate configuration
        this.validateConfig();
    }
    async createRequiredDirectories(projectPath) {
        const requiredDirs = [
            path__default.join(projectPath, 'public'),
            path__default.join(projectPath, 'logs'),
            path__default.join(projectPath, 'src')
        ];
        for (const dir of requiredDirs) {
            try {
                await promises.mkdir(dir, { recursive: true });
            }
            catch (error) {
                this.logger.warn(`Failed to create directory ${dir}: ${error}`);
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
    async ensureDefaultTemplate() {
        const defaultHtml = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AeroSSR App</title>
  </head>
  <body>
      <div id="app"></div>
      <script type="module" src="/dist/main.js"></script>
  </body>
  </html>`;
        const indexPath = path__default.join(this.config.projectPath, 'public', 'index.html');
        try {
            await promises.access(indexPath);
        }
        catch {
            await promises.writeFile(indexPath, defaultHtml, 'utf-8');
        }
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
                corsManager.handlePreflight(res, this.config.corsOrigins);
                return;
            }
            // Set CORS headers
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
            // Default handler
            await this.handleDefaultRequest(req, res);
        }
        catch (error) {
            await ErrorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), req, res);
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
            const etag = etagGenerator.generate(bundle.code);
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
            const parsedUrl = parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Template lookup - check both project root and public directory
            const possiblePaths = [
                path__default.join(this.config.projectPath, 'public', 'index.html'),
                path__default.join(this.config.projectPath, 'index.html')
            ];
            let html = '';
            for (const htmlPath of possiblePaths) {
                try {
                    html = await promises.readFile(htmlPath, 'utf-8');
                    break;
                }
                catch (error) {
                    continue;
                }
            }
            if (!html) {
                throw new Error('No index.html found in project');
            }
            ;
            // Define meta tags
            const meta = {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
            };
            // Inject meta tags
            html = htmlManager.injectMetaTags(html, meta, this.config.defaultMeta);
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

export { AeroSSR, AeroSSR as default };
//# sourceMappingURL=AeroSSR.js.map
