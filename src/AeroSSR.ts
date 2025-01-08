import { Server, createServer, IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { parse as parseUrl } from 'url';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from './utils/Logger';
import { createCache } from './utils/CacheManager';
import { corsManager, CorsOptions } from './utils/CorsManager';
import { etagGenerator } from './utils/ETagGenerator';
import { ErrorHandler } from './utils/ErrorHandler';
import { htmlManager } from './utils/HtmlManager';
import { AeroSSRBundler } from './utils/Bundler';
import { AeroSSRConfig, Middleware, RouteHandler, BundleHandler } from './types';

const gzipAsync = promisify(gzip);

export class AeroSSR {
  public readonly config: Required<AeroSSRConfig>;
  public readonly logger: Logger;
  private readonly bundler: AeroSSRBundler;
  public server: Server | null;
  public readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];
  
  constructor(options: Partial<AeroSSRConfig> = {}) {
    // Initialize base configuration first
    const baseConfig = {
      projectPath: options.projectPath || process.cwd(),
      port: options.port || 3000,
      compression: options.compression !== false,
      cacheMaxAge: options.cacheMaxAge || 3600,
      logFilePath: options.logFilePath || null,
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

    // Complete configuration with derived components
    this.config = {
      ...baseConfig,
      bundleCache: options.bundleCache || createCache<string>(),
      templateCache: options.templateCache || createCache<string>(),
      errorHandler: options.errorHandler || ErrorHandler.handleError,
      staticFileHandler: options.staticFileHandler || this.handleDefaultRequest.bind(this),
      bundleHandler: options.bundleHandler as BundleHandler || this.handleDistRequest.bind(this),
    } as Required<AeroSSRConfig>;

    // Initialize core components
    this.logger = new Logger({ 
      logFilePath: this.config.logFilePath,
      ...this.config.loggerOptions 
    });
    
    this.bundler = new AeroSSRBundler(this.config.projectPath);
    this.server = null;
    this.routes = new Map();
    this.middlewares = [];

    // Update CORS manager defaults
    corsManager.updateDefaults(this.config.corsOrigins as CorsOptions);

    // Validate configuration
    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.port < 0 || this.config.port > 65535) {
      throw new Error('Invalid port number');
    }
    if (this.config.cacheMaxAge < 0) {
      throw new Error('Cache max age cannot be negative');
    }
  }

  public use(middleware: Middleware): void {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
  }

  public route(path: string, handler: RouteHandler): void {
    if (typeof path !== 'string' || !path) {
      throw new Error('Route path must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('Route handler must be a function');
    }
    this.routes.set(path, handler);
  }

  public clearCache(): void {
    this.config.bundleCache.clear();
    this.config.templateCache.clear();
    this.bundler.clearCache();
  }

  private async executeMiddlewares(
    req: IncomingMessage,
    res: ServerResponse,
    index = 0
  ): Promise<void> {
    if (index >= this.middlewares.length) {
      return;
    }

    const chain = [...this.middlewares];
    let currentIndex = index;

    const next = async (): Promise<void> => {
      const middleware = chain[currentIndex];
      if (middleware) {
        currentIndex++;
        await middleware(req, res, next);
      }
    };

    await next();
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      this.logger.log(`Request received: ${req.method} ${req.url}`);
      
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        corsManager.handlePreflight(res, this.config.corsOrigins as CorsOptions);
        return;
      }

      // Set CORS headers
      corsManager.setCorsHeaders(res, this.config.corsOrigins as CorsOptions);

      // Execute middleware chain
      await this.executeMiddlewares(req, res);

      const parsedUrl = parseUrl(req.url || '', true);
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
    } catch (error) {
      await ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'), 
        req, 
        res
      );
    }
  }

  private async handleDistRequest(
    req: IncomingMessage,
    res: ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): Promise<void> {
    try {
      const entryPoint = (query.entryPoint as string) || 'main.js';

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
      } else {
        res.writeHead(200, headers);
        res.end(bundle.code);
      }
    } catch (error) {
      throw new Error(`Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDefaultRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const parsedUrl = parseUrl(req.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      // Template lookup
      const htmlPath = join(this.config.projectPath, 'index.html');
      let html = await fs.readFile(htmlPath, 'utf-8');

      // Meta tags
      const meta = {
        title: `Page - ${pathname}`,
        description: `Content for ${pathname}`,
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
    } catch (error) {
      throw new Error(`Default request handling failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async start(): Promise<Server> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer((req, res) => this.handleRequest(req, res));
        
        this.server.on('error', (error) => {
          this.logger.log(`Server error: ${error.message}`);
          reject(error);
        });

        this.server.listen(this.config.port, () => {
          this.logger.log(`Server is running on port ${this.config.port}`);
          resolve(this.server as Server);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
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

  public listen(port: number): void {
    if (port < 0 || port > 65535) {
      throw new Error('Invalid port number');
    }
    this.config.port = port;
    this.start().catch(error => {
      this.logger.log(`Failed to start server: ${error.message}`);
    });
  }
}

export default AeroSSR;